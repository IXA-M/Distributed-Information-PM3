const express = require("express");
const { v4: uuidv4 } = require("uuid");
const logsRouter = require("./routes/logs");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.locals.requestId = uuidv4();
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "central-logging" });
});

app.get("/ready", (req, res) => {
  res.json({ status: "ready", service: "central-logging" });
});

app.use("/logs", logsRouter);

module.exports = app;
