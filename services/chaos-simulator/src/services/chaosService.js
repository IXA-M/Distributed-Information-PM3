const ChaosRule = require("../models/ChaosRule");

async function upsertChaosRule({ service, type, value, enabled }) {
  const rule = await ChaosRule.findOneAndUpdate(
    { service, type },
    {
      service,
      type,
      value,
      enabled: enabled !== false,
      updated_at: new Date()
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return {
    id: String(rule._id),
    service: rule.service,
    type: rule.type,
    value: rule.value,
    enabled: rule.enabled,
    created_at: rule.created_at,
    updated_at: rule.updated_at
  };
}

async function countRules() {
  return ChaosRule.countDocuments();
}

module.exports = {
  upsertChaosRule,
  countRules
};
