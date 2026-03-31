const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { body } = require("express-validator");

const authRoutes = require("./routes/authRoutes");
const { signup, login } = require("./controllers/authController");
const propertyRoutes = require("./routes/propertyRoutes");
const messageRoutes = require("./routes/messageRoutes");
const configRoutes = require("./routes/configRoutes");
const errorHandler = require("./middleware/errorHandler");
const validateRequest = require("./middleware/validateRequest");

const app = express();
const publicDir = path.join(__dirname, "..", "public");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "RoomRadar API is healthy."
  });
});

app.post(
  "/login",
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required.")
      .bail()
      .isEmail()
      .withMessage("Enter a valid email address.")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required.")
  ],
  validateRequest,
  login
);

app.post(
  "/signup",
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters long."),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required.")
      .bail()
      .isEmail()
      .withMessage("Enter a valid email address.")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long."),
    body("role")
      .optional()
      .isIn(["student", "owner"])
      .withMessage("Role must be either student or owner."),
    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required.")
      .bail()
      .customSanitizer((value) => String(value).replace(/\D/g, ""))
      .matches(/^\d{10}$/)
      .withMessage("Enter a valid 10-digit phone number.")
  ],
  validateRequest,
  signup
);

app.use("/api/config", configRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/messages", messageRoutes);

app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/signup", (_req, res) => {
  res.sendFile(path.join(publicDir, "signup.html"));
});

app.get("/about", (_req, res) => {
  res.sendFile(path.join(publicDir, "about.html"));
});

app.get("/contact", (_req, res) => {
  res.sendFile(path.join(publicDir, "contact.html"));
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "API route not found."
    });
  }

  if (req.method === "GET") {
    return res.sendFile(path.join(publicDir, "index.html"));
  }

  next();
});

app.use(errorHandler);

module.exports = app;
