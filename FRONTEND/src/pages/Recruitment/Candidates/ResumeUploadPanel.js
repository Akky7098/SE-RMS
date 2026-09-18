import React, {
  useRef,
  useState,
} from "react";

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

/* =========================================================
   SIZE
========================================================= */

const formatFileSize = (
  bytes
) => {
  const size =
    Number(
      bytes || 0
    );

  if (!size) {
    return "";
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${Math.ceil(
      size / 1024
    )} KB`;
  }

  return `${(
    size /
    (
      1024 *
      1024
    )
  ).toFixed(1)} MB`;
};

/* =========================================================
   COMPONENT
========================================================= */

const ResumeUploadPanel = ({
  file = null,

  uploading = false,

  uploadProgress = 0,

  parsing = false,

  parsed = false,

  onFileSelected,

  onReplace,
}) => {
  const inputRef =
    useRef(null);

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /* =====================================================
     VALIDATE
  ===================================================== */

  const validate = (
    selected
  ) => {
    setError("");

    if (!selected) {
      return;
    }

    const fileName =
      String(
        selected?.name ||
          ""
      ).toLowerCase();

    const isPdf =
      selected?.type ===
        "application/pdf" ||
      fileName.endsWith(
        ".pdf"
      );

    if (!isPdf) {
      setError(
        "Only PDF resumes are supported."
      );

      return;
    }

    if (
      Number(
        selected?.size ||
          0
      ) >
      MAX_FILE_SIZE
    ) {
      setError(
        "Resume must be 10 MB or smaller."
      );

      return;
    }

    onFileSelected?.(
      selected
    );
  };

  /* =====================================================
     OPEN
  ===================================================== */

  const openPicker =
    () => {
      if (
        uploading ||
        parsing
      ) {
        return;
      }

      inputRef
        .current
        ?.click();
    };

  /* =====================================================
     DROP
  ===================================================== */

  const handleDrop =
    (
      event
    ) => {
      event.preventDefault();

      setDragActive(false);

      if (
        uploading ||
        parsing
      ) {
        return;
      }

      validate(
        event
          ?.dataTransfer
          ?.files?.[0]
      );
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <section className="se-single-cv-section">
      <div className="se-single-cv-head">
        <div>
          <span>
            RESUME
          </span>

          <h3>
            Candidate CV
          </h3>

          <p>
            Upload once and review the
            automatically extracted details below.
          </p>
        </div>

        {file &&
        !uploading &&
        !parsing ? (
          <button
            type="button"
            onClick={() => {
              onReplace?.();

              inputRef
                .current
                ?.click();
            }}
          >
            ↻ Replace CV
          </button>
        ) : null}
      </div>

      <input
        ref={
          inputRef
        }
        type="file"
        accept=".pdf,application/pdf"
        hidden
        onChange={(
          event
        ) => {
          validate(
            event
              ?.target
              ?.files?.[0]
          );

          event.target.value =
            "";
        }}
      />

      {!file ? (
        <button
          type="button"
          className={[
            "se-single-cv-drop",

            dragActive
              ? "dragging"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={
            openPicker
          }
          onDragEnter={(
            event
          ) => {
            event.preventDefault();

            setDragActive(
              true
            );
          }}
          onDragOver={(
            event
          ) =>
            event.preventDefault()
          }
          onDragLeave={() =>
            setDragActive(
              false
            )
          }
          onDrop={
            handleDrop
          }
        >
          <span className="upload-icon">
            ↑
          </span>

          <div>
            <strong>
              Upload candidate CV
            </strong>

            <p>
              Drop PDF here or click
              to select a resume
            </p>
          </div>

          <span className="select-file">
            Select PDF
          </span>

          <small>
            PDF · Max 10 MB
          </small>
        </button>
      ) : (
        <div className="se-single-cv-file">
          <span className="pdf-icon">
            PDF
          </span>

          <div className="file-main">
            <strong>
              {
                file.name
              }
            </strong>

            <small>
              {formatFileSize(
                file.size
              )}
            </small>
          </div>

          <div className="file-status">
            {uploading ? (
              <>
                <span>
                  Uploading
                </span>

                <strong>
                  {
                    uploadProgress
                  }
                  %
                </strong>
              </>
            ) : parsing ? (
              <>
                <span>
                  Upload complete ✓
                </span>

                <strong>
                  Extracting...
                </strong>
              </>
            ) : parsed ? (
              <>
                <span className="success">
                  ✓ CV PARSED
                </span>

                <strong className="success">
                  Parsed successfully
                </strong>
              </>
            ) : null}
          </div>

          {uploading ? (
            <div className="se-single-upload-progress">
              <span
                style={{
                  width:
                    `${uploadProgress}%`,
                }}
              />
            </div>
          ) : null}

          {parsing ? (
            <div className="se-single-parser-line">
              <span />

              <p>
                Reading contact details,
                employment, skills and education...
              </p>
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <div className="se-single-cv-error">
          <span>
            !
          </span>

          {
            error
          }
        </div>
      ) : null}
    </section>
  );
};

export default ResumeUploadPanel;