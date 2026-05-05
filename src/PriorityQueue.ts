import { Message, MessagePriority } from "./types.ts";

export class PriorityQueue {
  private queues: Map<MessagePriority, Message[]> = new Map();

  constructor() {
    this.queues.set(MessagePriority.LOW, []);
    this.queues.set(MessagePriority.NORMAL, []);
    this.queues.set(MessagePriority.HIGH, []);
    this.queues.set(MessagePriority.CRITICAL, []);
  }

  public enqueue(message: Message): void {
    const priority = message.metadata.priority;
    const queue = this.queues.get(priority) || [];
    queue.push(message);
    this.queues.set(priority, queue);
  }

  public dequeue(): Message | undefined {
    // Check queues from highest priority to lowest
    const priorities = [
      MessagePriority.CRITICAL,
      MessagePriority.HIGH,
      MessagePriority.NORMAL,
      MessagePriority.LOW
    ];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift();
      }
    }

    return undefined;
  }

  public peek(): Message | undefined {
    const priorities = [
      MessagePriority.CRITICAL,
      MessagePriority.HIGH,
      MessagePriority.NORMAL,
      MessagePriority.LOW
    ];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }

    return undefined;
  }

  public get size(): number {
    let count = 0;
    this.queues.forEach(q => count += q.length);
    return count;
  }

  public clear(): void {
    this.queues.forEach(q => q.length = 0);
  }

  public remove(messageId: string): boolean {
    let removed = false;
    this.queues.forEach((q, priority) => {
      const index = q.findIndex(m => m.id === messageId);
      if (index !== -1) {
        q.splice(index, 1);
        removed = true;
      }
    });
    return removed;
  }
}
