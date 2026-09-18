import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  checkCandidateDuplicate,
  createCandidate,
} from "../../../services/recruitmentService";

import {
  deleteTemporaryResume,
  normalizeResumeParseResult,
  parseCandidateResume,
} from "../../../services/resumeParserService";

import ResumeUploadPanel from "./ResumeUploadPanel";

import ResumeReviewForm from "./ResumeReviewForm";

import {
  getApiErrorMessage,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   TEMP FILE
========================================================= */

const getTempFileName = (
  resume = {}
) => {
  return (
    resume?.tempFileName ||
    resume?.fileName ||
    resume?.filename ||
    ""
  );
};

/* =========================================================
   RESUME PAYLOAD
========================================================= */

const buildResumePayload = (
  resume,
  file,
  parserMeta
) => {
  const tempFileName =
    getTempFileName(
      resume
    );

  if (!tempFileName) {
    return {};
  }

  return {
    ...resume,

    tempFileName,

    fileName:
      resume?.fileName ||
      tempFileName,

    originalName:
      resume?.originalName ||
      file?.name ||
      "",

    mimeType:
      resume?.mimeType ||
      file?.type ||
      "application/pdf",

    size:
      Number(
        resume?.size ||
        file?.size ||
        0
      ),

    parsed:
      true,

    parserProvider:
      parserMeta?.provider ||
      resume?.parserProvider ||
      "LOCAL_PDF_PARSER",

    parserConfidence:
      parserMeta?.confidence ??
      null,
  };
};

/* =========================================================
   COMPONENT
========================================================= */

const AddCandidateDrawer = ({
  open,

  requirement,

  onClose,

  onCreated,
}) => {
  const requirementId =
    getRecordId(
      requirement
    );

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    parseResult,
    setParseResult,
  ] = useState(null);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

  const [
    parsing,
    setParsing,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /* =====================================================
     NORMALIZED RESULT
  ===================================================== */

  const normalized =
    useMemo(
      () =>
        parseResult
          ? normalizeResumeParseResult(
              parseResult
            )
          : {
              parsed: {},
              resume: {},
              duplicate: null,
              matching: {},
              reviewFields: [],
              parserMeta: {},
            },
      [
        parseResult,
      ]
    );

  const cvParsed =
    Boolean(
      parseResult
    );

  /* =====================================================
     RESET
  ===================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedFile(null);

    setParseResult(null);

    setUploading(false);

    setUploadProgress(0);

    setParsing(false);

    setCreating(false);

    setError("");
  }, [
    open,
    requirementId,
  ]);

  /* =====================================================
     CLEANUP
  ===================================================== */

  const cleanupTemporary =
    async () => {
      const fileName =
        getTempFileName(
          normalized.resume
        );

      if (!fileName) {
        return;
      }

      try {
        await deleteTemporaryResume(
          fileName
        );
      } catch (
        cleanupError
      ) {
        console.warn(
          "Temporary resume cleanup failed:",
          cleanupError
        );
      }
    };

  /* =====================================================
     CLOSE
  ===================================================== */

  const handleClose =
    async () => {
      if (
        uploading ||
        parsing ||
        creating
      ) {
        return;
      }

      if (parseResult) {
        await cleanupTemporary();
      }

      onClose?.();
    };

  /* =====================================================
     RESUME SELECTED
  ===================================================== */

  const handleFileSelected =
    async (
      file
    ) => {
      if (
        !file ||
        !requirementId
      ) {
        return;
      }

      /*
       * Delete previous temporary CV first
       * when replacing.
       */

      if (parseResult) {
        await cleanupTemporary();
      }

      try {
        setSelectedFile(
          file
        );

        setParseResult(null);

        setUploadProgress(0);

        setUploading(true);

        setParsing(false);

        setError("");

        let uploadFinished =
          false;

        const resultPromise =
          parseCandidateResume(
            file,
            requirementId,
            {
              onUploadProgress: (
                percent
              ) => {
                setUploadProgress(
                  percent
                );

                if (
                  percent >= 100 &&
                  !uploadFinished
                ) {
                  uploadFinished =
                    true;

                  setUploading(
                    false
                  );

                  setParsing(
                    true
                  );
                }
              },
            }
          );

        const result =
          await resultPromise;

        /*
         * Very fast localhost uploads can finish
         * without enough visible progress updates.
         */

        setUploadProgress(100);

        setUploading(false);

        setParsing(true);

        setParseResult(
          result
        );

        /*
         * Give React one short paint cycle
         * for "Parsed successfully".
         */

        await new Promise(
          (
            resolve
          ) =>
            setTimeout(
              resolve,
              220
            )
        );

        setParsing(false);
      } catch (
  parseError
) {
  setUploading(
    false
  );

  setParsing(
    false
  );

  setUploadProgress(
    0
  );

  setParseResult(
    null
  );

  /*
   * Upload failed.
   * Do not continue showing the file as if
   * it had been accepted by the server.
   */
  setSelectedFile(
    null
  );

  setError(
    getApiErrorMessage(
      parseError,
      "Resume could not be uploaded or parsed."
    )
  );
}
    };

  /* =====================================================
     REPLACE
  ===================================================== */

  const handleReplace =
    () => {
      setError("");
    };

  /* =====================================================
     CREATE
  ===================================================== */

  const handleCreate =
    async (
      reviewedPayload
    ) => {
      if (
        !requirementId
      ) {
        setError(
          "Hiring requirement ID is missing."
        );

        return;
      }

      if (!parseResult) {
        setError(
          "Please upload and parse the candidate CV first."
        );

        return;
      }

      try {
        setCreating(true);

        setError("");

        /* ===============================================
           DUPLICATE RECHECK AFTER HR EDITS
        ================================================ */

        const duplicateResult =
          await checkCandidateDuplicate({
            mobile:
              reviewedPayload
                ?.mobile ||
              "",

            email:
              reviewedPayload
                ?.email ||
              "",
          });

        const duplicateFound =
          Boolean(
            duplicateResult
              ?.duplicate ||
            duplicateResult
              ?.isDuplicate ||
            duplicateResult
              ?.candidate
              ?._id
          );

        if (
          duplicateFound
        ) {
          throw new Error(
            "A candidate with this mobile number or email already exists."
          );
        }

        const resume =
          buildResumePayload(
            normalized.resume,
            selectedFile,
            normalized.parserMeta
          );

        const payload = {
          ...reviewedPayload,

          resume,
        };

        const candidate =
          await createCandidate(
            requirementId,
            payload
          );

        await onCreated?.(
          candidate
        );
      } catch (
        createError
      ) {
        setError(
          getApiErrorMessage(
            createError,
            "Candidate could not be created."
          )
        );
      } finally {
        setCreating(false);
      }
    };

  /* =====================================================
     CLOSED
  ===================================================== */

  if (!open) {
    return null;
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div
      className="se-candidate-drawer-overlay"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      <section
        className="se-candidate-drawer se-candidate-single-form-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <header className="se-candidate-drawer-head se-single-form-head">
          <div className="se-candidate-head-main">
            <span>
              ADD CANDIDATE
            </span>

            <h2>
              {safeText(
                requirement
                  ?.positionTitle,
                "Candidate Intake"
              )}
            </h2>

            <p>
              <strong>
                {safeText(
                  requirement
                    ?.requestNumber,
                  "MPR"
                )}
              </strong>

              <i>
                •
              </i>

              {safeText(
                requirement
                  ?.department
                  ?.name,
                "Department"
              )}

              <i>
                •
              </i>

              Hiring Owner:{" "}
              <strong>
                {safeText(
                  requirement
                    ?.assignedHr
                    ?.displayName,
                  "HR Team"
                )}
              </strong>
            </p>
          </div>

          <button
            type="button"
            className="se-candidate-drawer-close"
            onClick={
              handleClose
            }
            disabled={
              uploading ||
              parsing ||
              creating
            }
          >
            ×
          </button>
        </header>

        {/* =================================================
            BODY
        ================================================== */}

        <div className="se-candidate-drawer-body se-single-form-body">
          {error ? (
            <div className="se-candidate-drawer-error">
              <span>
                !
              </span>

              <div>
                <strong>
                  Candidate intake needs attention
                </strong>

                <p>
                  {
                    error
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
              >
                ×
              </button>
            </div>
          ) : null}

          {/* =================================================
              CV UPLOAD
          ================================================== */}

          <ResumeUploadPanel
            file={
              selectedFile
            }
            uploading={
              uploading
            }
            uploadProgress={
              uploadProgress
            }
            parsing={
              parsing
            }
            parsed={
              cvParsed &&
              !parsing
            }
            onFileSelected={
              handleFileSelected
            }
            onReplace={
              handleReplace
            }
          />

          {/* =================================================
              SINGLE FORM

              Always visible.
              Empty before CV upload.
              Automatically filled after parser completes.
          ================================================== */}

          <ResumeReviewForm
            parsed={
              normalized.parsed
            }
            matching={
              normalized.matching
            }
            duplicate={
              normalized.duplicate
            }
            parserMeta={
              normalized.parserMeta
            }
            reviewFields={
              normalized.reviewFields
            }
            requirement={
              requirement
            }
            fileName={
              selectedFile
                ?.name ||
              ""
            }
            cvParsed={
              cvParsed
            }
            parsing={
              parsing
            }
            creating={
              creating
            }
            onCreate={
              handleCreate
            }
            onCancel={
              handleClose
            }
          />
        </div>
      </section>
    </div>
  );
};

export default AddCandidateDrawer;