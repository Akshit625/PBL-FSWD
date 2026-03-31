const errorHandler = (err, _req, res, _next) => {
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error.";

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = "A record with that value already exists.";
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
