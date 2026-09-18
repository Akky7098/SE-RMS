const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(env.mongoUri);

    console.log(
      `MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDB;