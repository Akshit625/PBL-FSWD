const asyncHandler = require("../utils/asyncHandler");

const getPublicConfig = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      defaultMapCenter: {
        lat: Number(process.env.DEFAULT_MAP_LAT || 28.6139),
        lng: Number(process.env.DEFAULT_MAP_LNG || 77.209)
      },
      defaultSearchDistanceKm: Number(process.env.DEFAULT_SEARCH_DISTANCE_KM || 5)
    }
  });
});

module.exports = {
  getPublicConfig
};
