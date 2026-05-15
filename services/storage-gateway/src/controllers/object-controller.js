const { success } = require("../../../../shared/http");

function createObjectController({ objectStorageService }) {
  return {
    async putObject(req, res) {
      const result = await objectStorageService.storeObject({
        body: req.body,
        chunkId: req.params.chunk_id,
        contentType: req.get("content-type") || "application/octet-stream",
        requestId: req.context.requestId
      });

      success(req, res, result, 201);
    },

    async getObject(req, res) {
      const result = await objectStorageService.getObject({
        chunkId: req.params.chunk_id,
        raw: req.query.raw === "true"
      });

      if (result.raw) {
        res.setHeader("content-type", result.content_type || "application/octet-stream");
        res.setHeader("x-object-hash", result.hash);
        res.setHeader("x-object-size", String(result.size));
        res.status(200).send(result.buffer);
        return;
      }

      success(req, res, result);
    }
  };
}

module.exports = { createObjectController };
