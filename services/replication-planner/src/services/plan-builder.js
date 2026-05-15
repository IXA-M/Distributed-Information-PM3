function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function dataOf(event) {
  return event && typeof event === "object" && event.data ? event.data : event || {};
}

function eventTypeOf(sourceTopic, event) {
  return event.event_type || sourceTopic;
}

function normalizeChunks(value) {
  if (!value) {
    return [];
  }

  if (!Array.isArray(value)) {
    return [value];
  }
  return value;
}

function chunkIdOf(chunk) {
  if (typeof chunk === "string") {
    return chunk;
  }
  return chunk.chunk_id || chunk.chunkId || chunk.id;
}

function replicasOf(data, chunk) {
  const chunkReplicas = Array.isArray(chunk.replicas) ? chunk.replicas : [];
  const dataReplicas = Array.isArray(data.replicas) ? data.replicas : [];
  return unique([...chunkReplicas, ...dataReplicas, chunk.node_id, chunk.source_node_id]);
}

function candidateNodesOf(data, chunk, targetNodes) {
  return unique([
    ...(Array.isArray(chunk.target_nodes) ? chunk.target_nodes : []),
    ...(Array.isArray(data.target_nodes) ? data.target_nodes : []),
    ...(Array.isArray(data.available_nodes) ? data.available_nodes : []),
    ...(Array.isArray(data.replacement_nodes) ? data.replacement_nodes : []),
    ...targetNodes
  ]);
}

function selectTargets(candidates, excluded, count) {
  const excludedSet = new Set(excluded.filter(Boolean).map(String));
  return candidates.filter((node) => !excludedSet.has(String(node))).slice(0, count);
}

function taskFor({ chunkId, reason, sourceNodeId, targetNodeId, triggerType }) {
  return {
    chunk_id: chunkId,
    reason,
    source_node_id: sourceNodeId || null,
    target_node_id: targetNodeId || null,
    trigger_type: triggerType,
    status: targetNodeId ? "planned" : "needs_target_node"
  };
}

function buildUploadCompletedTasks(data, triggerType, policy, targetNodes) {
  const chunks = normalizeChunks(data.chunks || data.chunk_ids || data.chunkIds);
  const tasks = [];

  for (const chunk of chunks) {
    const chunkId = chunkIdOf(chunk);
    if (!chunkId) {
      continue;
    }

    const chunkObject = typeof chunk === "string" ? { chunk_id: chunk } : chunk;
    const existingReplicas = replicasOf(data, chunkObject);
    const desiredFactor = chunkObject.replication_factor || data.replication_factor || policy.default_factor;
    const missingReplicas = Math.max(desiredFactor - existingReplicas.length, 0);
    const candidates = candidateNodesOf(data, chunkObject, targetNodes);
    const selectedTargets = selectTargets(candidates, existingReplicas, missingReplicas);

    for (let index = 0; index < missingReplicas; index += 1) {
      tasks.push(
        taskFor({
          chunkId,
          reason: "new_upload_replication",
          sourceNodeId: chunkObject.source_node_id || chunkObject.node_id || existingReplicas[0] || null,
          targetNodeId: selectedTargets[index] || null,
          triggerType
        })
      );
    }
  }

  return tasks;
}

function buildNodeMissedTasks(data, triggerType, targetNodes) {
  const failedNodeId = data.failed_node_id || data.node_id;
  const chunks = normalizeChunks(data.affected_chunks || data.chunks || data.chunk_ids || data.chunkIds);
  const tasks = [];

  for (const chunk of chunks) {
    const chunkId = chunkIdOf(chunk);
    if (!chunkId) {
      continue;
    }

    const chunkObject = typeof chunk === "string" ? { chunk_id: chunk } : chunk;
    const candidates = candidateNodesOf(data, chunkObject, targetNodes);
    const sourceNodeId = chunkObject.healthy_node_id || chunkObject.source_node_id || null;
    const selected = selectTargets(candidates, [failedNodeId, sourceNodeId], 1)[0] || null;
    tasks.push(
      taskFor({
        chunkId,
        reason: "node_heartbeat_missed",
        sourceNodeId,
        targetNodeId: selected,
        triggerType
      })
    );
  }

  return tasks;
}

function buildIntegrityFailedTasks(data, triggerType, targetNodes) {
  const chunks = normalizeChunks(data.chunks || data.chunk_ids || data.chunk_id || data.chunkId);
  const tasks = [];

  for (const chunk of chunks) {
    const chunkId = chunkIdOf(chunk);
    if (!chunkId) {
      continue;
    }

    const chunkObject = typeof chunk === "string" ? { chunk_id: chunk } : chunk;
    const corruptNodeId = chunkObject.corrupt_node_id || data.corrupt_node_id || data.node_id;
    const sourceNodeId = chunkObject.healthy_node_id || data.healthy_node_id || chunkObject.source_node_id || null;
    const candidates = candidateNodesOf(data, chunkObject, targetNodes);
    const selected = selectTargets(candidates, [corruptNodeId, sourceNodeId], 1)[0] || null;
    tasks.push(
      taskFor({
        chunkId,
        reason: "integrity_failed",
        sourceNodeId,
        targetNodeId: selected,
        triggerType
      })
    );
  }

  return tasks;
}

function buildReplicationTasks({ sourceTopic, event, policy, targetNodes = [] }) {
  const data = dataOf(event);
  const triggerType = eventTypeOf(sourceTopic, event || {});

  if (triggerType === "upload.completed" || sourceTopic === "upload.completed") {
    return buildUploadCompletedTasks(data, triggerType, policy, targetNodes);
  }
  if (triggerType === "node.heartbeat.missed" || sourceTopic === "node.heartbeat.missed") {
    return buildNodeMissedTasks(data, triggerType, targetNodes);
  }
  if (triggerType === "integrity.failed" || sourceTopic === "integrity.failed") {
    return buildIntegrityFailedTasks(data, triggerType, targetNodes);
  }

  return [];
}

module.exports = {
  buildReplicationTasks,
  candidateNodesOf,
  dataOf,
  normalizeChunks,
  selectTargets
};
