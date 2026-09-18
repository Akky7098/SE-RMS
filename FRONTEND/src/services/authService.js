import api from "./api";

export const loginUser = (
  payload
) => {
  return api.post(
    "/auth/login",
    payload
  );
};

export const loginWithGoogle = (
  credential
) => {
  return api.post(
    "/auth/google",
    {
      credential,
    }
  );
};

export const logoutUser = () => {
  return api.post(
    "/auth/logout"
  );
};

export const logoutAllDevices =
  () => {
    return api.post(
      "/auth/logout-all"
    );
  };

export const forgotPassword = (
  email
) => {
  return api.post(
    "/auth/forgot-password",
    {
      email,
    }
  );
};

export const resetPassword = (
  payload
) => {
  return api.post(
    "/auth/reset-password",
    payload
  );
};

export const getCurrentUser =
  () => {
    return api.get(
      "/users/me"
    );
  };