import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getCandidatePortal,
  getCandidateDocuments,
  acceptCandidateLoi,
  declineCandidateLoi,
  openCandidateLoi,
  saveCandidateDocumentProfile,
  uploadCandidateDocument,
  openCandidateDocument,
  removeCandidateDocument,
  submitCandidateDocuments,
} from "../../../services/candidatePortalService";

import "./CandidatePortal.css";

/* =========================================================
   DOCUMENT CONFIG
========================================================= */

const DOCUMENT_CONFIG = [
  {
    type: "AADHAAR",
    label: "Aadhaar Card",
    description:
      "Upload a clear copy of your Aadhaar Card.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "PAN",
    label: "PAN Card",
    description:
      "Upload a clear copy of your PAN Card.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "BANK_PROOF",
    label: "Bank Proof / Cancelled Cheque",
    description:
      "Cancelled cheque, passbook page or bank statement showing your account details.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "HIGHEST_QUALIFICATION",
    label: "Highest Qualification",
    description:
      "Degree, diploma or highest qualification certificate.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "PHOTO",
    label: "Photograph",
    description:
      "Recent passport-size photograph. JPG or PNG only.",
    accept:
      ".jpg,.jpeg,.png",
  },

  {
    type: "SIGNATURE",
    label: "Signature",
    description:
      "Clear image of your signature. JPG or PNG only.",
    accept:
      ".jpg,.jpeg,.png",
  },

  {
    type: "EXPERIENCE_LETTER",
    label: "Experience Letter",
    description:
      "Experience certificate from your previous employer.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "RELIEVING_LETTER",
    label: "Relieving Letter",
    description:
      "Relieving letter from your previous employer.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "SALARY_SLIP",
    label: "Latest Salary Slip",
    description:
      "Latest salary slip from your previous/current employer.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "PREVIOUS_APPOINTMENT_LETTER",
    label: "Previous Appointment Letter",
    description:
      "Previous employer appointment letter.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "FORM16",
    label: "Form 16",
    description:
      "Latest Form 16 / TDS certificate, if available.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },

  {
    type: "OTHER",
    label: "Other Supporting Document",
    description:
      "Any other relevant employment or joining document.",
    accept:
      ".pdf,.jpg,.jpeg,.png",
  },
];

/* =========================================================
   QUERY FIELD MAP

   Keys exactly match backend fieldQueries.
========================================================= */

const QUERY_FIELD_LABELS = {
  currentAddress:
    "Current Address",

  permanentAddress:
    "Permanent Address",

  dateOfBirth:
    "Date of Birth",

  emergencyContactNumber:
    "Emergency Contact Number",

  previousCompany:
    "Previous / Current Company",

  previousDesignation:
    "Previous / Current Designation",

  lastWorkingDate:
    "Last Working Date",

  accountHolderName:
    "Account Holder Name",

  bankName:
    "Bank Name",

  accountNumber:
    "Account Number",

  ifscCode:
    "IFSC Code",

  branch:
    "Bank Branch",
};

/* =========================================================
   HELPERS
========================================================= */

const extractToken =
  () => {
    const parts =
      window.location.pathname
        .split("/")
        .filter(Boolean);

    const index =
      parts.indexOf(
        "selection"
      );

    if (
      index === -1 ||
      !parts[
        index + 1
      ]
    ) {
      return "";
    }

    return decodeURIComponent(
      parts[
        index + 1
      ]
    );
  };

const formatDate =
  (
    value
  ) => {
    if (
      !value
    ) {
      return "—";
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "long",

          year:
            "numeric",
        }
      )
      .format(
        date
      );
  };

const formatDateTime =
  (
    value
  ) => {
    if (
      !value
    ) {
      return "—";
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",

          hour12:
            true,
        }
      )
      .format(
        date
      );
  };

const formatBytes =
  (
    value
  ) => {
    const bytes =
      Number(
        value ||
          0
      );

    if (
      !bytes
    ) {
      return "";
    }

    if (
      bytes <
      1024 *
        1024
    ) {
      return `${Math.max(
        1,
        Math.round(
          bytes /
            1024
        )
      )} KB`;
    }

    return `${(
      bytes /
      (
        1024 *
        1024
      )
    ).toFixed(
      1
    )} MB`;
  };

const findDocument =
  (
    documents,
    type
  ) =>
    (
      documents ||
      []
    ).find(
      (
        item
      ) =>
        item.type ===
        type
    );

const candidateFirstName =
  (
    name
  ) =>
    String(
      name ||
        "Candidate"
    )
      .trim()
      .split(
        /\s+/
      )[0] ||
    "Candidate";

const cleanDigits =
  (
    value,
    max
  ) =>
    String(
      value ||
        ""
    )
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        max
      );

const createEmptyProfile =
  () => ({
    personal: {
      currentAddress:
        "",

      permanentAddress:
        "",

      dateOfBirth:
        "",

      emergencyContactNumber:
        "",
    },

    employment: {
      isFresher:
        null,

      previousCompany:
        "",

      previousDesignation:
        "",

      lastWorkingDate:
        "",
    },

    bank: {
      accountHolderName:
        "",

      bankName:
        "",

      accountNumber:
        "",

      confirmAccountNumber:
        "",

      ifscCode:
        "",

      branch:
        "",
    },
  });

const parseServerError =
  (
    error,
    fallback
  ) =>
    error
      ?.response
      ?.data
      ?.message ||
    error
      ?.message ||
    fallback;

/* =========================================================
   PAGE
========================================================= */

function CandidateSelectionPortal() {
  const token =
    useMemo(
      () =>
        extractToken(),
      []
    );

  /* =====================================================
     DATA
  ===================================================== */

  const [
    portal,
    setPortal,
  ] =
    useState(
      null
    );

  const [
    documentData,
    setDocumentData,
  ] =
    useState(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
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
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    declineReason,
    setDeclineReason,
  ] =
    useState(
      ""
    );

  const [
    declaration,
    setDeclaration,
  ] =
    useState(
      false
    );

  /* =====================================================
     PROFILE
  ===================================================== */

  const [
    profile,
    setProfile,
  ] =
    useState(
      createEmptyProfile
    );

  /* =====================================================
     SAVE STATE
  ===================================================== */

  const [
    saveState,
    setSaveState,
  ] =
    useState({
      status:
        "IDLE",

      message:
        "",
    });

  const [
    fieldErrors,
    setFieldErrors,
  ] =
    useState({});

  /* =====================================================
     UPLOAD STATE
  ===================================================== */

  const [
    uploadProgress,
    setUploadProgress,
  ] =
    useState({});

  /* =====================================================
     REFS
  ===================================================== */

  const hydratedRef =
    useRef(
      false
    );

  const autosaveTimerRef =
    useRef(
      null
    );

  const saveInFlightRef =
    useRef(
      false
    );

  const pendingAutosaveRef =
    useRef(
      false
    );

  const lastSavedPayloadRef =
    useRef(
      ""
    );

  /* =====================================================
     APPLY DOCUMENT RECORD TO FORM
  ===================================================== */

  const applyDocumentRecord =
    useCallback(
      (
        docs,
        {
          markAsSaved =
            true,
        } = {}
      ) => {
        const record =
          docs?.record ||
          {};

        const nextProfile = {
          personal: {
            currentAddress:
              record
                ?.personal
                ?.currentAddress ||
              "",

            permanentAddress:
              record
                ?.personal
                ?.permanentAddress ||
              "",

            dateOfBirth:
              record
                ?.personal
                ?.dateOfBirth
                ? String(
                    record
                      .personal
                      .dateOfBirth
                  ).slice(
                    0,
                    10
                  )
                : "",

            emergencyContactNumber:
              cleanDigits(
                record
                  ?.personal
                  ?.emergencyContactNumber,
                10
              ),
          },

          employment: {
            isFresher:
              typeof
                record
                  ?.employment
                  ?.isFresher ===
              "boolean"
                ? record
                    .employment
                    .isFresher
                : null,

            previousCompany:
              record
                ?.employment
                ?.previousCompany ||
              "",

            previousDesignation:
              record
                ?.employment
                ?.previousDesignation ||
              "",

            lastWorkingDate:
              record
                ?.employment
                ?.lastWorkingDate
                ? String(
                    record
                      .employment
                      .lastWorkingDate
                  ).slice(
                    0,
                    10
                  )
                : "",
          },

          bank: {
            accountHolderName:
              record
                ?.bank
                ?.accountHolderName ||
              "",

            bankName:
              record
                ?.bank
                ?.bankName ||
              "",

            accountNumber:
              record
                ?.bank
                ?.accountNumber ||
              "",

            confirmAccountNumber:
              record
                ?.bank
                ?.accountNumber ||
              "",

            ifscCode:
              record
                ?.bank
                ?.ifscCode ||
              "",

            branch:
              record
                ?.bank
                ?.branch ||
              "",
          },
        };

        setProfile(
          nextProfile
        );

        if (
          markAsSaved
        ) {
          lastSavedPayloadRef.current =
            JSON.stringify({
              personal: {
                currentAddress:
                  nextProfile
                    .personal
                    .currentAddress,

                permanentAddress:
                  nextProfile
                    .personal
                    .permanentAddress,

                dateOfBirth:
                  nextProfile
                    .personal
                    .dateOfBirth,

                emergencyContactNumber:
                  nextProfile
                    .personal
                    .emergencyContactNumber,
              },

              employment: {
                previousCompany:
                  nextProfile
                    .employment
                    .previousCompany,

                previousDesignation:
                  nextProfile
                    .employment
                    .previousDesignation,

                lastWorkingDate:
                  nextProfile
                    .employment
                    .lastWorkingDate,
              },

              bank: {
                accountHolderName:
                  nextProfile
                    .bank
                    .accountHolderName,

                bankName:
                  nextProfile
                    .bank
                    .bankName,

                accountNumber:
                  nextProfile
                    .bank
                    .accountNumber,

                ifscCode:
                  nextProfile
                    .bank
                    .ifscCode,

                branch:
                  nextProfile
                    .bank
                    .branch,
              },
            });
        }

        hydratedRef.current =
          true;
      },
      []
    );

  /* =====================================================
     LOAD PORTAL
  ===================================================== */

  const loadPortal =
    useCallback(
      async () => {
        if (
          !token
        ) {
          setError(
            "This candidate portal link is incomplete."
          );

          setLoading(
            false
          );

          return;
        }

        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const result =
            await getCandidatePortal(
              token
            );

          setPortal(
            result
          );

          const step =
            result
              ?.workflow
              ?.step;

          if (
            [
              "DOCUMENTS",
              "DOCUMENTS_UNDER_VERIFICATION",
              "DOCUMENTS_VERIFIED",
            ].includes(
              step
            )
          ) {
            try {
              const docs =
                await getCandidateDocuments(
                  token
                );

              setDocumentData(
                docs
              );

              applyDocumentRecord(
                docs
              );
            } catch (
              documentError
            ) {
              if (
                step ===
                "DOCUMENTS"
              ) {
                throw documentError;
              }
            }
          }
        } catch (
          err
        ) {
          setError(
            parseServerError(
              err,
              "This candidate portal could not be loaded."
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        token,
        applyDocumentRecord,
      ]
    );

  useEffect(
    () => {
      loadPortal();
    },
    [
      loadPortal,
    ]
  );

  /* =====================================================
     CLEAN AUTOSAVE TIMER
  ===================================================== */

  useEffect(
    () => {
      return () => {
        if (
          autosaveTimerRef
            .current
        ) {
          window.clearTimeout(
            autosaveTimerRef
              .current
          );
        }
      };
    },
    []
  );

  /* =====================================================
     PORTAL DERIVED
  ===================================================== */

  const candidate =
    portal?.candidate ||
    {};

  const selection =
    portal?.selection ||
    {};

  const workflow =
    portal?.workflow ||
    {};

  const loi =
    portal?.loi ||
    {};

  const firstName =
    candidateFirstName(
      candidate
        ?.fullName
    );

  const record =
    documentData
      ?.record ||
    {};

  const documents =
    record
      ?.documents ||
    portal
      ?.documents
      ?.items ||
    [];

  const activeFieldQueries =
    record
      ?.fieldQueries &&
    typeof
      record
        .fieldQueries ===
      "object"
      ? record
          .fieldQueries
      : {};

  const generalQueryMessage =
    record
      ?.generalQueryMessage ||
    "";

  const isCorrectionMode =
    selection
      ?.status ===
      "DOCUMENT_QUERY" ||
    record
      ?.status ===
      "QUERY";

  /* =====================================================
     QUERY HELPERS
  ===================================================== */

  const isFieldQueried =
    (
      key
    ) =>
      Boolean(
        isCorrectionMode &&
        activeFieldQueries[
          key
        ]
      );

  const isDocumentQueried =
    (
      document
    ) =>
      Boolean(
        isCorrectionMode &&
        document
          ?.status ===
          "QUERY"
      );

  /* =====================================================
     LOI
  ===================================================== */

  const viewLoi =
    async () => {
      try {
        setBusy(
          true
        );

        await openCandidateLoi(
          token
        );
      } catch (
        err
      ) {
        setError(
          parseServerError(
            err,
            "Letter of Intent could not be opened."
          )
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  const confirmAccept =
    async () => {
      try {
        setBusy(
          true
        );

        setModal({
          type:
            "PROCESSING",

          title:
            "Confirming acceptance...",
        });

        await acceptCandidateLoi(
          token
        );

        setModal({
          type:
            "ACCEPT_SUCCESS",
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Acceptance could not be recorded",

          message:
            parseServerError(
              err,
              "Please try again or contact HR."
            ),
        });
      } finally {
        setBusy(
          false
        );
      }
    };

  const continueAfterAcceptance =
    async () => {
      setModal(
        null
      );

      await loadPortal();
    };

  const confirmDecline =
    async () => {
      try {
        setBusy(
          true
        );

        setModal({
          type:
            "PROCESSING",

          title:
            "Recording your response...",
        });

        await declineCandidateLoi(
          token,
          declineReason
        );

        setModal({
          type:
            "DECLINE_SUCCESS",
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Response could not be recorded",

          message:
            parseServerError(
              err,
              "Please try again."
            ),
        });
      } finally {
        setBusy(
          false
        );
      }
    };

  /* =====================================================
     FIELD ERROR HELPERS
  ===================================================== */

  const clearFieldError =
    (
      key
    ) => {
      setFieldErrors(
        (
          previous
        ) => {
          if (
            !previous[
              key
            ]
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next[
            key
          ];

          return next;
        }
      );
    };

  const clearBankServerErrors =
    () => {
      setFieldErrors(
        (
          previous
        ) => {
          const next = {
            ...previous,
          };

          delete next
            .bankName;

          delete next
            .accountNumber;

          delete next
            .ifscCode;

          delete next
            .branch;

          delete next
            .bankGeneral;

          return next;
        }
      );
    };

  /* =====================================================
     UPDATE PROFILE
  ===================================================== */

  const updatePersonal =
    (
      key,
      value
    ) => {
      clearFieldError(
        key
      );

      setProfile(
        (
          previous
        ) => ({
          ...previous,

          personal: {
            ...previous.personal,

            [key]:
              value,
          },
        })
      );

      setSaveState({
        status:
          "DIRTY",

        message:
          "Changes waiting to save",
      });
    };

  const updateEmployment =
    (
      key,
      value
    ) => {
      clearFieldError(
        key
      );

      setProfile(
        (
          previous
        ) => ({
          ...previous,

          employment: {
            ...previous.employment,

            [key]:
              value,
          },
        })
      );

      setSaveState({
        status:
          "DIRTY",

        message:
          "Changes waiting to save",
      });
    };

  const updateBank =
    (
      key,
      value
    ) => {
      clearBankServerErrors();

      setProfile(
        (
          previous
        ) => ({
          ...previous,

          bank: {
            ...previous.bank,

            [key]:
              value,
          },
        })
      );

      setSaveState({
        status:
          "DIRTY",

        message:
          "Changes waiting to save",
      });
    };

  /* =====================================================
     BASIC VALIDATION
  ===================================================== */

  const emergencyContactValid =
    /^\d{10}$/.test(
      String(
        profile
          .personal
          .emergencyContactNumber ||
          ""
      )
    );

  const accountNumberValid =
    /^[0-9]{6,30}$/.test(
      String(
        profile
          .bank
          .accountNumber ||
          ""
      )
    );

  const accountMatches =
    Boolean(
      profile
        .bank
        .accountNumber &&
      profile
        .bank
        .accountNumber ===
        profile
          .bank
          .confirmAccountNumber
    );

  const ifscValid =
    /^[A-Z]{4}0[A-Z0-9]{6}$/.test(
      String(
        profile
          .bank
          .ifscCode ||
          ""
      )
        .trim()
        .toUpperCase()
    );

  /* =====================================================
     CREATE SAVE PAYLOAD
  ===================================================== */

  const buildSavePayload =
    useCallback(
      () => {
        const emergencyNumber =
          cleanDigits(
            profile
              .personal
              .emergencyContactNumber,
            10
          );

        return {
          personal: {
            currentAddress:
              profile
                .personal
                .currentAddress,

            permanentAddress:
              profile
                .personal
                .permanentAddress,

            dateOfBirth:
              profile
                .personal
                .dateOfBirth,

            emergencyContactNumber:
              emergencyNumber,
          },

          /*
           * Backend remains authoritative for isFresher.
           */
          employment: {
            previousCompany:
              profile
                .employment
                .previousCompany,

            previousDesignation:
              profile
                .employment
                .previousDesignation,

            lastWorkingDate:
              profile
                .employment
                .lastWorkingDate,
          },

          bank: {
            accountHolderName:
              profile
                .bank
                .accountHolderName,

            bankName:
              profile
                .bank
                .bankName,

            accountNumber:
              profile
                .bank
                .accountNumber,

            ifscCode:
              profile
                .bank
                .ifscCode
                .trim()
                .toUpperCase(),

            branch:
              profile
                .bank
                .branch,
          },
        };
      },
      [
        profile,
      ]
    );

  /* =====================================================
     CLASSIFY BACKEND SAVE ERROR
  ===================================================== */

  const applySaveError =
    (
      message
    ) => {
      const normalized =
        String(
          message ||
            ""
        )
          .toLowerCase();

      if (
        normalized.includes(
          "emergency"
        )
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            emergencyContactNumber:
              message,
          })
        );

        return;
      }

      if (
        normalized.includes(
          "account number"
        )
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            accountNumber:
              message,
          })
        );

        return;
      }

      if (
        normalized.includes(
          "ifsc"
        )
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            ifscCode:
              message,

            bankGeneral:
              message,
          })
        );

        return;
      }

      if (
        normalized.includes(
          "bank name"
        )
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            bankName:
              message,

            bankGeneral:
              message,
          })
        );

        return;
      }

      if (
        normalized.includes(
          "branch"
        )
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            branch:
              message,

            bankGeneral:
              message,
          })
        );
      }
    };

  /* =====================================================
     SAVE PROFILE

     No visible Save button.

     Used by:
     - automatic background save
     - final submission save
  ===================================================== */

  const saveProfile =
    useCallback(
      async ({
        showState =
          true,

        refresh =
          false,
      } = {}) => {
        if (
          !token
        ) {
          return null;
        }

        const payload =
          buildSavePayload();

        const serialized =
          JSON.stringify(
            payload
          );

        if (
          serialized ===
          lastSavedPayloadRef
            .current
        ) {
          if (
            showState
          ) {
            setSaveState({
              status:
                "SAVED",

              message:
                "All changes saved",
            });
          }

          return documentData;
        }

        /*
         * Prevent two simultaneous autosaves.
         */
        if (
          saveInFlightRef
            .current
        ) {
          pendingAutosaveRef
            .current =
            true;

          return null;
        }

        try {
          saveInFlightRef
            .current =
            true;

          setError(
            ""
          );

          if (
            showState
          ) {
            setSaveState({
              status:
                "SAVING",

              message:
                "Saving changes...",
            });
          }

          const saved =
            await saveCandidateDocumentProfile(
              token,
              payload
            );

          lastSavedPayloadRef
            .current =
            serialized;

          clearBankServerErrors();

          if (
            showState
          ) {
            setSaveState({
              status:
                "SAVED",

              message:
                "All changes saved",
            });
          }

          if (
            refresh
          ) {
            const refreshed =
              await getCandidateDocuments(
                token
              );

            setDocumentData(
              refreshed
            );

            return refreshed;
          }

          return saved;
        } catch (
          err
        ) {
          const message =
            parseServerError(
              err,
              "Your information could not be saved."
            );

          applySaveError(
            message
          );

          if (
            showState
          ) {
            setSaveState({
              status:
                "ERROR",

              message,
            });
          }

          throw err;
        } finally {
          saveInFlightRef
            .current =
            false;

          if (
            pendingAutosaveRef
              .current
          ) {
            pendingAutosaveRef
              .current =
              false;

            window.setTimeout(
              () => {
                saveProfile({
                  showState:
                    true,

                  refresh:
                    false,
                }).catch(
                  () => {}
                );
              },
              150
            );
          }
        }
      },
      [
        token,
        buildSavePayload,
        documentData,
      ]
    );

  /* =====================================================
     AUTO SAVE

     Wait until candidate stops typing.

     Invalid unfinished fields are not sent until they reach
     a valid shape.
  ===================================================== */

  useEffect(
    () => {
      if (
        !hydratedRef
          .current
      ) {
        return;
      }

      if (
        workflow.step !==
        "DOCUMENTS"
      ) {
        return;
      }

      const payload =
        buildSavePayload();

      const serialized =
        JSON.stringify(
          payload
        );

      if (
        serialized ===
        lastSavedPayloadRef
          .current
      ) {
        return;
      }

      /*
       * Don't send known-invalid partial values while user
       * is still typing.
       */
      const emergency =
        profile
          .personal
          .emergencyContactNumber;

      if (
        emergency &&
        !emergencyContactValid
      ) {
        return;
      }

      const account =
        profile
          .bank
          .accountNumber;

      if (
        account &&
        !accountNumberValid
      ) {
        return;
      }

      const ifsc =
        profile
          .bank
          .ifscCode;

      if (
        ifsc &&
        ifsc.length ===
          11 &&
        !ifscValid
      ) {
        return;
      }

      if (
        ifsc &&
        ifsc.length > 0 &&
        ifsc.length <
          11
      ) {
        return;
      }

      if (
        autosaveTimerRef
          .current
      ) {
        window.clearTimeout(
          autosaveTimerRef
            .current
        );
      }

      setSaveState({
        status:
          "DIRTY",

        message:
          "Changes waiting to save",
      });

      autosaveTimerRef
        .current =
        window.setTimeout(
          () => {
            saveProfile({
              showState:
                true,

              refresh:
                false,
            }).catch(
              () => {}
            );
          },
          1000
        );

      return () => {
        if (
          autosaveTimerRef
            .current
        ) {
          window.clearTimeout(
            autosaveTimerRef
              .current
          );
        }
      };
    },
    [
      profile,
      workflow.step,
      buildSavePayload,
      saveProfile,
      emergencyContactValid,
      accountNumberValid,
      ifscValid,
    ]
  );

  /* =====================================================
     UPLOAD
  ===================================================== */

  const handleUpload =
    async (
      type,
      file
    ) => {
      if (
        !file
      ) {
        return;
      }

      const config =
        DOCUMENT_CONFIG.find(
          (
            item
          ) =>
            item.type ===
            type
        );

      /*
       * Immediate frontend rule for photo/signature.
       */
      if (
        [
          "PHOTO",
          "SIGNATURE",
        ].includes(
          type
        ) &&
        ![
          "image/jpeg",
          "image/jpg",
          "image/png",
        ].includes(
          String(
            file.type ||
              ""
          ).toLowerCase()
        )
      ) {
        setUploadProgress(
          (
            previous
          ) => ({
            ...previous,

            [type]: {
              status:
                "FAILED",

              progress:
                0,

              message:
                `${config?.label || "This document"} must be uploaded as a JPG or PNG image.`,
            },
          })
        );

        return;
      }

      if (
        file.size >
        10 *
          1024 *
          1024
      ) {
        setUploadProgress(
          (
            previous
          ) => ({
            ...previous,

            [type]: {
              status:
                "FAILED",

              progress:
                0,

              message:
                "Maximum file size is 10 MB.",
            },
          })
        );

        return;
      }

      try {
        setError(
          ""
        );

        /*
         * Bank proof should be validated against latest
         * entered account details.
         */
        if (
          type ===
          "BANK_PROOF"
        ) {
          if (
            profile
              .bank
              .accountNumber &&
            (
              !accountNumberValid ||
              !accountMatches
            )
          ) {
            throw new Error(
              "Please correct and confirm your Bank Account Number before uploading Bank Proof."
            );
          }

          if (
            profile
              .bank
              .ifscCode &&
            !ifscValid
          ) {
            throw new Error(
              "Please enter a valid IFSC Code before uploading Bank Proof."
            );
          }

          /*
           * Make sure backend has current bank values before
           * OCR cross-checks the uploaded proof.
           */
          await saveProfile({
            showState:
              true,

            refresh:
              false,
          });
        }

        setUploadProgress(
          (
            previous
          ) => ({
            ...previous,

            [type]: {
              status:
                "UPLOADING",

              progress:
                0,

              message:
                "",
            },
          })
        );

        await uploadCandidateDocument(
          token,
          type,
          file,
          (
            percent
          ) => {
            setUploadProgress(
              (
                previous
              ) => ({
                ...previous,

                [type]: {
                  status:
                    "UPLOADING",

                  progress:
                    percent,

                  message:
                    percent >=
                    100
                      ? "Upload complete. SE-RMS is scanning and validating this document..."
                      : "Uploading securely...",
                },
              })
            );
          }
        );

        /*
         * Backend has now completed:
         * - fingerprint
         * - duplicate check
         * - OCR/text extraction
         * - document type validation
         * - applicable bank-proof cross-check
         */

        const refreshed =
          await getCandidateDocuments(
            token
          );

        setDocumentData(
          refreshed
        );

        setUploadProgress(
          (
            previous
          ) => ({
            ...previous,

            [type]: {
              status:
                "COMPLETE",

              progress:
                100,

              message:
                "Document passed the automatic validation checks.",
            },
          })
        );

        window.setTimeout(
          () => {
            setUploadProgress(
              (
                previous
              ) => {
                if (
                  previous[
                    type
                  ]?.status !==
                  "COMPLETE"
                ) {
                  return previous;
                }

                const next = {
                  ...previous,
                };

                delete next[
                  type
                ];

                return next;
              }
            );
          },
          5000
        );
      } catch (
        err
      ) {
        const message =
          parseServerError(
            err,
            "Document could not be uploaded."
          );

        setUploadProgress(
          (
            previous
          ) => ({
            ...previous,

            [type]: {
              status:
                "FAILED",

              progress:
                0,

              message,
            },
          })
        );
      }
    };

  /* =====================================================
     REMOVE DOCUMENT
  ===================================================== */

  const removeDocument =
    async (
      documentId,
      type
    ) => {
      try {
        setBusy(
          true
        );

        setError(
          ""
        );

        await removeCandidateDocument(
          token,
          documentId
        );

        setUploadProgress(
          (
            previous
          ) => {
            const next = {
              ...previous,
            };

            delete next[
              type
            ];

            return next;
          }
        );

        const refreshed =
          await getCandidateDocuments(
            token
          );

        setDocumentData(
          refreshed
        );
      } catch (
        err
      ) {
        setError(
          parseServerError(
            err,
            "Document could not be removed."
          )
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  /* =====================================================
     DOCUMENT REQUIREMENTS
  ===================================================== */

  const isFresher =
    profile
      ?.employment
      ?.isFresher;

  const requiredTypes =
    useMemo(
      () => {
        const fromBackend =
          documentData
            ?.requirements
            ?.requiredDocuments;

        if (
          Array.isArray(
            fromBackend
          ) &&
          fromBackend.length
        ) {
          return fromBackend;
        }

        const required = [
          "AADHAAR",
          "PAN",
          "BANK_PROOF",
          "HIGHEST_QUALIFICATION",
          "PHOTO",
          "SIGNATURE",
        ];

        if (
          isFresher ===
          false
        ) {
          required.push(
            "EXPERIENCE_LETTER",
            "RELIEVING_LETTER",
            "SALARY_SLIP",
            "PREVIOUS_APPOINTMENT_LETTER"
          );
        }

        return required;
      },
      [
        documentData,
        isFresher,
      ]
    );

  const visibleDocumentConfig =
    useMemo(
      () =>
        DOCUMENT_CONFIG.filter(
          (
            item
          ) => {
            if (
              isFresher ===
                true &&
              [
                "EXPERIENCE_LETTER",
                "RELIEVING_LETTER",
                "SALARY_SLIP",
                "PREVIOUS_APPOINTMENT_LETTER",
              ].includes(
                item.type
              )
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        isFresher,
      ]
    );

  const requiredDocumentsComplete =
    requiredTypes.every(
      (
        type
      ) =>
        Boolean(
          findDocument(
            documents,
            type
          )
        )
    );

  const personalComplete =
    Boolean(
      profile
        .personal
        .currentAddress &&
      profile
        .personal
        .dateOfBirth &&
      emergencyContactValid
    );

  const employmentComplete =
    typeof isFresher ===
      "boolean";

  const bankComplete =
    Boolean(
      profile
        .bank
        .accountHolderName &&
      profile
        .bank
        .bankName &&
      accountNumberValid &&
      accountMatches &&
      ifscValid &&
      !fieldErrors
        .bankGeneral
    );

  const profileComplete =
    personalComplete &&
    employmentComplete;

  const canSubmit =
    profileComplete &&
    bankComplete &&
    requiredDocumentsComplete &&
    declaration &&
    saveState.status !==
      "SAVING";

  /* =====================================================
     CORRECTION COUNTS
  ===================================================== */

  const queriedFieldKeys =
    Object.keys(
      activeFieldQueries
    ).filter(
      (
        key
      ) =>
        Boolean(
          activeFieldQueries[
            key
          ]
        )
    );

  const queriedDocuments =
    documents.filter(
      (
        document
      ) =>
        isDocumentQueried(
          document
        )
    );

  const correctionCount =
    queriedFieldKeys.length +
    queriedDocuments.length;

  /* =====================================================
     FINAL SUBMIT VALIDATION
  ===================================================== */

  const validateBeforeSubmit =
    () => {
      setError(
        ""
      );

      if (
        !profile
          .personal
          .currentAddress
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            currentAddress:
              "Please enter your complete current address.",
          })
        );

        setError(
          "Please complete the highlighted information before submitting."
        );

        return false;
      }

      if (
        !profile
          .personal
          .dateOfBirth
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            dateOfBirth:
              "Please enter your date of birth.",
          })
        );

        setError(
          "Please complete the highlighted information before submitting."
        );

        return false;
      }

      if (
        !emergencyContactValid
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            emergencyContactNumber:
              "Please enter exactly 10 digits.",
          })
        );

        setError(
          "Please enter a valid 10-digit emergency contact number."
        );

        return false;
      }

      if (
        typeof isFresher !==
        "boolean"
      ) {
        setError(
          "Employment profile could not be determined. Please contact HR."
        );

        return false;
      }

      if (
        !profile
          .bank
          .accountHolderName ||
        !profile
          .bank
          .bankName
      ) {
        setError(
          "Please complete your bank details."
        );

        return false;
      }

      if (
        !accountNumberValid
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            accountNumber:
              "Please enter a valid numeric bank account number.",
          })
        );

        setError(
          "Please check your bank account number."
        );

        return false;
      }

      if (
        !accountMatches
      ) {
        setError(
          "Bank Account Number and Confirm Account Number do not match."
        );

        return false;
      }

      if (
        !ifscValid
      ) {
        setFieldErrors(
          (
            previous
          ) => ({
            ...previous,

            ifscCode:
              "Please enter a valid 11-character IFSC Code.",
          })
        );

        setError(
          "Please check your IFSC Code."
        );

        return false;
      }

      if (
        !requiredDocumentsComplete
      ) {
        const missing =
          requiredTypes
            .filter(
              (
                type
              ) =>
                !findDocument(
                  documents,
                  type
                )
            )
            .map(
              (
                type
              ) =>
                DOCUMENT_CONFIG.find(
                  (
                    config
                  ) =>
                    config.type ===
                    type
                )
                  ?.label ||
                type
            );

        setError(
          `Please upload all mandatory documents: ${missing.join(
            ", "
          )}.`
        );

        return false;
      }

      if (
        !declaration
      ) {
        setError(
          "Please confirm the declaration before submitting."
        );

        return false;
      }

      return true;
    };

  /* =====================================================
     OPEN SUBMIT CONFIRM

     Final server-side save here also catches:
     - Bank vs IFSC mismatch
     - Bank Proof mismatch
     - other backend validation
  ===================================================== */

  const openSubmitConfirm =
    async () => {
      if (
        !validateBeforeSubmit()
      ) {
        return;
      }

      try {
        setBusy(
          true
        );

        await saveProfile({
          showState:
            true,

          refresh:
            false,
        });

        setModal({
          type:
            "SUBMIT_CONFIRM",
        });
      } catch (
        err
      ) {
        const message =
          parseServerError(
            err,
            "Please correct the highlighted information."
          );

        setError(
          message
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  /* =====================================================
     SUBMIT DOCUMENTS
  ===================================================== */

  const submitDocuments =
    async () => {
      try {
        setBusy(
          true
        );

        setModal({
          type:
            "PROCESSING",

          title:
            isCorrectionMode
              ? "Resubmitting your corrections..."
              : "Submitting your documents...",
        });

        /*
         * Final save before workflow transition.
         */
        await saveProfile({
          showState:
            false,

          refresh:
            false,
        });

        const result =
          await submitCandidateDocuments(
            token
          );

        setModal({
          type:
            "DOCUMENT_SUCCESS",

          data:
            result,
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            isCorrectionMode
              ? "Corrections could not be submitted"
              : "Documents could not be submitted",

          message:
            parseServerError(
              err,
              "Please review the required information and try again."
            ),
        });
      } finally {
        setBusy(
          false
        );
      }
    };

  /* =====================================================
     BASE STATES
  ===================================================== */

  if (
    loading
  ) {
    return (
      <div className="candidate-portal-loading">

        <div className="candidate-portal-spinner" />

        <strong>
          Opening your secure candidate portal...
        </strong>

        <span>
          Please wait a moment.
        </span>

      </div>
    );
  }

  if (
    error &&
    !portal
  ) {
    return (
      <div className="candidate-portal-invalid">

        <div>
          !
        </div>

        <h1>
          Link unavailable
        </h1>

        <p>
          {error}
        </p>

        <span>
          Please contact the People & Culture team if you need a new secure link.
        </span>

      </div>
    );
  }

  /* =====================================================
     FIELD WRAPPER HELPERS
  ===================================================== */

  const fieldClass =
    (
      key
    ) => {
      const classes =
        [];

      if (
        isFieldQueried(
          key
        )
      ) {
        classes.push(
          "candidate-field-query"
        );
      }

      if (
        fieldErrors[
          key
        ]
      ) {
        classes.push(
          "candidate-field-invalid"
        );
      }

      return classes.join(
        " "
      );
    };

  const renderQueryNote =
    (
      key
    ) => {
      if (
        !isFieldQueried(
          key
        )
      ) {
        return null;
      }

      return (
        <small className="candidate-query-field-note">
          <b>!</b>
          HR requested correction of this field.
        </small>
      );
    };

  const renderFieldError =
    (
      key
    ) => {
      if (
        !fieldErrors[
          key
        ]
      ) {
        return null;
      }

      return (
        <small className="candidate-field-error">
          {fieldErrors[
            key
          ]}
        </small>
      );
    };

  /* =====================================================
     LOI SCREEN
  ===================================================== */

  const renderLoi =
    () => (
      <main className="candidate-portal-main candidate-portal-main--narrow">

        <section className="candidate-welcome">

          <span>
            YOUR SELECTION
          </span>

          <h1>
            Congratulations,{" "}
            {firstName}.
          </h1>

          <p>
            We are pleased to move forward with your application for the position below.
          </p>

        </section>

        <section className="candidate-loi-card">

          <div className="candidate-loi-card-top">

            <div>

              <span>
                LETTER OF INTENT
              </span>

              <h2>
                Review your LOI
              </h2>

            </div>

            <div className="candidate-loi-status">
              Awaiting Response
            </div>

          </div>

          <div className="candidate-loi-details">

            <div>
              <span>
                Position
              </span>

              <strong>
                {selection
                  ?.positionTitle ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Department
              </span>

              <strong>
                {selection
                  ?.department ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Office
              </span>

              <strong>
                {selection
                  ?.officeLocation ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Proposed Joining
              </span>

              <strong>
                {formatDate(
                  selection
                    ?.proposedJoiningDate
                )}
              </strong>
            </div>

            <div>
              <span>
                Reference
              </span>

              <strong>
                {loi
                  ?.documentNumber ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Issue Date
              </span>

              <strong>
                {formatDate(
                  loi
                    ?.issueDate
                )}
              </strong>
            </div>

          </div>

          <button
            type="button"
            className="candidate-view-loi"
            onClick={
              viewLoi
            }
            disabled={
              busy
            }
          >

            <span>
              PDF
            </span>

            <div>

              <strong>
                View Letter of Intent
              </strong>

              <small>
                Open and review the complete document
              </small>

            </div>

            <b>
              →
            </b>

          </button>

          <div className="candidate-loi-note">
            Please review the Letter of Intent carefully before submitting your response.
          </div>

          <div className="candidate-loi-actions">

            <button
              type="button"
              className="candidate-decline-button"
              onClick={() =>
                setModal({
                  type:
                    "DECLINE",
                })
              }
            >
              Decline
            </button>

            <button
              type="button"
              className="candidate-primary-button"
              onClick={() =>
                setModal({
                  type:
                    "ACCEPT_CONFIRM",
                })
              }
            >
              Accept LOI
            </button>

          </div>

        </section>

      </main>
    );

  /* =====================================================
     DOCUMENT SCREEN
  ===================================================== */

  const renderDocuments =
    () => (
      <main className="candidate-portal-main">

        {/* =================================================
            HEADING
        ================================================== */}

        <section className="candidate-doc-heading">

          <div>

            <span>
              {isCorrectionMode
                ? "CORRECTION REQUEST"
                : "PRE-JOINING DOCUMENTATION"}
            </span>

            <h1>
              {isCorrectionMode
                ? `Action required, ${firstName}.`
                : `Welcome, ${firstName}.`}
            </h1>

            <p>
              {isCorrectionMode
                ? "Our People & Culture team reviewed your submission and requested corrections to the highlighted items below."
                : "Your Letter of Intent has been accepted. Complete the information below for HR verification."}
            </p>

          </div>

          <div
            className={
              isCorrectionMode
                ? "candidate-doc-status candidate-doc-status--query"
                : "candidate-doc-status"
            }
          >

            <strong>
              {isCorrectionMode
                ? `${correctionCount} Correction${
                    correctionCount ===
                    1
                      ? ""
                      : "s"
                  } Requested`
                : "LOI Accepted"}
            </strong>

            <span>
              {isCorrectionMode
                ? "Correct highlighted items and resubmit"
                : "Next: Document Verification"}
            </span>

          </div>

        </section>

        {/* =================================================
            HR QUERY MESSAGE
        ================================================== */}

        {isCorrectionMode ? (
          <section className="candidate-hr-query-banner">

            <div className="candidate-hr-query-icon">
              !
            </div>

            <div className="candidate-hr-query-content">

              <span>
                MESSAGE FROM PEOPLE & CULTURE
              </span>

              <h2>
                Please update the highlighted items
              </h2>

              <p>
                {generalQueryMessage ||
                  "Please review the fields and documents marked in red, make the required corrections, and submit them again for verification."}
              </p>

              <div className="candidate-hr-query-summary">

                {queriedFieldKeys.length >
                0 ? (
                  <div>

                    <strong>
                      Information
                    </strong>

                    <span>
                      {queriedFieldKeys
                        .map(
                          (
                            key
                          ) =>
                            QUERY_FIELD_LABELS[
                              key
                            ] ||
                            key
                        )
                        .join(
                          " · "
                        )}
                    </span>

                  </div>
                ) : null}

                {queriedDocuments.length >
                0 ? (
                  <div>

                    <strong>
                      Documents
                    </strong>

                    <span>
                      {queriedDocuments
                        .map(
                          (
                            document
                          ) =>
                            DOCUMENT_CONFIG.find(
                              (
                                config
                              ) =>
                                config.type ===
                                document.type
                            )
                              ?.label ||
                            document.type
                        )
                        .join(
                          " · "
                        )}
                    </span>

                  </div>
                ) : null}

              </div>

            </div>

          </section>
        ) : null}

        {/* =================================================
            GENERAL FORM ERROR
        ================================================== */}

        {error ? (
          <div className="candidate-form-error">

            <strong>
              Please check the information below
            </strong>

            <span>
              {error}
            </span>

          </div>
        ) : null}

        {/* =================================================
            PERSONAL INFORMATION
        ================================================== */}

        <section className="candidate-form-card">

          <div className="candidate-form-card-header">

            <span>
              01
            </span>

            <div>

              <h2>
                Personal Information
              </h2>

              <p>
                Review your registered details and complete the required information.
              </p>

            </div>

          </div>

          <div className="candidate-form-grid">

            <label>

              <span>
                Full Name
              </span>

              <input
                value={
                  candidate
                    ?.fullName ||
                  ""
                }
                disabled
              />

            </label>

            <label>

              <span>
                Email Address
              </span>

              <input
                value={
                  candidate
                    ?.email ||
                  ""
                }
                disabled
              />

            </label>

            <label>

              <span>
                Registered Mobile
              </span>

              <input
                value={
                  candidate
                    ?.mobile ||
                  ""
                }
                disabled
              />

            </label>

            <label
              className={
                fieldClass(
                  "dateOfBirth"
                )
              }
            >

              <span>
                Date of Birth *
              </span>

              <input
                type="date"
                value={
                  profile
                    .personal
                    .dateOfBirth
                }
                onChange={(
                  event
                ) =>
                  updatePersonal(
                    "dateOfBirth",
                    event
                      .target
                      .value
                  )
                }
              />

              {renderQueryNote(
                "dateOfBirth"
              )}

              {renderFieldError(
                "dateOfBirth"
              )}

            </label>

            <label
              className={`candidate-form-span-2 ${fieldClass(
                "currentAddress"
              )}`}
            >

              <span>
                Current Address *
              </span>

              <textarea
                placeholder="Enter your complete current residential address"
                value={
                  profile
                    .personal
                    .currentAddress
                }
                onChange={(
                  event
                ) =>
                  updatePersonal(
                    "currentAddress",
                    event
                      .target
                      .value
                  )
                }
              />

              {renderQueryNote(
                "currentAddress"
              )}

              {renderFieldError(
                "currentAddress"
              )}

            </label>

            <label
              className={`candidate-form-span-2 ${fieldClass(
                "permanentAddress"
              )}`}
            >

              <span>
                Permanent Address
              </span>

              <textarea
                placeholder="Enter permanent address, if different"
                value={
                  profile
                    .personal
                    .permanentAddress
                }
                onChange={(
                  event
                ) =>
                  updatePersonal(
                    "permanentAddress",
                    event
                      .target
                      .value
                  )
                }
              />

              {renderQueryNote(
                "permanentAddress"
              )}

              {renderFieldError(
                "permanentAddress"
              )}

            </label>

            <label
              className={`candidate-form-span-2 ${fieldClass(
                "emergencyContactNumber"
              )}`}
            >

              <span>
                Emergency Contact Number *
              </span>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter exactly 10 digits"
                value={
                  profile
                    .personal
                    .emergencyContactNumber
                }
                onChange={(
                  event
                ) => {
                  const value =
                    cleanDigits(
                      event
                        .target
                        .value,
                      10
                    );

                  updatePersonal(
                    "emergencyContactNumber",
                    value
                  );
                }}
              />

              {renderQueryNote(
                "emergencyContactNumber"
              )}

              {profile
                .personal
                .emergencyContactNumber &&
              !emergencyContactValid ? (
                <small className="candidate-field-error">
                  Please enter exactly 10 digits.
                </small>
              ) : null}

              {renderFieldError(
                "emergencyContactNumber"
              )}

            </label>

          </div>

        </section>

        {/* =================================================
            EMPLOYMENT
        ================================================== */}

        <section className="candidate-form-card">

          <div className="candidate-form-card-header">

            <span>
              02
            </span>

            <div>

              <h2>
                Employment Background
              </h2>

              <p>
                Your employment category is automatically taken from your recruitment profile.
              </p>

            </div>

          </div>

          <div className="candidate-employment-summary">

            <div
              className={
                isFresher
                  ? "candidate-employment-badge candidate-employment-badge--fresher"
                  : "candidate-employment-badge candidate-employment-badge--experienced"
              }
            >

              <span>
                {typeof isFresher !==
                "boolean"
                  ? "?"
                  : isFresher
                    ? "F"
                    : "E"}
              </span>

              <div>

                <small>
                  EMPLOYMENT PROFILE
                </small>

                <strong>
                  {typeof isFresher !==
                  "boolean"
                    ? "Employment status unavailable"
                    : isFresher
                      ? "Fresher"
                      : "Experienced Professional"}
                </strong>

                <p>
                  This status is verified automatically from your recruitment profile.
                </p>

              </div>

              {typeof isFresher ===
              "boolean" ? (
                <b>
                  Verified
                </b>
              ) : null}

            </div>

          </div>

          {isFresher ===
          false ? (
            <div className="candidate-form-grid candidate-form-grid--employment">

              <label
                className={
                  fieldClass(
                    "previousCompany"
                  )
                }
              >

                <span>
                  Previous / Current Company
                </span>

                <input
                  value={
                    profile
                      .employment
                      .previousCompany
                  }
                  onChange={(
                    event
                  ) =>
                    updateEmployment(
                      "previousCompany",
                      event
                        .target
                        .value
                    )
                  }
                />

                {renderQueryNote(
                  "previousCompany"
                )}

                {renderFieldError(
                  "previousCompany"
                )}

              </label>

              <label
                className={
                  fieldClass(
                    "previousDesignation"
                  )
                }
              >

                <span>
                  Previous / Current Designation
                </span>

                <input
                  value={
                    profile
                      .employment
                      .previousDesignation
                  }
                  onChange={(
                    event
                  ) =>
                    updateEmployment(
                      "previousDesignation",
                      event
                        .target
                        .value
                    )
                  }
                />

                {renderQueryNote(
                  "previousDesignation"
                )}

                {renderFieldError(
                  "previousDesignation"
                )}

              </label>

              <label
                className={
                  fieldClass(
                    "lastWorkingDate"
                  )
                }
              >

                <span>
                  Last Working Date
                </span>

                <input
                  type="date"
                  value={
                    profile
                      .employment
                      .lastWorkingDate
                  }
                  onChange={(
                    event
                  ) =>
                    updateEmployment(
                      "lastWorkingDate",
                      event
                        .target
                        .value
                    )
                  }
                />

                {renderQueryNote(
                  "lastWorkingDate"
                )}

                {renderFieldError(
                  "lastWorkingDate"
                )}

              </label>

            </div>
          ) : null}

        </section>

        {/* =================================================
            DOCUMENTS
        ================================================== */}

        <section className="candidate-form-card">

          <div className="candidate-form-card-header">

            <span>
              03
            </span>

            <div>

              <h2>
                Documents
              </h2>

              <p>
                Documents are automatically checked for file quality, duplicate uploads and expected document type before acceptance.
              </p>

            </div>

          </div>

          <div className="candidate-document-security-note">

            <div>
              ✦
            </div>

            <div>

              <strong>
                Automatic document validation
              </strong>

              <span>
                Aadhaar, PAN, bank proof and employment documents are checked before they are accepted. Photograph and Signature must be JPG or PNG images.
              </span>

            </div>

          </div>

          <div className="candidate-document-grid">

            {visibleDocumentConfig.map(
              (
                config
              ) => {
                const uploaded =
                  findDocument(
                    documents,
                    config.type
                  );

                const progress =
                  uploadProgress[
                    config.type
                  ];

                const required =
                  requiredTypes.includes(
                    config.type
                  );

                const queried =
                  isDocumentQueried(
                    uploaded
                  );

                const failed =
                  progress
                    ?.status ===
                  "FAILED";

                const complete =
                  progress
                    ?.status ===
                  "COMPLETE";

                const scanned =
                  uploaded
                    ?.scan
                    ?.scanned ===
                  true;

                return (
                  <article
                    key={
                      config.type
                    }
                    className={
                      `candidate-upload-card ${
                        uploaded
                          ? "is-uploaded"
                          : ""
                      } ${
                        queried
                          ? "is-query"
                          : ""
                      } ${
                        failed
                          ? "is-invalid"
                          : ""
                      }`
                    }
                  >

                    <div className="candidate-upload-top">

                      <div>

                        <span>
                          {required
                            ? "REQUIRED"
                            : "OPTIONAL"}
                        </span>

                        <h3>
                          {config.label}
                        </h3>

                        <p>
                          {config.description}
                        </p>

                      </div>

                      {queried ? (
                        <div className="candidate-upload-query-icon">
                          !
                        </div>
                      ) : uploaded ? (
                        <div className="candidate-upload-check">
                          ✓
                        </div>
                      ) : null}

                    </div>

                    {/* =====================================
                        HR QUERY
                    ====================================== */}

                    {queried ? (
                      <div className="candidate-document-query-note">

                        <strong>
                          Replacement requested
                        </strong>

                        <span>
                          HR has requested a corrected copy of this document.
                        </span>

                      </div>
                    ) : null}

                    {/* =====================================
                        UPLOADING / SCANNING
                    ====================================== */}

                    {progress
                      ?.status ===
                    "UPLOADING" ? (
                      <div className="candidate-upload-progress">

                        <div>

                          <span>
                            {progress
                              .progress >=
                            100
                              ? "Scanning & validating..."
                              : "Uploading securely..."}
                          </span>

                          <strong>
                            {progress
                              .progress >=
                            100
                              ? "Checking"
                              : `${progress.progress}%`}
                          </strong>

                        </div>

                        <div className="candidate-upload-track">

                          <div
                            className={
                              progress
                                .progress >=
                              100
                                ? "is-scanning"
                                : ""
                            }
                            style={{
                              width:
                                progress
                                  .progress >=
                                100
                                  ? "100%"
                                  : `${progress.progress}%`,
                            }}
                          />

                        </div>

                        {progress.message ? (
                          <p className="candidate-scan-progress-message">
                            {progress.message}
                          </p>
                        ) : null}

                      </div>
                    ) : uploaded ? (
                      <div className="candidate-uploaded-file">

                        <div className="candidate-uploaded-file-info">

                          <div>
                            FILE
                          </div>

                          <span>

                            <strong>
                              {uploaded
                                .originalName}
                            </strong>

                            <small>
                              {formatBytes(
                                uploaded
                                  .size
                              )}

                              {uploaded
                                ?.version
                                ? ` · Version ${uploaded.version}`
                                : ""}
                            </small>

                          </span>

                        </div>

                        {/* =================================
                            SCAN RESULT
                        ================================== */}

                        {!queried ? (
                          <div className="candidate-document-scan-result">

                            <span>
                              ✓
                            </span>

                            <div>

                              <strong>
                                {scanned
                                  ? "Automatic validation passed"
                                  : "File stored securely"}
                              </strong>

                              <small>
                                {scanned
                                  ? "Document accepted by SE-RMS validation."
                                  : "This supporting document will be reviewed by HR."}
                              </small>

                            </div>

                          </div>
                        ) : null}

                        <div className="candidate-upload-actions">

                          <button
                            type="button"
                            onClick={() =>
                              openCandidateDocument(
                                token,
                                uploaded._id
                              )
                            }
                          >
                            Open
                          </button>

                          <label
                            className={
                              queried
                                ? "candidate-replace-query"
                                : ""
                            }
                          >

                            {queried
                              ? "Upload Correct File"
                              : "Replace"}

                            <input
                              type="file"
                              accept={
                                config.accept
                              }
                              onChange={(
                                event
                              ) => {
                                const file =
                                  event
                                    .target
                                    .files?.[0];

                                event.target.value =
                                  "";

                                handleUpload(
                                  config.type,
                                  file
                                );
                              }}
                            />

                          </label>

                          <button
                            type="button"
                            className="candidate-remove-file"
                            onClick={() =>
                              removeDocument(
                                uploaded._id,
                                config.type
                              )
                            }
                            disabled={
                              busy
                            }
                          >
                            Remove
                          </button>

                        </div>

                      </div>
                    ) : (
                      <label className="candidate-upload-drop">

                        <span>
                          Upload File
                        </span>

                        <small>
                          {[
                            "PHOTO",
                            "SIGNATURE",
                          ].includes(
                            config.type
                          )
                            ? "JPG or PNG · Max 10 MB"
                            : "PDF, JPG or PNG · Max 10 MB"}
                        </small>

                        <input
                          type="file"
                          accept={
                            config.accept
                          }
                          onChange={(
                            event
                          ) => {
                            const file =
                              event
                                .target
                                .files?.[0];

                            event.target.value =
                              "";

                            handleUpload(
                              config.type,
                              file
                            );
                          }}
                        />

                      </label>
                    )}

                    {/* =====================================
                        SUCCESS MESSAGE
                    ====================================== */}

                    {complete ? (
                      <div className="candidate-upload-success-message">

                        <span>
                          ✓
                        </span>

                        <div>

                          <strong>
                            Document accepted
                          </strong>

                          <p>
                            {progress.message}
                          </p>

                        </div>

                      </div>
                    ) : null}

                    {/* =====================================
                        VALIDATION FAILURE
                    ====================================== */}

                    {failed ? (
                      <div className="candidate-upload-validation">

                        <span>
                          !
                        </span>

                        <div>

                          <strong>
                            Upload not accepted
                          </strong>

                          <p>
                            {progress.message}
                          </p>

                          <small>
                            Please select the correct document and try again.
                          </small>

                        </div>

                      </div>
                    ) : null}

                  </article>
                );
              }
            )}

          </div>

        </section>

        {/* =================================================
            BANK
        ================================================== */}

        <section
          className={
            fieldErrors
              .bankGeneral
              ? "candidate-form-card candidate-bank-card has-error"
              : "candidate-form-card candidate-bank-card"
          }
        >

          <div className="candidate-form-card-header">

            <span>
              04
            </span>

            <div>

              <h2>
                Bank Details
              </h2>

              <p>
                These details will be used for payroll processing after joining and may be cross-checked against your Bank Proof.
              </p>

            </div>

          </div>

          {fieldErrors
            .bankGeneral ? (
            <div className="candidate-bank-alert">

              <span>
                !
              </span>

              <div>

                <strong>
                  Bank details need attention
                </strong>

                <p>
                  {fieldErrors
                    .bankGeneral}
                </p>

              </div>

            </div>
          ) : null}

          <div className="candidate-form-grid">

            <label
              className={
                fieldClass(
                  "accountHolderName"
                )
              }
            >

              <span>
                Account Holder Name *
              </span>

              <input
                value={
                  profile
                    .bank
                    .accountHolderName
                }
                onChange={(
                  event
                ) =>
                  updateBank(
                    "accountHolderName",
                    event
                      .target
                      .value
                  )
                }
              />

              {renderQueryNote(
                "accountHolderName"
              )}

              {renderFieldError(
                "accountHolderName"
              )}

            </label>

            <label
              className={
                fieldClass(
                  "bankName"
                )
              }
            >

              <span>
                Bank Name *
              </span>

              <input
                placeholder="e.g. HDFC Bank"
                value={
                  profile
                    .bank
                    .bankName
                }
                onChange={(
                  event
                ) =>
                  updateBank(
                    "bankName",
                    event
                      .target
                      .value
                  )
                }
              />

              {renderQueryNote(
                "bankName"
              )}

              {renderFieldError(
                "bankName"
              )}

            </label>

            <label
              className={
                fieldClass(
                  "accountNumber"
                )
              }
            >

              <span>
                Account Number *
              </span>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={30}
                placeholder="Enter account number"
                value={
                  profile
                    .bank
                    .accountNumber
                }
                onChange={(
                  event
                ) =>
                  updateBank(
                    "accountNumber",
                    cleanDigits(
                      event
                        .target
                        .value,
                      30
                    )
                  )
                }
              />

              {renderQueryNote(
                "accountNumber"
              )}

              {profile
                .bank
                .accountNumber &&
              !accountNumberValid ? (
                <small className="candidate-field-error">
                  Account number must contain 6–30 digits.
                </small>
              ) : null}

              {renderFieldError(
                "accountNumber"
              )}

            </label>

            <label>

              <span>
                Confirm Account Number *
              </span>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={30}
                placeholder="Re-enter account number"
                value={
                  profile
                    .bank
                    .confirmAccountNumber
                }
                onChange={(
                  event
                ) =>
                  updateBank(
                    "confirmAccountNumber",
                    cleanDigits(
                      event
                        .target
                        .value,
                      30
                    )
                  )
                }
              />

              {profile
                .bank
                .confirmAccountNumber &&
              !accountMatches ? (
                <small className="candidate-field-error">
                  Account numbers do not match.
                </small>
              ) : null}

            </label>

            <label
              className={
                fieldClass(
                  "ifscCode"
                )
              }
            >

              <span>
                IFSC Code *
              </span>

              <input
                maxLength={11}
                placeholder="e.g. HDFC0001234"
                value={
                  profile
                    .bank
                    .ifscCode
                }
                onChange={(
                  event
                ) =>
                  updateBank(
                    "ifscCode",
                    event
                      .target
                      .value
                      .replace(
                        /[^A-Za-z0-9]/g,
                        ""
                      )
                      .toUpperCase()
                      .slice(
                        0,
                        11
                      )
                  )
                }
              />

              {renderQueryNote(
                "ifscCode"
              )}

              {profile
                .bank
                .ifscCode &&
              profile
                .bank
                .ifscCode
                .length ===
                11 &&
              !ifscValid ? (
                <small className="candidate-field-error">
                  Enter a valid IFSC such as HDFC0001234.
                </small>
              ) : null}

              {renderFieldError(
                "ifscCode"
              )}

            </label>

            <label
              className={
                fieldClass(
                  "branch"
                )
              }
            >

              <span>
                Branch
              </span>

              <input
                placeholder="Enter branch name/location"
                value={
                  profile
                    .bank
                    .branch
                }
                onChange={(
                  event
                ) =>
                  updateBank(
                    "branch",
                    event
                      .target
                      .value
                  )
                }
              />

              {renderQueryNote(
                "branch"
              )}

              {renderFieldError(
                "branch"
              )}

            </label>

          </div>

          <div className="candidate-bank-security-note">

            <span>
              i
            </span>

            <div>

              <strong>
                Bank details are cross-checked
              </strong>

              <p>
                SE-RMS validates the IFSC format and may compare your entered details with readable information from the uploaded Bank Proof.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            FINAL REVIEW
        ================================================== */}

        <section className="candidate-review-card">

          <div className="candidate-review-heading">

            <span>
              05 · FINAL REVIEW
            </span>

            <h2>
              {isCorrectionMode
                ? "Review your corrections"
                : "Review before submission"}
            </h2>

            <p>
              {isCorrectionMode
                ? "After resubmission, the corrected information and documents will return to the People & Culture team for verification."
                : "Your information and uploaded documents will be sent securely to the People & Culture team for verification."}
            </p>

          </div>

          <div className="candidate-review-list">

            <div
              className={
                profileComplete
                  ? "is-complete"
                  : ""
              }
            >

              <span>
                Personal & Employment
              </span>

              <strong>
                {profileComplete
                  ? "Complete"
                  : "Check Details"}
              </strong>

            </div>

            <div
              className={
                requiredDocumentsComplete
                  ? "is-complete"
                  : ""
              }
            >

              <span>
                Mandatory Documents
              </span>

              <strong>
                {requiredDocumentsComplete
                  ? "Complete"
                  : "Pending"}
              </strong>

            </div>

            <div
              className={
                bankComplete
                  ? "is-complete"
                  : ""
              }
            >

              <span>
                Bank Details
              </span>

              <strong>
                {bankComplete
                  ? "Complete"
                  : "Check Details"}
              </strong>

            </div>

            <div>

              <span>
                Files Uploaded
              </span>

              <strong>
                {documents.length}
              </strong>

            </div>

          </div>

          {/* =================================================
              AUTO SAVE STATUS
          ================================================== */}

          <div
            className={
              `candidate-autosave-strip ${
                saveState.status ===
                "SAVED"
                  ? "is-saved"
                  : saveState.status ===
                      "ERROR"
                    ? "is-error"
                    : saveState.status ===
                        "SAVING"
                      ? "is-saving"
                      : ""
              }`
            }
          >

            <div
              className={
                `candidate-autosave-icon ${
                  saveState.status ===
                  "SAVING"
                    ? "is-spinning"
                    : ""
                }`
              }
            >
              {saveState.status ===
              "SAVING"
                ? "↻"
                : saveState.status ===
                    "ERROR"
                  ? "!"
                  : "✓"}
            </div>

            <div>

              <strong>
                {saveState.status ===
                "SAVING"
                  ? "Saving automatically"
                  : saveState.status ===
                      "ERROR"
                    ? "Automatic save needs attention"
                    : saveState.status ===
                        "DIRTY"
                      ? "Changes detected"
                      : "Automatic saving enabled"}
              </strong>

              <span>
                {saveState.status ===
                "ERROR"
                  ? saveState.message
                  : saveState.status ===
                      "SAVING"
                    ? "Please continue. Your changes are being saved securely."
                    : saveState.status ===
                        "DIRTY"
                      ? "Your changes will be saved automatically."
                      : "Your information is saved securely as you complete this form."}
              </span>

            </div>

          </div>

          <label className="candidate-declaration">

            <input
              type="checkbox"
              checked={
                declaration
              }
              onChange={(
                event
              ) =>
                setDeclaration(
                  event
                    .target
                    .checked
                )
              }
            />

            <span>
              I confirm that the information and documents provided by me are complete, genuine and correct to the best of my knowledge.
            </span>

          </label>

          <div className="candidate-review-actions candidate-review-actions--autosave">

            <div className="candidate-final-security">

              <span>
                🔒
              </span>

              <div>

                <strong>
                  Secure submission
                </strong>

                <small>
                  Information is saved automatically. No separate Save button is required.
                </small>

              </div>

            </div>

            <button
              type="button"
              className="candidate-primary-button candidate-submit-button"
              onClick={
                openSubmitConfirm
              }
              disabled={
                !canSubmit ||
                busy
              }
            >
              {isCorrectionMode
                ? "Resubmit Corrections →"
                : "Submit Documents →"}
            </button>

          </div>

        </section>

      </main>
    );

  /* =====================================================
     VERIFICATION
  ===================================================== */

  const renderVerification =
    () => (
      <main className="candidate-portal-main candidate-portal-main--narrow">

        <section className="candidate-verification-card">

          <div className="candidate-verification-icon">
            ✓
          </div>

          <span>
            PRE-JOINING
          </span>

          <h1>
            Your documents are with our HR team.
          </h1>

          <p>
            Thank you,{" "}
            {firstName}. Your information and documents were submitted successfully.
          </p>

          <div className="candidate-verification-status">

            <span>
              CURRENT STATUS
            </span>

            <strong>
              Under HR Verification
            </strong>

            <small>
              No action is required from you currently.
            </small>

          </div>

          <div className="candidate-verification-timeline">

            <div className="is-complete">

              <b>
                ✓
              </b>

              <span>
                LOI Accepted
              </span>

            </div>

            <div className="is-complete">

              <b>
                ✓
              </b>

              <span>
                Documents Submitted
              </span>

            </div>

            <div className="is-active">

              <b>
                3
              </b>

              <span>
                HR Verification
              </span>

            </div>

            <div>

              <b>
                4
              </b>

              <span>
                Offer
              </span>

            </div>

          </div>

          {portal
            ?.documents
            ?.submittedAt ? (
            <div className="candidate-submitted-time">
              Submitted{" "}
              {formatDateTime(
                portal
                  .documents
                  .submittedAt
              )}
            </div>
          ) : null}

          <p className="candidate-verification-footnote">
            If any clarification or replacement document is required, our People & Culture team will send you a secure correction link.
          </p>

        </section>

      </main>
    );

  /* =====================================================
     DECLINED
  ===================================================== */

  const renderDeclined =
    () => (
      <main className="candidate-portal-main candidate-portal-main--narrow">

        <section className="candidate-declined-card">

          <div>
            ✓
          </div>

          <span>
            RESPONSE RECORDED
          </span>

          <h1>
            Thank you for letting us know.
          </h1>

          <p>
            Your response regarding the Letter of Intent has been recorded successfully.
          </p>

          <small>
            If you need any assistance, please contact the People & Culture team.
          </small>

        </section>

      </main>
    );

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <div className="candidate-portal-page">

      <header className="candidate-portal-header">

        <div className="candidate-portal-brand">

          <div className="candidate-brand-mark">
            SE
          </div>

          <div>

            <strong>
              SANDEEP
            </strong>

            <span>
              EDGE TECH
            </span>

          </div>

        </div>

        <div className="candidate-secure-label">
          🔒 Secure Candidate Portal
        </div>

      </header>

      <div className="candidate-progress-bar">

        <div
          style={{
            width:
              `${
                workflow
                  ?.progressPercent ||
                25
              }%`,
          }}
        />

      </div>

      {workflow.step ===
      "LOI_RESPONSE"
        ? renderLoi()
        : workflow.step ===
            "DOCUMENTS"
          ? renderDocuments()
          : workflow.step ===
              "DOCUMENTS_UNDER_VERIFICATION"
            ? renderVerification()
            : workflow.step ===
                "DOCUMENTS_VERIFIED"
              ? renderVerification()
              : workflow.step ===
                  "LOI_DECLINED"
                ? renderDeclined()
                : renderVerification()}

      <footer className="candidate-portal-footer">

        <strong>
          Sandeep Edge Tech
        </strong>

        <span>
          People & Culture · Secure Recruitment Portal
        </span>

      </footer>

      {/* =================================================
          MODALS
      ================================================== */}

      {modal ? (
        <div className="candidate-modal-overlay">

          <div className="candidate-modal">

            {/* =============================================
                ACCEPT
            ============================================== */}

            {modal.type ===
            "ACCEPT_CONFIRM" ? (
              <>

                <div className="candidate-modal-symbol candidate-modal-symbol--success">
                  ✓
                </div>

                <div className="candidate-modal-content">

                  <span>
                    LETTER OF INTENT
                  </span>

                  <h2>
                    Accept Letter of Intent?
                  </h2>

                  <p>
                    I confirm that I have reviewed the Letter of Intent and wish to continue with the employment process.
                  </p>

                </div>

                <div className="candidate-modal-actions">

                  <button
                    type="button"
                    className="candidate-modal-secondary"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Not Now
                  </button>

                  <button
                    type="button"
                    className="candidate-modal-primary"
                    onClick={
                      confirmAccept
                    }
                  >
                    Confirm Acceptance
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                DECLINE
            ============================================== */}

            {modal.type ===
            "DECLINE" ? (
              <>

                <div className="candidate-modal-content candidate-modal-content--left">

                  <span>
                    LETTER OF INTENT
                  </span>

                  <h2>
                    Decline Letter of Intent?
                  </h2>

                  <p>
                    You may optionally share a short reason with our People & Culture team.
                  </p>

                  <label className="candidate-decline-reason">

                    <span>
                      Reason (Optional)
                    </span>

                    <textarea
                      value={
                        declineReason
                      }
                      onChange={(
                        event
                      ) =>
                        setDeclineReason(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="You may share your reason here..."
                    />

                  </label>

                </div>

                <div className="candidate-modal-actions">

                  <button
                    type="button"
                    className="candidate-modal-secondary"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Go Back
                  </button>

                  <button
                    type="button"
                    className="candidate-modal-danger"
                    onClick={
                      confirmDecline
                    }
                  >
                    Confirm Decline
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                SUBMIT CONFIRM
            ============================================== */}

            {modal.type ===
            "SUBMIT_CONFIRM" ? (
              <>

                <div className="candidate-modal-symbol candidate-modal-symbol--document">
                  ↑
                </div>

                <div className="candidate-modal-content">

                  <span>
                    {isCorrectionMode
                      ? "CORRECTION SUBMISSION"
                      : "FINAL SUBMISSION"}
                  </span>

                  <h2>
                    {isCorrectionMode
                      ? "Resubmit your corrections?"
                      : "Submit your documents?"}
                  </h2>

                  <p>
                    {isCorrectionMode
                      ? "Your corrected information and replacement documents will be returned to our People & Culture team for verification."
                      : "Please confirm that the information and documents provided are complete and correct. They will be sent securely to our People & Culture team for verification."}
                  </p>

                </div>

                <div className="candidate-modal-actions">

                  <button
                    type="button"
                    className="candidate-modal-secondary"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Review Again
                  </button>

                  <button
                    type="button"
                    className="candidate-modal-primary"
                    onClick={
                      submitDocuments
                    }
                  >
                    {isCorrectionMode
                      ? "Confirm Resubmission"
                      : "Confirm & Submit"}
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                PROCESSING
            ============================================== */}

            {modal.type ===
            "PROCESSING" ? (
              <div className="candidate-modal-state">

                <div className="candidate-portal-spinner" />

                <h2>
                  {modal.title}
                </h2>

                <p>
                  Please do not close this page while the request is being completed.
                </p>

              </div>
            ) : null}

            {/* =============================================
                ACCEPTED
            ============================================== */}

            {modal.type ===
            "ACCEPT_SUCCESS" ? (
              <div className="candidate-modal-state">

                <div className="candidate-modal-large-success">
                  ✓
                </div>

                <span>
                  ACCEPTANCE RECORDED
                </span>

                <h2>
                  LOI Accepted
                </h2>

                <p>
                  Thank you,{" "}
                  {firstName}. Your acceptance has been recorded successfully.
                </p>

                <div className="candidate-modal-next">

                  <span>
                    NEXT STEP
                  </span>

                  <strong>
                    Complete your pre-joining documentation
                  </strong>

                </div>

                <button
                  type="button"
                  className="candidate-modal-primary candidate-modal-full"
                  onClick={
                    continueAfterAcceptance
                  }
                >
                  Continue
                </button>

              </div>
            ) : null}

            {/* =============================================
                DOCUMENT SUCCESS
            ============================================== */}

            {modal.type ===
            "DOCUMENT_SUCCESS" ? (
              <div className="candidate-modal-state">

                <div className="candidate-modal-large-success">
                  ✓
                </div>

                <span>
                  {isCorrectionMode
                    ? "CORRECTIONS SUBMITTED"
                    : "SUBMISSION COMPLETE"}
                </span>

                <h2>
                  {isCorrectionMode
                    ? "Corrections Resubmitted"
                    : "Documents Submitted"}
                </h2>

                <p>
                  Thank you,{" "}
                  {firstName}.{" "}
                  {isCorrectionMode
                    ? "Your corrected information and documents have been resubmitted successfully."
                    : "Your information and documents have been submitted successfully."}
                </p>

                <div className="candidate-modal-next">

                  <span>
                    CURRENT STATUS
                  </span>

                  <strong>
                    Under HR Verification
                  </strong>

                </div>

                <button
                  type="button"
                  className="candidate-modal-primary candidate-modal-full"
                  onClick={async () => {
                    setModal(
                      null
                    );

                    await loadPortal();
                  }}
                >
                  Done
                </button>

              </div>
            ) : null}

            {/* =============================================
                DECLINE SUCCESS
            ============================================== */}

            {modal.type ===
            "DECLINE_SUCCESS" ? (
              <div className="candidate-modal-state">

                <div className="candidate-modal-large-success">
                  ✓
                </div>

                <span>
                  RESPONSE RECORDED
                </span>

                <h2>
                  Thank you
                </h2>

                <p>
                  Your response has been recorded successfully.
                </p>

                <button
                  type="button"
                  className="candidate-modal-primary candidate-modal-full"
                  onClick={async () => {
                    setModal(
                      null
                    );

                    await loadPortal();
                  }}
                >
                  Done
                </button>

              </div>
            ) : null}

            {/* =============================================
                ERROR
            ============================================== */}

            {modal.type ===
            "ERROR" ? (
              <div className="candidate-modal-state">

                <div className="candidate-modal-large-error">
                  !
                </div>

                <span className="candidate-modal-error-kicker">
                  SOMETHING WENT WRONG
                </span>

                <h2>
                  {modal.title}
                </h2>

                <p>
                  {modal.message}
                </p>

                <button
                  type="button"
                  className="candidate-modal-primary candidate-modal-full"
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

          </div>

        </div>
      ) : null}

    </div>
  );
}

export default CandidateSelectionPortal;