const mongoose = require("mongoose");
const env = require("./env");

async function connectDatabase() {
  await mongoose.connect(env.mongoUri, {
    dbName: env.dbName
  });
}

module.exports = {
  connectDatabase,
  mongoose
};
