const { success } = require("../../../../shared/http");

function createHealthController({ readyCheck }) {
  return {
    health(req, res) {
      success(req, res, { status: "ok" });
    },

    async ready(req, res) {
      const checks = await readyCheck();
      success(req, res, { status: "ready", checks });
    }
  };
}

module.exports = { createHealthController };
