const PRODUCTION_FRONTEND_ORIGIN = "https://www.erp1.sandeepedgetech.com";

function createCorsOptions(frontendUrls = []) {
  const allowedOrigins = new Set(
    [PRODUCTION_FRONTEND_ORIGIN, "https://api.nuvanata.io", ...frontendUrls]
      .map((url) => url.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  );

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      const error = new Error(`CORS origin not allowed: ${origin}`);
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

module.exports = { createCorsOptions };
