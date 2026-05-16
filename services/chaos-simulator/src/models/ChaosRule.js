const { Schema, model } = require("mongoose");

const chaosRuleSchema = new Schema(
  {
    service: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: ["latency", "error-rate"]
    },
    value: {
      type: Schema.Types.Mixed,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

chaosRuleSchema.index({ service: 1, type: 1 }, { unique: true });

module.exports = model("ChaosRule", chaosRuleSchema, "chaos_rules");
