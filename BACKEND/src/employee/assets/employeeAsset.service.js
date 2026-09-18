const mongoose =
  require(
    "mongoose"
  );

const {
  EmployeeAsset,
  EmployeeAssetCounter,
  EMPLOYEE_ASSET_TYPES,
  EMPLOYEE_ASSET_CONDITIONS,
} =
  require(
    "./employeeAsset.model"
  );

const {
  Employee,
} =
  require(
    "../employee.model"
  );

const {
  EmployeeOnboarding,
} =
  require(
    "../onboarding/onboarding.model"
  );

const employeeDocumentService =
  require(
    "../documents/employeeDocument.service"
  );

const {
  generateAssetHandoverPdf,
} =
  require(
    "./employeeAssetPdf.service"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   HELPERS
========================================================= */

const validId =
  (
    value
  ) =>
    mongoose.Types
      .ObjectId
      .isValid(
        value
      );

const clean =
  (
    value
  ) =>
    String(
      value ??
        ""
    ).trim();

const upper =
  (
    value
  ) =>
    clean(
      value
    ).toUpperCase();

/* =========================================================
   EMPLOYEE
========================================================= */

const getEmployee =
  async (
    employeeId
  ) => {
    if (
      !validId(
        employeeId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Employee ID."
      );
    }

    const employee =
      await Employee
        .findById(
          employeeId
        )
        .populate(
          "department",
          "name code"
        )
        .populate(
          "reportsTo",
          "employeeCode fullName designation officialEmail"
        );

    if (!employee) {
      throw new ApiError(
        404,
        "Employee not found."
      );
    }

    return employee;
  };

/* =========================================================
   ASSET
========================================================= */

const getAsset =
  async ({
    employeeId,
    assetId,
  }) => {
    if (
      !validId(
        assetId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Asset Assignment ID."
      );
    }

    const asset =
      await EmployeeAsset
        .findOne({
          _id:
            assetId,

          employee:
            employeeId,
        })
        .populate(
          "handoverDocument"
        )
        .populate(
          "signedAcknowledgementDocument"
        )
        .populate(
          "createdBy",
          "displayName email"
        )
        .populate(
          "updatedBy",
          "displayName email"
        )
        .populate(
          "auditTrail.performedBy",
          "displayName email"
        );

    if (!asset) {
      throw new ApiError(
        404,
        "Asset assignment not found."
      );
    }

    return asset;
  };

/* =========================================================
   ASSIGNMENT NUMBER
========================================================= */

const generateAssignmentNumber =
  async (
    employee
  ) => {
    const key =
      `ASSET-${employee.employeeCode}`;

    const counter =
      await EmployeeAssetCounter
        .findOneAndUpdate(
          {
            key,
          },
          {
            $inc: {
              sequence:
                1,
            },
          },
          {
            new:
              true,

            upsert:
              true,

            setDefaultsOnInsert:
              true,
          }
        );

    return (
      `AST-${employee.employeeCode}-${String(
        counter.sequence
      ).padStart(
        4,
        "0"
      )}`
    );
  };

/* =========================================================
   VALIDATE ACCESSORIES
========================================================= */

const normalizeAccessories =
  (
    value
  ) => {
    if (
      !Array.isArray(
        value
      )
    ) {
      return [];
    }

    return value
      .filter(
        (
          item
        ) =>
          clean(
            item?.name
          )
      )
      .slice(
        0,
        30
      )
      .map(
        (
          item
        ) => ({
          name:
            clean(
              item.name
            ),

          included:
            item.included !==
            false,

          remarks:
            clean(
              item.remarks
            ),
        })
      );
  };

/* =========================================================
   CREATE
========================================================= */

const createAssetAssignment =
  async ({
    employeeId,
    payload,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const assetType =
      upper(
        payload.assetType
      );

    if (
      !EMPLOYEE_ASSET_TYPES.includes(
        assetType
      )
    ) {
      throw new ApiError(
        400,
        "Invalid asset type."
      );
    }

    if (
      !clean(
        payload.assetName
      )
    ) {
      throw new ApiError(
        400,
        "Asset name is required."
      );
    }

    const condition =
      upper(
        payload.conditionAtIssue ||
        "GOOD"
      );

    if (
      !EMPLOYEE_ASSET_CONDITIONS.includes(
        condition
      )
    ) {
      throw new ApiError(
        400,
        "Invalid asset condition."
      );
    }

    if (
      !payload.issueDate
    ) {
      throw new ApiError(
        400,
        "Asset issue date is required."
      );
    }

    const issueDate =
      new Date(
        payload.issueDate
      );

    if (
      Number.isNaN(
        issueDate.getTime()
      )
    ) {
      throw new ApiError(
        400,
        "Invalid asset issue date."
      );
    }

    if (
      payload.estimatedValue !==
        undefined &&
      payload.estimatedValue !==
        null &&
      payload.estimatedValue !==
        "" &&
      (
        Number.isNaN(
          Number(
            payload.estimatedValue
          )
        ) ||
        Number(
          payload.estimatedValue
        ) <
          0
      )
    ) {
      throw new ApiError(
        400,
        "Estimated value must be a valid positive amount."
      );
    }

    const assignmentNumber =
      await generateAssignmentNumber(
        employee
      );

    const asset =
      await EmployeeAsset
        .create({
          employee:
            employee._id,

          onboarding:
            employee.onboarding ||
            null,

          assignmentNumber,

          assetType,

          assetName:
            clean(
              payload.assetName
            ),

          assetCode:
            upper(
              payload.assetCode
            ),

          serialNumber:
            clean(
              payload.serialNumber
            ),

          manufacturer:
            clean(
              payload.manufacturer
            ),

          model:
            clean(
              payload.model
            ),

          issueDate,

          conditionAtIssue:
            condition,

          estimatedValue:
            payload.estimatedValue ===
              undefined ||
            payload.estimatedValue ===
              null ||
            payload.estimatedValue ===
              ""
              ? null
              : Number(
                  payload.estimatedValue
                ),

          currency:
            upper(
              payload.currency ||
              "INR"
            ),

          accessories:
            normalizeAccessories(
              payload.accessories
            ),

          remarks:
            clean(
              payload.remarks
            ),

          status:
            "DRAFT",

          createdBy:
            actorUserId,

          updatedBy:
            actorUserId,

          auditTrail: [
            {
              event:
                "ASSET_ASSIGNMENT_CREATED",

              remarks:
                `${clean(
                  payload.assetName
                )} added to employee onboarding.`,

              performedBy:
                actorUserId,
            },
          ],
        });

    /*
     * Asset is required for this onboarding now,
     * but not complete until signed acknowledgement.
     */
    if (
      employee.onboarding
    ) {
      await EmployeeOnboarding
        .findByIdAndUpdate(
          employee
            .onboarding,
          {
            $set: {
              "checklist.assets":
                false,
            },

            $push: {
              auditTrail: {
                event:
                  "ASSET_REQUIRED",

                remarks:
                  `Asset assignment ${assignmentNumber} created.`,

                performedBy:
                  actorUserId,

                at:
                  new Date(),
              },
            },

            updatedBy:
              actorUserId,
          }
        );
    }

    return getAsset({
      employeeId:
        employee._id,

      assetId:
        asset._id,
    });
  };

/* =========================================================
   UPDATE DRAFT
========================================================= */

const updateAssetAssignment =
  async ({
    employeeId,
    assetId,
    payload,
    actorUserId,
  }) => {
    const asset =
      await getAsset({
        employeeId,

        assetId,
      });

    if (
      ![
        "DRAFT",
        "ACKNOWLEDGEMENT_PENDING",
      ].includes(
        asset.status
      )
    ) {
      throw new ApiError(
        409,
        "This asset assignment can no longer be edited."
      );
    }

    if (
      payload.assetType !==
      undefined
    ) {
      const value =
        upper(
          payload.assetType
        );

      if (
        !EMPLOYEE_ASSET_TYPES.includes(
          value
        )
      ) {
        throw new ApiError(
          400,
          "Invalid asset type."
        );
      }

      asset.assetType =
        value;
    }

    if (
      payload.conditionAtIssue !==
      undefined
    ) {
      const value =
        upper(
          payload.conditionAtIssue
        );

      if (
        !EMPLOYEE_ASSET_CONDITIONS.includes(
          value
        )
      ) {
        throw new ApiError(
          400,
          "Invalid asset condition."
        );
      }

      asset.conditionAtIssue =
        value;
    }

    const fields = [
      "assetName",
      "serialNumber",
      "manufacturer",
      "model",
      "remarks",
    ];

    for (
      const field
      of fields
    ) {
      if (
        payload[field] !==
        undefined
      ) {
        asset[field] =
          clean(
            payload[field]
          );
      }
    }

    if (
      payload.assetCode !==
      undefined
    ) {
      asset.assetCode =
        upper(
          payload.assetCode
        );
    }

    if (
      payload.currency !==
      undefined
    ) {
      asset.currency =
        upper(
          payload.currency
        );
    }

    if (
      payload.accessories !==
      undefined
    ) {
      asset.accessories =
        normalizeAccessories(
          payload.accessories
        );
    }

    if (
      payload.issueDate !==
      undefined
    ) {
      const date =
        new Date(
          payload.issueDate
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        throw new ApiError(
          400,
          "Invalid issue date."
        );
      }

      asset.issueDate =
        date;
    }

    if (
      payload.estimatedValue !==
      undefined
    ) {
      if (
        payload.estimatedValue ===
          "" ||
        payload.estimatedValue ===
          null
      ) {
        asset.estimatedValue =
          null;
      } else {
        const amount =
          Number(
            payload.estimatedValue
          );

        if (
          Number.isNaN(
            amount
          ) ||
          amount <
            0
        ) {
          throw new ApiError(
            400,
            "Invalid estimated value."
          );
        }

        asset.estimatedValue =
          amount;
      }
    }

    asset.updatedBy =
      actorUserId;

    asset.auditTrail.push({
      event:
        "ASSET_ASSIGNMENT_UPDATED",

      remarks:
        "Asset assignment details updated.",

      performedBy:
        actorUserId,
    });

    await asset.save();

    return getAsset({
      employeeId,

      assetId,
    });
  };

/* =========================================================
   GENERATE HANDOVER FORM
========================================================= */

const generateHandoverForm =
  async ({
    employeeId,
    assetId,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const asset =
      await getAsset({
        employeeId,

        assetId,
      });

    if (
      [
        "CANCELLED",
        "RETURNED",
      ].includes(
        asset.status
      )
    ) {
      throw new ApiError(
        409,
        "Handover form cannot be generated for this asset status."
      );
    }

    const buffer =
      await generateAssetHandoverPdf({
        employee,

        asset,
      });

    const document =
      await employeeDocumentService
        .registerDocumentBuffer({
          employeeId:
            employee._id,

          buffer,

          originalFileName:
            `${asset.assignmentNumber}-Asset-Handover.pdf`,

          mimeType:
            "application/pdf",

          category:
            "ASSET",

          documentType:
            "ASSET_HANDOVER_FORM",

          label:
            `Asset Handover Form - ${asset.assetName}`,

          description:
            `Generated asset handover acknowledgement for ${asset.assignmentNumber}.`,

          source:
            "GENERATED",

          sourceRecordType:
            "EmployeeAsset",

          sourceRecordId:
            asset._id,

          /*
           * Different timestamp allows a revised form to be
           * regenerated if asset details were corrected.
           */
          sourceDocumentId:
            `HANDOVER-${Date.now()}`,

          actorUserId,

          allowDuplicate:
            true,
        });

    asset.handoverDocument =
      document._id;

    asset.status =
      "ACKNOWLEDGEMENT_PENDING";

    asset.assignedAt =
      asset.assignedAt ||
      new Date();

    asset.updatedBy =
      actorUserId;

    asset.auditTrail.push({
      event:
        "HANDOVER_FORM_GENERATED",

      remarks:
        "Printable asset handover form generated.",

      performedBy:
        actorUserId,

      metadata: {
        documentId:
          document._id,
      },
    });

    await asset.save();

    return getAsset({
      employeeId,

      assetId,
    });
  };

/* =========================================================
   UPLOAD SIGNED ACKNOWLEDGEMENT
========================================================= */

const uploadSignedAcknowledgement =
  async ({
    employeeId,
    assetId,
    file,
    actorUserId,
  }) => {
    if (!file) {
      throw new ApiError(
        400,
        "Signed asset acknowledgement is required."
      );
    }

    const employee =
      await getEmployee(
        employeeId
      );

    const asset =
      await getAsset({
        employeeId,

        assetId,
      });

    if (
      [
        "CANCELLED",
        "RETURNED",
      ].includes(
        asset.status
      )
    ) {
      throw new ApiError(
        409,
        "Signed acknowledgement cannot be uploaded for this asset."
      );
    }

    const document =
      await employeeDocumentService
        .registerDocumentBuffer({
          employeeId:
            employee._id,

          buffer:
            file.buffer,

          originalFileName:
            file.originalname,

          mimeType:
            file.mimetype,

          category:
            "ASSET",

          documentType:
            "SIGNED_ASSET_ACKNOWLEDGEMENT",

          label:
            `Signed Asset Acknowledgement - ${asset.assetName}`,

          description:
            `Signed acknowledgement for ${asset.assignmentNumber}.`,

          source:
            "HR_UPLOAD",

          sourceRecordType:
            "EmployeeAsset",

          sourceRecordId:
            asset._id,

          sourceDocumentId:
            `SIGNED-${Date.now()}`,

          signedDate:
            new Date(),

          actorUserId,

          allowDuplicate:
            false,
        });

    asset
      .signedAcknowledgementDocument =
      document._id;

    asset.status =
      "ACKNOWLEDGED";

    asset.acknowledgedAt =
      new Date();

    asset.assignedAt =
      asset.assignedAt ||
      new Date();

    asset.updatedBy =
      actorUserId;

    asset.auditTrail.push({
      event:
        "SIGNED_ACKNOWLEDGEMENT_UPLOADED",

      remarks:
        "Signed employee asset acknowledgement uploaded and verified.",

      performedBy:
        actorUserId,

      metadata: {
        documentId:
          document._id,
      },
    });

    await asset.save();

    /* =====================================================
       ONBOARDING CHECKLIST

       Assets complete only when ALL live onboarding
       assignments are acknowledged.
    ===================================================== */

    await refreshAssetChecklist({
      employee,

      actorUserId,
    });

    return getAsset({
      employeeId,

      assetId,
    });
  };

/* =========================================================
   CHECKLIST
========================================================= */

const refreshAssetChecklist =
  async ({
    employee,
    actorUserId,
  }) => {
    if (
      !employee.onboarding
    ) {
      return;
    }

    const liveAssets =
      await EmployeeAsset
        .find({
          employee:
            employee._id,

          status: {
            $nin: [
              "CANCELLED",
              "RETURNED",
            ],
          },
        })
        .select(
          "status"
        )
        .lean();

    const complete =
      liveAssets.length >
        0 &&
      liveAssets.every(
        (
          item
        ) =>
          item.status ===
          "ACKNOWLEDGED"
      );

    await EmployeeOnboarding
      .findByIdAndUpdate(
        employee
          .onboarding,
        {
          $set: {
            "checklist.assets":
              complete,
          },

          $push: complete
            ? {
                auditTrail: {
                  event:
                    "ASSET_SETUP_COMPLETED",

                  remarks:
                    "All assigned employee assets have signed acknowledgements.",

                  performedBy:
                    actorUserId,

                  at:
                    new Date(),
                },
              }
            : {
                auditTrail: {
                  event:
                    "ASSET_SETUP_PENDING",

                  remarks:
                    "Employee asset acknowledgement is pending.",

                  performedBy:
                    actorUserId,

                  at:
                    new Date(),
                },
              },

          updatedBy:
            actorUserId,
        }
      );
  };

/* =========================================================
   NO ASSET REQUIRED
========================================================= */

const markNoAssetRequired =
  async ({
    employeeId,
    remarks,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    if (
      !employee.onboarding
    ) {
      throw new ApiError(
        409,
        "This employee does not have an onboarding record."
      );
    }

    const activeAssetCount =
      await EmployeeAsset
        .countDocuments({
          employee:
            employee._id,

          status: {
            $nin: [
              "CANCELLED",
              "RETURNED",
            ],
          },
        });

    if (
      activeAssetCount >
      0
    ) {
      throw new ApiError(
        409,
        "Asset assignments already exist. Cancel them before marking No Asset Required."
      );
    }

    await EmployeeOnboarding
      .findByIdAndUpdate(
        employee
          .onboarding,
        {
          $set: {
            "checklist.assets":
              true,
          },

          $push: {
            auditTrail: {
              event:
                "NO_ASSET_REQUIRED",

              remarks:
                clean(
                  remarks
                ) ||
                "HR confirmed that no company asset is required for this employee.",

              performedBy:
                actorUserId,

              at:
                new Date(),
            },
          },

          updatedBy:
            actorUserId,
        }
      );

    return {
      completed:
        true,

      noAssetRequired:
        true,
    };
  };

/* =========================================================
   CANCEL
========================================================= */

const cancelAssetAssignment =
  async ({
    employeeId,
    assetId,
    remarks,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const asset =
      await getAsset({
        employeeId,

        assetId,
      });

    if (
      asset.status ===
      "RETURNED"
    ) {
      throw new ApiError(
        409,
        "Returned asset assignment cannot be cancelled."
      );
    }

    asset.status =
      "CANCELLED";

    asset.updatedBy =
      actorUserId;

    asset.auditTrail.push({
      event:
        "ASSET_ASSIGNMENT_CANCELLED",

      remarks:
        clean(
          remarks
        ) ||
        "Asset assignment cancelled by HR.",

      performedBy:
        actorUserId,
    });

    await asset.save();

    await refreshAssetChecklist({
      employee,

      actorUserId,
    });

    return getAsset({
      employeeId,

      assetId,
    });
  };

/* =========================================================
   LIST
========================================================= */

const listEmployeeAssets =
  async (
    employeeId
  ) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const assets =
      await EmployeeAsset
        .find({
          employee:
            employee._id,
        })
        .populate(
          "handoverDocument",
          "label documentType mimeType version status"
        )
        .populate(
          "signedAcknowledgementDocument",
          "label documentType mimeType version status"
        )
        .populate(
          "createdBy",
          "displayName email"
        )
        .sort({
          createdAt:
            -1,
        })
        .lean();

    return {
      employee: {
        _id:
          employee._id,

        employeeCode:
          employee
            .employeeCode,

        fullName:
          employee
            .fullName,

        designation:
          employee
            .designation,
      },

      summary: {
        total:
          assets.length,

        acknowledged:
          assets.filter(
            (
              item
            ) =>
              item.status ===
              "ACKNOWLEDGED"
          ).length,

        pending:
          assets.filter(
            (
              item
            ) =>
              [
                "DRAFT",
                "ASSIGNED",
                "ACKNOWLEDGEMENT_PENDING",
              ].includes(
                item.status
              )
          ).length,

        returned:
          assets.filter(
            (
              item
            ) =>
              item.status ===
              "RETURNED"
          ).length,
      },

      assets,
    };
  };

/* =========================================================
   META
========================================================= */

const getAssetMeta =
  () => ({
    assetTypes:
      EMPLOYEE_ASSET_TYPES,

    conditions:
      EMPLOYEE_ASSET_CONDITIONS,
  });

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createAssetAssignment,

  updateAssetAssignment,

  generateHandoverForm,

  uploadSignedAcknowledgement,

  markNoAssetRequired,

  cancelAssetAssignment,

  listEmployeeAssets,

  getAsset,

  getAssetMeta,
};