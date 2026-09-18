import api from "./api";

/* =========================================================
   RESPONSE
========================================================= */

const responseData =
  (
    response
  ) =>
    response?.data?.data ||
    response?.data ||
    null;

/* =========================================================
   ERROR
========================================================= */

const errorMessage =
  (
    error,
    fallback =
      "Asset request failed"
  ) =>
    error?.response?.data?.message ||
    error?.message ||
    fallback;

/* =========================================================
   META
========================================================= */

export const getEmployeeAssetMeta =
  async () => {
    try {
      const response =
        await api.get(
          "/employee-assets/meta"
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "Asset options could not be loaded"
        )
      );
    }
  };

/* =========================================================
   LIST
========================================================= */

export const getEmployeeAssets =
  async (
    employeeId
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    try {
      const response =
        await api.get(
          `/employee-assets/${employeeId}`
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "Employee assets could not be loaded"
        )
      );
    }
  };

/* =========================================================
   DETAIL
========================================================= */

export const getEmployeeAsset =
  async (
    employeeId,
    assetId
  ) => {
    if (
      !employeeId ||
      !assetId
    ) {
      throw new Error(
        "Employee and asset IDs are required"
      );
    }

    try {
      const response =
        await api.get(
          `/employee-assets/${employeeId}/${assetId}`
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "Asset assignment could not be loaded"
        )
      );
    }
  };

/* =========================================================
   CREATE
========================================================= */

export const createEmployeeAsset =
  async (
    employeeId,
    payload = {}
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    try {
      const response =
        await api.post(
          `/employee-assets/${employeeId}`,
          payload
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "Asset assignment could not be created"
        )
      );
    }
  };

/* =========================================================
   UPDATE
========================================================= */

export const updateEmployeeAsset =
  async (
    employeeId,
    assetId,
    payload = {}
  ) => {
    if (
      !employeeId ||
      !assetId
    ) {
      throw new Error(
        "Employee and asset IDs are required"
      );
    }

    try {
      const response =
        await api.patch(
          `/employee-assets/${employeeId}/${assetId}`,
          payload
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "Asset assignment could not be updated"
        )
      );
    }
  };

/* =========================================================
   GENERATE HANDOVER
========================================================= */

export const generateAssetHandover =
  async (
    employeeId,
    assetId
  ) => {
    if (
      !employeeId ||
      !assetId
    ) {
      throw new Error(
        "Employee and asset IDs are required"
      );
    }

    try {
      const response =
        await api.post(
          `/employee-assets/${employeeId}/${assetId}/generate-handover`
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "Asset handover form could not be generated"
        )
      );
    }
  };

/* =========================================================
   SIGNED ACKNOWLEDGEMENT
========================================================= */

export const uploadAssetAcknowledgement =
  async (
    employeeId,
    assetId,
    file
  ) => {
    if (
      !employeeId ||
      !assetId
    ) {
      throw new Error(
        "Employee and asset IDs are required"
      );
    }

    if (
      !file
    ) {
      throw new Error(
        "Signed acknowledgement file is required"
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
      file.name
    );

    try {
      /*
       * Do NOT manually force Content-Type.
       * Browser/Axios should create multipart boundary.
       */
      const response =
        await api.post(
          `/employee-assets/${employeeId}/${assetId}/signed-acknowledgement`,
          formData
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "Signed acknowledgement could not be uploaded"
        )
      );
    }
  };

/* =========================================================
   NO ASSET REQUIRED
========================================================= */

export const markNoAssetRequired =
  async (
    employeeId,
    remarks =
      ""
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    try {
      const response =
        await api.post(
          `/employee-assets/${employeeId}/no-asset-required`,
          {
            remarks,
          }
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "No Asset Required could not be confirmed"
        )
      );
    }
  };

/* =========================================================
   CANCEL
========================================================= */

export const cancelEmployeeAsset =
  async (
    employeeId,
    assetId,
    remarks =
      ""
  ) => {
    if (
      !employeeId ||
      !assetId
    ) {
      throw new Error(
        "Employee and asset IDs are required"
      );
    }

    try {
      const response =
        await api.patch(
          `/employee-assets/${employeeId}/${assetId}/cancel`,
          {
            remarks,
          }
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        errorMessage(
          error,
          "Asset assignment could not be cancelled"
        )
      );
    }
  };

/* =========================================================
   DEFAULT
========================================================= */

const employeeAssetService = {
  getEmployeeAssetMeta,

  getEmployeeAssets,

  getEmployeeAsset,

  createEmployeeAsset,

  updateEmployeeAsset,

  generateAssetHandover,

  uploadAssetAcknowledgement,

  markNoAssetRequired,

  cancelEmployeeAsset,
};

export default employeeAssetService;