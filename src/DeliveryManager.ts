import { Message, MessageStatus, DeliveryOptions, Subscriber } from "./types.ts";

export class DeliveryManager {
  private pendingAcks: Map<string, {
    message: Message;
    subscriber: Subscriber;
    timeout: Timer;
    attempts: number;
  }> = new Map();

  private options: DeliveryOptions;

  constructor(options: DeliveryOptions) {
    this.options = options;
  }

  public async deliver(message: Message, subscriber: Subscriber): Promise<void> {
    try {
      if (this.options.requireAck) {
        this.trackAck(message, subscriber);
      }

      await subscriber.callback(message);
      
      if (!this.options.requireAck) {
        message.status = MessageStatus.DELIVERED;
      }
    } catch (error) {
      console.error(`Delivery failed to ${subscriber.id} for message ${message.id}:`, error);
      
      // Clean up tracking on immediate failure
      if (this.options.requireAck) {
        const trackId = `${message.id}:${subscriber.id}`;
        const tracking = this.pendingAcks.get(trackId);
        if (tracking) {
          clearTimeout(tracking.timeout);
          this.pendingAcks.delete(trackId);
        }
      }

      await this.handleFailure(message, subscriber);
    }
  }

  private trackAck(message: Message, subscriber: Subscriber): void {
    const trackId = `${message.id}:${subscriber.id}`;
    
    const timeout = setTimeout(() => {
      this.handleAckTimeout(message, subscriber);
    }, this.options.ackTimeout);

    this.pendingAcks.set(trackId, {
      message,
      subscriber,
      timeout,
      attempts: message.retryCount
    });
  }

  public acknowledge(messageId: string, subscriberId: string): void {
    const trackId = `${messageId}:${subscriberId}`;
    const tracking = this.pendingAcks.get(trackId);
    
    if (tracking) {
      clearTimeout(tracking.timeout);
      this.pendingAcks.delete(trackId);
      tracking.message.status = MessageStatus.ACKNOWLEDGED;
    }
  }

  private async handleAckTimeout(message: Message, subscriber: Subscriber): Promise<void> {
    const trackId = `${message.id}:${subscriber.id}`;
    this.pendingAcks.delete(trackId);
    
    console.warn(`ACK timeout for message ${message.id} from ${subscriber.id}`);
    await this.handleFailure(message, subscriber);
  }

  private async handleFailure(message: Message, subscriber: Subscriber): Promise<void> {
    if (message.retryCount < this.options.maxRetries) {
      message.retryCount++;
      
      // Wait for interval
      await new Promise(resolve => setTimeout(resolve, this.options.retryInterval));
      
      console.log(`Retrying delivery of ${message.id} to ${subscriber.id} (Attempt ${message.retryCount})`);
      await this.deliver(message, subscriber);
    } else {
      message.status = MessageStatus.FAILED;
      console.error(`Max retries reached for message ${message.id} to ${subscriber.id}`);
    }
  }

  public get pendingCount(): number {
    return this.pendingAcks.size;
  }
}
