const User = require("../models/User");
const createToken = require("../utils/createToken");
const asyncHandler = require("../utils/asyncHandler");

const prefersHtml = (req) => !req.originalUrl.startsWith("/api/") && req.accepts(["html", "json"]) === "html";
const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const sendHtmlAuthSuccess = (res, message, authData, statusCode = 200) => {
  const serializedAuth = JSON.stringify(authData).replace(/</g, "\\u003c");

  res.status(statusCode).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RoomRadar</title>
  </head>
  <body>
    <p>${escapeHtml(message)} Redirecting...</p>
    <script>
      const authData = ${serializedAuth};
      localStorage.setItem("roomradar_token", authData.token);
      localStorage.setItem("roomradar_user", JSON.stringify(authData.user));
      window.location.replace("/");
    </script>
    <noscript>
      <p>JavaScript is required to finish sign-in. Go back and enable JavaScript.</p>
    </noscript>
  </body>
</html>`);
};

const redirectWithError = (res, path, message) => res.redirect(303, `${path}?error=${encodeURIComponent(message)}`);

const buildAuthResponse = (user) => ({
  token: createToken(user._id),
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone
  }
});

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const message = "An account with this email already exists.";

    if (prefersHtml(req)) {
      return redirectWithError(res, "/signup", message);
    }

    return res.status(409).json({
      success: false,
      message
    });
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    phone
  });

  const authResponse = buildAuthResponse(user);

  if (prefersHtml(req)) {
    return sendHtmlAuthSuccess(res, "Account created successfully.", authResponse, 201);
  }

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    ...authResponse
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !(await user.matchPassword(password))) {
    const message = "Invalid email or password.";

    if (prefersHtml(req)) {
      return redirectWithError(res, "/login", message);
    }

    return res.status(401).json({
      success: false,
      message
    });
  }

  const authResponse = buildAuthResponse(user);

  if (prefersHtml(req)) {
    return sendHtmlAuthSuccess(res, "Login successful.", authResponse);
  }

  res.json({
    success: true,
    message: "Login successful.",
    ...authResponse
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = {
  signup,
  login,
  getCurrentUser
};
