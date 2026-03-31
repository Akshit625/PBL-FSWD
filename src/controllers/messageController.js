const ContactMessage = require("../models/ContactMessage");
const Property = require("../models/Property");
const asyncHandler = require("../utils/asyncHandler");

const createMessage = asyncHandler(async (req, res) => {
  const { propertyId, message, phone } = req.body;

  const property = await Property.findById(propertyId).populate("owner", "name email phone role");

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found."
    });
  }

  if (String(property.owner._id) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "You cannot message yourself about your own listing."
    });
  }

  const contactMessage = await ContactMessage.create({
    property: property._id,
    owner: property.owner._id,
    student: req.user._id,
    name: req.user.name,
    email: req.user.email,
    phone: phone || req.user.phone || "",
    message
  });

  const populatedMessage = await contactMessage.populate([
    { path: "property", select: "title listingMode propertyType price" },
    { path: "owner", select: "name email phone" },
    { path: "student", select: "name email phone role" }
  ]);

  res.status(201).json({
    success: true,
    message: "Message sent to the property owner.",
    contact: populatedMessage
  });
});

const getInbox = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { owner: req.user._id };

  const messages = await ContactMessage.find(filter)
    .populate("property", "title listingMode propertyType price verificationStatus")
    .populate("owner", "name email phone")
    .populate("student", "name email phone role")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: messages.length,
    messages
  });
});

const markMessageAsRead = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id)
    .populate("property", "title")
    .populate("owner", "name email phone")
    .populate("student", "name email phone role");

  if (!message) {
    return res.status(404).json({
      success: false,
      message: "Message not found."
    });
  }

  const isOwner = String(message.owner._id) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You can only update messages sent to you."
    });
  }

  message.status = "read";
  await message.save();

  res.json({
    success: true,
    message: "Message marked as read.",
    contact: message
  });
});

module.exports = {
  createMessage,
  getInbox,
  markMessageAsRead
};
