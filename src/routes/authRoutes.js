const express = require("express");
const { body } = require("express-validator");

const { signup, login, getCurrentUser } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.post(
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

router.post(
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

router.get("/me", protect, getCurrentUser);

module.exports = router;
