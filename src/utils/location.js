const EARTH_RADIUS_KM = 6371;

const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (fromLat, fromLng, toLat, toLng) => {
  const latDelta = degreesToRadians(toLat - fromLat);
  const lngDelta = degreesToRadians(toLng - fromLng);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(degreesToRadians(fromLat)) *
      Math.cos(degreesToRadians(toLat)) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

module.exports = {
  EARTH_RADIUS_KM,
  haversineDistanceKm
};
