const express = require("express");
const { body } = require("express-validator");

const {
  listProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties,
  verifyProperty
} = require("../controllers/propertyController");
const { attachUser, protect, authorize } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

const createPropertyValidationRules = [
  body("title").trim().isLength({ min: 4 }).withMessage("Title must be at least 4 characters long."),
  body("description")
    .trim()
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters long."),
  body("listingMode")
    .isIn(["rent", "sale"])
    .withMessage("Listing mode must be rent or sale."),
  body("propertyType")
    .isIn(["pg", "hostel", "apartment", "flat", "house", "studio"])
    .withMessage("Invalid property type."),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number."),
  body("address").trim().notEmpty().withMessage("Address is required."),
  body("city").trim().notEmpty().withMessage("City is required."),
  body("latitude").isFloat({ min: -90, max: 90 }).withMessage("Latitude must be valid."),
  body("longitude").isFloat({ min: -180, max: 180 }).withMessage("Longitude must be valid."),
  body("contactEmail").optional().trim().isEmail().withMessage("Contact email must be valid."),
  body("distanceFromCollege").optional().isFloat({ min: 0 }),
  body("bedrooms").optional().isFloat({ min: 0 }),
  body("bathrooms").optional().isFloat({ min: 0 }),
  body("furnishing")
    .optional()
    .isIn(["unfurnished", "semi-furnished", "fully-furnished"])
    .withMessage("Invalid furnishing type.")
];

const updatePropertyValidationRules = [
  body("title").optional().trim().isLength({ min: 4 }).withMessage("Title must be at least 4 characters long."),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters long."),
  body("listingMode")
    .optional()
    .isIn(["rent", "sale"])
    .withMessage("Listing mode must be rent or sale."),
  body("propertyType")
    .optional()
    .isIn(["pg", "hostel", "apartment", "flat", "house", "studio"])
    .withMessage("Invalid property type."),
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number."),
  body("address").optional().trim().notEmpty().withMessage("Address is required."),
  body("city").optional().trim().notEmpty().withMessage("City is required."),
  body("distanceFromCollege").optional().isFloat({ min: 0 }),
  body("bedrooms").optional().isFloat({ min: 0 }),
  body("bathrooms").optional().isFloat({ min: 0 }),
  body("furnishing")
    .optional()
    .isIn(["unfurnished", "semi-furnished", "fully-furnished"])
    .withMessage("Invalid furnishing type."),
  body("latitude").optional().isFloat({ min: -90, max: 90 }).withMessage("Latitude must be valid."),
  body("longitude").optional().isFloat({ min: -180, max: 180 }).withMessage("Longitude must be valid."),
  body("contactEmail").optional().trim().isEmail().withMessage("Contact email must be valid.")
];

router.get("/", attachUser, listProperties);
router.get("/mine", protect, authorize("owner", "admin"), getMyProperties);
router.get("/:id", attachUser, getPropertyById);
router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createPropertyValidationRules,
  validateRequest,
  createProperty
);
router.put(
  "/:id",
  protect,
  authorize("owner", "admin"),
  updatePropertyValidationRules,
  validateRequest,
  updateProperty
);
router.delete("/:id", protect, authorize("owner", "admin"), deleteProperty);
router.patch(
  "/:id/verify",
  protect,
  authorize("admin"),
  [
    body("verificationStatus")
      .isIn(["pending", "verified", "rejected"])
      .withMessage("Invalid verification status.")
  ],
  validateRequest,
  verifyProperty
);

module.exports = router;
