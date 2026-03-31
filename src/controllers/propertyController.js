const mongoose = require("mongoose");

const Property = require("../models/Property");
const asyncHandler = require("../utils/asyncHandler");
const { haversineDistanceKm } = require("../utils/location");

const sortMap = {
  newest: { createdAt: -1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? undefined : numericValue;
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const buildVisibilityQuery = (user) => {
  if (!user) {
    return { verificationStatus: "verified" };
  }

  if (user.role === "admin") {
    return {};
  }

  return {
    $or: [
      { verificationStatus: "verified" },
      { owner: new mongoose.Types.ObjectId(user._id) }
    ]
  };
};

const buildPropertyPayload = (body, existingProperty) => {
  const payload = {};
  const fieldNames = [
    "title",
    "description",
    "listingMode",
    "propertyType",
    "address",
    "city",
    "state",
    "landmark",
    "nearbyCollege",
    "furnishing",
    "contactPhone",
    "contactEmail"
  ];

  fieldNames.forEach((field) => {
    if (body[field] !== undefined) {
      payload[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  });

  ["price", "distanceFromCollege", "bedrooms", "bathrooms"].forEach((field) => {
    const parsedNumber = toNumber(body[field]);
    if (parsedNumber !== undefined) {
      payload[field] = parsedNumber;
    }
  });

  if (body.images !== undefined) {
    payload.images = normalizeList(body.images);
  }

  if (body.amenities !== undefined) {
    payload.amenities = normalizeList(body.amenities);
  }

  const latitude = toNumber(body.latitude ?? body.lat);
  const longitude = toNumber(body.longitude ?? body.lng);

  if (latitude !== undefined && longitude !== undefined) {
    payload.location = {
      type: "Point",
      coordinates: [longitude, latitude]
    };
  } else if (!existingProperty) {
    const error = new Error("Latitude and longitude are required.");
    error.statusCode = 400;
    throw error;
  }

  return payload;
};

const enrichPropertiesWithDistance = (properties, lat, lng) =>
  properties.map((property) => {
    const [propertyLng, propertyLat] = property.location.coordinates;
    const distanceFromSearchKm =
      lat !== undefined && lng !== undefined
        ? haversineDistanceKm(lat, lng, propertyLat, propertyLng)
        : null;

    return {
      ...property,
      distanceFromSearchKm:
        distanceFromSearchKm === null ? null : Number(distanceFromSearchKm.toFixed(2))
    };
  });

const listProperties = asyncHandler(async (req, res) => {
  const {
    keyword,
    college,
    listingMode,
    propertyType,
    minPrice,
    maxPrice,
    distance,
    lat,
    lng,
    sort = "newest",
    verificationStatus
  } = req.query;

  const filter = {
    ...buildVisibilityQuery(req.user)
  };

  if (listingMode) {
    filter.listingMode = listingMode;
  }

  if (propertyType) {
    filter.propertyType = propertyType;
  }

  if (verificationStatus && req.user?.role === "admin") {
    filter.verificationStatus = verificationStatus;
  }

  const minPriceValue = toNumber(minPrice);
  const maxPriceValue = toNumber(maxPrice);
  if (minPriceValue !== undefined || maxPriceValue !== undefined) {
    filter.price = {};
    if (minPriceValue !== undefined) {
      filter.price.$gte = minPriceValue;
    }
    if (maxPriceValue !== undefined) {
      filter.price.$lte = maxPriceValue;
    }
  }

  const textTerms = [keyword, college].filter(Boolean);
  if (textTerms.length > 0) {
    const regex = new RegExp(textTerms.map(escapeRegex).join("|"), "i");
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { title: regex },
        { description: regex },
        { address: regex },
        { city: regex },
        { landmark: regex },
        { nearbyCollege: regex }
      ]
    });
  }

  const latValue = toNumber(lat);
  const lngValue = toNumber(lng);
  const distanceValue = toNumber(distance) || Number(process.env.DEFAULT_SEARCH_DISTANCE_KM || 5);

  if (latValue !== undefined && lngValue !== undefined) {
    filter.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lngValue, latValue]
        },
        $maxDistance: distanceValue * 1000
      }
    };
  }

  let query = Property.find(filter).populate("owner", "name email phone role");

  if (!(latValue !== undefined && lngValue !== undefined && sort === "distance")) {
    query = query.sort(sortMap[sort] || sortMap.newest);
  }

  const properties = await query.lean();

  res.json({
    success: true,
    count: properties.length,
    properties: enrichPropertiesWithDistance(properties, latValue, lngValue)
  });
});

const getPropertyById = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate("owner", "name email phone role")
    .lean();

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found."
    });
  }

  const visibleQuery = buildVisibilityQuery(req.user);
  const allowedIds = (visibleQuery.$or || []).map((item) => String(item.owner || ""));
  const isVisible =
    !visibleQuery.verificationStatus ||
    property.verificationStatus === visibleQuery.verificationStatus ||
    allowedIds.includes(String(property.owner?._id || property.owner));

  if (!isVisible) {
    return res.status(404).json({
      success: false,
      message: "Property not found."
    });
  }

  res.json({
    success: true,
    property
  });
});

const createProperty = asyncHandler(async (req, res) => {
  const payload = buildPropertyPayload(req.body);

  const property = await Property.create({
    ...payload,
    owner: req.user._id,
    verificationStatus: "pending"
  });

  const populatedProperty = await property.populate("owner", "name email phone role");

  res.status(201).json({
    success: true,
    message: "Property created and submitted for verification.",
    property: populatedProperty
  });
});

const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found."
    });
  }

  const isOwner = String(property.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You can only edit your own listings."
    });
  }

  const payload = buildPropertyPayload(req.body, property);
  Object.assign(property, payload);

  if (req.user.role !== "admin") {
    property.verificationStatus = "pending";
  }

  await property.save();
  await property.populate("owner", "name email phone role");

  res.json({
    success: true,
    message:
      req.user.role === "admin"
        ? "Property updated successfully."
        : "Property updated and sent back for verification.",
    property
  });
});

const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found."
    });
  }

  const isOwner = String(property.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You can only delete your own listings."
    });
  }

  await property.deleteOne();

  res.json({
    success: true,
    message: "Property deleted successfully."
  });
});

const getMyProperties = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { owner: req.user._id };

  const properties = await Property.find(filter)
    .populate("owner", "name email phone role")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: properties.length,
    properties
  });
});

const verifyProperty = asyncHandler(async (req, res) => {
  const { verificationStatus } = req.body;

  const property = await Property.findByIdAndUpdate(
    req.params.id,
    { verificationStatus },
    { new: true }
  ).populate("owner", "name email phone role");

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found."
    });
  }

  res.json({
    success: true,
    message: `Property marked as ${verificationStatus}.`,
    property
  });
});

module.exports = {
  listProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties,
  verifyProperty
};
