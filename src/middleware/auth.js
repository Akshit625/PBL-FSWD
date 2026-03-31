const jwt = require("jsonwebtoken");

const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const resolveToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const attachUser = asyncHandler(async (req, _res, next) => {
  const token = resolveToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (user) {
      req.user = user;
    }
  } catch (_error) {
    req.user = null;
  }

  next();
});

const protect = asyncHandler(async (req, res, next) => {
  const token = resolveToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found."
      });
    }

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
});

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action."
      });
    }

    next();
  };

module.exports = {
  attachUser,
  protect,
  authorize
};
