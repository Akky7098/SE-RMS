const asyncHandler =
  require(
    "../../utils/asyncHandler"
  );

const assetService =
  require(
    "./employeeAsset.service"
  );

/* =========================================================
   META
========================================================= */

const meta =
  asyncHandler(
    async (
      req,
      res
    ) => {
      return res
        .status(200)
        .json({
          success:
            true,

          data:
            assetService
              .getAssetMeta(),
        });
    }
  );

/* =========================================================
   LIST
========================================================= */

const list =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await assetService
          .listEmployeeAssets(
            req.params
              .employeeId
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    }
  );

/* =========================================================
   DETAIL
========================================================= */

const detail =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await assetService
          .getAsset({
            employeeId:
              req.params
                .employeeId,

            assetId:
              req.params
                .assetId,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    }
  );

/* =========================================================
   CREATE
========================================================= */

const create =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await assetService
          .createAssetAssignment({
            employeeId:
              req.params
                .employeeId,

            payload:
              req.body ||
              {},

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Asset assignment created successfully.",

          data,
        });
    }
  );

/* =========================================================
   UPDATE
========================================================= */

const update =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await assetService
          .updateAssetAssignment({
            employeeId:
              req.params
                .employeeId,

            assetId:
              req.params
                .assetId,

            payload:
              req.body ||
              {},

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Asset assignment updated successfully.",

          data,
        });
    }
  );

/* =========================================================
   GENERATE HANDOVER
========================================================= */

const generateHandover =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await assetService
          .generateHandoverForm({
            employeeId:
              req.params
                .employeeId,

            assetId:
              req.params
                .assetId,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Asset Handover Form generated successfully.",

          data,
        });
    }
  );

/* =========================================================
   SIGNED ACKNOWLEDGEMENT
========================================================= */

const uploadSignedAcknowledgement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await assetService
          .uploadSignedAcknowledgement({
            employeeId:
              req.params
                .employeeId,

            assetId:
              req.params
                .assetId,

            file:
              req.file,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Signed Asset Acknowledgement uploaded successfully.",

          data,
        });
    }
  );

/* =========================================================
   NO ASSET REQUIRED
========================================================= */

const noAssetRequired =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await assetService
          .markNoAssetRequired({
            employeeId:
              req.params
                .employeeId,

            remarks:
              req.body
                ?.remarks,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "No Asset Required confirmed for this employee.",

          data,
        });
    }
  );

/* =========================================================
   CANCEL
========================================================= */

const cancel =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await assetService
          .cancelAssetAssignment({
            employeeId:
              req.params
                .employeeId,

            assetId:
              req.params
                .assetId,

            remarks:
              req.body
                ?.remarks,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Asset assignment cancelled successfully.",

          data,
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  meta,

  list,

  detail,

  create,

  update,

  generateHandover,

  uploadSignedAcknowledgement,

  noAssetRequired,

  cancel,
};