require("dotenv").config();

const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Property = require("../src/models/Property");

const seed = async () => {
  await connectDB();

  await Promise.all([User.deleteMany({}), Property.deleteMany({})]);

  const users = await User.create([
    {
      name: "RoomRadar Admin",
      email: "admin@roomradar.local",
      password: "admin123",
      role: "admin",
      phone: "9999999999"
    },
    {
      name: "Aarav Owner",
      email: "owner@roomradar.local",
      password: "owner123",
      role: "owner",
      phone: "9876543210"
    },
    {
      name: "Sara Student",
      email: "student@roomradar.local",
      password: "student123",
      role: "student",
      phone: "9123456789"
    }
  ]);

  console.log("Seeded users only. No default property listings were inserted.");

  console.log("Seed data inserted.");
  process.exit(0);
};

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
