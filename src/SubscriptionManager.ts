import { Message, Subscriber } from "./types.ts";

export class SubscriptionManager {
  private topicSubscribers: Map<string, Set<Subscriber>> = new Map();
  private directSubscribers: Map<string, Subscriber> = new Map();

  public subscribe(topic: string, subscriber: Subscriber): void {
    if (!this.topicSubscribers.has(topic)) {
      this.topicSubscribers.set(topic, new Set());
    }
    this.topicSubscribers.get(topic)!.add(subscriber);
  }

  public unsubscribe(topic: string, subscriberId: string): void {
    const subscribers = this.topicSubscribers.get(topic);
    if (subscribers) {
      for (const sub of subscribers) {
        if (sub.id === subscriberId) {
          subscribers.delete(sub);
          break;
        }
      }
    }
  }

  public registerDirect(subscriber: Subscriber): void {
    this.directSubscribers.set(subscriber.id, subscriber);
  }

  public unregisterDirect(subscriberId: string): void {
    this.directSubscribers.delete(subscriberId);
  }

  public getSubscribersForMessage(message: Message): Subscriber[] {
    const recipients: Subscriber[] = [];

    // Handle direct messaging
    if (message.metadata.recipientId) {
      const directSub = this.directSubscribers.get(message.metadata.recipientId);
      if (directSub) {
        recipients.push(directSub);
      }
    }

    // Handle topic subscriptions
    if (message.metadata.topic) {
      const topicSubs = this.topicSubscribers.get(message.metadata.topic);
      if (topicSubs) {
        for (const sub of topicSubs) {
          // Avoid double delivery if it's both direct and topic
          if (!recipients.some(r => r.id === sub.id)) {
            // Check optional filter
            if (!sub.filter || sub.filter(message)) {
              recipients.push(sub);
            }
          }
        }
      }
    }

    return recipients;
  }

  public get subscriptionCount(): number {
    let count = 0;
    this.topicSubscribers.forEach(s => count += s.size);
    return count + this.directSubscribers.size;
  }
}
