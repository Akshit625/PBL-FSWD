const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    listingMode: {
      type: String,
      enum: ["rent", "sale"],
      required: true
    },
    propertyType: {
      type: String,
      enum: ["pg", "hostel", "apartment", "flat", "house", "studio"],
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      trim: true,
      default: ""
    },
    landmark: {
      type: String,
      trim: true,
      default: ""
    },
    nearbyCollege: {
      type: String,
      trim: true,
      default: ""
    },
    distanceFromCollege: {
      type: Number,
      min: 0,
      default: 0
    },
    bedrooms: {
      type: Number,
      min: 0,
      default: 1
    },
    bathrooms: {
      type: Number,
      min: 0,
      default: 1
    },
    furnishing: {
      type: String,
      enum: ["unfurnished", "semi-furnished", "fully-furnished"],
      default: "semi-furnished"
    },
    amenities: {
      type: [String],
      default: []
    },
    images: {
      type: [String],
      default: []
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (value) => Array.isArray(value) && value.length === 2,
          message: "Location coordinates must contain longitude and latitude."
        }
      }
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ""
    },
    contactEmail: {
      type: String,
      trim: true,
      default: ""
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending"
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

propertySchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Property", propertySchema);
