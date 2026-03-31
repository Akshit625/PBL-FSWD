const express = require("express");
const { body } = require("express-validator");

const { createMessage, getInbox, markMessageAsRead } = require("../controllers/messageController");
const { protect, authorize } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("student", "admin"),
  [
    body("propertyId").trim().notEmpty().withMessage("Property ID is required."),
    body("message")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Message must be at least 10 characters long."),
    body("phone").optional().trim().isLength({ max: 20 })
  ],
  validateRequest,
  createMessage
);

router.get("/", protect, authorize("owner", "admin"), getInbox);
router.patch("/:id/read", protect, authorize("owner", "admin"), markMessageAsRead);

module.exports = router;
