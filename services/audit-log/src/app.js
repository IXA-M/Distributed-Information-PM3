const express = require("express");
const { v4: uuidv4 } = require("uuid");
const auditRouter = require("./routes/audit");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.locals.requestId = uuidv4();
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "audit-log" });
});

app.get("/ready", (req, res) => {
  res.json({ status: "ready", service: "audit-log" });
});

app.use("/audit", auditRouter);

module.exports = app;
