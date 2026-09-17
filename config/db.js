const mongoose = require("mongoose");
mongoose.set("strictQuery", true, "useNewUrlParser", true);
// DB_URL = process.env.MONGODB_URL
const DB_URL = process.env.MONGODB_URI || process.env.MONGODB_URL || "mongodb+srv://curiakply_db_user:3ypjZKPaGWFyIZPp@curiadb.dy7rfcv.mongodb.net/curia?retryWrites=true&w=majority";
const connectDB = async () => {
  try {
    await mongoose.connect(DB_URL);
    console.log("MongoDB is Connected...");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
module.exports = connectDB;