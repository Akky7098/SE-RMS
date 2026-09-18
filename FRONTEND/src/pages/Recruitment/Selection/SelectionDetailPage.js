import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSelection,
  getLoiReadiness,
  generateSelectionLoi,
  openSelectionLoiPdf,
  sendSelectionLoi,

  getSelectionDocuments,
  openSelectionDocument,
  requestDocumentResubmission,
  verifySelectionDocuments,
} from "../../../services/selectionService";

import OfferWorkspace from "./OfferWorkspace";

import JoiningWorkspace from "./JoiningWorkspace";

import "./Selection.css";

/* =========================================================
   WORKFLOW
========================================================= */

const WORKFLOW_STEPS = [
  {
    key: "SELECTED",
    label: "Selected",
  },

  {
    key: "LOI",
    label: "LOI",
  },

  {
    key: "DOCUMENTS",
    label: "Documents",
  },

  {
    key: "OFFER",
    label: "Offer",
  },

  {
    key: "JOINING",
    label: "Joining",
  },
];

/* =========================================================
   DOCUMENT LABELS
========================================================= */

const DOCUMENT_LABELS = {
  AADHAAR:
    "Aadhaar Card",

  PAN:
    "PAN Card",

  BANK_PROOF:
    "Bank Proof / Cancelled Cheque",

  HIGHEST_QUALIFICATION:
    "Highest Qualification",

  PHOTO:
    "Photograph",

  SIGNATURE:
    "Signature",

  EXPERIENCE_LETTER:
    "Experience Letter",

  RELIEVING_LETTER:
    "Relieving Letter",

  SALARY_SLIP:
    "Latest Salary Slip",

  PREVIOUS_APPOINTMENT_LETTER:
    "Previous Appointment Letter",

  FORM16:
    "Form 16",

  OTHER:
    "Other Supporting Document",
};

/* =========================================================
   QUERY FIELDS
========================================================= */

const QUERY_FIELDS = [
  {
    key:
      "currentAddress",

    label:
      "Current Address",

    group:
      "Personal",
  },

  {
    key:
      "permanentAddress",

    label:
      "Permanent Address",

    group:
      "Personal",
  },

  {
    key:
      "dateOfBirth",

    label:
      "Date of Birth",

    group:
      "Personal",
  },

  {
    key:
      "emergencyContactNumber",

    label:
      "Emergency Contact Number",

    group:
      "Personal",
  },

  {
    key:
      "previousCompany",

    label:
      "Previous / Current Company",

    group:
      "Employment",
  },

  {
    key:
      "previousDesignation",

    label:
      "Previous / Current Designation",

    group:
      "Employment",
  },

  {
    key:
      "lastWorkingDate",

    label:
      "Last Working Date",

    group:
      "Employment",
  },

  {
    key:
      "accountHolderName",

    label:
      "Account Holder Name",

    group:
      "Bank",
  },

  {
    key:
      "bankName",

    label:
      "Bank Name",

    group:
      "Bank",
  },

  {
    key:
      "accountNumber",

    label:
      "Account Number",

    group:
      "Bank",
  },

  {
    key:
      "ifscCode",

    label:
      "IFSC Code",

    group:
      "Bank",
  },

  {
    key:
      "branch",

    label:
      "Bank Branch",

    group:
      "Bank",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const niceValue =
  (
    value
  ) =>
    String(
      value ||
        ""
    )
      .replaceAll(
        "_",
        " "
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character
            .toUpperCase()
      );

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
            "short",

          year:
            "numeric",
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
      return "—";
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

const toDateInputValue =
  (
    value
  ) => {
    if (
      !value
    ) {
      return "";
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
      return "";
    }

    return date
      .toISOString()
      .slice(
        0,
        10
      );
  };

const stageFromStatus =
  (
    status
  ) => {
    if (
      [
        "LOI_PENDING",
        "LOI_DRAFT",
        "LOI_SENT",
        "LOI_ACCEPTED",
        "LOI_DECLINED",
      ].includes(
        status
      )
    ) {
      return "LOI";
    }

    if (
      [
        "PRE_JOINING_DOCUMENTS",
        "DOCUMENTS_SUBMITTED",
        "DOCUMENT_VERIFICATION",
        "DOCUMENT_QUERY",
        "DOCUMENTS_VERIFIED",
      ].includes(
        status
      )
    ) {
      return "DOCUMENTS";
    }

    if (
      [
        "READY_FOR_OFFER",
        "OFFER_DRAFT",
        "OFFER_SENT",
        "OFFER_ACCEPTED",
        "OFFER_DECLINED",
      ].includes(
        status
      )
    ) {
      return "OFFER";
    }

   if (
  [
    "JOINING_PENDING",
    "JOINING_RESCHEDULED",
    "NO_SHOW",
    "JOINING_CONFIRMED",
    "JOINING_DECLINED",
    "COMPLETED",
  ].includes(
    status
  )
) {
  return "JOINING";
}

    return "LOI";
  };

const workflowIndex =
  (
    status
  ) => {
    const stage =
      stageFromStatus(
        status
      );

    return WORKFLOW_STEPS
      .findIndex(
        (
          step
        ) =>
          step.key ===
          stage
      );
  };

const getLoiReviewKey =
  (
    selectionId,
    loi
  ) => {
    if (
      !selectionId ||
      !loi
    ) {
      return "";
    }

    return [
      "se-rms",
      "selection",
      selectionId,
      "loi",

      loi?._id ||
        loi?.documentNumber ||
        "current",

      "version",

      loi?.version ||
        1,

      "reviewed",
    ].join(
      ":"
    );
  };

/* =========================================================
   PAGE
========================================================= */

function SelectionDetailPage() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const selectionId =
    params.get(
      "id"
    );

  /* =====================================================
     MAIN DATA
  ===================================================== */

  const [
    selection,
    setSelection,
  ] =
    useState(
      null
    );

  const [
    documentRecord,
    setDocumentRecord,
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
    documentLoading,
    setDocumentLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  /* =====================================================
     MODAL
  ===================================================== */

  const [
    modal,
    setModal,
  ] =
    useState(
      null
    );

  /* =====================================================
     LOI
  ===================================================== */

  const [
    loiForm,
    setLoiForm,
  ] =
    useState({
      officeLocation:
        "",

      proposedJoiningDate:
        "",
    });

  const [
    actionBusy,
    setActionBusy,
  ] =
    useState(
      false
    );

  const [
    openingPdf,
    setOpeningPdf,
  ] =
    useState(
      false
    );

  const [
    loiReviewed,
    setLoiReviewed,
  ] =
    useState(
      false
    );

  /* =====================================================
     DOCUMENT QUERY
  ===================================================== */

  const [
    generalQueryComment,
    setGeneralQueryComment,
  ] =
    useState(
      ""
    );

  const [
    fieldQueries,
    setFieldQueries,
  ] =
    useState(
      []
    );

  const [
    documentQueries,
    setDocumentQueries,
  ] =
    useState(
      []
    );

  /* =====================================================
     LOAD SELECTION
  ===================================================== */

  const load =
    useCallback(
      async () => {
        if (
          !selectionId
        ) {
          setError(
            "Selection ID is missing."
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

          const data =
            await getSelection(
              selectionId
            );

          setSelection(
            data
          );

          return data;
        } catch (
          err
        ) {
          setError(
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Selection could not be loaded"
          );

          return null;
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        selectionId,
      ]
    );

  /* =====================================================
     LOAD DOCUMENT DOSSIER
  ===================================================== */

  const loadDocuments =
    useCallback(
      async (
        silent =
          false
      ) => {
        if (
          !selectionId
        ) {
          return null;
        }

        try {
          if (
            !silent
          ) {
            setDocumentLoading(
              true
            );
          }

          const data =
            await getSelectionDocuments(
              selectionId
            );

          setDocumentRecord(
            data
          );

          return data;
        } catch (
          err
        ) {
          if (
            selection &&
           [
  "DOCUMENTS_SUBMITTED",
  "DOCUMENT_VERIFICATION",
  "DOCUMENT_QUERY",
  "DOCUMENTS_VERIFIED",

  "READY_FOR_OFFER",
  "OFFER_DRAFT",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",

  "JOINING_PENDING",
  "JOINING_RESCHEDULED",
  "NO_SHOW",
  "JOINING_CONFIRMED",
  "JOINING_DECLINED",

  "COMPLETED",
].includes(
              selection.status
            )
          ) {
            setError(
              err?.response
                ?.data
                ?.message ||
              err?.message ||
              "Candidate documents could not be loaded"
            );
          }

          return null;
        } finally {
          if (
            !silent
          ) {
            setDocumentLoading(
              false
            );
          }
        }
      },
      [
        selectionId,
        selection,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  useEffect(
  () => {
    if (
      !selection
    ) {
      return;
    }

    if (
      [
        "DOCUMENTS_SUBMITTED",
        "DOCUMENT_VERIFICATION",
        "DOCUMENT_QUERY",
        "DOCUMENTS_VERIFIED",

        "READY_FOR_OFFER",
        "OFFER_DRAFT",
        "OFFER_SENT",
        "OFFER_ACCEPTED",
        "OFFER_DECLINED",

        "JOINING_PENDING",
        "JOINING_RESCHEDULED",
        "NO_SHOW",
        "JOINING_CONFIRMED",
        "JOINING_DECLINED",

        "COMPLETED",
      ].includes(
        selection.status
      )
    ) {
      loadDocuments();
    }
  },
  [
    selection?.status,
    loadDocuments,
  ]
);

  /* =====================================================
     DERIVED DATA
  ===================================================== */

  const candidate =
    selection
      ?.candidate ||
    {};

  const workflow =
    selection
      ?.workflow ||
    {};

  const loi =
    selection
      ?.currentLoi ||
    null;

  const currentDocuments =
    documentRecord
      ?.currentDocuments ||
    (
      documentRecord
        ?.documents ||
      []
    ).filter(
      (
        document
      ) =>
        document
          .isCurrent !==
          false &&
        document
          .status !==
          "REPLACED"
    );

  const historicalDocuments =
    documentRecord
      ?.historicalDocuments ||
    (
      documentRecord
        ?.documents ||
      []
    ).filter(
      (
        document
      ) =>
        document
          .isCurrent ===
          false ||
        document
          .status ===
          "REPLACED"
    );

  const currentStepIndex =
    useMemo(
      () =>
        workflowIndex(
          selection
            ?.status
        ),
      [
        selection
          ?.status,
      ]
    );

  /* =====================================================
     LOI REVIEW STATE
  ===================================================== */

  useEffect(
    () => {
      if (
        !selectionId ||
        !loi
      ) {
        setLoiReviewed(
          false
        );

        return;
      }

      const key =
        getLoiReviewKey(
          selectionId,
          loi
        );

      try {
        setLoiReviewed(
          window
            .sessionStorage
            .getItem(
              key
            ) ===
            "true"
        );
      } catch {
        setLoiReviewed(
          false
        );
      }
    },
    [
      selectionId,
      loi,
    ]
  );

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const goBack =
    () => {
      const url =
        new URL(
          window.location.href
        );

      url.searchParams.set(
        "page",
        "selections"
      );

      url.searchParams.delete(
        "id"
      );

      window.history.pushState(
        {},
        "",
        url
      );

      window.dispatchEvent(
        new PopStateEvent(
          "popstate"
        )
      );
    };

  /* =====================================================
     LOI FORM
  ===================================================== */

  const fillLoiForm =
    (
      data
    ) => {
      setLoiForm({
        officeLocation:
          data
            ?.selection
            ?.officeLocation ||
          selection
            ?.officeLocation ||
          "",

        proposedJoiningDate:
          toDateInputValue(
            data
              ?.selection
              ?.proposedJoiningDate ||
            selection
              ?.proposedJoiningDate
          ),
      });
    };

  const clearCurrentLoiReview =
    () => {
      const key =
        getLoiReviewKey(
          selectionId,
          loi
        );

      if (
        key
      ) {
        try {
          window
            .sessionStorage
            .removeItem(
              key
            );
        } catch {
          // Ignore.
        }
      }

      setLoiReviewed(
        false
      );
    };

  /* =====================================================
     PREPARE LOI
  ===================================================== */

  const prepareLoi =
    async () => {
      try {
        setActionBusy(
          true
        );

        const data =
          await getLoiReadiness(
            selectionId
          );

        fillLoiForm(
          data
        );

        if (
          data?.ready
        ) {
          setModal({
            type:
              "GENERATE_CONFIRM",
          });

          return;
        }

        if (
          data
            ?.missingFields
            ?.length
        ) {
          setModal({
            type:
              "LOI_FIELDS",
          });

          return;
        }

        throw new Error(
          "Required LOI information could not be determined."
        );
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "LOI readiness failed",

          message:
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "LOI readiness could not be checked.",
        });
      } finally {
        setActionBusy(
          false
        );
      }
    };

  /* =====================================================
     GENERATE LOI
  ===================================================== */

  const generateLoi =
    async () => {
      try {
        setActionBusy(
          true
        );

        setModal({
          type:
            "GENERATING",
        });

        const payload =
          {};

        if (
          loiForm
            .officeLocation
        ) {
          payload.officeLocation =
            loiForm
              .officeLocation;
        }

        if (
          loiForm
            .proposedJoiningDate
        ) {
          payload.proposedJoiningDate =
            loiForm
              .proposedJoiningDate;
        }

        const result =
          await generateSelectionLoi(
            selectionId,
            payload
          );

        clearCurrentLoiReview();

        await load();

        setModal({
          type:
            "GENERATED",

          loi:
            result?.loi ||
            result,
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "LOI could not be generated",

          message:
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Please try again.",
        });
      } finally {
        setActionBusy(
          false
        );
      }
    };

  /* =====================================================
     OPEN LOI
  ===================================================== */

  const openLoiPdf =
    async () => {
      if (
        openingPdf
      ) {
        return;
      }

      try {
        setOpeningPdf(
          true
        );

        await openSelectionLoiPdf(
          selectionId
        );

        const key =
          getLoiReviewKey(
            selectionId,
            loi
          );

        try {
          window
            .sessionStorage
            .setItem(
              key,
              "true"
            );
        } catch {
          // Ignore.
        }

        setLoiReviewed(
          true
        );
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "LOI could not be opened",

          message:
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Generated LOI PDF could not be opened.",
        });
      } finally {
        setOpeningPdf(
          false
        );
      }
    };

  /* =====================================================
     EDIT LOI
  ===================================================== */

  const openEditLoi =
    async () => {
      try {
        setActionBusy(
          true
        );

        const data =
          await getLoiReadiness(
            selectionId
          );

        fillLoiForm(
          data
        );

        setModal({
          type:
            "EDIT_LOI",
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "LOI details could not be loaded",

          message:
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Please try again.",
        });
      } finally {
        setActionBusy(
          false
        );
      }
    };

  /* =====================================================
     REGENERATE LOI
  ===================================================== */

  const regenerateLoi =
    async () => {
      try {
        setActionBusy(
          true
        );

        setModal({
          type:
            "REGENERATING",
        });

        clearCurrentLoiReview();

        const result =
          await generateSelectionLoi(
            selectionId,
            {
              officeLocation:
                loiForm
                  .officeLocation,

              proposedJoiningDate:
                loiForm
                  .proposedJoiningDate,
            }
          );

        await load();

        setModal({
          type:
            "REGENERATED",

          loi:
            result?.loi ||
            result,
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "LOI could not be updated",

          message:
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "The revised LOI could not be generated.",
        });
      } finally {
        setActionBusy(
          false
        );
      }
    };

  /* =====================================================
     SEND LOI
  ===================================================== */

  const openSendConfirm =
    () => {
      if (
        !loiReviewed
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Review LOI before sending",

          message:
            "Open and review the current LOI PDF before sending it.",
        });

        return;
      }

      setModal({
        type:
          "SEND_CONFIRM",
      });
    };

  const sendLoi =
    async () => {
      try {
        setActionBusy(
          true
        );

        setModal({
          type:
            "SENDING",
        });

        await sendSelectionLoi(
          selectionId
        );

        await load();

        setModal({
          type:
            "SENT",
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "LOI could not be sent",

          message:
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Please try again.",
        });
      } finally {
        setActionBusy(
          false
        );
      }
    };

  /* =====================================================
     DOCUMENT QUERY FORM
  ===================================================== */

  const resetQueryForm =
    () => {
      setGeneralQueryComment(
        ""
      );

      setFieldQueries(
        []
      );

      setDocumentQueries(
        []
      );
    };

  const openQueryModal =
    (
      document =
        null
    ) => {
      setGeneralQueryComment(
        ""
      );

      setFieldQueries(
        []
      );

      if (
        document
          ?._id
      ) {
        setDocumentQueries([
          String(
            document._id
          ),
        ]);
      } else {
        setDocumentQueries(
          []
        );
      }

      setModal({
        type:
          "DOCUMENT_QUERY",
      });
    };

  const toggleFieldQuery =
    (
      key
    ) => {
      setFieldQueries(
        (
          previous
        ) => {
          if (
            previous.includes(
              key
            )
          ) {
            return previous.filter(
              (
                item
              ) =>
                item !==
                key
            );
          }

          return [
            ...previous,
            key,
          ];
        }
      );
    };

  const toggleDocumentQuery =
    (
      documentId
    ) => {
      const id =
        String(
          documentId
        );

      setDocumentQueries(
        (
          previous
        ) => {
          if (
            previous.includes(
              id
            )
          ) {
            return previous.filter(
              (
                item
              ) =>
                item !==
                id
            );
          }

          return [
            ...previous,
            id,
          ];
        }
      );
    };

  /* =====================================================
     SUBMIT QUERY
  ===================================================== */

  const submitQuery =
    async () => {
      if (
        fieldQueries.length ===
          0 &&
        documentQueries.length ===
          0
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Select correction items",

          message:
            "Please select at least one field or document that requires correction.",
        });

        return;
      }

      try {
        setActionBusy(
          true
        );

        setModal({
          type:
            "DOCUMENT_QUERY_SENDING",
        });

        await requestDocumentResubmission(
          selectionId,
          {
            fieldQueries,

            documentQueries,

            generalComment:
              generalQueryComment
                .trim(),
          }
        );

        await load();

        await loadDocuments(
          true
        );

        resetQueryForm();

        setModal({
          type:
            "DOCUMENT_QUERY_SENT",
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Resubmission request failed",

          message:
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Candidate could not be notified.",
        });
      } finally {
        setActionBusy(
          false
        );
      }
    };

  /* =====================================================
     VERIFY DOCUMENTS
  ===================================================== */

  const verifyDocuments =
    async () => {
      try {
        setActionBusy(
          true
        );

        setModal({
          type:
            "VERIFYING_DOCUMENTS",
        });

        await verifySelectionDocuments(
          selectionId
        );

        await load();

        await loadDocuments(
          true
        );

        setModal({
          type:
            "DOCUMENTS_VERIFIED",
        });
      } catch (
        err
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Verification could not be completed",

          message:
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Please check the submitted information and try again.",
        });
      } finally {
        setActionBusy(
          false
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
      <div className="selection-detail-loading">
        Loading selection workflow...
      </div>
    );
  }

  if (
    !selection
  ) {
    return (
      <div className="selection-detail-error">

        <strong>
          Selection unavailable
        </strong>

        <span>
          {error ||
            "Selection record was not found."}
        </span>

        <button
          type="button"
          onClick={
            goBack
          }
        >
          Back to Selected Candidates
        </button>

      </div>
    );
  }

  /* =====================================================
     LOI CARD
  ===================================================== */

  const renderLoiCard =
    () => {
      if (
        selection.status ===
          "LOI_PENDING" ||
        selection.status ===
          "LOI_DECLINED"
      ) {
        return (
          <section className="selection-action-card selection-action-card--loi">

            <div className="selection-action-card-icon">
              L
            </div>

            <div className="selection-action-card-main">

              <span className="selection-card-eyebrow">
                LETTER OF INTENT
              </span>

              <h2>
                Prepare Letter of Intent
              </h2>

              <p>
                SE-RMS will reuse candidate and hiring information already available.
              </p>

            </div>

            <button
              type="button"
              className="selection-primary-button"
              onClick={
                prepareLoi
              }
              disabled={
                actionBusy
              }
            >
              Prepare LOI
            </button>

          </section>
        );
      }

      if (
        selection.status ===
        "LOI_DRAFT"
      ) {
        return (
          <section className="selection-action-card selection-action-card--ready selection-loi-review-card">

            <div className="selection-action-card-icon">
              L
            </div>

            <div className="selection-action-card-main">

              <div className="selection-loi-review-heading">

                <div>

                  <span className="selection-card-eyebrow">
                    LETTER OF INTENT
                  </span>

                  <h2>
                    Letter of Intent Ready
                  </h2>

                  <p>
                    Review the controlled PDF before release to the candidate.
                  </p>

                </div>

                <div
                  className={
                    loiReviewed
                      ? "selection-review-badge is-reviewed"
                      : "selection-review-badge"
                  }
                >
                  {loiReviewed
                    ? "✓ PDF Reviewed"
                    : "Review Required"}
                </div>

              </div>

              <div className="selection-loi-info-grid">

                <div>

                  <span>
                    Reference
                  </span>

                  <strong>
                    {loi
                      ?.documentNumber ||
                      "Generated LOI"}
                  </strong>

                </div>

                <div>

                  <span>
                    Version
                  </span>

                  <strong>
                    {loi
                      ?.version ||
                      1}
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

                <div>

                  <span>
                    Candidate
                  </span>

                  <strong>
                    {candidate
                      ?.email ||
                      "—"}
                  </strong>

                </div>

              </div>

              <div className="selection-loi-review-actions">

                <button
                  type="button"
                  className="selection-review-pdf-button"
                  onClick={
                    openLoiPdf
                  }
                  disabled={
                    openingPdf
                  }
                >
                  {openingPdf
                    ? "Opening..."
                    : "Review LOI"}
                </button>

                <button
                  type="button"
                  className="selection-edit-loi-button"
                  onClick={
                    openEditLoi
                  }
                  disabled={
                    actionBusy
                  }
                >
                  Edit Details
                </button>

              </div>

            </div>

            <div className="selection-loi-send-column">

              <span>
                CANDIDATE RELEASE
              </span>

              <button
                type="button"
                className="selection-primary-button"
                onClick={
                  openSendConfirm
                }
                disabled={
                  !loiReviewed ||
                  actionBusy
                }
              >
                Send LOI →
              </button>

            </div>

          </section>
        );
      }

      if (
        selection.status ===
        "LOI_SENT"
      ) {
        return (
          <section className="selection-action-card selection-action-card--waiting">

            <div className="selection-action-card-icon">
              ↗
            </div>

            <div className="selection-action-card-main">

              <span className="selection-card-eyebrow">
                CANDIDATE RESPONSE
              </span>

              <h2>
                Awaiting LOI response
              </h2>

              <p>
                LOI and secure candidate portal were shared successfully.
              </p>

            </div>

            <div className="selection-status-pill selection-status-pill--waiting">
              Awaiting Candidate
            </div>

          </section>
        );
      }

      return null;
    };

  /* =====================================================
     DOCUMENT CENTER
  ===================================================== */

  const renderDocumentCenter =
    () => {
      if (
        !documentRecord
      ) {
        if (
          documentLoading
        ) {
          return (
            <section className="selection-document-center">

              <div className="selection-document-center-header">
                Loading candidate dossier...
              </div>

            </section>
          );
        }

        return null;
      }

      return (
        <section className="selection-document-center">

          {/* ===============================================
              HEADER
          ================================================ */}

          <div className="selection-document-center-header">

            <div>

              <span className="selection-card-eyebrow">
                PERMANENT CANDIDATE DOSSIER
              </span>

              <h2>
                Document Center
              </h2>

              <p>
                LOI, candidate information and submitted employment documents remain attached to this selection record.
              </p>

            </div>

            <div className="selection-document-count">

              <strong>
                {currentDocuments.length}
              </strong>

              <span>
                Current Files
              </span>

            </div>

          </div>

          {/* ===============================================
              LOI
          ================================================ */}

          {loi ? (
            <div className="selection-document-loi">

              <div className="selection-document-loi-icon">
                LOI
              </div>

              <div className="selection-document-loi-main">

                <span>
                  LETTER OF INTENT
                </span>

                <strong>
                  {loi
                    .documentNumber ||
                    "Letter of Intent"}
                </strong>

                <small>
                  Version{" "}
                  {loi
                    .version ||
                    1}
                  {" · "}
                  {niceValue(
                    loi
                      .status
                  )}
                </small>

              </div>

              <button
                type="button"
                className="selection-review-pdf-button"
                onClick={
                  openLoiPdf
                }
                disabled={
                  openingPdf
                }
              >
                {openingPdf
                  ? "Opening..."
                  : "Open LOI"}
              </button>

            </div>
          ) : null}

          {/* ===============================================
              CANDIDATE INFORMATION
          ================================================ */}

          <div className="selection-dossier-info">

            <div className="selection-dossier-section-title">

              <span>
                01
              </span>

              <div>

                <strong>
                  Candidate Information
                </strong>

                <small>
                  Personal, employment and bank information submitted by the candidate
                </small>

              </div>

            </div>

            <div className="selection-dossier-field-grid">

              <div>

                <span>
                  Current Address
                </span>

                <strong>
                  {documentRecord
                    ?.personal
                    ?.currentAddress ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Permanent Address
                </span>

                <strong>
                  {documentRecord
                    ?.personal
                    ?.permanentAddress ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Date of Birth
                </span>

                <strong>
                  {formatDate(
                    documentRecord
                      ?.personal
                      ?.dateOfBirth
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Emergency Contact
                </span>

                <strong>
                  {documentRecord
                    ?.personal
                    ?.emergencyContactNumber ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Employment
                </span>

                <strong>
                  {typeof
                    documentRecord
                      ?.employment
                      ?.isFresher ===
                  "boolean"
                    ? documentRecord
                        .employment
                        .isFresher
                      ? "Fresher"
                      : "Experienced"
                    : "—"}
                </strong>

              </div>

              <div>

                <span>
                  Previous Company
                </span>

                <strong>
                  {documentRecord
                    ?.employment
                    ?.previousCompany ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Previous Designation
                </span>

                <strong>
                  {documentRecord
                    ?.employment
                    ?.previousDesignation ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Last Working Date
                </span>

                <strong>
                  {formatDate(
                    documentRecord
                      ?.employment
                      ?.lastWorkingDate
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Account Holder
                </span>

                <strong>
                  {documentRecord
                    ?.bank
                    ?.accountHolderName ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Bank
                </span>

                <strong>
                  {documentRecord
                    ?.bank
                    ?.bankName ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Account Number
                </span>

                <strong>
                  {documentRecord
                    ?.bank
                    ?.accountNumber ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  IFSC
                </span>

                <strong>
                  {documentRecord
                    ?.bank
                    ?.ifscCode ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Branch
                </span>

                <strong>
                  {documentRecord
                    ?.bank
                    ?.branch ||
                    "—"}
                </strong>

              </div>

            </div>

          </div>

          {/* ===============================================
              CURRENT DOCUMENTS
          ================================================ */}

          <div className="selection-document-list">

            <div className="selection-dossier-section-title">

              <span>
                02
              </span>

              <div>

                <strong>
                  Candidate Documents
                </strong>

                <small>
                  Current submitted versions available for HR review
                </small>

              </div>

            </div>

            {currentDocuments.length ===
            0 ? (
              <div className="selection-document-empty">
                No current documents available.
              </div>
            ) : null}

            {currentDocuments.map(
              (
                document
              ) => {
                const status =
                  String(
                    document
                      .status ||
                      "PENDING"
                  )
                    .trim()
                    .toUpperCase();

                return (
                  <div
                    key={
                      document._id
                    }
                    className={
                      `selection-document-row ${
                        status ===
                        "QUERY"
                          ? "is-query"
                          : status ===
                              "VERIFIED"
                            ? "is-verified"
                            : ""
                      }`
                    }
                  >

                    <div className="selection-document-file-icon">
                      FILE
                    </div>

                    <div className="selection-document-meta">

                      <strong>
                        {DOCUMENT_LABELS[
                          document
                            .type
                        ] ||
                          niceValue(
                            document
                              .type
                          )}
                      </strong>

                      <span>
                        {document
                          .originalName ||
                          "Uploaded file"}
                        {" · "}
                        {formatBytes(
                          document
                            .size
                        )}
                        {" · "}
                        Version{" "}
                        {document
                          .version ||
                          1}
                      </span>

                      {document
                        .queryMessage ? (
                        <span className="selection-document-query-message">
                          HR Query:{" "}
                          {document
                            .queryMessage}
                        </span>
                      ) : null}

                    </div>

                    <span
                      className={
                        `selection-document-status ${
                          status ===
                          "QUERY"
                            ? "is-query"
                            : status ===
                                "VERIFIED"
                              ? "is-verified"
                              : ""
                        }`
                      }
                    >
                      {niceValue(
                        status
                      )}
                    </span>

                    <div className="selection-document-actions">

                      <button
                        type="button"
                        onClick={() =>
                          openSelectionDocument(
                            selectionId,
                            document._id
                          )
                        }
                      >
                        Open
                      </button>

                      {selection.status ===
                      "DOCUMENT_VERIFICATION" ? (
                        <button
                          type="button"
                          className="selection-document-query-button"
                          onClick={() =>
                            openQueryModal(
                              document
                            )
                          }
                        >
                          Query
                        </button>
                      ) : null}

                    </div>

                  </div>
                );
              }
            )}

          </div>

          {/* ===============================================
              HISTORICAL DOCUMENTS
          ================================================ */}

          {historicalDocuments.length ? (
            <details className="selection-document-history">

              <summary>
                Previous document versions{" "}
                ({historicalDocuments.length})
              </summary>

              <div>

                {historicalDocuments.map(
                  (
                    document
                  ) => (
                    <button
                      key={
                        document._id
                      }
                      type="button"
                      onClick={() =>
                        openSelectionDocument(
                          selectionId,
                          document._id
                        )
                      }
                    >

                      <span>
                        {DOCUMENT_LABELS[
                          document
                            .type
                        ] ||
                          niceValue(
                            document
                              .type
                          )}
                      </span>

                      <small>
                        Version{" "}
                        {document
                          .version ||
                          1}
                        {" · "}
                        Replaced{" "}
                        {formatDate(
                          document
                            .replacedAt
                        )}
                      </small>

                    </button>
                  )
                )}

              </div>

            </details>
          ) : null}

          {/* ===============================================
              HR DECISION
          ================================================ */}

          {selection.status ===
          "DOCUMENT_VERIFICATION" ? (
            <div className="selection-document-verification-footer">

              <div>

                <span>
                  HR DECISION
                </span>

                <strong>
                  Review candidate details and all submitted files before continuing.
                </strong>

              </div>

              <div className="selection-document-verification-actions">

                <button
                  type="button"
                  className="selection-document-query-all"
                  onClick={() =>
                    openQueryModal()
                  }
                >
                  Request Resubmission
                </button>

                <button
                  type="button"
                  className="selection-document-verify-all"
                  onClick={() =>
                    setModal({
                      type:
                        "VERIFY_CONFIRM",
                    })
                  }
                >
                  ✓ Verify Documents
                </button>

              </div>

            </div>
          ) : null}

          {/* ===============================================
              WAITING FOR CANDIDATE
          ================================================ */}

          {selection.status ===
          "DOCUMENT_QUERY" ? (
            <div className="selection-document-query-banner">

              <span>
                !
              </span>

              <div>

                <strong>
                  Waiting for candidate correction
                </strong>

                <p>
                  The candidate has been sent a fresh secure portal link. Only the selected fields and documents need correction.
                </p>

                {documentRecord
                  ?.generalQueryMessage ? (
                  <small>
                    HR Message:{" "}
                    {documentRecord
                      .generalQueryMessage}
                  </small>
                ) : null}

              </div>

            </div>
          ) : null}

          {/* ===============================================
              VERIFIED
          ================================================ */}

          {[
  "DOCUMENTS_VERIFIED",

  "READY_FOR_OFFER",
  "OFFER_DRAFT",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",

  "JOINING_PENDING",
  "JOINING_RESCHEDULED",
  "NO_SHOW",
  "JOINING_CONFIRMED",
  "JOINING_DECLINED",

  "COMPLETED",
].includes(
  selection.status
) ? (
            <div className="selection-documents-verified-banner">

              <span>
                ✓
              </span>

              <div>

                <strong>
                  Documents verified
                </strong>

                <p>
                  Verification is complete. This dossier remains available as part of the candidate's permanent selection record.
                </p>

              </div>

            </div>
          ) : null}

        </section>
      );
    };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="selection-detail-page">

      <button
        type="button"
        className="selection-back"
        onClick={
          goBack
        }
      >
        ← Selected Candidates
      </button>

      {/* =================================================
          HERO
      ================================================== */}

      <section className="selection-detail-hero">

        <div className="selection-detail-person">

          <div className="selection-detail-avatar">
            {candidate
              ?.fullName
              ?.charAt(
                0
              )
              ?.toUpperCase() ||
              "C"}
          </div>

          <div>

            <div className="selection-detail-eyebrow">
              POST-SELECTION WORKSPACE
            </div>

            <h1>
              {candidate
                ?.fullName ||
                "Candidate"}
            </h1>

            <p>
              {selection
                ?.positionTitle ||
                "Position"}
              {" · "}
              {selection
                ?.department
                ?.name ||
                "Department"}
            </p>

          </div>

        </div>

        <div className="selection-detail-number-card">

          <span>
            SELECTION
          </span>

          <strong>
            {selection
              ?.selectionNumber ||
              "—"}
          </strong>

          <small>
            Selected{" "}
            {formatDate(
              selection
                ?.selectedAt
            )}
          </small>

        </div>

      </section>

      {error ? (
        <div className="selection-error">
          {error}
        </div>
      ) : null}

      {/* =================================================
          WORKFLOW
      ================================================== */}

      <section className="selection-workflow-card">

        <div className="selection-workflow-top">

          <div>

            <span>
              CURRENT PROGRESS
            </span>

            <h2>
              {workflow
                ?.stageLabel ||
                niceValue(
                  selection
                    ?.status
                )}
            </h2>

          </div>

          <strong>
            {workflow
              ?.progressPercent ||
              0}
            %
          </strong>

        </div>

        <div className="selection-main-progress">

          <div
            style={{
              width:
                `${workflow
                  ?.progressPercent ||
                  0}%`,
            }}
          />

        </div>

        <div className="selection-workflow-steps">

          {WORKFLOW_STEPS.map(
            (
              step,
              index
            ) => {
              const workflowCompleted =
  selection.status ===
  "COMPLETED";

const completed =
  workflowCompleted
    ? true
    : index <
      currentStepIndex;

const active =
  !workflowCompleted &&
  index ===
    currentStepIndex;

              return (
                <div
                  key={
                    step.key
                  }
                  className={
                    `selection-workflow-step ${
                      completed
                        ? "is-complete"
                        : ""
                    } ${
                      active
                        ? "is-active"
                        : ""
                    }`
                  }
                >

                  <div>
                    {completed
                      ? "✓"
                      : index +
                        1}
                  </div>

                  <span>
                    {step.label}
                  </span>

                </div>
              );
            }
          )}

        </div>

      </section>

      {/* =================================================
          SUMMARY
      ================================================== */}

      <section className="selection-detail-grid">

        <article className="selection-info-card">

          <span>
            CANDIDATE
          </span>

          <strong>
            {candidate
              ?.fullName ||
              "—"}
          </strong>

          <p>
            {candidate
              ?.candidateNumber ||
              "—"}
          </p>

        </article>

        <article className="selection-info-card">

          <span>
            POSITION
          </span>

          <strong>
            {selection
              ?.positionTitle ||
              "—"}
          </strong>

          <p>
            {selection
              ?.employmentType
              ? niceValue(
                  selection
                    .employmentType
                )
              : "Full Time"}
          </p>

        </article>

        <article className="selection-info-card">

          <span>
            HIRING HR
          </span>

          <strong>
            {selection
              ?.hiringHr
              ?.displayName ||
              "—"}
          </strong>

          <p>
            {selection
              ?.hiringHr
              ?.email ||
              ""}
          </p>

        </article>

        <article className="selection-info-card">

          <span>
            NEXT ACTION
          </span>

          <strong>
            {workflow
              ?.nextActionLabel ||
              "No Action"}
          </strong>

          <p>
            Controlled by SE-RMS workflow.
          </p>

        </article>

      </section>

      {/* =================================================
          LOI
      ================================================== */}

      {renderLoiCard()}

      {/* =================================================
          PERMANENT DOCUMENT DOSSIER
      ================================================== */}

      {renderDocumentCenter()}

      {/* =================================================
          OFFER WORKSPACE

          IMPORTANT:
          OfferWorkspace decides internally whether it should
          render according to selection.status.

          It appears from:
          DOCUMENTS_VERIFIED / READY_FOR_OFFER onward.
      ================================================== */}

      <OfferWorkspace
        selectionId={
          selectionId
        }
        selection={
          selection
        }
        onWorkflowChanged={
          async () => {
            await load();

            await loadDocuments(
              true
            );
          }
        }
      />


      <JoiningWorkspace
  selectionId={selectionId}
  selection={selection}
  onWorkflowChanged={async () => {
    await load();
    await loadDocuments(true);
  }}
/>

      {/* =================================================
          EXISTING LOI / DOCUMENT MODALS
      ================================================== */}

      {modal ? (
        <div className="selection-modal-overlay">

          <div className="selection-modal">

            {/* =============================================
                DOCUMENT QUERY
            ============================================== */}

            {modal.type ===
            "DOCUMENT_QUERY" ? (
              <>

                <div className="selection-modal-header selection-modal-header--query">

                  <span>
                    HR CORRECTION REQUEST
                  </span>

                  <h2>
                    Request candidate correction
                  </h2>

                  <p>
                    Select only the incorrect information or documents. The candidate will see these exact items highlighted for correction.
                  </p>

                </div>

                <div className="selection-modal-body">

                  <div className="selection-query-section-title">
                    Candidate Information
                  </div>

                  <p className="selection-query-helper">
                    Select the fields that the candidate needs to correct.
                  </p>

                  <div className="selection-query-field-list">

                    {QUERY_FIELDS.map(
                      (
                        item
                      ) => {
                        const selected =
                          fieldQueries.includes(
                            item.key
                          );

                        return (
                          <button
                            key={
                              item.key
                            }
                            type="button"
                            className={
                              `selection-query-select-card ${
                                selected
                                  ? "is-selected"
                                  : ""
                              }`
                            }
                            onClick={() =>
                              toggleFieldQuery(
                                item.key
                              )
                            }
                          >

                            <span className="selection-query-checkbox">
                              {selected
                                ? "✓"
                                : ""}
                            </span>

                            <div>

                              <strong>
                                {item.label}
                              </strong>

                              <small>
                                {item.group}
                              </small>

                            </div>

                          </button>
                        );
                      }
                    )}

                  </div>

                  <div className="selection-query-section-title">
                    Candidate Documents
                  </div>

                  <p className="selection-query-helper">
                    Select documents that must be replaced or corrected.
                  </p>

                  <div className="selection-query-field-list">

                    {currentDocuments.map(
                      (
                        document
                      ) => {
                        const id =
                          String(
                            document._id
                          );

                        const selected =
                          documentQueries.includes(
                            id
                          );

                        return (
                          <button
                            key={
                              id
                            }
                            type="button"
                            className={
                              `selection-query-select-card ${
                                selected
                                  ? "is-selected"
                                  : ""
                              }`
                            }
                            onClick={() =>
                              toggleDocumentQuery(
                                id
                              )
                            }
                          >

                            <span className="selection-query-checkbox">
                              {selected
                                ? "✓"
                                : ""}
                            </span>

                            <div>

                              <strong>
                                {DOCUMENT_LABELS[
                                  document.type
                                ] ||
                                  niceValue(
                                    document.type
                                  )}
                              </strong>

                              <small>
                                {document
                                  .originalName ||
                                  "Uploaded document"}
                              </small>

                            </div>

                          </button>
                        );
                      }
                    )}

                  </div>

                  <div className="selection-query-message-box">

                    <div className="selection-query-message-heading">

                      <div>

                        <span>
                          HR MESSAGE
                        </span>

                        <strong>
                          Message to candidate
                        </strong>

                      </div>

                      <small>
                        Optional
                      </small>

                    </div>

                    <textarea
                      value={
                        generalQueryComment
                      }
                      onChange={(
                        event
                      ) =>
                        setGeneralQueryComment(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Example: Please correct the highlighted information and upload clear copies of the selected documents."
                      maxLength={
                        2000
                      }
                    />

                    <div className="selection-query-message-foot">

                      <span>
                        The selected items will be highlighted in the candidate portal. This message will appear as the common HR instruction.
                      </span>

                      <strong>
                        {generalQueryComment.length}
                        /2000
                      </strong>

                    </div>

                  </div>

                </div>

                <div className="selection-modal-footer">

                  <button
                    type="button"
                    className="selection-modal-secondary"
                    onClick={() => {
                      resetQueryForm();

                      setModal(
                        null
                      );
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="selection-modal-primary"
                    onClick={
                      submitQuery
                    }
                    disabled={
                      actionBusy ||
                      (
                        fieldQueries.length ===
                          0 &&
                        documentQueries.length ===
                          0
                      )
                    }
                  >
                    Send Correction Request
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                QUERY SENDING
            ============================================== */}

            {modal.type ===
            "DOCUMENT_QUERY_SENDING" ? (
              <div className="selection-modal-state">

                <div className="selection-spinner" />

                <h2>
                  Sending correction request...
                </h2>

                <p>
                  Creating a fresh secure candidate portal link and notifying the candidate.
                </p>

              </div>
            ) : null}

            {/* =============================================
                QUERY SUCCESS
            ============================================== */}

            {modal.type ===
            "DOCUMENT_QUERY_SENT" ? (
              <div className="selection-modal-state">

                <div className="selection-success-circle">
                  ✓
                </div>

                <span className="selection-modal-state-kicker">
                  CANDIDATE NOTIFIED
                </span>

                <h2>
                  Correction requested
                </h2>

                <p>
                  The candidate has received a fresh secure portal link. Only the selected fields and documents require correction.
                </p>

                <button
                  type="button"
                  className="selection-modal-primary selection-modal-single-button"
                  onClick={() =>
                    setModal(
                      null
                    )
                  }
                >
                  Done
                </button>

              </div>
            ) : null}

            {/* =============================================
                VERIFY CONFIRM
            ============================================== */}

            {modal.type ===
            "VERIFY_CONFIRM" ? (
              <>

                <div className="selection-modal-icon selection-modal-icon--verify">
                  ✓
                </div>

                <div className="selection-modal-centered">

                  <span>
                    HR VERIFICATION
                  </span>

                  <h2>
                    Verify all documents?
                  </h2>

                  <p>
                    Confirm only after reviewing candidate information and every current submitted document.
                  </p>

                </div>

                <div className="selection-modal-summary">

                  <div>

                    <span>
                      Candidate
                    </span>

                    <strong>
                      {candidate
                        ?.fullName ||
                        "—"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Current Documents
                    </span>

                    <strong>
                      {currentDocuments.length}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Next Stage
                    </span>

                    <strong>
                      Ready for Offer
                    </strong>

                  </div>

                </div>

                <div className="selection-modal-footer">

                  <button
                    type="button"
                    className="selection-modal-secondary"
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
                    className="selection-document-verify-all"
                    onClick={
                      verifyDocuments
                    }
                    disabled={
                      actionBusy
                    }
                  >
                    ✓ Verify & Continue
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                VERIFYING
            ============================================== */}

            {modal.type ===
            "VERIFYING_DOCUMENTS" ? (
              <div className="selection-modal-state">

                <div className="selection-spinner" />

                <h2>
                  Verifying documents...
                </h2>

                <p>
                  Completing HR verification and moving the candidate to Offer preparation.
                </p>

              </div>
            ) : null}

            {/* =============================================
                VERIFIED
            ============================================== */}

            {modal.type ===
            "DOCUMENTS_VERIFIED" ? (
              <div className="selection-modal-state">

                <div className="selection-success-circle">
                  ✓
                </div>

                <span className="selection-modal-state-kicker">
                  VERIFICATION COMPLETE
                </span>

                <h2>
                  Candidate ready for Offer
                </h2>

                <p>
                  Documents have been verified. The candidate and Hiring HR have been notified and the Offer stage is now active.
                </p>

                <button
                  type="button"
                  className="selection-modal-primary selection-modal-single-button"
                  onClick={() =>
                    setModal(
                      null
                    )
                  }
                >
                  Continue
                </button>

              </div>
            ) : null}

            {/* =============================================
                LOI FIELDS
            ============================================== */}

            {modal.type ===
            "LOI_FIELDS" ? (
              <>

                <div className="selection-modal-header">

                  <span>
                    PREPARE LOI
                  </span>

                  <h2>
                    Complete required information
                  </h2>

                </div>

                <div className="selection-modal-body">

                  <label className="selection-form-field">

                    <span>
                      Office Location
                    </span>

                    <select
                      value={
                        loiForm
                          .officeLocation
                      }
                      onChange={(
                        event
                      ) =>
                        setLoiForm(
                          (
                            previous
                          ) => ({
                            ...previous,

                            officeLocation:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    >

                      <option value="">
                        Select office
                      </option>

                      <option value="DELHI">
                        Delhi Office
                      </option>

                      <option value="SONIPAT">
                        Sonipat Office
                      </option>

                    </select>

                  </label>

                  <label className="selection-form-field">

                    <span>
                      Proposed Joining Date
                    </span>

                    <input
                      type="date"
                      value={
                        loiForm
                          .proposedJoiningDate
                      }
                      onChange={(
                        event
                      ) =>
                        setLoiForm(
                          (
                            previous
                          ) => ({
                            ...previous,

                            proposedJoiningDate:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />

                  </label>

                </div>

                <div className="selection-modal-footer">

                  <button
                    type="button"
                    className="selection-modal-secondary"
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
                    className="selection-modal-primary"
                    onClick={
                      generateLoi
                    }
                    disabled={
                      actionBusy
                    }
                  >
                    Generate LOI
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                GENERATE CONFIRM
            ============================================== */}

            {modal.type ===
            "GENERATE_CONFIRM" ? (
              <>

                <div className="selection-modal-icon selection-modal-icon--document">
                  L
                </div>

                <div className="selection-modal-centered">

                  <span>
                    LETTER OF INTENT
                  </span>

                  <h2>
                    Generate Letter of Intent?
                  </h2>

                  <p>
                    SE-RMS has all required information for this candidate.
                  </p>

                </div>

                <div className="selection-modal-footer">

                  <button
                    type="button"
                    className="selection-modal-secondary"
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
                    className="selection-modal-primary"
                    onClick={
                      generateLoi
                    }
                    disabled={
                      actionBusy
                    }
                  >
                    Generate LOI
                  </button>

                </div>

              </>
            ) : null}

            {modal.type ===
            "GENERATING" ? (
              <div className="selection-modal-state">

                <div className="selection-spinner" />

                <h2>
                  Generating LOI...
                </h2>

              </div>
            ) : null}

            {modal.type ===
            "GENERATED" ? (
              <div className="selection-modal-state">

                <div className="selection-success-circle">
                  ✓
                </div>

                <h2>
                  Letter of Intent is ready
                </h2>

                <button
                  type="button"
                  className="selection-modal-primary selection-modal-single-button"
                  onClick={() => {
                    setModal(
                      null
                    );

                    window.setTimeout(
                      openLoiPdf,
                      100
                    );
                  }}
                >
                  Review Generated LOI
                </button>

              </div>
            ) : null}

            {/* =============================================
                EDIT LOI
            ============================================== */}

            {modal.type ===
            "EDIT_LOI" ? (
              <>

                <div className="selection-modal-header">

                  <span>
                    EDIT LOI DETAILS
                  </span>

                  <h2>
                    Prepare revised LOI
                  </h2>

                </div>

                <div className="selection-modal-body">

                  <label className="selection-form-field">

                    <span>
                      Office Location
                    </span>

                    <select
                      value={
                        loiForm
                          .officeLocation
                      }
                      onChange={(
                        event
                      ) =>
                        setLoiForm(
                          (
                            previous
                          ) => ({
                            ...previous,

                            officeLocation:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="DELHI">
                        Delhi
                      </option>

                      <option value="SONIPAT">
                        Sonipat
                      </option>

                    </select>

                  </label>

                  <label className="selection-form-field">

                    <span>
                      Proposed Joining Date
                    </span>

                    <input
                      type="date"
                      value={
                        loiForm
                          .proposedJoiningDate
                      }
                      onChange={(
                        event
                      ) =>
                        setLoiForm(
                          (
                            previous
                          ) => ({
                            ...previous,

                            proposedJoiningDate:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />

                  </label>

                </div>

                <div className="selection-modal-footer">

                  <button
                    type="button"
                    className="selection-modal-secondary"
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
                    className="selection-modal-primary"
                    onClick={
                      regenerateLoi
                    }
                    disabled={
                      actionBusy
                    }
                  >
                    Generate Revised LOI
                  </button>

                </div>

              </>
            ) : null}

            {modal.type ===
            "REGENERATING" ? (
              <div className="selection-modal-state">

                <div className="selection-spinner" />

                <h2>
                  Generating revised LOI...
                </h2>

              </div>
            ) : null}

            {modal.type ===
            "REGENERATED" ? (
              <div className="selection-modal-state">

                <div className="selection-success-circle">
                  ✓
                </div>

                <h2>
                  Revised LOI generated
                </h2>

                <button
                  type="button"
                  className="selection-modal-primary selection-modal-single-button"
                  onClick={() => {
                    setModal(
                      null
                    );

                    window.setTimeout(
                      openLoiPdf,
                      100
                    );
                  }}
                >
                  Review New LOI
                </button>

              </div>
            ) : null}

            {/* =============================================
                SEND LOI
            ============================================== */}

            {modal.type ===
            "SEND_CONFIRM" ? (
              <>

                <div className="selection-modal-icon selection-modal-icon--send">
                  ↗
                </div>

                <div className="selection-modal-centered">

                  <span>
                    CANDIDATE COMMUNICATION
                  </span>

                  <h2>
                    Send Letter of Intent?
                  </h2>

                  <p>
                    The reviewed LOI and secure candidate portal link will be shared with the candidate.
                  </p>

                </div>

                <div className="selection-modal-footer">

                  <button
                    type="button"
                    className="selection-modal-secondary"
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
                    className="selection-modal-primary"
                    onClick={
                      sendLoi
                    }
                    disabled={
                      actionBusy
                    }
                  >
                    Send LOI
                  </button>

                </div>

              </>
            ) : null}

            {modal.type ===
            "SENDING" ? (
              <div className="selection-modal-state">

                <div className="selection-spinner" />

                <h2>
                  Sending LOI...
                </h2>

              </div>
            ) : null}

            {modal.type ===
            "SENT" ? (
              <div className="selection-modal-state">

                <div className="selection-success-circle">
                  ✓
                </div>

                <h2>
                  Candidate notified
                </h2>

                <p>
                  The Letter of Intent and secure candidate portal have been shared successfully.
                </p>

                <button
                  type="button"
                  className="selection-modal-primary selection-modal-single-button"
                  onClick={() =>
                    setModal(
                      null
                    )
                  }
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
              <div className="selection-modal-state">

                <div className="selection-error-circle">
                  !
                </div>

                <span className="selection-modal-state-kicker selection-modal-state-kicker--error">
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
                  className="selection-modal-primary selection-modal-single-button"
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

export default SelectionDetailPage;