const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 5 * 60 * 1000,
};

const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

function formatCoordinates(latitude, longitude) {
  return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
}

function formatReverseGeocode(payload) {
  const city = String(payload?.city || payload?.locality || '').trim();
  const region = String(payload?.principalSubdivision || '').trim();
  const country = String(payload?.countryName || '').trim();

  if (city && region) return `${city}, ${region}`;
  if (city && country) return `${city}, ${country}`;
  if (region && country) return `${region}, ${country}`;
  return city || region || country || '';
}

function mapGeolocationError(error) {
  if (!error || typeof error.code !== 'number') {
    return 'Could not detect your location.';
  }

  if (error.code === 1) return 'Location permission was denied.';
  if (error.code === 2) return 'Location information is unavailable.';
  if (error.code === 3) return 'Location request timed out.';
  return 'Could not detect your location.';
}

function getCurrentPosition() {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported in this browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
  });
}

export async function detectBrowserLocation() {
  let position;
  try {
    position = await getCurrentPosition();
  } catch (error) {
    throw new Error(mapGeolocationError(error));
  }

  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Could not read location coordinates.');
  }

  const coordinateFallback = formatCoordinates(latitude, longitude);

  try {
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: 'en',
    });
    const response = await fetch(`${REVERSE_GEOCODE_URL}?${query.toString()}`);
    if (!response.ok) return coordinateFallback;

    const payload = await response.json();
    return formatReverseGeocode(payload) || coordinateFallback;
  } catch {
    return coordinateFallback;
  }
}

