import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,

  withCredentials: true,

  headers: {
    "Content-Type":
      "application/json",
  },
});

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (config) => {
    try {
      const accessToken =
        localStorage.getItem(
          "se_rms_access_token"
        );

      if (accessToken) {
        config.headers.Authorization =
          `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.error(
        "Token read failed:",
        error
      );
    }

    return config;
  },
  (error) =>
    Promise.reject(error)
);

/* =========================================================
   RESPONSE / REFRESH TOKEN HANDLING
========================================================= */

let refreshPromise = null;

const refreshSession =
  async () => {
    if (!refreshPromise) {
      refreshPromise = axios
        .post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        )
        .then((response) => {
          const accessToken =
            response?.data?.data
              ?.accessToken;

          if (!accessToken) {
            throw new Error(
              "Refresh response did not contain access token"
            );
          }

          localStorage.setItem(
            "se_rms_access_token",
            accessToken
          );

          return accessToken;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    return refreshPromise;
  };

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error?.config;

    if (
      error?.response?.status ===
        401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes(
        "/auth/login"
      ) &&
      !originalRequest.url?.includes(
        "/auth/google"
      ) &&
      !originalRequest.url?.includes(
        "/auth/refresh"
      )
    ) {
      originalRequest._retry =
        true;

      try {
        const newToken =
          await refreshSession();

        originalRequest.headers =
          originalRequest.headers ||
          {};

        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        return api(
          originalRequest
        );
      } catch (
        refreshError
      ) {
        localStorage.removeItem(
          "se_rms_access_token"
        );

        localStorage.removeItem(
          "se_rms_user"
        );

        localStorage.removeItem(
          "se_rms_access"
        );

        localStorage.removeItem(
          "se_rms_logged_in"
        );

        if (
          window.location.pathname !==
          "/login"
        ) {
          window.location.href =
            "/login";
        }

        return Promise.reject(
          refreshError
        );
      }
    }

    return Promise.reject(
      error
    );
  }
);

export default api;