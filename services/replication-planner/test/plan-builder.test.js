const { buildReplicationTasks } = require("../src/services/plan-builder");

describe("plan-builder unit tests", () => {
  test("upload.completed plans missing replicas", () => {
    const tasks = buildReplicationTasks({
      sourceTopic: "upload.completed",
      event: {
        event_type: "upload.completed",
        data: {
          chunks: [{ chunk_id: "chunk-a", replicas: ["storage-node-a"] }]
        }
      },
      policy: { default_factor: 3 },
      targetNodes: ["storage-node-a", "storage-node-b", "storage-node-c"]
    });

    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.target_node_id)).toEqual(["storage-node-b", "storage-node-c"]);
  });

  test("node.heartbeat.missed excludes the failed node", () => {
    const tasks = buildReplicationTasks({
      sourceTopic: "node.heartbeat.missed",
      event: {
        data: {
          failed_node_id: "storage-node-a",
          affected_chunks: [{ chunk_id: "chunk-b", healthy_node_id: "storage-node-b" }]
        }
      },
      policy: { default_factor: 3 },
      targetNodes: ["storage-node-a", "storage-node-b", "storage-node-c"]
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].target_node_id).toBe("storage-node-c");
    expect(tasks[0].reason).toBe("node_heartbeat_missed");
  });

  test("integrity.failed creates a repair task", () => {
    const tasks = buildReplicationTasks({
      sourceTopic: "integrity.failed",
      event: {
        data: {
          chunk_id: "chunk-c",
          corrupt_node_id: "storage-node-a",
          healthy_node_id: "storage-node-b"
        }
      },
      policy: { default_factor: 3 },
      targetNodes: ["storage-node-a", "storage-node-b", "storage-node-c"]
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].source_node_id).toBe("storage-node-b");
    expect(tasks[0].target_node_id).toBe("storage-node-c");
  });

  test("unknown event creates no tasks", () => {
    const tasks = buildReplicationTasks({
      sourceTopic: "unknown.event",
      event: { data: { chunk_id: "chunk-x" } },
      policy: { default_factor: 3 },
      targetNodes: ["storage-node-a"]
    });

    expect(tasks).toEqual([]);
  });

  test("upload.completed marks missing target when no candidates exist", () => {
    const tasks = buildReplicationTasks({
      sourceTopic: "upload.completed",
      event: {
        data: {
          chunks: [{ chunk_id: "chunk-z", replicas: ["storage-node-a"], replication_factor: 2 }]
        }
      },
      policy: { default_factor: 3 },
      targetNodes: []
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe("needs_target_node");
  });
});
