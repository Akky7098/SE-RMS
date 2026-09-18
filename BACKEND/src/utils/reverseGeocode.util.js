const buildAddress = (data) => {
  const address = data?.address || {};
  const displayName = String(
    data?.display_name || ""
  ).trim();

  const parts = [
    address.house_number,
    address.building,
    address.office,
    address.company,
    address.shop,
    address.amenity,
    address.industrial,
    address.commercial,
    address.residential,
    address.road,
    address.neighbourhood,
    address.suburb,
    address.quarter,
    address.city_district,
    address.village,
    address.town,
    address.city,
    address.county,
    address.state_district,
    address.state,
    address.postcode,
    address.country,
  ]
    .map((value) =>
      String(value || "").trim()
    )
    .filter(Boolean);

  const uniqueParts = [
    ...new Set(parts),
  ];

  return (
    uniqueParts.join(", ") ||
    displayName ||
    ""
  );
};

const normalizeCoordinate = (
  value,
  min,
  max
) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max
  ) {
    return null;
  }

  return number;
};

const reverseGeocode = async (
  latitude,
  longitude
) => {
  const lat = normalizeCoordinate(
    latitude,
    -90,
    90
  );

  const lng = normalizeCoordinate(
    longitude,
    -180,
    180
  );

  if (
    lat === null ||
    lng === null
  ) {
    return "";
  }

  try {
    const params =
      new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: "jsonv2",
        zoom: "18",
        addressdetails: "1",
        namedetails: "1",
      });

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        7000
      );

    try {
      const response =
        await fetch(
          `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
          {
            method: "GET",

            headers: {
              "User-Agent":
                process.env
                  .NOMINATIM_USER_AGENT ||
                "SE-RMS/1.0",

              Accept:
                "application/json",
            },

            signal:
              controller.signal,
          }
        );

      if (!response.ok) {
        throw new Error(
          `Nominatim returned HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      return buildAddress(
        data
      );
    } finally {
      clearTimeout(
        timeout
      );
    }
  } catch (error) {
    console.error(
      "[Attendance] Reverse geocode failed:",
      error?.name ===
        "AbortError"
        ? "Request timed out."
        : error?.message ||
            error
    );

    /*
     * Geocoding failure must not prevent
     * attendance from being recorded.
     */
    return "";
  }
};

module.exports = {
  buildAddress,
  reverseGeocode,
};