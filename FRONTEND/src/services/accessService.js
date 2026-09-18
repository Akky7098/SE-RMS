import api from "./api";

export const getMyAccess =
  () => {
    return api.get(
      "/access/me"
    );
  };

export const getAccessMeta =
  () => {
    return api.get(
      "/access/meta"
    );
  };

export const getRoleAccessList =
  () => {
    return api.get(
      "/access/roles"
    );
  };

export const getRoleAccess = (
  role
) => {
  return api.get(
    `/access/roles/${role}`
  );
};

export const updateRoleAccess = (
  role,
  permissions
) => {
  return api.put(
    `/access/roles/${role}`,
    {
      permissions,
    }
  );
};