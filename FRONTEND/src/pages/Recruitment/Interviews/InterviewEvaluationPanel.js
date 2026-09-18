import React, {
  useRef,
  useState,
} from "react";

import {
  openTemporaryInterviewEvaluationAttachment,
  removeInterviewEvaluationAttachment,
  submitInterviewEvaluation,
  uploadInterviewEvaluationAttachment,
} from "../../../services/interviewService";

import {
  getApiErrorMessage,
  getRecordId,
} from "../utils/recruitmentHelpers";

/* =========================================================
   CONFIG
========================================================= */

const RATINGS = [
  1,
  2,
  3,
  4,
  5,
];

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

const ALLOWED_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]);

/* =========================================================
   FILE SIZE
========================================================= */

const formatFileSize =
  (
    value
  ) => {
    const bytes =
      Number(
        value ||
          0
      );

    if (
      bytes <
      1024
    ) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 *
        1024
    ) {
      return `${(
        bytes /
        1024
      ).toFixed(
        1
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

/* =========================================================
   COMPONENT
========================================================= */

const InterviewEvaluationPanel = ({
  interview,

  onCompleted,
}) => {
  const fileInputRef =
    useRef(
      null
    );

  const [
    open,
    setOpen,
  ] = useState(
    false
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  /* =====================================================
     DOCUMENT STATE
  ===================================================== */

  const [
    attachment,
    setAttachment,
  ] = useState(
    null
  );

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(
    0
  );

  const [
    uploading,
    setUploading,
  ] = useState(
    false
  );

  const [
    removingFile,
    setRemovingFile,
  ] = useState(
    false
  );

  const [
    openingFile,
    setOpeningFile,
  ] = useState(
    false
  );

  /* =====================================================
     FORM
  ===================================================== */

  const [
    form,
    setForm,
  ] = useState({
    technicalSkills:
      "3",

    relevantExperience:
      "3",

    communication:
      "3",

    problemSolving:
      "3",

    roleFit:
      "3",

    professionalism:
      "3",

    overallRating:
      "3",

    recommendation:
      "HIRE",

    finalDecision:
      "HOLD",

    strengths:
      "",

    concerns:
      "",

    remarks:
      "",
  });

  const interviewId =
    getRecordId(
      interview
    );

  /* =====================================================
     UPDATE
  ===================================================== */

  const update =
    (
      name,
      value
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,

          [name]:
            value,
        })
      );
    };

  /* =====================================================
     SELECT FILE
  ===================================================== */

  const handleFileSelected =
    async (
      event
    ) => {
      const file =
        event
          ?.target
          ?.files
          ?.[0];

      if (
        event
          ?.target
      ) {
        event.target.value =
          "";
      }

      if (
        !file
      ) {
        return;
      }

      if (
        !interviewId
      ) {
        setError(
          "Interview ID is missing."
        );

        return;
      }

      if (
        !ALLOWED_TYPES.has(
          file.type
        )
      ) {
        setError(
          "Please upload a PDF, JPG, JPEG or PNG file."
        );

        return;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        setError(
          "Evaluation document cannot be larger than 10 MB."
        );

        return;
      }

      try {
        setUploading(
          true
        );

        setUploadProgress(
          0
        );

        setError(
          ""
        );

        /*
         * If HR/interviewer replaces an existing staged file,
         * remove the previous temporary copy first.
         */

        if (
          attachment
            ?.storedName
        ) {
          try {
            await removeInterviewEvaluationAttachment(
              interviewId,
              attachment
                .storedName
            );
          } catch (
            removeError
          ) {
            console.warn(
              "Previous evaluation attachment cleanup failed:",
              removeError
            );
          }

          setAttachment(
            null
          );
        }

        const uploaded =
          await uploadInterviewEvaluationAttachment(
            interviewId,
            file,
            (
              percent
            ) => {
              setUploadProgress(
                percent
              );
            }
          );

        setUploadProgress(
          100
        );

        setAttachment({
          storedName:
            uploaded
              ?.storedName,

          originalName:
            uploaded
              ?.originalName ||
            file.name,

          mimeType:
            uploaded
              ?.mimeType ||
            file.type,

          size:
            Number(
              uploaded
                ?.size ||
                file.size ||
                0
            ),
        });
      } catch (
        uploadError
      ) {
        setAttachment(
          null
        );

        setUploadProgress(
          0
        );

        setError(
          getApiErrorMessage(
            uploadError,
            "Evaluation document could not be uploaded."
          )
        );
      } finally {
        setUploading(
          false
        );
      }
    };

  /* =====================================================
     OPEN FILE
  ===================================================== */

  const handleOpenAttachment =
    async () => {
      if (
        !interviewId ||
        !attachment
          ?.storedName
      ) {
        return;
      }

      try {
        setOpeningFile(
          true
        );

        setError(
          ""
        );

        await openTemporaryInterviewEvaluationAttachment(
          interviewId,
          attachment
            .storedName
        );
      } catch (
        openError
      ) {
        setError(
          getApiErrorMessage(
            openError,
            "Evaluation document could not be opened."
          )
        );
      } finally {
        setOpeningFile(
          false
        );
      }
    };

  /* =====================================================
     REMOVE FILE
  ===================================================== */

  const handleRemoveAttachment =
    async () => {
      if (
        !attachment
          ?.storedName
      ) {
        setAttachment(
          null
        );

        return;
      }

      try {
        setRemovingFile(
          true
        );

        setError(
          ""
        );

        await removeInterviewEvaluationAttachment(
          interviewId,
          attachment
            .storedName
        );

        setAttachment(
          null
        );

        setUploadProgress(
          0
        );
      } catch (
        removeError
      ) {
        setError(
          getApiErrorMessage(
            removeError,
            "Evaluation document could not be removed."
          )
        );
      } finally {
        setRemovingFile(
          false
        );
      }
    };

  /* =====================================================
     CLOSE
  ===================================================== */

  const handleClose =
    async () => {
      if (
        submitting ||
        uploading ||
        removingFile
      ) {
        return;
      }

      /*
       * Evaluation was not completed.
       * Remove staged temporary document.
       */

      if (
        attachment
          ?.storedName
      ) {
        try {
          await removeInterviewEvaluationAttachment(
            interviewId,
            attachment
              .storedName
          );
        } catch (
          cleanupError
        ) {
          console.warn(
            "Evaluation attachment cleanup failed:",
            cleanupError
          );
        }
      }

      setAttachment(
        null
      );

      setUploadProgress(
        0
      );

      setError(
        ""
      );

      setOpen(
        false
      );
    };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const submit =
    async () => {
      if (
        !interviewId
      ) {
        setError(
          "Interview ID is missing."
        );

        return;
      }

      if (
        uploading
      ) {
        setError(
          "Please wait for the evaluation document upload to finish."
        );

        return;
      }

      try {
        setSubmitting(
          true
        );

        setError(
          ""
        );

        const payload = {
          technicalSkills:
            Number(
              form.technicalSkills
            ),

          relevantExperience:
            Number(
              form.relevantExperience
            ),

          communication:
            Number(
              form.communication
            ),

          problemSolving:
            Number(
              form.problemSolving
            ),

          roleFit:
            Number(
              form.roleFit
            ),

          professionalism:
            Number(
              form.professionalism
            ),

          overallRating:
            Number(
              form.overallRating
            ),

          recommendation:
            form.recommendation,

          finalDecision:
            form.finalDecision,

          strengths:
            form.strengths
              .trim(),

          concerns:
            form.concerns
              .trim(),

          remarks:
            form.remarks
              .trim(),

          /*
           * Optional.
           * Existing evaluation still works without file.
           */

          attachment:
            attachment
              ?.storedName
              ? {
                  storedName:
                    attachment
                      .storedName,

                  originalName:
                    attachment
                      .originalName,

                  mimeType:
                    attachment
                      .mimeType,

                  size:
                    attachment
                      .size,
                }
              : null,
        };

        const result =
          await submitInterviewEvaluation(
            interviewId,
            payload
          );

        /*
         * Do not delete temp file here.
         * Backend already moved it to permanent storage.
         */

        setAttachment(
          null
        );

        setUploadProgress(
          0
        );

        setOpen(
          false
        );

        await onCompleted?.(
          result
        );
      } catch (
        submitError
      ) {
        setError(
          getApiErrorMessage(
            submitError,
            "Interview evaluation could not be saved."
          )
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>
      <button
        type="button"
        className="se-interview-evaluate-trigger"
        onClick={() => {
          setError(
            ""
          );

          setOpen(
            true
          );
        }}
      >
        <span>
          ✓
        </span>

        Complete Evaluation
      </button>

      {open ? (
        <div
          className="se-interview-modal-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !submitting &&
              !uploading &&
              !removingFile
            ) {
              handleClose();
            }
          }}
        >
          <section
            className="se-interview-evaluation-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <header className="se-interview-modal-head">
              <div>
                <span>
                  INTERVIEW · EVALUATION
                </span>

                <h2>
                  Interview Evaluation
                </h2>

                <p>
                  Record interviewer feedback
                  and the final hiring
                  decision.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleClose
                }
                disabled={
                  submitting ||
                  uploading ||
                  removingFile
                }
              >
                ×
              </button>
            </header>

            <div className="se-interview-evaluation-body">
              {error ? (
                <div className="se-interview-error">
                  <span>
                    !
                  </span>

                  <p>
                    {
                      error
                    }
                  </p>
                </div>
              ) : null}

              {/* =================================================
                  01 ASSESSMENT
              ================================================== */}

              <section>
                <div className="se-interview-section-title">
                  <span>
                    01
                  </span>

                  <div>
                    <strong>
                      Assessment
                    </strong>

                    <small>
                      Rate each area from 1 to
                      5.
                    </small>
                  </div>
                </div>

                <div className="se-interview-rating-grid">
                  {[
                    [
                      "technicalSkills",
                      "Technical Skills",
                    ],

                    [
                      "relevantExperience",
                      "Relevant Experience",
                    ],

                    [
                      "communication",
                      "Communication",
                    ],

                    [
                      "problemSolving",
                      "Problem Solving",
                    ],

                    [
                      "roleFit",
                      "Role Fit",
                    ],

                    [
                      "professionalism",
                      "Professionalism",
                    ],

                    [
                      "overallRating",
                      "Overall Rating",
                    ],
                  ].map(
                    (
                      [
                        key,
                        label,
                      ]
                    ) => (
                      <label
                        key={
                          key
                        }
                      >
                        <span>
                          {
                            label
                          }
                        </span>

                        <div className="se-interview-rating-options">
                          {RATINGS.map(
                            (
                              rating
                            ) => (
                              <button
                                type="button"
                                key={
                                  rating
                                }
                                className={
                                  Number(
                                    form[
                                      key
                                    ]
                                  ) ===
                                  rating
                                    ? "active"
                                    : ""
                                }
                                disabled={
                                  submitting
                                }
                                onClick={() =>
                                  update(
                                    key,
                                    String(
                                      rating
                                    )
                                  )
                                }
                              >
                                {
                                  rating
                                }
                              </button>
                            )
                          )}
                        </div>
                      </label>
                    )
                  )}
                </div>
              </section>

              {/* =================================================
                  02 RECOMMENDATION
              ================================================== */}

              <section>
                <div className="se-interview-section-title">
                  <span>
                    02
                  </span>

                  <div>
                    <strong>
                      Recommendation
                    </strong>

                    <small>
                      Interviewer's
                      recommendation.
                    </small>
                  </div>
                </div>

                <div className="se-interview-decision-grid">
                  {[
                    [
                      "STRONG_HIRE",
                      "★",
                      "Strong Hire",
                    ],

                    [
                      "HIRE",
                      "✓",
                      "Hire",
                    ],

                    [
                      "HOLD",
                      "—",
                      "Hold",
                    ],

                    [
                      "REJECT",
                      "×",
                      "Reject",
                    ],
                  ].map(
                    (
                      [
                        value,
                        icon,
                        label,
                      ]
                    ) => (
                      <button
                        type="button"
                        key={
                          value
                        }
                        disabled={
                          submitting
                        }
                        className={
                          form.recommendation ===
                          value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          update(
                            "recommendation",
                            value
                          )
                        }
                      >
                        <span>
                          {
                            icon
                          }
                        </span>

                        {
                          label
                        }
                      </button>
                    )
                  )}
                </div>
              </section>

              {/* =================================================
                  03 FINAL DECISION
              ================================================== */}

              <section>
                <div className="se-interview-section-title">
                  <span>
                    03
                  </span>

                  <div>
                    <strong>
                      Final Decision
                    </strong>

                    <small>
                      This updates candidate
                      workflow automatically.
                    </small>
                  </div>
                </div>

                <div className="se-interview-final-decision">
                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    className={
                      form.finalDecision ===
                      "SELECTED"
                        ? "selected active"
                        : "selected"
                    }
                    onClick={() =>
                      update(
                        "finalDecision",
                        "SELECTED"
                      )
                    }
                  >
                    <span>
                      ✓
                    </span>

                    <div>
                      <strong>
                        Selected
                      </strong>

                      <small>
                        Candidate moves to
                        SELECTED
                      </small>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    className={
                      form.finalDecision ===
                      "HOLD"
                        ? "hold active"
                        : "hold"
                    }
                    onClick={() =>
                      update(
                        "finalDecision",
                        "HOLD"
                      )
                    }
                  >
                    <span>
                      —
                    </span>

                    <div>
                      <strong>
                        Hold
                      </strong>

                      <small>
                        Keep candidate under
                        review
                      </small>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    className={
                      form.finalDecision ===
                      "REJECTED"
                        ? "rejected active"
                        : "rejected"
                    }
                    onClick={() =>
                      update(
                        "finalDecision",
                        "REJECTED"
                      )
                    }
                  >
                    <span>
                      ×
                    </span>

                    <div>
                      <strong>
                        Rejected
                      </strong>

                      <small>
                        Candidate is rejected
                        after interview
                      </small>
                    </div>
                  </button>
                </div>
              </section>

              {/* =================================================
                  04 NOTES
              ================================================== */}

              <section>
                <div className="se-interview-section-title">
                  <span>
                    04
                  </span>

                  <div>
                    <strong>
                      Notes
                    </strong>

                    <small>
                      Preserve interview
                      feedback.
                    </small>
                  </div>
                </div>

                <label className="se-interview-text-field">
                  <span>
                    Strengths
                  </span>

                  <textarea
                    value={
                      form.strengths
                    }
                    disabled={
                      submitting
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "strengths",
                        event
                          .target
                          .value
                      )
                    }
                  />
                </label>

                <label className="se-interview-text-field">
                  <span>
                    Concerns
                  </span>

                  <textarea
                    value={
                      form.concerns
                    }
                    disabled={
                      submitting
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "concerns",
                        event
                          .target
                          .value
                      )
                    }
                  />
                </label>

                <label className="se-interview-text-field">
                  <span>
                    Final Remarks
                  </span>

                  <textarea
                    value={
                      form.remarks
                    }
                    disabled={
                      submitting
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "remarks",
                        event
                          .target
                          .value
                      )
                    }
                  />
                </label>
              </section>

              {/* =================================================
                  05 INTERVIEW DOCUMENT
              ================================================== */}

              <section className="se-evaluation-document-section">
                <div className="se-interview-section-title">
                  <span>
                    05
                  </span>

                  <div>
                    <strong>
                      Interview Document
                    </strong>

                    <small>
                      Optional — attach the
                      marked CV, interview
                      sheet or handwritten
                      notes for the permanent
                      recruitment record.
                    </small>
                  </div>
                </div>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="se-evaluation-file-input"
                  onChange={
                    handleFileSelected
                  }
                />

                {/* =========================================
                    NO FILE
                ========================================== */}

                {!attachment &&
                !uploading ? (
                  <button
                    type="button"
                    className="se-evaluation-upload-zone"
                    disabled={
                      submitting
                    }
                    onClick={() =>
                      fileInputRef
                        .current
                        ?.click()
                    }
                  >
                    <span className="se-evaluation-upload-icon">
                      ↑
                    </span>

                    <div>
                      <strong>
                        Upload interview document
                      </strong>

                      <p>
                        Marked CV, handwritten
                        evaluation sheet or
                        interview notes
                      </p>

                      <small>
                        PDF, JPG, JPEG or PNG ·
                        Maximum 10 MB
                      </small>
                    </div>

                    <b>
                      Browse
                    </b>
                  </button>
                ) : null}

                {/* =========================================
                    UPLOADING
                ========================================== */}

                {uploading ? (
                  <div className="se-evaluation-upload-progress-card">
                    <div className="se-evaluation-upload-progress-head">
                      <span>
                        ↑
                      </span>

                      <div>
                        <strong>
                          Uploading document
                        </strong>

                        <small>
                          Please keep this
                          window open
                        </small>
                      </div>

                      <b>
                        {
                          uploadProgress
                        }
                        %
                      </b>
                    </div>

                    <div className="se-evaluation-upload-progress-track">
                      <span
                        style={{
                          width:
                            `${uploadProgress}%`,
                        }}
                      />
                    </div>

                    <div className="se-evaluation-upload-progress-footer">
                      <span>
                        {uploadProgress <
                        100
                          ? "Uploading securely..."
                          : "Finalising upload..."}
                      </span>

                      <strong>
                        {uploadProgress}
                        /100
                      </strong>
                    </div>
                  </div>
                ) : null}

                {/* =========================================
                    UPLOADED FILE
                ========================================== */}

                {attachment &&
                !uploading ? (
                  <div className="se-evaluation-uploaded-file">
                    <div className="se-evaluation-file-status">
                      <span>
                        ✓
                      </span>

                      <div>
                        <small>
                          UPLOAD COMPLETE
                        </small>

                        <strong>
                          {
                            attachment
                              .originalName
                          }
                        </strong>

                        <p>
                          {formatFileSize(
                            attachment
                              .size
                          )}

                          {" · "}

                          Ready to attach to
                          evaluation
                        </p>
                      </div>
                    </div>

                    <div className="se-evaluation-file-actions">
                      <button
                        type="button"
                        className="open"
                        disabled={
                          openingFile ||
                          removingFile ||
                          submitting
                        }
                        onClick={
                          handleOpenAttachment
                        }
                      >
                        {openingFile
                          ? "Opening..."
                          : "Open & Check"}
                      </button>

                      <button
                        type="button"
                        className="replace"
                        disabled={
                          removingFile ||
                          submitting
                        }
                        onClick={() =>
                          fileInputRef
                            .current
                            ?.click()
                        }
                      >
                        Replace
                      </button>

                      <button
                        type="button"
                        className="remove"
                        disabled={
                          removingFile ||
                          submitting
                        }
                        onClick={
                          handleRemoveAttachment
                        }
                      >
                        {removingFile
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="se-evaluation-document-note">
                  <span>
                    i
                  </span>

                  <p>
                    The document is optional.
                    Uploading it does not
                    complete the interview.
                    You can open and cross-check
                    the file before clicking
                    <strong>
                      {" "}
                      Complete Interview
                    </strong>
                    .
                  </p>
                </div>
              </section>
            </div>

            {/* =================================================
                FOOTER
            ================================================== */}

            <footer className="se-interview-evaluation-actions">
              <button
                type="button"
                className="secondary"
                onClick={
                  handleClose
                }
                disabled={
                  submitting ||
                  uploading ||
                  removingFile
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary"
                onClick={
                  submit
                }
                disabled={
                  submitting ||
                  uploading ||
                  removingFile
                }
              >
                {submitting
                  ? "Saving Evaluation..."
                  : uploading
                    ? `Uploading ${uploadProgress}%`
                    : "Complete Interview"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
};

export default InterviewEvaluationPanel;