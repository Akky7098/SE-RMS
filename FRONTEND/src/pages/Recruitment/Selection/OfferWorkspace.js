import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getOfferReadiness,
  getSelectionOffer,
  getSelectionOfferHistory,
  generateSelectionOffer,
  openSelectionOfferPdf,
  reviewSelectionOffer,
  sendSelectionOffer,
} from "../../../services/selectionService";

/* =========================================================
   CONSTANTS
========================================================= */

const OFFER_VISIBLE_STATUSES = [
  "DOCUMENTS_VERIFIED",
  "READY_FOR_OFFER",
  "OFFER_DRAFT",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",
  "JOINING_PENDING",
  "JOINING_CONFIRMED",
];

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (
  value
) => {
  if (!value) {
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

const dateInput = (
  value
) => {
  if (!value) {
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

const pretty = (
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

const errorMessage = (
  error,
  fallback
) =>
  error?.response
    ?.data
    ?.message ||
  error?.message ||
  fallback;

const onlyDigits = (
  value,
  max = 10
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

/* =========================================================
   OFFER NORMALIZER
========================================================= */

const normalizeOffer = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    typeof value ===
      "object" &&
    Object.prototype
      .hasOwnProperty
      .call(
        value,
        "data"
      )
  ) {
    return normalizeOffer(
      value.data
    );
  }

  if (
    typeof value !==
    "object"
  ) {
    return null;
  }

  if (
    !value._id ||
    !value.referenceNumber
  ) {
    return null;
  }

  return value;
};

/* =========================================================
   INITIAL FORM
========================================================= */

const INITIAL_FORM = {
  candidateTitle:
    "Mr.",

  candidateName:
    "",

  fatherName:
    "",

  residentialAddress:
    "",

  email:
    "",

  mobile:
    "",

  positionTitle:
    "",

  officeLocation:
    "Delhi",

  compensationText:
    "Your compensation will be as agreed during our discussions.",

  reportingDate:
    "",

  issueDate:
    "",

  hrName:
    "",

  hrDesignation:
    "HR Executive",

  hrEmail:
    "hrd@sandeepedgetech.com",

  signatoryName:
    "Renu",

  signatoryDesignation:
    "HR Manager",
};

/* =========================================================
   COMPONENT
========================================================= */

function OfferWorkspace({
  selectionId,
  selection,
  onWorkflowChanged,
}) {
  /* =====================================================
     DATA
  ===================================================== */

  const [
    readiness,
    setReadiness,
  ] =
    useState(
      null
    );

  const [
    offer,
    setOffer,
  ] =
    useState(
      null
    );

  const [
    history,
    setHistory,
  ] =
    useState(
      []
    );

  const [
    form,
    setForm,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    loading,
    setLoading,
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
    modal,
    setModal,
  ] =
    useState(
      null
    );

  /* =====================================================
     OFFER STAGE
  ===================================================== */

  const offerStage =
    useMemo(
      () =>
        OFFER_VISIBLE_STATUSES.includes(
          selection
            ?.status
        ),
      [
        selection
          ?.status,
      ]
    );

  /* =====================================================
     REAL GENERATED OFFER
  ===================================================== */

  const hasGeneratedOffer =
    useMemo(
      () =>
        Boolean(
          offer?._id &&
          offer
            ?.referenceNumber
        ),
      [
        offer,
      ]
    );

  const offerSent =
    offer?.status ===
      "SENT" ||
    selection?.status ===
      "OFFER_SENT";

  const offerAccepted =
    offer?.status ===
      "ACCEPTED" ||
    selection?.status ===
      "OFFER_ACCEPTED";

  const offerDeclined =
    offer?.status ===
      "DECLINED" ||
    selection?.status ===
      "OFFER_DECLINED";

  /* =====================================================
     LOAD
  ===================================================== */

  const load =
    useCallback(
      async () => {
        if (
          !selectionId ||
          !offerStage
        ) {
          setOffer(
            null
          );

          return;
        }

        try {
          setLoading(
            true
          );

          const [
            readinessResult,
            currentOfferResult,
            offerHistoryResult,
          ] =
            await Promise.all([
              getOfferReadiness(
                selectionId
              ),

              getSelectionOffer(
                selectionId
              ).catch(
                () =>
                  null
              ),

              getSelectionOfferHistory(
                selectionId
              ).catch(
                () =>
                  []
              ),
            ]);

          const realOffer =
            normalizeOffer(
              currentOfferResult
            );

          setReadiness(
            readinessResult ||
            null
          );

          setOffer(
            realOffer
          );

          setHistory(
            Array.isArray(
              offerHistoryResult
            )
              ? offerHistoryResult.filter(
                  (
                    item
                  ) =>
                    Boolean(
                      normalizeOffer(
                        item
                      )
                    )
                )
              : []
          );
        } catch (
          error
        ) {
          setModal({
            type:
              "ERROR",

            title:
              "Offer workspace unavailable",

            message:
              errorMessage(
                error,
                "Offer Letter information could not be loaded."
              ),
          });
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        selectionId,
        offerStage,
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

  /* =====================================================
     PREFILL
  ===================================================== */

  const fillForm = (
    data
  ) => {
    const prefill =
      data?.prefill ||
      readiness?.prefill ||
      {};

    const candidate =
      selection
        ?.candidate ||
      {};

    const hr =
      selection
        ?.hiringHr ||
      {};

    setForm({
      candidateTitle:
        prefill
          ?.candidateTitle ||
        candidate
          ?.candidateTitle ||
        "Mr.",

      candidateName:
        prefill
          ?.candidateName ||
        candidate
          ?.fullName ||
        "",

      fatherName:
        prefill
          ?.fatherName ||
        "",

      residentialAddress:
        prefill
          ?.residentialAddress ||
        "",

      email:
        prefill
          ?.email ||
        candidate
          ?.email ||
        "",

      mobile:
        onlyDigits(
          prefill
            ?.mobile ||
          candidate
            ?.mobile ||
          candidate
            ?.phone ||
          "",
          10
        ),

      positionTitle:
        prefill
          ?.positionTitle ||
        selection
          ?.positionTitle ||
        "",

      officeLocation:
        prefill
          ?.officeLocation ||
        (
          selection
            ?.officeLocation ===
          "SONIPAT"
            ? "Sonipat"
            : "Delhi"
        ),

      compensationText:
        prefill
          ?.compensationText ||
        "Your compensation will be as agreed during our discussions.",

      reportingDate:
        dateInput(
          prefill
            ?.reportingDate ||
          selection
            ?.finalJoiningDate ||
          selection
            ?.proposedJoiningDate
        ),

      issueDate:
        dateInput(
          prefill
            ?.issueDate ||
          new Date()
        ),

      hrName:
        prefill
          ?.hrName ||
        hr
          ?.displayName ||
        hr
          ?.fullName ||
        "",

      hrDesignation:
        prefill
          ?.hrDesignation ||
        hr
          ?.designation ||
        "HR Executive",

      hrEmail:
        prefill
          ?.hrEmail ||
        hr
          ?.email ||
        "hrd@sandeepedgetech.com",

      signatoryName:
        prefill
          ?.signatoryName ||
        "Renu",

      signatoryDesignation:
        prefill
          ?.signatoryDesignation ||
        "HR Manager",
    });
  };

  /* =====================================================
     PREPARE OFFER
  ===================================================== */

  const prepareOffer =
    async () => {
      try {
        setBusy(
          "PREPARE"
        );

        const result =
          await getOfferReadiness(
            selectionId
          );

        setReadiness(
          result ||
          null
        );

        fillForm(
          result
        );

        setModal({
          type:
            "FORM",

          mode:
            "CREATE",
        });
      } catch (
        error
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Offer Letter cannot be prepared",

          message:
            errorMessage(
              error,
              "Offer readiness could not be checked."
            ),
        });
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     FORM UPDATE
  ===================================================== */

  const update = (
    key,
    value
  ) => {
    setForm(
      (
        previous
      ) => ({
        ...previous,

        [key]:
          value,
      })
    );
  };

  /* =====================================================
     FORM VALIDATION
  ===================================================== */

  const validateForm =
    () => {
      if (
        !form
          .candidateName
          .trim()
      ) {
        return "Candidate name is required.";
      }

      if (
        !form
          .fatherName
          .trim()
      ) {
        return "Father's name is required.";
      }

      if (
        !form
          .residentialAddress
          .trim()
      ) {
        return "Residential address is required.";
      }

      if (
        !form.email
          .trim()
      ) {
        return "Candidate email is required.";
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.email.trim()
        )
      ) {
        return "Please enter a valid candidate email address.";
      }

      if (
        onlyDigits(
          form.mobile,
          10
        ).length !==
        10
      ) {
        return "Candidate mobile number must contain exactly 10 digits.";
      }

      if (
        !form
          .positionTitle
          .trim()
      ) {
        return "Position is required.";
      }

      if (
        !form
          .officeLocation
      ) {
        return "Office location is required.";
      }

      if (
        !form
          .reportingDate
      ) {
        return "Reporting / joining date is required.";
      }

      if (
        !form
          .issueDate
      ) {
        return "Offer issue date is required.";
      }

      return "";
    };

  /* =====================================================
     GENERATE
  ===================================================== */

  const generate =
    async () => {
      const validationError =
        validateForm();

      if (
        validationError
      ) {
        setModal({
          type:
            "FORM_ERROR",

          message:
            validationError,
        });

        return;
      }

      try {
        setBusy(
          "GENERATE"
        );

        setModal({
          type:
            "GENERATING",
        });

        const result =
          await generateSelectionOffer(
            selectionId,
            {
              candidateTitle:
                form
                  .candidateTitle,

              candidateName:
                form
                  .candidateName
                  .trim(),

              fatherName:
                form
                  .fatherName
                  .trim(),

              residentialAddress:
                form
                  .residentialAddress
                  .trim(),

              email:
                form
                  .email
                  .trim(),

              mobile:
                onlyDigits(
                  form.mobile,
                  10
                ),

              positionTitle:
                form
                  .positionTitle
                  .trim(),

              officeLocation:
                form
                  .officeLocation,

              compensationText:
                form
                  .compensationText
                  .trim(),

              reportingDate:
                form
                  .reportingDate,

              issueDate:
                form
                  .issueDate,

              hrName:
                form
                  .hrName
                  .trim(),

              hrDesignation:
                form
                  .hrDesignation
                  .trim(),

              hrEmail:
                form
                  .hrEmail
                  .trim(),

              signatoryName:
                form
                  .signatoryName
                  .trim(),

              signatoryDesignation:
                form
                  .signatoryDesignation
                  .trim(),
            }
          );

        const generatedOffer =
          normalizeOffer(
            result
          );

        if (
          generatedOffer
        ) {
          setOffer(
            generatedOffer
          );
        }

        if (
          onWorkflowChanged
        ) {
          await onWorkflowChanged();
        }

        await load();

        setModal({
          type:
            "GENERATED",
        });
      } catch (
        error
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Offer Letter could not be generated",

          message:
            errorMessage(
              error,
              "Please review the information and try again."
            ),
        });
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     EDIT / REGENERATE
  ===================================================== */

  const editOffer =
    () => {
      if (
        !hasGeneratedOffer
      ) {
        prepareOffer();

        return;
      }

      setForm({
        candidateTitle:
          offer
            ?.candidateTitle ||
          "Mr.",

        candidateName:
          offer
            ?.candidateName ||
          "",

        fatherName:
          offer
            ?.fatherName ||
          "",

        residentialAddress:
          offer
            ?.residentialAddress ||
          "",

        email:
          offer
            ?.email ||
          "",

        mobile:
          onlyDigits(
            offer
              ?.mobile,
            10
          ),

        positionTitle:
          offer
            ?.positionTitle ||
          "",

        officeLocation:
          offer
            ?.officeLocation ||
          "Delhi",

        compensationText:
          offer
            ?.compensationText ||
          "Your compensation will be as agreed during our discussions.",

        reportingDate:
          dateInput(
            offer
              ?.reportingDate
          ),

        issueDate:
          dateInput(
            offer
              ?.issueDate
          ),

        hrName:
          offer
            ?.hrName ||
          "",

        hrDesignation:
          offer
            ?.hrDesignation ||
          "HR Executive",

        hrEmail:
          offer
            ?.hrEmail ||
          "hrd@sandeepedgetech.com",

        signatoryName:
          offer
            ?.signatoryName ||
          "Renu",

        signatoryDesignation:
          offer
            ?.signatoryDesignation ||
          "HR Manager",
      });

      setModal({
        type:
          "FORM",

        mode:
          "EDIT",
      });
    };

  /* =====================================================
     OPEN PDF ONLY
  ===================================================== */

  const openOfferPdf =
    async () => {
      if (
        !hasGeneratedOffer
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Offer Letter unavailable",

          message:
            "The generated Offer Letter PDF is not available.",
        });

        return;
      }

      try {
        setBusy(
          "OPEN_PDF"
        );

        await openSelectionOfferPdf(
          selectionId
        );
      } catch (
        error
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Offer Letter could not be opened",

          message:
            errorMessage(
              error,
              "The stored Offer Letter PDF could not be opened."
            ),
        });
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     OPEN & REVIEW
  ===================================================== */

  const reviewPdf =
    async () => {
      if (
        !hasGeneratedOffer
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Offer Letter not generated",

          message:
            "Generate the Offer Letter before attempting HR review.",
        });

        return;
      }

      try {
        setBusy(
          "OPEN"
        );

        await openSelectionOfferPdf(
          selectionId
        );

        if (
          !offer
            ?.reviewedAt
        ) {
          const reviewedResult =
            await reviewSelectionOffer(
              selectionId
            );

          const reviewedOffer =
            normalizeOffer(
              reviewedResult
            );

          if (
            reviewedOffer
          ) {
            setOffer(
              reviewedOffer
            );
          }

          await load();
        }
      } catch (
        error
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Offer Letter could not be reviewed",

          message:
            errorMessage(
              error,
              "The generated Offer Letter could not be opened."
            ),
        });
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     SEND CONFIRM
  ===================================================== */

  const openSend =
    () => {
      if (
        !hasGeneratedOffer
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Generate Offer Letter first",

          message:
            "There is no generated Offer Letter available for candidate release.",
        });

        return;
      }

      if (
        !offer
          ?.reviewedAt
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Review required",

          message:
            "Open and review the current Offer Letter PDF before sending it to the candidate.",
        });

        return;
      }

      setModal({
        type:
          "SEND_CONFIRM",
      });
    };

  /* =====================================================
     SEND
  ===================================================== */

  const sendOffer =
    async () => {
      try {
        setBusy(
          "SEND"
        );

        setModal({
          type:
            "SENDING",
        });

        const result =
          await sendSelectionOffer(
            selectionId
          );

        const sentOffer =
          normalizeOffer(
            result
          );

        if (
          sentOffer
        ) {
          setOffer(
            sentOffer
          );
        }

        if (
          onWorkflowChanged
        ) {
          await onWorkflowChanged();
        }

        await load();

        setModal({
          type:
            "SENT",
        });
      } catch (
        error
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Offer Letter could not be sent",

          message:
            errorMessage(
              error,
              "Please try again."
            ),
        });
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     RENDER GUARDS
  ===================================================== */

  if (
    !offerStage
  ) {
    return null;
  }

  if (
    loading &&
    readiness ===
      null &&
    offer ===
      null
  ) {
    return (
      <section className="selection-offer-shell">

        <div className="selection-offer-loading">

          <div className="selection-spinner" />

          <span>
            Loading Offer workspace...
          </span>

        </div>

      </section>
    );
  }

  /* =====================================================
     READY
  ===================================================== */

  const renderReady =
    () => (
      <section className="selection-offer-shell selection-offer-shell--ready selection-offer-preparation-card">

        <div className="selection-offer-ready-visual">

          <div className="selection-offer-ready-icon">
            O
          </div>

          <div>

            <span>
              OFFER PREPARATION
            </span>

            <h2>
              Candidate is ready for Offer
            </h2>

            <p>
              HR verification is complete. Prepare the controlled company Offer Letter using the candidate information already available in SE-RMS.
            </p>

            <div className="selection-offer-ready-points">

              <span>
                ✓ Candidate details pre-filled
              </span>

              <span>
                ✓ Company legal template locked
              </span>

              <span>
                ✓ Unique reference generated automatically
              </span>

            </div>

          </div>

        </div>

        <div className="selection-offer-ready-side">

          <div className="selection-offer-ready-status">

            <span>
              CURRENT STAGE
            </span>

            <strong>
              Ready for Offer
            </strong>

          </div>

          <button
            type="button"
            className="selection-offer-primary selection-offer-prepare-button"
            onClick={
              prepareOffer
            }
            disabled={
              Boolean(
                busy
              )
            }
          >
            {busy ===
            "PREPARE"
              ? "Preparing..."
              : "Prepare Offer Letter"}

            <span>
              →
            </span>

          </button>

        </div>

      </section>
    );

  /* =====================================================
     GENERATED OFFER
  ===================================================== */

  const renderOffer =
    () => (
      <section className="selection-offer-shell selection-offer-shell--document">

        {/* ===============================================
            HEADER
        ================================================ */}

        <div className="selection-offer-heading">

          <div className="selection-offer-document-icon">
            PDF
          </div>

          <div className="selection-offer-heading-main">

            <div className="selection-offer-eyebrow">
              CONTROLLED EMPLOYMENT DOCUMENT
            </div>

            <h2>
              Offer Letter
            </h2>

            <p>
              Generated from the approved company legal template.
            </p>

          </div>

          <div
            className={
              `selection-offer-status ${
                offerAccepted
                  ? "is-reviewed"
                  : offerDeclined
                    ? "is-review"
                    : offerSent
                      ? "is-sent"
                      : offer
                          ?.reviewedAt
                        ? "is-reviewed"
                        : "is-review"
              }`
            }
          >
            {offerAccepted
              ? "Accepted"
              : offerDeclined
                ? "Declined"
                : offerSent
                  ? "Sent"
                  : offer
                      ?.reviewedAt
                    ? "Reviewed"
                    : "Review Required"}
          </div>

        </div>

        {/* ===============================================
            CONTROL DATA
        ================================================ */}

        <div className="selection-offer-reference">

          <div>

            <span>
              Reference Number
            </span>

            <strong>
              {offer
                ?.referenceNumber}
            </strong>

          </div>

          <div>

            <span>
              Version
            </span>

            <strong>
              V
              {offer
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
                offer
                  ?.issueDate
              )}
            </strong>

          </div>

          <div>

            <span>
              Reporting Date
            </span>

            <strong>
              {formatDate(
                offer
                  ?.reportingDate
              )}
            </strong>

          </div>

        </div>

        {/* ===============================================
            CANDIDATE / POSITION / HR
        ================================================ */}

        <div className="selection-offer-person-row">

          <div>

            <span>
              CANDIDATE
            </span>

            <strong>
              {offer
                ?.candidateName ||
                "—"}
            </strong>

            <small>
              {offer
                ?.email ||
                "—"}
            </small>

          </div>

          <div>

            <span>
              POSITION
            </span>

            <strong>
              {offer
                ?.positionTitle ||
                "—"}
            </strong>

            <small>
              {offer
                ?.officeLocation ||
                "—"}{" "}
              Office
            </small>

          </div>

          <div>

            <span>
              HR CONTACT
            </span>

            <strong>
              {offer
                ?.hrName ||
                "People & Culture"}
            </strong>

            <small>
              {offer
                ?.hrEmail ||
                "—"}
            </small>

          </div>

        </div>

        {/* ===============================================
            DRAFT / REVIEW
        ================================================ */}

        {!offerSent &&
        !offerAccepted &&
        !offerDeclined ? (
          <div className="selection-offer-review-control">

            <div className="selection-offer-review-copy">

              <span
                className={
                  offer
                    ?.reviewedAt
                    ? "selection-offer-review-symbol is-complete"
                    : "selection-offer-review-symbol"
                }
              >
                {offer
                  ?.reviewedAt
                  ? "✓"
                  : "!"}
              </span>

              <div>

                <strong>
                  {offer
                    ?.reviewedAt
                    ? "Offer reviewed by HR"
                    : "HR review required before release"}
                </strong>

                <p>
                  {offer
                    ?.reviewedAt
                    ? `Reviewed ${formatDate(
                        offer
                          .reviewedAt
                      )}. The controlled Offer Letter is ready for candidate release.`
                    : "Open the generated PDF and verify all legal, commercial and candidate information before sending."}
                </p>

              </div>

            </div>

            <div className="selection-offer-document-actions">

              <button
                type="button"
                className="selection-offer-open"
                onClick={
                  reviewPdf
                }
                disabled={
                  Boolean(
                    busy
                  )
                }
              >
                {busy ===
                "OPEN"
                  ? "Opening..."
                  : offer
                      ?.reviewedAt
                    ? "Open PDF"
                    : "Open & Review PDF"}
              </button>

              <button
                type="button"
                className="selection-offer-edit"
                onClick={
                  editOffer
                }
                disabled={
                  Boolean(
                    busy
                  )
                }
              >
                Edit Details
              </button>

              <button
                type="button"
                className="selection-offer-send"
                onClick={
                  openSend
                }
                disabled={
                  !offer
                    ?.reviewedAt ||
                  Boolean(
                    busy
                  )
                }
              >
                Send to Candidate

                <span>
                  →
                </span>

              </button>

            </div>

          </div>
        ) : (
          /* ===============================================
             PERMANENT SENT RECORD
          ================================================ */

          <div className="selection-offer-sent-record">

            <div className="selection-offer-sent-record-main">

              <div className="selection-offer-sent-record-check">
                ✓
              </div>

              <div className="selection-offer-sent-record-copy">

                <span className="selection-offer-sent-record-eyebrow">
                  CONTROLLED DOCUMENT RELEASED
                </span>

                <strong>
                  {offerAccepted
                    ? "Offer Letter accepted"
                    : offerDeclined
                      ? "Offer Letter response recorded"
                      : "Offer Letter sent successfully"}
                </strong>

                <p>
                  {offerSent
                    ? (
                      <>
                        Sent to{" "}
                        <b>
                          {offer
                            ?.sentToEmail ||
                            offer
                              ?.email ||
                            "candidate"}
                        </b>
                        {" on "}
                        {formatDate(
                          offer
                            ?.sentAt
                        )}
                        .
                      </>
                    )
                    : null}
                </p>

                <small>
                  The exact Offer Letter PDF remains permanently attached to this candidate's selection record.
                </small>

              </div>

            </div>

            <div className="selection-offer-sent-record-actions">

              <button
                type="button"
                className="selection-offer-open selection-offer-open--permanent"
                onClick={
                  openOfferPdf
                }
                disabled={
                  Boolean(
                    busy
                  )
                }
              >
                {busy ===
                "OPEN_PDF"
                  ? "Opening..."
                  : "Open Offer PDF"}
              </button>

            </div>

          </div>
        )}

        {/* ===============================================
            DOCUMENT HISTORY
        ================================================ */}

        {history.length >
        0 ? (
          <details className="selection-offer-history">

            <summary>

              <div className="selection-offer-history-summary">

                <div>

                  <span>
                    DOCUMENT RECORD
                  </span>

                  <strong>
                    Offer Letter History
                  </strong>

                </div>

                <small>
                  {history.length}
                  {" "}
                  {history.length ===
                  1
                    ? "version"
                    : "versions"}
                </small>

              </div>

            </summary>

            <div className="selection-offer-history-list">

              {history.map(
                (
                  item
                ) => {
                  const isCurrent =
                    String(
                      item._id
                    ) ===
                    String(
                      offer?._id
                    );

                  return (
                    <div
                      key={
                        item._id
                      }
                      className={
                        `selection-offer-history-item ${
                          isCurrent
                            ? "is-current"
                            : ""
                        }`
                      }
                    >

                      <div className="selection-offer-history-version">
                        V
                        {item
                          .version ||
                          1}
                      </div>

                      <div className="selection-offer-history-info">

                        <strong>
                          {item
                            .referenceNumber ||
                            "Offer Letter"}
                        </strong>

                        <span>
                          Generated{" "}
                          {formatDate(
                            item
                              .createdAt
                          )}
                          {" · "}
                          {pretty(
                            item
                              .status
                          )}
                        </span>

                        {item
                          ?.reviewedAt ? (
                          <small>
                            HR reviewed{" "}
                            {formatDate(
                              item
                                .reviewedAt
                            )}
                          </small>
                        ) : null}

                        {item
                          ?.sentAt ? (
                          <small>
                            Sent{" "}
                            {formatDate(
                              item
                                .sentAt
                            )}
                            {" to "}
                            {item
                              ?.sentToEmail ||
                              item
                                ?.email ||
                              "candidate"}
                          </small>
                        ) : null}

                      </div>

                      {isCurrent ? (
                        <span className="selection-offer-history-current">
                          Current
                        </span>
                      ) : null}

                    </div>
                  );
                }
              )}

            </div>

          </details>
        ) : null}

      </section>
    );

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <>

      {hasGeneratedOffer
        ? renderOffer()
        : renderReady()}

      {/* =================================================
          OFFER MODAL
      ================================================== */}

      {modal ? (
        <div className="selection-offer-modal-overlay">

          <div
            className={
              `selection-offer-modal ${
                modal.type ===
                  "FORM" ||
                modal.type ===
                  "FORM_ERROR"
                  ? "selection-offer-modal--large"
                  : ""
              }`
            }
          >

            {/* =============================================
                FORM
            ============================================== */}

            {modal.type ===
            "FORM" ? (
              <>

                <div className="selection-offer-modal-head">

                  <div className="selection-offer-modal-mark">
                    O
                  </div>

                  <div>

                    <span>
                      CONTROLLED OFFER LETTER
                    </span>

                    <h2>
                      {modal.mode ===
                      "EDIT"
                        ? "Revise Offer Letter"
                        : "Prepare Offer Letter"}
                    </h2>

                    <p>
                      Existing recruitment information is pre-filled. Complete the remaining legal and employment details before generating the PDF.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="selection-offer-modal-close"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    ×
                  </button>

                </div>

                {/* =========================================
                    LEGAL DOCUMENT NOTICE
                ========================================== */}

                <div className="selection-offer-legal-strip">

                  <div>
                    🔒
                  </div>

                  <div>

                    <strong>
                      Company legal template protected
                    </strong>

                    <span>
                      HR is entering variable information only. The approved Offer Letter clauses cannot be changed from this screen.
                    </span>

                  </div>

                </div>

                <div className="selection-offer-form">

                  {/* =======================================
                      CANDIDATE
                  ======================================== */}

                  <div className="selection-offer-form-section">

                    <div className="selection-offer-form-section-title">

                      <span>
                        01
                      </span>

                      <div>

                        <strong>
                          Candidate Information
                        </strong>

                        <small>
                          Legal identification and communication details
                        </small>

                      </div>

                    </div>

                    <div className="selection-offer-form-grid">

                      <label className="selection-offer-small-field">

                        <span>
                          Title
                        </span>

                        <select
                          value={
                            form
                              .candidateTitle
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "candidateTitle",
                              event
                                .target
                                .value
                            )
                          }
                        >

                          <option value="Mr.">
                            Mr.
                          </option>

                          <option value="Ms.">
                            Ms.
                          </option>

                          <option value="Mrs.">
                            Mrs.
                          </option>

                        </select>

                      </label>

                      <label>

                        <span>
                          Candidate Name *
                        </span>

                        <input
                          value={
                            form
                              .candidateName
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "candidateName",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label>

                        <span>
                          Father's Name *
                        </span>

                        <input
                          placeholder="Enter father's name"
                          value={
                            form
                              .fatherName
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "fatherName",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label>

                        <span>
                          Email *
                        </span>

                        <input
                          type="email"
                          value={
                            form.email
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "email",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label>

                        <span>
                          Mobile *
                        </span>

                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={
                            form.mobile
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "mobile",
                              onlyDigits(
                                event
                                  .target
                                  .value,
                                10
                              )
                            )
                          }
                        />

                        <small>
                          Exactly 10 digits
                        </small>

                      </label>

                      <label className="selection-offer-form-span-2">

                        <span>
                          Residential Address *
                        </span>

                        <textarea
                          placeholder="Complete residential address appearing on the Offer Letter"
                          value={
                            form
                              .residentialAddress
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "residentialAddress",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                    </div>

                  </div>

                  {/* =======================================
                      EMPLOYMENT
                  ======================================== */}

                  <div className="selection-offer-form-section">

                    <div className="selection-offer-form-section-title">

                      <span>
                        02
                      </span>

                      <div>

                        <strong>
                          Employment Details
                        </strong>

                        <small>
                          Position, location, compensation and reporting date
                        </small>

                      </div>

                    </div>

                    <div className="selection-offer-form-grid">

                      <label>

                        <span>
                          Position *
                        </span>

                        <input
                          value={
                            form
                              .positionTitle
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "positionTitle",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label>

                        <span>
                          Office Location *
                        </span>

                        <select
                          value={
                            form
                              .officeLocation
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "officeLocation",
                              event
                                .target
                                .value
                            )
                          }
                        >

                          <option value="Delhi">
                            Delhi
                          </option>

                          <option value="Sonipat">
                            Sonipat
                          </option>

                        </select>

                      </label>

                      <label>

                        <span>
                          Offer Issue Date *
                        </span>

                        <input
                          type="date"
                          value={
                            form
                              .issueDate
                          }
                          onChange={(
                            event
                          ) =>
                            update(
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
                          Reporting / Joining Date *
                        </span>

                        <input
                          type="date"
                          value={
                            form
                              .reportingDate
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "reportingDate",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label className="selection-offer-form-span-2">

                        <span>
                          Compensation Statement
                        </span>

                        <textarea
                          value={
                            form
                              .compensationText
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "compensationText",
                              event
                                .target
                                .value
                            )
                          }
                        />

                        <small>
                          This variable text is inserted into the approved legal Offer Letter sentence.
                        </small>

                      </label>

                    </div>

                  </div>

                  {/* =======================================
                      HR
                  ======================================== */}

                  <div className="selection-offer-form-section selection-offer-form-section--soft">

                    <div className="selection-offer-form-section-title">

                      <span>
                        03
                      </span>

                      <div>

                        <strong>
                          HR Contact & Signatory
                        </strong>

                        <small>
                          Reused from the recruitment workflow wherever available
                        </small>

                      </div>

                    </div>

                    <div className="selection-offer-form-grid">

                      <label>

                        <span>
                          HR Contact Name
                        </span>

                        <input
                          value={
                            form.hrName
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "hrName",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label>

                        <span>
                          HR Designation
                        </span>

                        <input
                          value={
                            form
                              .hrDesignation
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "hrDesignation",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label>

                        <span>
                          HR Email
                        </span>

                        <input
                          type="email"
                          value={
                            form.hrEmail
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "hrEmail",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label>

                        <span>
                          Signatory Name
                        </span>

                        <input
                          value={
                            form
                              .signatoryName
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "signatoryName",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                      <label>

                        <span>
                          Signatory Designation
                        </span>

                        <input
                          value={
                            form
                              .signatoryDesignation
                          }
                          onChange={(
                            event
                          ) =>
                            update(
                              "signatoryDesignation",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </label>

                    </div>

                  </div>

                </div>

                {/* =========================================
                    FORM FOOTER
                ========================================== */}

                <div className="selection-offer-form-footer">

                  <div>

                    <strong>
                      Controlled document generation
                    </strong>

                    <span>
                      A unique reference number and immutable PDF version will be created after generation.
                    </span>

                  </div>

                  <div>

                    <button
                      type="button"
                      className="selection-offer-modal-secondary"
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
                      className="selection-offer-primary"
                      onClick={
                        generate
                      }
                      disabled={
                        busy ===
                        "GENERATE"
                      }
                    >
                      {modal.mode ===
                      "EDIT"
                        ? "Generate Revised Offer"
                        : "Generate Offer Letter"}
                    </button>

                  </div>

                </div>

              </>
            ) : null}

            {/* =============================================
                FORM ERROR
            ============================================== */}

            {modal.type ===
            "FORM_ERROR" ? (
              <div className="selection-offer-modal-state">

                <div className="selection-offer-error">
                  !
                </div>

                <span className="selection-offer-error-kicker">
                  REQUIRED INFORMATION
                </span>

                <h2>
                  Offer details incomplete
                </h2>

                <p>
                  {modal.message}
                </p>

                <button
                  type="button"
                  className="selection-offer-primary selection-offer-modal-single"
                  onClick={() =>
                    setModal({
                      type:
                        "FORM",

                      mode:
                        hasGeneratedOffer
                          ? "EDIT"
                          : "CREATE",
                    })
                  }
                >
                  Continue Editing
                </button>

              </div>
            ) : null}

            {/* =============================================
                GENERATING
            ============================================== */}

            {modal.type ===
            "GENERATING" ? (
              <div className="selection-offer-modal-state">

                <div className="selection-spinner" />

                <span>
                  CONTROLLED DOCUMENT
                </span>

                <h2>
                  Generating Offer Letter
                </h2>

                <p>
                  SE-RMS is generating the legal PDF, assigning the controlled reference number and creating the document version.
                </p>

              </div>
            ) : null}

            {/* =============================================
                GENERATED
            ============================================== */}

            {modal.type ===
            "GENERATED" ? (
              <div className="selection-offer-modal-state">

                <div className="selection-offer-success">
                  ✓
                </div>

                <span>
                  OFFER GENERATED
                </span>

                <h2>
                  Offer Letter is ready
                </h2>

                <p>
                  The controlled PDF was generated successfully. It must now be reviewed by HR before release to the candidate.
                </p>

                <button
                  type="button"
                  className="selection-offer-primary selection-offer-modal-single"
                  onClick={() => {
                    setModal(
                      null
                    );

                    window.setTimeout(
                      () => {
                        reviewPdf();
                      },
                      120
                    );
                  }}
                >
                  Open & Review Offer
                </button>

              </div>
            ) : null}

            {/* =============================================
                SEND CONFIRM
            ============================================== */}

            {modal.type ===
            "SEND_CONFIRM" ? (
              <>

                <div className="selection-offer-send-head">

                  <div className="selection-offer-send-icon">
                    ↗
                  </div>

                  <span>
                    CANDIDATE RELEASE
                  </span>

                  <h2>
                    Send Offer Letter?
                  </h2>

                  <p>
                    The reviewed Offer Letter PDF will be emailed to the candidate.
                  </p>

                </div>

                <div className="selection-offer-send-summary">

                  <div>

                    <span>
                      Candidate
                    </span>

                    <strong>
                      {offer
                        ?.candidateName}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Email
                    </span>

                    <strong>
                      {offer
                        ?.email}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Controlled Document
                    </span>

                    <strong>
                      {offer
                        ?.referenceNumber}
                    </strong>

                    <small>
                      Version{" "}
                      {offer
                        ?.version ||
                        1}
                    </small>

                  </div>

                </div>

                <div className="selection-offer-modal-actions">

                  <button
                    type="button"
                    className="selection-offer-modal-secondary"
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
                    className="selection-offer-send"
                    onClick={
                      sendOffer
                    }
                    disabled={
                      busy ===
                      "SEND"
                    }
                  >
                    Send Offer Letter
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                SENDING
            ============================================== */}

            {modal.type ===
            "SENDING" ? (
              <div className="selection-offer-modal-state">

                <div className="selection-spinner" />

                <span>
                  CANDIDATE RELEASE
                </span>

                <h2>
                  Sending Offer Letter...
                </h2>

                <p>
                  The Offer Letter PDF is being emailed to the candidate.
                </p>

              </div>
            ) : null}

            {/* =============================================
                SENT
            ============================================== */}

            {modal.type ===
            "SENT" ? (
              <div className="selection-offer-modal-state">

                <div className="selection-offer-success">
                  ✓
                </div>

                <span>
                  OFFER RELEASED
                </span>

                <h2>
                  Offer Letter sent successfully
                </h2>

                <p>
                  The candidate has been sent the Offer Letter and the exact PDF remains available in this selection record.
                </p>

                <button
                  type="button"
                  className="selection-offer-primary selection-offer-modal-single"
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
              <div className="selection-offer-modal-state">

                <div className="selection-offer-error">
                  !
                </div>

                <span className="selection-offer-error-kicker">
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
                  className="selection-offer-primary selection-offer-modal-single"
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

    </>
  );
}

export default OfferWorkspace;