const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,  // ✅ Keep this (creates index automatically)
    },
    phone: {
      type: String,
      required: true,
      unique: true,  // ✅ Keep this (creates index automatically)
    },
    password: {
      type: String,
      required: true,
    },
    role: [
      {
        type: String,
        default: "user",
      },
    ],
    parish: {
      type: String,
      required: true,
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware before saving the user
userSchema.pre("save", async function (next) {
  next();
});

// Method to compare password during login
userSchema.methods.comparePassword = async function (password) {
  console.log('Comparing:', password, this.password);
  return this.password === password;
};

const User = mongoose.model("Users", userSchema);
module.exports = User;