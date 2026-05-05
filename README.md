# Agent Message Router

Intelligent message routing system for multi-agent communication with priority queuing, delivery guarantees, and subscription patterns.

## Features

- **Priority Queuing**: Support for LOW, NORMAL, HIGH, and CRITICAL message priorities.
- **Pub/Sub Subscriptions**: Subscribe agents to specific topics.
- **Direct Messaging**: Send messages directly to specific agent IDs.
- **Delivery Guarantees**: Optional ACK requirements with configurable timeouts and retries.
- **Performance Tracking**: Built-in stats for latency, throughput, and failure rates.
- **Type Safe**: Written in TypeScript with full type definitions.

## Installation

```bash
bun install
```

## Usage

### Basic Setup

```typescript
import { AgentMessageRouter, MessagePriority } from "./src/index.ts";

const router = new AgentMessageRouter({
  requireAck: true,
  ackTimeout: 5000,
  maxRetries: 3
});
```

### Subscribing to Topics

```typescript
router.subscribe("agent.updates", {
  id: "collector-agent",
  callback: async (message) => {
    console.log("Received update:", message.payload);
    router.acknowledge(message.id, "collector-agent");
  }
});
```

### Publishing Messages

```typescript
router.publish({ 
  status: "active",
  load: 0.45 
}, {
  senderId: "agent-1",
  topic: "agent.updates",
  priority: MessagePriority.NORMAL
});
```

### Direct Messaging

```typescript
router.publish({ command: "shutdown" }, {
  senderId: "admin",
  recipientId: "agent-1",
  priority: MessagePriority.CRITICAL
});
```

## Architecture

The router consists of several core components:

- **PriorityQueue**: Manages messages in memory, ensuring higher priority messages are processed first.
- **SubscriptionManager**: Tracks topic-based and direct subscribers.
- **DeliveryManager**: Handles the actual delivery loop, including ACKs and exponential backoff/retries.
- **Router**: The main facade providing the public API.

## Testing

```bash
bun test
```

## License

MIT
