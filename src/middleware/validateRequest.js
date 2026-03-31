const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    if (!req.originalUrl.startsWith("/api/") && req.accepts(["html", "json"]) === "html") {
      const message = errors.array()[0]?.msg || "Validation failed.";
      return res.redirect(303, `${req.path}?error=${encodeURIComponent(message)}`);
    }

    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array()
    });
  }

  next();
};

module.exports = validateRequest;
