/* =========================================================
   COORDINATE VALIDATION
========================================================= */

const toCoordinate =
  (
    value,
    min,
    max,
    label
  ) => {
    const number =
      Number(
        value
      );

    if (
      !Number.isFinite(
        number
      ) ||
      number < min ||
      number > max
    ) {
      const error =
        new Error(
          `Valid ${label} is required.`
        );

      error.statusCode =
        400;

      throw error;
    }

    return number;
  };

/* =========================================================
   HAVERSINE DISTANCE
========================================================= */

const getDistanceInMeters =
  (
    lat1,
    lon1,
    lat2,
    lon2
  ) => {
    const latitude1 =
      toCoordinate(
        lat1,
        -90,
        90,
        "latitude"
      );

    const longitude1 =
      toCoordinate(
        lon1,
        -180,
        180,
        "longitude"
      );

    const latitude2 =
      toCoordinate(
        lat2,
        -90,
        90,
        "office latitude"
      );

    const longitude2 =
      toCoordinate(
        lon2,
        -180,
        180,
        "office longitude"
      );

    const earthRadiusMeters =
      6371000;

    const toRadians =
      (
        value
      ) =>
        (
          value *
          Math.PI
        ) /
        180;

    const dLatitude =
      toRadians(
        latitude2 -
          latitude1
      );

    const dLongitude =
      toRadians(
        longitude2 -
          longitude1
      );

    const a =
      Math.sin(
        dLatitude /
          2
      ) **
        2 +
      Math.cos(
        toRadians(
          latitude1
        )
      ) *
        Math.cos(
          toRadians(
            latitude2
          )
        ) *
        Math.sin(
          dLongitude /
            2
        ) **
          2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(
          a
        ),
        Math.sqrt(
          1 -
            a
        )
      );

    return Math.round(
      earthRadiusMeters *
        c
    );
  };

/* =========================================================
   GEOFENCE CHECK

   IMPORTANT:
   Office coordinates/radius are arguments rather than
   environment variables.

   The Attendance service should obtain these values from
   the employee's configured Office.
========================================================= */

const verifyOfficeLocation =
  ({
    latitude,

    longitude,

    officeLatitude,

    officeLongitude,

    radiusMeters,
  }) => {
    const radius =
      Number(
        radiusMeters
      );

    if (
      !Number.isFinite(
        radius
      ) ||
      radius <= 0
    ) {
      const error =
        new Error(
          "Office geofence radius is not configured."
        );

      error.statusCode =
        500;

      throw error;
    }

    const distance =
      getDistanceInMeters(
        latitude,
        longitude,
        officeLatitude,
        officeLongitude
      );

    return {
      distance,

      distanceMeters:
        distance,

      radiusMeters:
        radius,

      isWithinOffice:
        distance <=
        radius,
    };
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getDistanceInMeters,

  verifyOfficeLocation,
};