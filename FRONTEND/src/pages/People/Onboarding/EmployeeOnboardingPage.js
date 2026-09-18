import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

/* =========================================================
   EMPLOYEE
========================================================= */

import {
  getEmployeeById,
} from "../../../services/employeeService";

/* =========================================================
   ONBOARDING
========================================================= */

import {
  getEmployeeOnboarding,
} from "../../../services/employeeOnboardingService";

/* =========================================================
   ACCESS
========================================================= */

import {
  createEmployeeRmsAccount,
  getEmployeeAccess,
  getEmployeeAccessReadiness,
  prepareEmployeeAccess,
  updateEmployeeOfficialEmail,
} from "../../../services/employeeAccessService";

/* =========================================================
   MAIL
========================================================= */

import {
  getEmployeeMailStatus,
  resendEmployeeAccessMail,
  resendEmployeeWelcomeMail,
  sendEmployeeAccessMail,
  sendEmployeeWelcomeMail,
} from "../../../services/employeeMailService";

/* =========================================================
   DOCUMENTS
========================================================= */

import {
  deleteEmployeeDocument,
  getEmployeeDocuments,
  openEmployeeDocument,
  uploadEmployeeDocument,
} from "../../../services/employeeDocumentService";

/* =========================================================
   ASSETS
========================================================= */

import {
  createEmployeeAsset,
  generateAssetHandover,
  getEmployeeAssetMeta,
  getEmployeeAssets,
  markNoAssetRequired,
  uploadAssetAcknowledgement,
} from "../../../services/employeeAssetService";

/* =========================================================
   APPOINTMENT
========================================================= */

import {
  generateAppointment,
  getAppointmentReadiness,
  getCurrentAppointment,
  issueAppointment,
  reviewAppointment,
} from "../../../services/employeeAppointmentService";

/* =========================================================
   ACTIVATION
========================================================= */

import {
  activateEmployee,
  getEmployeeActivationReadiness,
} from "../../../services/employeeActivationService";

/* =========================================================
   COMPONENTS
========================================================= */

import OnboardingHeader from "./components/OnboardingHeader";

import OnboardingProgress from "./components/OnboardingProgress";

import EmployeeSnapshot from "./components/EmployeeSnapshot";

import AccessStep from "./components/AccessStep";

import DocumentsStep from "./components/DocumentsStep";

import AssetsStep from "./components/AssetsStep";

import AppointmentStep from "./components/AppointmentStep";

import WelcomeStep from "./components/WelcomeStep";

import ActivationStep from "./components/ActivationStep";

import "./Onboarding.css";

/* =========================================================
   HELPERS
========================================================= */

const errorMessage = (
  error,
  fallback =
    "Something went wrong."
) => {
  return (
    error?.response
      ?.data
      ?.message ||
    error?.message ||
    fallback
  );
};

const asArray = (
  value
) => {
  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  return [];
};

// const isTruthyComplete = (
//   value
// ) => {
//   return (
//     value ===
//       true ||
//     [
//       "DONE",
//       "COMPLETE",
//       "COMPLETED",
//       "VERIFIED",
//       "ISSUED",
//       "SENT",
//       "ACKNOWLEDGED",
//       "ACTIVE",
//     ].includes(
//       String(
//         value ||
//         ""
//       ).toUpperCase()
//     )
//   );
// };

/* =========================================================
   DOCUMENT NORMALIZER
========================================================= */

const normalizeDocuments = (
  result
) => {
  const raw =
    result?.documents ||
    result?.records ||
    result?.items ||
    result?.employeeDocuments ||
    (
      Array.isArray(
        result
      )
        ? result
        : []
    );

  return asArray(
    raw
  ).map(
    (
      item
    ) => ({
      ...item,

      id:
        item?._id ||
        item?.id,

      name:
        item?.label ||
        item?.documentName ||
        item?.originalFileName ||
        item?.fileName ||
        "Employee Document",

      category:
        item?.category ||
        item?.documentType ||
        "EMPLOYEE",

      source:
        item?.source ||
        "HR",
    })
  );
};

/* =========================================================
   ASSET NORMALIZER
========================================================= */

const normalizeAssets = (
  result
) => {
  const raw =
    result?.assets ||
    result?.records ||
    result?.items ||
    (
      Array.isArray(
        result
      )
        ? result
        : []
    );

  return asArray(
    raw
  ).map(
    (
      item
    ) => ({
      ...item,

      id:
        item?._id ||
        item?.id,

      issuedAt:
        item?.issueDate ||
        item?.issuedAt ||
        item?.assignedAt,
    })
  );
};

/* =========================================================
   APPOINTMENT ELIGIBILITY NORMALIZER
========================================================= */

const normalizeAppointmentReadiness =
  (
    readiness
  ) => {
    if (
      !readiness
    ) {
      return {
        eligible:
          false,

        daysRemaining:
          0,

        eligibleAt:
          null,
      };
    }

    return {
      ...readiness,

      eligible:
        Boolean(
          readiness?.ready ||
          readiness?.eligible
        ),

      daysRemaining:
        Number(
          readiness
            ?.remainingDays ??
          readiness
            ?.daysRemaining ??
          0
        ),

      eligibleAt:
        readiness
          ?.eligibleAt ||
        null,
    };
  };

/* =========================================================
   APPOINTMENT NORMALIZER
========================================================= */

const normalizeAppointment =
  (
    appointment
  ) => {
    if (
      !appointment
    ) {
      return null;
    }

    return {
      ...appointment,

      generatedAt:
        appointment
          ?.generatedAt ||
        appointment
          ?.createdAt ||
        null,

      documentUrl:
        appointment
          ?.documentUrl ||
        (
          appointment
            ?.document
            ? true
            : ""
        ),
    };
  };

/* =========================================================
   ACCESS NORMALIZER
========================================================= */

const normalizeAccess =
  ({
    access,
    mailStatus,
  }) => {
    const accessCommunication =
      mailStatus
        ?.accessCommunication ||
      {};

    return {
      ...(access ||
        {}),

      email:
        access
          ?.loginEmail ||
        access
          ?.email ||
        "",

      userId:
        access
          ?.user?._id ||
        access
          ?.user ||
        null,

      credentialsSentAt:
        access
          ?.accessMailSentAt ||
        accessCommunication
          ?.sentAt ||
        null,

      credentialsSent:
        Boolean(
          access
            ?.accessMailSentAt ||
          accessCommunication
            ?.sent
        ),
    };
  };

/* =========================================================
   MAIL NORMALIZER
========================================================= */

const normalizeMailStatus =
  (
    value
  ) => {
    const welcome =
      value
        ?.welcomeCommunication ||
      {};

    return {
      ...value,

      welcomeSentAt:
        welcome
          ?.sentAt ||
        value
          ?.welcomeMailSentAt ||
        null,

      welcomeSent:
        Boolean(
          welcome
            ?.sent ||
          value
            ?.welcomeMailSentAt
        ),
    };
  };

/* =========================================================
   MODAL INITIAL
========================================================= */

const INITIAL_ASSET_FORM = {
  assetType:
    "LAPTOP",

  assetName:
    "",

  assetCode:
    "",

  serialNumber:
    "",

  manufacturer:
    "",

  model:
    "",

  issueDate:
    new Date()
      .toISOString()
      .slice(
        0,
        10
      ),

  conditionAtIssue:
    "GOOD",

  estimatedValue:
    "",

  currency:
    "INR",

  remarks:
    "",
};

/* =========================================================
   PAGE
========================================================= */

function EmployeeOnboardingPage() {
  const {
    employeeId,
  } =
    useParams();

  const navigate =
    useNavigate();

  /* =====================================================
     STEP REFS
  ===================================================== */

  const accessRef =
    useRef(
      null
    );

  const documentsRef =
    useRef(
      null
    );

  const assetsRef =
    useRef(
      null
    );

  const appointmentRef =
    useRef(
      null
    );

  const welcomeRef =
    useRef(
      null
    );

  const activationRef =
    useRef(
      null
    );

  /* =====================================================
     DATA
  ===================================================== */

  const [
    employee,
    setEmployee,
  ] =
    useState(
      null
    );

  const [
    onboarding,
    setOnboarding,
  ] =
    useState(
      null
    );

  const [
    access,
    setAccess,
  ] =
    useState(
      null
    );

  const [
    accessReadiness,
    setAccessReadiness,
  ] =
    useState(
      null
    );

  const [
    mailStatus,
    setMailStatus,
  ] =
    useState(
      null
    );

  const [
    documents,
    setDocuments,
  ] =
    useState(
      []
    );

  const [
    assets,
    setAssets,
  ] =
    useState(
      []
    );

  const [
    assetMeta,
    setAssetMeta,
  ] =
    useState(
      null
    );

  const [
    appointment,
    setAppointment,
  ] =
    useState(
      null
    );

  const [
    appointmentReadiness,
    setAppointmentReadiness,
  ] =
    useState(
      null
    );

  const [
    activationReadiness,
    setActivationReadiness,
  ] =
    useState(
      null
    );

  /* =====================================================
     UI
  ===================================================== */

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      ""
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    notice,
    setNotice,
  ] =
    useState(
      ""
    );

  const [
    modal,
    setModal,
  ] =
    useState(
      null
    );

  const [
    assetForm,
    setAssetForm,
  ] =
    useState(
      INITIAL_ASSET_FORM
    );

  const [
    selectedAsset,
    setSelectedAsset,
  ] =
    useState(
      null
    );

  /* =====================================================
     LOAD
  ===================================================== */

  const loadWorkspace =
    useCallback(
      async (
        silent =
          false
      ) => {
        if (
          !employeeId
        ) {
          return;
        }

        try {
          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          /*
           * Employee is essential.
           */
          const employeeResult =
            await getEmployeeById(
              employeeId
            );

          setEmployee(
            employeeResult
          );

          /*
           * Remaining APIs are allowed to fail independently
           * because a fresh employee may not have every
           * onboarding sub-record yet.
           */
          const results =
  await Promise.allSettled([
    /*
     * Employee ID -> Employee.onboarding -> Onboarding ID.
     */
    getEmployeeOnboarding(
      employeeId
    ),

    /*
     * ACCESS
     */
    getEmployeeAccess(
      employeeId
    ),

    getEmployeeAccessReadiness(
      employeeId
    ),

    /*
     * MAIL
     */
    getEmployeeMailStatus(
      employeeId
    ),

    /*
     * DOCUMENTS
     */
    getEmployeeDocuments(
      employeeId
    ),

    /*
     * ASSETS
     */
    getEmployeeAssets(
      employeeId
    ),

    getEmployeeAssetMeta(),

    /*
     * APPOINTMENT
     */
    getAppointmentReadiness(
      employeeId
    ),

    getCurrentAppointment(
      employeeId
    ),

    /*
     * ACTIVATION

     * This service now provides a local fallback if the
     * backend readiness endpoint is unavailable.
     */
    getEmployeeActivationReadiness(
      employeeId
    ),
  ]);
          /* ===============================================
             ONBOARDING
          =============================================== */

          if (
            results[0]
              .status ===
            "fulfilled"
          ) {
            setOnboarding(
              results[0]
                .value ||
              null
            );
          }

          /* ===============================================
             ACCESS
          =============================================== */

          const accessValue =
            results[1]
              .status ===
            "fulfilled"
              ? results[1]
                  .value
              : null;

          const mailValue =
            results[3]
              .status ===
            "fulfilled"
              ? results[3]
                  .value
              : null;

          setAccess(
            normalizeAccess({
              access:
                accessValue,

              mailStatus:
                mailValue,
            })
          );

          if (
            results[2]
              .status ===
            "fulfilled"
          ) {
            setAccessReadiness(
              results[2]
                .value ||
              null
            );
          }

          setMailStatus(
            normalizeMailStatus(
              mailValue
            )
          );

          /* ===============================================
             DOCUMENTS
          =============================================== */

          if (
            results[4]
              .status ===
            "fulfilled"
          ) {
            setDocuments(
              normalizeDocuments(
                results[4]
                  .value
              )
            );
          }

          /* ===============================================
             ASSETS
          =============================================== */

          if (
            results[5]
              .status ===
            "fulfilled"
          ) {
            setAssets(
              normalizeAssets(
                results[5]
                  .value
              )
            );
          }

          if (
            results[6]
              .status ===
            "fulfilled"
          ) {
            setAssetMeta(
              results[6]
                .value ||
              null
            );
          }

          /* ===============================================
             APPOINTMENT
          =============================================== */

          if (
            results[7]
              .status ===
            "fulfilled"
          ) {
            setAppointmentReadiness(
              normalizeAppointmentReadiness(
                results[7]
                  .value
              )
            );
          }

          if (
            results[8]
              .status ===
            "fulfilled"
          ) {
            setAppointment(
              normalizeAppointment(
                results[8]
                  .value
              )
            );
          }

          /* ===============================================
             ACTIVATION
          =============================================== */

          if (
            results[9]
              .status ===
            "fulfilled"
          ) {
            setActivationReadiness(
              results[9]
                .value ||
              null
            );
          }
        } catch (
          requestError
        ) {
          setError(
            errorMessage(
              requestError,
              "Employee onboarding workspace could not be loaded."
            )
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        employeeId,
      ]
    );

  useEffect(
    () => {
      loadWorkspace();
    },
    [
      loadWorkspace,
    ]
  );

  /* =====================================================
     NOTIFICATION
  ===================================================== */

  const success =
    (
      message
    ) => {
      setNotice(
        message
      );

      window.setTimeout(
        () => {
          setNotice(
            ""
          );
        },
        5000
      );
    };

  const fail =
    (
      requestError,
      fallback
    ) => {
      setModal({
        type:
          "ERROR",

        title:
          "Action could not be completed",

        message:
          errorMessage(
            requestError,
            fallback
          ),
      });
    };

  /* =====================================================
     CHECKLIST
  ===================================================== */

  const backendChecklist =
    onboarding
      ?.checklist ||
    {};

  const accessComplete =
    Boolean(
      employee
        ?.user ||
      access
        ?.user ||
      access
        ?.userId ||
      backendChecklist
        ?.rmsAccess
    );

  const documentsComplete =
    Boolean(
      backendChecklist
        ?.employeeDocuments
    );

  const assetsComplete =
    Boolean(
      backendChecklist
        ?.assets
    );

  const appointmentComplete =
    Boolean(
      backendChecklist
        ?.appointmentLetter ||
      String(
        appointment
          ?.status ||
          ""
      ).toUpperCase() ===
        "ISSUED"
    );

  const welcomeComplete =
    Boolean(
      backendChecklist
        ?.welcomeCommunication ||
      mailStatus
        ?.welcomeSent
    );

  const employeeComplete =
    Boolean(
      employee
        ?._id
    );

  const activationComplete =
    String(
      employee
        ?.status ||
        ""
    ).toUpperCase() ===
      "ACTIVE" &&
    String(
      onboarding
        ?.status ||
        ""
    ).toUpperCase() ===
      "COMPLETED";

  /* =====================================================
     PROGRESS
  ===================================================== */

  const progress =
    useMemo(
      () => {
        /*
         * Prefer backend progress because it is the
         * authoritative final activation calculation.
         */
        if (
          Number.isFinite(
            Number(
              activationReadiness
                ?.progress
            )
          )
        ) {
          return Number(
            activationReadiness
              .progress
          );
        }

        const states = [
          employeeComplete,
          accessComplete,
          documentsComplete,
          assetsComplete,
          appointmentComplete,
          welcomeComplete,
          activationComplete,
        ];

        return Math.round(
          (
            states.filter(
              Boolean
            ).length /
            states.length
          ) *
            100
        );
      },
      [
        activationReadiness,
        employeeComplete,
        accessComplete,
        documentsComplete,
        assetsComplete,
        appointmentComplete,
        welcomeComplete,
        activationComplete,
      ]
    );

  /* =====================================================
     FLOW STATUSES
  ===================================================== */

  const flowStatuses =
    useMemo(
      () => ({
        EMPLOYEE:
          employeeComplete
            ? "COMPLETED"
            : "PENDING",

        ACCESS:
          accessComplete
            ? "COMPLETED"
            : "READY",

        DOCUMENTS:
          documentsComplete
            ? "COMPLETED"
            : documents.length >
                0
              ? "IN_PROGRESS"
              : "READY",

        ASSETS:
          assetsComplete
            ? "COMPLETED"
            : assets.length >
                0
              ? "IN_PROGRESS"
              : "READY",

        APPOINTMENT:
          appointmentComplete
            ? "COMPLETED"
            : appointmentReadiness
                ?.eligible
              ? "READY"
              : "WAITING",

        WELCOME:
          welcomeComplete
            ? "COMPLETED"
            : appointmentComplete
              ? "READY"
              : "PENDING",

        ACTIVATION:
          activationComplete
            ? "COMPLETED"
            : activationReadiness
                ?.ready
              ? "READY"
              : "PENDING",
      }),
      [
        employeeComplete,
        accessComplete,
        documentsComplete,
        documents.length,
        assetsComplete,
        assets.length,
        appointmentComplete,
        appointmentReadiness,
        welcomeComplete,
        activationComplete,
        activationReadiness,
      ]
    );

  /* =====================================================
     ACTIVE STEP
  ===================================================== */

  const activeStep =
    useMemo(
      () => {
        const order = [
          "ACCESS",
          "DOCUMENTS",
          "ASSETS",
          "APPOINTMENT",
          "WELCOME",
          "ACTIVATION",
        ];

        for (
          const key
          of order
        ) {
          if (
            flowStatuses[key] !==
            "COMPLETED"
          ) {
            return key;
          }
        }

        return "ACTIVATION";
      },
      [
        flowStatuses,
      ]
    );

  /* =====================================================
     SCROLL
  ===================================================== */

  const stepRefs = {
    ACCESS:
      accessRef,

    DOCUMENTS:
      documentsRef,

    ASSETS:
      assetsRef,

    APPOINTMENT:
      appointmentRef,

    WELCOME:
      welcomeRef,

    ACTIVATION:
      activationRef,
  };

  const scrollToStep =
    (
      key
    ) => {
      const target =
        stepRefs[
          key
        ]?.current;

      if (
        target
      ) {
        target.scrollIntoView({
          behavior:
            "smooth",

          block:
            "start",
        });
      }
    };

  /* =====================================================
     ACCESS ACTION
  ===================================================== */

  const handleCreateAccess =
    async () => {
      try {
        setBusy(
          "ACCESS"
        );

        /*
         * Prepare access first.
         *
         * If official email is missing, backend will preserve
         * WAITING_FOR_EMAIL instead of creating invalid data.
         */
        await prepareEmployeeAccess(
          employeeId,
          {
            role:
              "EMPLOYEE",
          }
        );

        await createEmployeeRmsAccount(
          employeeId
        );

        /*
         * Access email is a separate controlled mail action.
         */
        try {
          await sendEmployeeAccessMail(
            employeeId
          );
        } catch (
          mailError
        ) {
          /*
           * Account creation should remain successful even if
           * Gmail delivery fails.
           */
          success(
            "SE-RMS account created. Access email is still pending."
          );

          await loadWorkspace(
            true
          );

          setModal({
            type:
              "ERROR",

            title:
              "Account created, email not sent",

            message:
              errorMessage(
                mailError,
                "The SE-RMS account was created successfully, but the access email could not be sent."
              ),
          });

          return;
        }

        success(
          "SE-RMS account created and access email sent."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "SE-RMS access could not be created."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     ACCESS RESEND
  ===================================================== */

  const handleResendAccess =
    async () => {
      try {
        setBusy(
          "ACCESS_MAIL"
        );

        await resendEmployeeAccessMail(
          employeeId
        );

        success(
          "SE-RMS access email resent successfully."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Access communication could not be resent."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     DOCUMENT UPLOAD
  ===================================================== */

  const handleDocumentUpload =
    async (
      file
    ) => {
      try {
        setBusy(
          "DOCUMENT_UPLOAD"
        );

        await uploadEmployeeDocument(
          employeeId,
          {
            file,

            category:
              "ONBOARDING",

            documentType:
              "HR_ONBOARDING_DOCUMENT",

            label:
              file.name,

            description:
              "Uploaded during employee onboarding.",
          }
        );

        success(
          "Employee document uploaded successfully."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Employee document could not be uploaded."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     DOCUMENT OPEN
  ===================================================== */

  const handleOpenDocument =
    async (
      item
    ) => {
      const documentId =
        item?._id ||
        item?.id;

      if (
        !documentId
      ) {
        return;
      }

      try {
        setBusy(
          `OPEN_DOCUMENT_${documentId}`
        );

        await openEmployeeDocument(
          employeeId,
          documentId
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Document could not be opened."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     DOCUMENT DELETE
  ===================================================== */

  const handleDeleteDocument =
    (
      item
    ) => {
      setModal({
        type:
          "DELETE_DOCUMENT",

        document:
          item,
      });
    };

  const confirmDeleteDocument =
    async () => {
      const item =
        modal?.document;

      const documentId =
        item?._id ||
        item?.id;

      if (
        !documentId
      ) {
        return;
      }

      try {
        setBusy(
          "DELETE_DOCUMENT"
        );

        await deleteEmployeeDocument(
          employeeId,
          documentId
        );

        setModal(
          null
        );

        success(
          "Employee document removed."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Employee document could not be removed."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     DOCUMENT VAULT
  ===================================================== */

  const handleOpenDocumentVault =
    () => {
      /*
       * For now keep this inside Employee Detail.
       * When we build a dedicated document sub-view, this
       * navigation can change without touching DocumentsStep.
       */
      navigate(
        `/people/employees/${employeeId}`
      );
    };

  /* =====================================================
     ASSET FORM
  ===================================================== */

  const openAssetForm =
    () => {
      setAssetForm({
        ...INITIAL_ASSET_FORM,

        assetType:
          assetMeta
            ?.assetTypes?.[0] ||
          "LAPTOP",

        conditionAtIssue:
          assetMeta
            ?.conditions?.[0] ||
          "GOOD",
      });

      setModal({
        type:
          "ASSET_FORM",
      });
    };

  const updateAssetForm =
    (
      key,
      value
    ) => {
      setAssetForm(
        (
          previous
        ) => ({
          ...previous,

          [key]:
            value,
        })
      );
    };

  const submitAsset =
    async () => {
      if (
        !assetForm
          .assetName
          .trim()
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Asset information incomplete",

          message:
            "Asset name is required.",
        });

        return;
      }

      try {
        setBusy(
          "ASSET_CREATE"
        );

        await createEmployeeAsset(
          employeeId,
          {
            ...assetForm,

            estimatedValue:
              assetForm
                .estimatedValue ===
              ""
                ? null
                : Number(
                    assetForm
                      .estimatedValue
                  ),
          }
        );

        setModal(
          null
        );

        success(
          "Asset assignment created."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Asset assignment could not be created."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     ASSET HANDOVER
  ===================================================== */

  const handleGenerateAssetForm =
    async (
      asset
    ) => {
      const assetId =
        asset?._id ||
        asset?.id;

      if (
        !assetId
      ) {
        return;
      }

      try {
        setBusy(
          `ASSET_HANDOVER_${assetId}`
        );

        await generateAssetHandover(
          employeeId,
          assetId
        );

        success(
          "Asset handover form generated and stored in the Employee Document Vault."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Asset handover form could not be generated."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  const openAssetHandoverSelection =
    () => {
      if (
        assets.length ===
        0
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "No asset assignment available",

          message:
            "Assign an asset before generating a handover form.",
        });

        return;
      }

      setModal({
        type:
          "ASSET_HANDOVER_SELECT",
      });
    };

  /* =====================================================
     SIGNED ASSET FORM
  ===================================================== */

  const openSignedAssetUpload =
    () => {
      if (
        assets.length ===
        0
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "No asset assignment available",

          message:
            "Assign an asset before uploading a signed acknowledgement.",
        });

        return;
      }

      setSelectedAsset(
        assets[0]
      );

      setModal({
        type:
          "ASSET_SIGNED_UPLOAD",
      });
    };

  const handleSignedAssetFile =
    async (
      file
    ) => {
      const assetId =
        selectedAsset
          ?._id ||
        selectedAsset
          ?.id;

      if (
        !assetId ||
        !file
      ) {
        return;
      }

      try {
        setBusy(
          "ASSET_SIGNED"
        );

        await uploadAssetAcknowledgement(
          employeeId,
          assetId,
          file
        );

        setModal(
          null
        );

        setSelectedAsset(
          null
        );

        success(
          "Signed asset acknowledgement uploaded."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Signed asset acknowledgement could not be uploaded."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     NO ASSET REQUIRED
  ===================================================== */

  const handleNoAssetRequired =
    () => {
      setModal({
        type:
          "NO_ASSET",
      });
    };

  const confirmNoAssetRequired =
    async () => {
      try {
        setBusy(
          "NO_ASSET"
        );

        await markNoAssetRequired(
          employeeId,
          "HR confirmed that no company asset is required for this employee."
        );

        setModal(
          null
        );

        success(
          "Asset formalities completed as No Asset Required."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "No Asset Required could not be confirmed."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     APPOINTMENT
  ===================================================== */

  const handleGenerateAppointment =
    async () => {
      try {
        setBusy(
          "APPOINTMENT"
        );

        await generateAppointment(
          employeeId,
          {
            issueDate:
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                ),
          }
        );

        success(
          "Appointment Letter generated successfully."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Appointment Letter could not be generated."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  const handleReviewAppointment =
    async () => {
      try {
        setBusy(
          "APPOINTMENT_REVIEW"
        );

        await reviewAppointment(
          employeeId
        );

        success(
          "Appointment Letter marked as reviewed."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Appointment Letter could not be reviewed."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  const handleIssueAppointment =
    async () => {
      try {
        setBusy(
          "APPOINTMENT_ISSUE"
        );

        await issueAppointment(
          employeeId
        );

        success(
          "Appointment Letter issued successfully."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Appointment Letter could not be issued."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  const handleAppointmentAction =
    () => {
      const status =
        String(
          appointment
            ?.status ||
            ""
        ).toUpperCase();

      if (
        status ===
        "GENERATED"
      ) {
        handleReviewAppointment();

        return;
      }

      if (
        status ===
        "REVIEWED"
      ) {
        handleIssueAppointment();

        return;
      }

      /*
       * Appointment PDF is stored in EmployeeDocument.
       * For now move to employee profile/document vault.
       */
      navigate(
        `/people/employees/${employeeId}`
      );
    };

  /* =====================================================
     OFFICIAL EMAIL
  ===================================================== */

  const handleOfficialEmail =
    async (
      email
    ) => {
      try {
        setBusy(
          "OFFICIAL_EMAIL"
        );

        await updateEmployeeOfficialEmail(
          employeeId,
          email
        );

        success(
          "Official employee email updated."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Official email could not be updated."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     WELCOME MAIL
  ===================================================== */

  const handleWelcomeMail =
    async () => {
      try {
        setBusy(
          "WELCOME"
        );

        if (
          mailStatus
            ?.welcomeSent
        ) {
          await resendEmployeeWelcomeMail(
            employeeId
          );
        } else {
          await sendEmployeeWelcomeMail(
            employeeId
          );
        }

        success(
          mailStatus
            ?.welcomeSent
            ? "Welcome email resent successfully."
            : "Welcome email sent successfully."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Welcome email could not be sent."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     ACTIVATION CHECKLIST
  ===================================================== */

  const activationChecklist =
    useMemo(
      () => ({
        employee:
          employeeComplete,

        access:
          accessComplete,

        documents:
          documentsComplete,

        assets:
          assetsComplete,

        appointment:
          appointmentComplete,

        welcome:
          welcomeComplete,
      }),
      [
        employeeComplete,
        accessComplete,
        documentsComplete,
        assetsComplete,
        appointmentComplete,
        welcomeComplete,
      ]
    );

  /* =====================================================
     ACTIVATE
  ===================================================== */

  const handleActivate =
    () => {
      setModal({
        type:
          "ACTIVATE",
      });
    };

  const confirmActivate =
    async () => {
      try {
        setBusy(
          "ACTIVATE"
        );

        await activateEmployee(
          employeeId,
          "Final onboarding review completed by HR."
        );

        setModal(
          null
        );

        success(
          "Employee activated successfully. Onboarding is complete."
        );

        await loadWorkspace(
          true
        );
      } catch (
        requestError
      ) {
        fail(
          requestError,
          "Employee activation could not be completed."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     LOADING
  ===================================================== */

  if (
    loading
  ) {
    return (
      <div className="onboarding-page">

        <div className="onboarding-page-loading">

          <div className="onboarding-spinner" />

          <strong>
            Loading Employee Onboarding
          </strong>

          <span>
            Preparing access, documents,
            assets and employee records...
          </span>

        </div>

      </div>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (
    error ||
    !employee
  ) {
    return (
      <div className="onboarding-page">

        <div className="onboarding-page-error">

          <div>
            !
          </div>

          <span>
            WORKSPACE UNAVAILABLE
          </span>

          <h1>
            Employee onboarding could not be opened
          </h1>

          <p>
            {error ||
              "Employee record was not found."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/people/employees"
              )
            }
          >
            Return to Employees
          </button>

        </div>

      </div>
    );
  }

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <div className="onboarding-page">

      {/* =================================================
          NOTICE
      ================================================== */}

      {notice ? (
        <div className="onboarding-toast">

          <span>
            ✓
          </span>

          <strong>
            {notice}
          </strong>

        </div>
      ) : null}

      {/* =================================================
          HEADER
      ================================================== */}

      <OnboardingHeader
        employee={
          employee
        }
        onboarding={
          onboarding
        }
        progress={
          progress
        }
      />

      {/* =================================================
          PROGRESS FLOW
      ================================================== */}

      <div className="onboarding-progress-shell">

        <div className="onboarding-progress-shell-head">

          <div>

            <span>
              ONBOARDING WORKFLOW
            </span>

            <strong>
              Complete the employee journey
            </strong>

          </div>

          <button
            type="button"
            className="onboarding-refresh"
            disabled={
              refreshing
            }
            onClick={() =>
              loadWorkspace(
                true
              )
            }
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh Status"}
          </button>

        </div>

        <OnboardingProgress
          statuses={
            flowStatuses
          }
          activeStep={
            activeStep
          }
          onStepClick={
            scrollToStep
          }
        />

      </div>

      {/* =================================================
          EMPLOYEE CREATED
      ================================================== */}

      <EmployeeSnapshot
        employee={
          employee
        }
      />

      {/* =================================================
          ACCESS
      ================================================== */}

      <div
        ref={
          accessRef
        }
        className="onboarding-step-anchor"
      >

        <AccessStep
          access={
            access
          }
          employee={
            employee
          }
          loading={
            [
              "ACCESS",
              "ACCESS_MAIL",
            ].includes(
              busy
            )
          }
          onCreateAccess={
            handleCreateAccess
          }
          onResendCredentials={
            handleResendAccess
          }
        />

        {!employee
          ?.officialEmail &&
        accessReadiness
          ?.emailMissing ? (
          <div className="onboarding-inline-warning">

            <span>
              !
            </span>

            <div>

              <strong>
                Official email not assigned yet
              </strong>

              <p>
                SE-RMS access can remain prepared
                while HR completes other onboarding
                formalities. Assign the official
                company email before account creation.
              </p>

            </div>

          </div>
        ) : null}

      </div>

      {/* =================================================
          DOCUMENTS
      ================================================== */}

      <div
        ref={
          documentsRef
        }
        className="onboarding-step-anchor"
      >

        <DocumentsStep
          documents={
            documents
          }
          maxDocuments={
            10
          }
          uploading={
            busy ===
            "DOCUMENT_UPLOAD"
          }
          onUpload={
            handleDocumentUpload
          }
          onOpen={
            handleOpenDocument
          }
          onDelete={
            handleDeleteDocument
          }
          onOpenDocumentVault={
            handleOpenDocumentVault
          }
        />

      </div>

      {/* =================================================
          ASSETS
      ================================================== */}

      <div
        ref={
          assetsRef
        }
        className="onboarding-step-anchor"
      >

        <AssetsStep
          assets={
            assets
          }
          loading={
            busy ===
            "ASSET_CREATE"
          }
          onAddAsset={
            openAssetForm
          }
          onPrintForm={
            openAssetHandoverSelection
          }
          onUploadSignedForm={
            openSignedAssetUpload
          }
        />

        {!assetsComplete ? (
          <div className="onboarding-no-asset-bar">

            <div>

              <strong>
                No company asset required?
              </strong>

              <span>
                HR can complete this step without
                assigning an asset when the employee
                does not require one.
              </span>

            </div>

            <button
              type="button"
              disabled={
                busy ===
                "NO_ASSET"
              }
              onClick={
                handleNoAssetRequired
              }
            >
              Mark No Asset Required
            </button>

          </div>
        ) : null}

      </div>

      {/* =================================================
          APPOINTMENT
      ================================================== */}

      <div
        ref={
          appointmentRef
        }
        className="onboarding-step-anchor"
      >

        <AppointmentStep
          appointment={
            appointment
          }
          eligibility={
            appointmentReadiness
          }
          loading={
            busy ===
            "APPOINTMENT"
          }
          onGenerate={
            handleGenerateAppointment
          }
          onDownload={
            handleAppointmentAction
          }
        />

        {appointment ? (
          <div className="onboarding-appointment-control">

            <div>

              <span>
                CURRENT DOCUMENT STATUS
              </span>

              <strong>
                {String(
                  appointment
                    ?.status ||
                    "GENERATED"
                )
                  .replaceAll(
                    "_",
                    " "
                  )}
              </strong>

            </div>

            {String(
              appointment
                ?.status ||
                ""
            ).toUpperCase() ===
            "GENERATED" ? (
              <button
                type="button"
                disabled={
                  busy ===
                  "APPOINTMENT_REVIEW"
                }
                onClick={
                  handleReviewAppointment
                }
              >
                {busy ===
                "APPOINTMENT_REVIEW"
                  ? "Reviewing..."
                  : "Mark Reviewed"}
              </button>
            ) : null}

            {String(
              appointment
                ?.status ||
                ""
            ).toUpperCase() ===
            "REVIEWED" ? (
              <button
                type="button"
                className="is-primary"
                disabled={
                  busy ===
                  "APPOINTMENT_ISSUE"
                }
                onClick={
                  handleIssueAppointment
                }
              >
                {busy ===
                "APPOINTMENT_ISSUE"
                  ? "Issuing..."
                  : "Issue Appointment Letter"}
              </button>
            ) : null}

          </div>
        ) : null}

      </div>

      {/* =================================================
          WELCOME
      ================================================== */}

      <div
        ref={
          welcomeRef
        }
        className="onboarding-step-anchor"
      >

        <WelcomeStep
          employee={
            employee
          }
          mailStatus={
            mailStatus
          }
          loading={
            [
              "OFFICIAL_EMAIL",
              "WELCOME",
            ].includes(
              busy
            )
          }
          onSaveOfficialEmail={
            handleOfficialEmail
          }
          onSendWelcomeMail={
            handleWelcomeMail
          }
        />

      </div>

      {/* =================================================
          ACTIVATION
      ================================================== */}

      <div
        ref={
          activationRef
        }
        className="onboarding-step-anchor"
      >

        <ActivationStep
          employee={
            employee
          }
          checklist={
            activationChecklist
          }
          loading={
            busy ===
            "ACTIVATE"
          }
          onActivate={
            handleActivate
          }
        />

        {activationReadiness
          ?.blocking
          ?.length ? (
          <div className="onboarding-blocking-panel">

            <span>
              ACTIVATION BLOCKERS
            </span>

            <div>

              {activationReadiness
                .blocking
                .map(
                  (
                    item
                  ) => (
                    <strong
                      key={
                        item?.key ||
                        item?.label
                      }
                    >
                      <b>
                        !
                      </b>

                      {item?.label ||
                        item?.key}
                    </strong>
                  )
                )}

            </div>

          </div>
        ) : null}

      </div>

      {/* =================================================
          MODAL
      ================================================== */}

      {modal ? (
        <div className="onboarding-modal-overlay">

          <div
            className={[
              "onboarding-modal",

              modal.type ===
              "ASSET_FORM"
                ? "onboarding-modal--large"
                : "",
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )}
          >

            {/* =============================================
                ERROR
            ============================================== */}

            {modal.type ===
            "ERROR" ? (
              <div className="onboarding-modal-state">

                <div className="onboarding-modal-error">
                  !
                </div>

                <span>
                  ACTION FAILED
                </span>

                <h2>
                  {modal.title}
                </h2>

                <p>
                  {modal.message}
                </p>

                <button
                  type="button"
                  className="onboarding-modal-primary"
                  onClick={() =>
                    setModal(
                      null
                    )
                  }
                >
                  Close
                </button>

              </div>
            ) : null}

            {/* =============================================
                DELETE DOCUMENT
            ============================================== */}

            {modal.type ===
            "DELETE_DOCUMENT" ? (
              <>

                <div className="onboarding-modal-heading">

                  <span>
                    DOCUMENT CONTROL
                  </span>

                  <h2>
                    Remove this document?
                  </h2>

                  <p>
                    This removes the selected file from
                    the employee document record.
                  </p>

                </div>

                <div className="onboarding-modal-document">

                  <strong>
                    {modal
                      ?.document
                      ?.name ||
                      "Employee Document"}
                  </strong>

                  <span>
                    {modal
                      ?.document
                      ?.category ||
                      "Employee Document"}
                  </span>

                </div>

                <div className="onboarding-modal-actions">

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="is-danger"
                    disabled={
                      busy ===
                      "DELETE_DOCUMENT"
                    }
                    onClick={
                      confirmDeleteDocument
                    }
                  >
                    {busy ===
                    "DELETE_DOCUMENT"
                      ? "Removing..."
                      : "Remove Document"}
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                ASSET FORM
            ============================================== */}

            {modal.type ===
            "ASSET_FORM" ? (
              <>

                <div className="onboarding-modal-heading onboarding-modal-heading--dark">

                  <div>

                    <span>
                      COMPANY ASSET
                    </span>

                    <h2>
                      Assign Asset
                    </h2>

                    <p>
                      Add an asset to the employee record.
                      The signed acknowledgement will be
                      stored in the Employee Document Vault.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    ×
                  </button>

                </div>

                <div className="onboarding-asset-form">

                  <label>

                    <span>
                      Asset Type *
                    </span>

                    <select
                      value={
                        assetForm
                          .assetType
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "assetType",
                          event
                            .target
                            .value
                        )
                      }
                    >

                      {(assetMeta
                        ?.assetTypes ||
                        [
                          "LAPTOP",
                          "DESKTOP",
                          "MOBILE",
                          "SIM",
                          "TABLET",
                          "ID_CARD",
                          "OTHER",
                        ])
                        .map(
                          (
                            item
                          ) => (
                            <option
                              key={
                                item
                              }
                              value={
                                item
                              }
                            >
                              {String(
                                item
                              )
                                .replaceAll(
                                  "_",
                                  " "
                                )}
                            </option>
                          )
                        )}

                    </select>

                  </label>

                  <label>

                    <span>
                      Asset Name *
                    </span>

                    <input
                      value={
                        assetForm
                          .assetName
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "assetName",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Dell Latitude 5440"
                    />

                  </label>

                  <label>

                    <span>
                      Asset Code
                    </span>

                    <input
                      value={
                        assetForm
                          .assetCode
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "assetCode",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="LAP-023"
                    />

                  </label>

                  <label>

                    <span>
                      Serial Number
                    </span>

                    <input
                      value={
                        assetForm
                          .serialNumber
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "serialNumber",
                          event
                            .target
                            .value
                        )
                      }
                    />

                  </label>

                  <label>

                    <span>
                      Manufacturer
                    </span>

                    <input
                      value={
                        assetForm
                          .manufacturer
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "manufacturer",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Dell"
                    />

                  </label>

                  <label>

                    <span>
                      Model
                    </span>

                    <input
                      value={
                        assetForm
                          .model
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "model",
                          event
                            .target
                            .value
                        )
                      }
                    />

                  </label>

                  <label>

                    <span>
                      Issue Date *
                    </span>

                    <input
                      type="date"
                      value={
                        assetForm
                          .issueDate
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "issueDate",
                          event
                            .target
                            .value
                        )
                      }
                    />

                  </label>

                  <label>

                    <span>
                      Condition
                    </span>

                    <select
                      value={
                        assetForm
                          .conditionAtIssue
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "conditionAtIssue",
                          event
                            .target
                            .value
                        )
                      }
                    >

                      {(assetMeta
                        ?.conditions ||
                        [
                          "NEW",
                          "GOOD",
                          "USED",
                          "FAIR",
                        ])
                        .map(
                          (
                            item
                          ) => (
                            <option
                              key={
                                item
                              }
                              value={
                                item
                              }
                            >
                              {item}
                            </option>
                          )
                        )}

                    </select>

                  </label>

                  <label>

                    <span>
                      Estimated Value
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        assetForm
                          .estimatedValue
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "estimatedValue",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="75000"
                    />

                  </label>

                  <label>

                    <span>
                      Currency
                    </span>

                    <input
                      value={
                        assetForm
                          .currency
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "currency",
                          event
                            .target
                            .value
                            .toUpperCase()
                        )
                      }
                    />

                  </label>

                  <label className="onboarding-asset-form-span">

                    <span>
                      Remarks
                    </span>

                    <textarea
                      value={
                        assetForm
                          .remarks
                      }
                      onChange={(
                        event
                      ) =>
                        updateAssetForm(
                          "remarks",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Asset issue remarks..."
                    />

                  </label>

                </div>

                <div className="onboarding-modal-actions onboarding-modal-actions--footer">

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="is-primary"
                    disabled={
                      busy ===
                      "ASSET_CREATE"
                    }
                    onClick={
                      submitAsset
                    }
                  >
                    {busy ===
                    "ASSET_CREATE"
                      ? "Assigning..."
                      : "Assign Asset"}
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                ASSET HANDOVER SELECT
            ============================================== */}

            {modal.type ===
            "ASSET_HANDOVER_SELECT" ? (
              <>

                <div className="onboarding-modal-heading">

                  <span>
                    ASSET HANDOVER
                  </span>

                  <h2>
                    Generate Handover Form
                  </h2>

                  <p>
                    Select the asset whose printable
                    acknowledgement should be generated.
                  </p>

                </div>

                <div className="onboarding-modal-asset-list">

                  {assets.map(
                    (
                      asset
                    ) => (
                      <button
                        type="button"
                        key={
                          asset?._id ||
                          asset?.id
                        }
                        onClick={async () => {
                          setModal(
                            null
                          );

                          await handleGenerateAssetForm(
                            asset
                          );
                        }}
                      >

                        <span>
                          {asset
                            ?.assetType ||
                            "ASSET"}
                        </span>

                        <strong>
                          {asset
                            ?.assetName ||
                            "Company Asset"}
                        </strong>

                        <small>
                          {asset
                            ?.assignmentNumber ||
                            asset
                              ?.assetCode ||
                            "No asset code"}
                        </small>

                        <b>
                          →
                        </b>

                      </button>
                    )
                  )}

                </div>

                <div className="onboarding-modal-actions">

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Close
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                SIGNED ACKNOWLEDGEMENT
            ============================================== */}

            {modal.type ===
            "ASSET_SIGNED_UPLOAD" ? (
              <>

                <div className="onboarding-modal-heading">

                  <span>
                    SIGNED ACKNOWLEDGEMENT
                  </span>

                  <h2>
                    Upload Signed Asset Form
                  </h2>

                  <p>
                    Select the asset and upload the signed
                    employee acknowledgement.
                  </p>

                </div>

                <div className="onboarding-signed-asset-form">

                  <label>

                    <span>
                      Asset
                    </span>

                    <select
                      value={
                        selectedAsset
                          ?._id ||
                        selectedAsset
                          ?.id ||
                        ""
                      }
                      onChange={(
                        event
                      ) => {
                        const next =
                          assets.find(
                            (
                              item
                            ) =>
                              String(
                                item
                                  ?._id ||
                                item?.id
                              ) ===
                              String(
                                event
                                  .target
                                  .value
                              )
                          );

                        setSelectedAsset(
                          next ||
                          null
                        );
                      }}
                    >

                      {assets.map(
                        (
                          asset
                        ) => (
                          <option
                            key={
                              asset
                                ?._id ||
                              asset?.id
                            }
                            value={
                              asset
                                ?._id ||
                              asset?.id
                            }
                          >
                            {asset
                              ?.assetName ||
                              "Asset"}
                            {" — "}
                            {asset
                              ?.assetCode ||
                              asset
                                ?.assignmentNumber ||
                              ""}
                          </option>
                        )
                      )}

                    </select>

                  </label>

                  <label className="onboarding-signed-upload">

                    <span>
                      Signed PDF / Image
                    </span>

                    <strong>
                      Choose signed acknowledgement
                    </strong>

                    <small>
                      PDF, JPG or PNG
                    </small>

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={
                        busy ===
                        "ASSET_SIGNED"
                      }
                      onChange={(
                        event
                      ) => {
                        const file =
                          event
                            .target
                            .files?.[0];

                        if (
                          file
                        ) {
                          handleSignedAssetFile(
                            file
                          );
                        }

                        event.target.value =
                          "";
                      }}
                    />

                  </label>

                </div>

                <div className="onboarding-modal-actions">

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                NO ASSET
            ============================================== */}

            {modal.type ===
            "NO_ASSET" ? (
              <>

                <div className="onboarding-modal-state">

                  <div className="onboarding-modal-neutral">
                    ✓
                  </div>

                  <span>
                    ASSET FORMALITY
                  </span>

                  <h2>
                    No Asset Required?
                  </h2>

                  <p>
                    Confirm that this employee does not
                    require a company laptop, phone, SIM,
                    ID device or any other controlled asset.
                  </p>

                </div>

                <div className="onboarding-modal-actions">

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="is-primary"
                    disabled={
                      busy ===
                      "NO_ASSET"
                    }
                    onClick={
                      confirmNoAssetRequired
                    }
                  >
                    {busy ===
                    "NO_ASSET"
                      ? "Confirming..."
                      : "Confirm No Asset Required"}
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                ACTIVATE
            ============================================== */}

            {modal.type ===
            "ACTIVATE" ? (
              <>

                <div className="onboarding-modal-state">

                  <div className="onboarding-modal-success">
                    ✓
                  </div>

                  <span>
                    FINAL ONBOARDING REVIEW
                  </span>

                  <h2>
                    Activate Employee?
                  </h2>

                  <p>
                    This will close the onboarding workflow
                    and move the employee into the active
                    workforce.
                  </p>

                </div>

                <div className="onboarding-activation-confirm">

                  <div>

                    <span>
                      EMPLOYEE
                    </span>

                    <strong>
                      {employee
                        ?.fullName}
                    </strong>

                  </div>

                  <div>

                    <span>
                      EMPLOYEE ID
                    </span>

                    <strong>
                      {employee
                        ?.employeeCode}
                    </strong>

                  </div>

                  <div>

                    <span>
                      COMPLETION
                    </span>

                    <strong>
                      {progress}%
                    </strong>

                  </div>

                </div>

                <div className="onboarding-modal-actions">

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="is-primary"
                    disabled={
                      busy ===
                      "ACTIVATE"
                    }
                    onClick={
                      confirmActivate
                    }
                  >
                    {busy ===
                    "ACTIVATE"
                      ? "Activating..."
                      : "Activate Employee"}
                  </button>

                </div>

              </>
            ) : null}

          </div>

        </div>
      ) : null}

    </div>
  );
}

export default EmployeeOnboardingPage;