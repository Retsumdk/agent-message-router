export * from "./types.ts";
export * from "./Router.ts";
export * from "./PriorityQueue.ts";
export * from "./SubscriptionManager.ts";
export * from "./DeliveryManager.ts";

import { AgentMessageRouter } from "./Router.ts";
import { MessagePriority } from "./types.ts";

// Simple example usage
if (import.meta.main) {
  const router = new AgentMessageRouter({
    requireAck: true,
    ackTimeout: 2000
  });

  console.log("Initializing Agent Message Router...");

  // Subscribe an agent to a topic
  router.subscribe("system.alerts", {
    id: "monitoring-agent",
    callback: async (msg) => {
      console.log(`[Monitoring Agent] Received Alert: ${JSON.stringify(msg.payload)}`);
      // Simulating some processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      router.acknowledge(msg.id, "monitoring-agent");
    }
  });

  // Register a direct agent
  router.registerAgent("executor-agent", async (msg) => {
    console.log(`[Executor Agent] Received Direct Task: ${JSON.stringify(msg.payload)}`);
    router.acknowledge(msg.id, "executor-agent");
  });

  // Publish some messages with different priorities
  console.log("Publishing messages...");

  router.publish({ alert: "Disk Space Low" }, {
    senderId: "system",
    topic: "system.alerts",
    priority: MessagePriority.HIGH
  });

  router.publish({ task: "Clean Temp Files" }, {
    senderId: "system",
    recipientId: "executor-agent",
    priority: MessagePriority.NORMAL
  });

  router.publish({ alert: "CPU Temperature High" }, {
    senderId: "system",
    topic: "system.alerts",
    priority: MessagePriority.CRITICAL
  });

  // Check stats after a short delay
  setTimeout(() => {
    const stats = router.getStats();
    console.log("\nRouter Stats:", JSON.stringify(stats, null, 2));
  }, 3000);
}
