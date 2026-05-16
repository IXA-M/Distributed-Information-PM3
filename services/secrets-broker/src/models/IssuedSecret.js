const { Schema, model } = require("mongoose");

const issuedSecretSchema = new Schema(
  {
    service: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    secret_hash: {
      type: String,
      required: true
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expires: 0 }
    },
    issued_at: {
      type: Date,
      default: Date.now
    },
    scopes: {
      type: [String],
      default: []
    }
  },
  {
    versionKey: false
  }
);

module.exports = model("IssuedSecret", issuedSecretSchema, "issued_secrets");
