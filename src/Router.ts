import { 
  Message, 
  MessagePriority, 
  MessageStatus, 
  Subscriber, 
  DeliveryOptions, 
  RouterStats 
} from "./types.ts";
import { PriorityQueue } from "./PriorityQueue.ts";
import { SubscriptionManager } from "./SubscriptionManager.ts";
import { DeliveryManager } from "./DeliveryManager.ts";
import { randomUUID } from "node:crypto";

export class AgentMessageRouter {
  private queue: PriorityQueue;
  private subscriptions: SubscriptionManager;
  private delivery: DeliveryManager;
  
  private stats: RouterStats = {
    totalMessagesSent: 0,
    activeSubscriptions: 0,
    pendingDeliveries: 0,
    failedMessages: 0,
    averageLatency: 0
  };

  private isProcessing: boolean = false;
  private messageHistory: Map<string, Message> = new Map();

  constructor(deliveryOptions: Partial<DeliveryOptions> = {}) {
    const defaultOptions: DeliveryOptions = {
      maxRetries: 3,
      retryInterval: 1000,
      requireAck: true,
      ackTimeout: 5000,
      ...deliveryOptions
    };

    this.queue = new PriorityQueue();
    this.subscriptions = new SubscriptionManager();
    this.delivery = new DeliveryManager(defaultOptions);
  }

  public publish(
    payload: any, 
    metadata: Omit<Message["metadata"], "timestamp">
  ): string {
    const message: Message = {
      id: randomUUID(),
      payload,
      metadata: {
        ...metadata,
        timestamp: Date.now()
      },
      status: MessageStatus.PENDING,
      retryCount: 0
    };

    this.queue.enqueue(message);
    this.messageHistory.set(message.id, message);
    this.stats.totalMessagesSent++;

    // Trigger processing if not already running
    this.processQueue();

    return message.id;
  }

  public subscribe(topic: string, subscriber: Subscriber): void {
    this.subscriptions.subscribe(topic, subscriber);
    this.updateStats();
  }

  public registerAgent(agentId: string, callback: Subscriber["callback"]): void {
    this.subscriptions.registerDirect({ id: agentId, callback });
    this.updateStats();
  }

  public acknowledge(messageId: string, agentId: string): void {
    this.delivery.acknowledge(messageId, agentId);
    this.updateStats();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.size > 0) {
        const message = this.queue.dequeue();
        if (!message) break;

        const startTime = Date.now();
        const subscribers = this.subscriptions.getSubscribersForMessage(message);

        if (subscribers.length === 0) {
          console.warn(`No subscribers found for message ${message.id} on topic ${message.metadata.topic}`);
          message.status = MessageStatus.FAILED;
          this.stats.failedMessages++;
        } else {
          const deliveryPromises = subscribers.map(sub => 
            this.delivery.deliver(message, sub)
          );
          
          // We don't necessarily want to wait for all deliveries if they are async/retrying
          // but we track them
          Promise.all(deliveryPromises).then(() => {
            const latency = Date.now() - startTime;
            this.updateLatency(latency);
          });
        }
        
        this.updateStats();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private updateLatency(newLatency: number): void {
    this.stats.averageLatency = (this.stats.averageLatency * 0.9) + (newLatency * 0.1);
  }

  private updateStats(): void {
    this.stats.activeSubscriptions = this.subscriptions.subscriptionCount;
    this.stats.pendingDeliveries = this.delivery.pendingCount;
  }

  public getStats(): RouterStats {
    this.updateStats();
    return { ...this.stats };
  }

  public getMessageStatus(messageId: string): MessageStatus | undefined {
    return this.messageHistory.get(messageId)?.status;
  }

  public purgeHistory(olderThanMs: number): void {
    const now = Date.now();
    for (const [id, msg] of this.messageHistory) {
      if (now - msg.metadata.timestamp > olderThanMs) {
        this.messageHistory.delete(id);
      }
    }
  }
}
