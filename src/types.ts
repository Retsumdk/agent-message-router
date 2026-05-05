export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum MessageStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  ACKNOWLEDGED = 'acknowledged',
  EXPIRED = 'expired'
}

export interface MessageMetadata {
  senderId: string;
  recipientId?: string;
  topic?: string;
  timestamp: number;
  ttl?: number;
  priority: MessagePriority;
  correlationId?: string;
  replyTo?: string;
}

export interface Message<T = any> {
  id: string;
  payload: T;
  metadata: MessageMetadata;
  status: MessageStatus;
  retryCount: number;
}

export interface Subscriber {
  id: string;
  callback: (message: Message) => Promise<void> | void;
  filter?: (message: Message) => boolean;
}

export interface DeliveryOptions {
  maxRetries: number;
  retryInterval: number; // ms
  requireAck: boolean;
  ackTimeout: number; // ms
}

export interface RouterStats {
  totalMessagesSent: number;
  activeSubscriptions: number;
  pendingDeliveries: number;
  failedMessages: number;
  averageLatency: number;
}
