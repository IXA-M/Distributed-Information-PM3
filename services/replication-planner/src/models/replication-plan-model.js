function createReplicationPlanModel(db) {
  const policies = db.collection("replication_policies");
  const runs = db.collection("replication_plan_runs");

  return {
    async ensureIndexes() {
      await policies.createIndex({ name: 1 }, { unique: true });
      await runs.createIndex({ source_topic: 1, source_event_id: 1 }, { unique: true });
      await runs.createIndex({ trigger_type: 1 });
      await runs.createIndex({ created_at: -1 });
    },

    async ensureDefaultPolicy(defaultFactor) {
      const now = new Date();
      await policies.updateOne(
        { name: "default" },
        {
          $set: {
            default_factor: defaultFactor,
            updated_at: now
          },
          $setOnInsert: {
            created_at: now
          }
        },
        { upsert: true }
      );
    },

    async getDefaultPolicy() {
      const policy = await policies.findOne({ name: "default" });
      return policy
        ? {
            default_factor: Number(policy.default_factor),
            name: policy.name
          }
        : { default_factor: 3, name: "default" };
    },

    async recordRun(run) {
      const now = new Date();
      const filter = {
        source_event_id: run.source_event_id,
        source_topic: run.source_topic
      };

      await runs.updateOne(
        filter,
        {
          $set: {
            error: run.error || null,
            status: run.status,
            task_count: run.task_count,
            trigger_type: run.trigger_type,
            updated_at: now
          },
          $setOnInsert: {
            _id: run.id,
            created_at: now
          }
        },
        { upsert: true }
      );

      const doc = await runs.findOne(filter);
      return {
        id: doc._id,
        source_event_id: doc.source_event_id,
        source_topic: doc.source_topic,
        task_count: Number(doc.task_count)
      };
    }
  };
}

module.exports = { createReplicationPlanModel };
