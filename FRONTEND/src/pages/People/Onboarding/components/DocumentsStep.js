import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import OnboardingStepCard from "./OnboardingStepCard";

import {
  getEmployeeDocuments,
  uploadEmployeeDocument,
} from "../../../../services/employeeDocumentService";

/* =========================================================
   HELPERS
========================================================= */

const getDocumentId =
  (
    document
  ) =>
    document?._id ||
    document?.id ||
    null;

const getDocumentName =
  (
    document,
    index
  ) =>
    document?.label ||
    document?.name ||
    document?.documentName ||
    document?.originalFileName ||
    document?.originalName ||
    `Document ${index + 1}`;

const getDocumentType =
  (
    document
  ) =>
    document?.documentType ||
    document?.category ||
    "DOCUMENT";

const getDocumentSource =
  (
    document
  ) =>
    String(
      document?.source ||
      "HR_UPLOAD"
    ).toUpperCase();

const getFileBadge =
  (
    document
  ) => {
    const mimeType =
      String(
        document?.mimeType ||
        ""
      ).toLowerCase();

    const extension =
      String(
        document?.extension ||
        ""
      ).toLowerCase();

    if (
      mimeType.includes(
        "pdf"
      ) ||
      extension ===
        ".pdf" ||
      extension ===
        "pdf"
    ) {
      return "PDF";
    }

    if (
      mimeType.includes(
        "image"
      )
    ) {
      return "IMG";
    }

    return "FILE";
  };

/* =========================================================
   DOCUMENT TYPES
========================================================= */

const DOCUMENT_TYPES = [
  {
    value:
      "NDA",

    label:
      "NDA",
  },

  {
    value:
      "DECLARATION",

    label:
      "Declaration",
  },

  {
    value:
      "POLICY_FORM",

    label:
      "Policy Form",
  },

  {
    value:
      "ID_PROOF",

    label:
      "ID Proof",
  },

  {
    value:
      "ADDRESS_PROOF",

    label:
      "Address Proof",
  },

  {
    value:
      "JOINING_FORM",

    label:
      "Joining Form",
  },

  {
    value:
      "CONFIDENTIALITY_AGREEMENT",

    label:
      "Confidentiality Agreement",
  },

  {
    value:
      "CODE_OF_CONDUCT",

    label:
      "Code of Conduct",
  },

  {
    value:
      "OTHER",

    label:
      "Other",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

function DocumentsStep({
  documents = [],
  maxDocuments = 10,

  /*
   * Parent uploading state remains supported,
   * but this component now handles its own API upload.
   */
  uploading = false,

  onOpen,
  onDelete,
  onOpenDocumentVault,

  /*
   * Optional callback AFTER upload succeeds.
   *
   * This is NOT responsible for doing the upload anymore.
   */
  onUploaded,
}) {
  /* =======================================================
     EMPLOYEE
  ======================================================= */

  const {
    employeeId,
  } =
    useParams();

  /* =======================================================
     LOCAL LIST

     Allows the document list to refresh immediately after
     upload without relying on parent state.
  ======================================================= */

  const [
    localDocuments,
    setLocalDocuments,
  ] =
    useState(
      Array.isArray(
        documents
      )
        ? documents
        : []
    );

  useEffect(
    () => {
      setLocalDocuments(
        Array.isArray(
          documents
        )
          ? documents
          : []
      );
    },
    [
      documents,
    ]
  );

  /* =======================================================
     MODAL
  ======================================================= */

  const [
    uploadOpen,
    setUploadOpen,
  ] =
    useState(
      false
    );

  const [
    title,
    setTitle,
  ] =
    useState(
      ""
    );

  const [
    documentType,
    setDocumentType,
  ] =
    useState(
      "NDA"
    );

  const [
    description,
    setDescription,
  ] =
    useState(
      ""
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState(
      null
    );

  const [
    localUploading,
    setLocalUploading,
  ] =
    useState(
      false
    );

  const [
    formError,
    setFormError,
  ] =
    useState(
      ""
    );

  const [
    uploadSuccess,
    setUploadSuccess,
  ] =
    useState(
      ""
    );

  const busy =
    Boolean(
      uploading ||
      localUploading
    );

  /* =======================================================
     DOCUMENT DATA
  ======================================================= */

  const documentList =
    Array.isArray(
      localDocuments
    )
      ? localDocuments
      : [];

  const hrDocuments =
    useMemo(
      () =>
        documentList.filter(
          (
            document
          ) =>
            getDocumentSource(
              document
            ) ===
            "HR_UPLOAD"
        ),
      [
        documentList,
      ]
    );

  const recruitmentDocuments =
    useMemo(
      () =>
        documentList.filter(
          (
            document
          ) => {
            const source =
              getDocumentSource(
                document
              );

            return [
              "RECRUITMENT",
              "CANDIDATE_PORTAL",
              "GENERATED",
              "SYSTEM",
            ].includes(
              source
            );
          }
        ),
      [
        documentList,
      ]
    );

  const totalDocuments =
    documentList.length;

  const hrUploaded =
    hrDocuments.length;

  const hrCapacityReached =
    hrUploaded >=
    maxDocuments;

  /* =======================================================
     RESET
  ======================================================= */

  const resetUploadForm =
    () => {
      setTitle(
        ""
      );

      setDocumentType(
        "NDA"
      );

      setDescription(
        ""
      );

      setSelectedFile(
        null
      );

      setFormError(
        ""
      );

      setUploadSuccess(
        ""
      );
    };

  /* =======================================================
     OPEN MODAL
  ======================================================= */

  const openUploadModal =
    () => {
      if (
        busy ||
        hrCapacityReached
      ) {
        return;
      }

      resetUploadForm();

      setUploadOpen(
        true
      );
    };

  /* =======================================================
     CLOSE
  ======================================================= */

  const closeUploadModal =
    () => {
      if (
        busy
      ) {
        return;
      }

      setUploadOpen(
        false
      );

      resetUploadForm();
    };

  /* =======================================================
     REFRESH VAULT
  ======================================================= */

  const refreshDocuments =
    async () => {
      if (
        !employeeId
      ) {
        return;
      }

      const vault =
        await getEmployeeDocuments(
          employeeId
        );

      const refreshed =
        Array.isArray(
          vault?.documents
        )
          ? vault.documents
          : [];

      setLocalDocuments(
        refreshed
      );

      return vault;
    };

  /* =======================================================
     SUBMIT

     IMPORTANT:
     The API request happens HERE directly.

     No parent upload handler is required.
  ======================================================= */

  const submitUpload =
    async () => {
      const cleanTitle =
        String(
          title ||
          ""
        ).trim();

      /* ===================================================
         EMPLOYEE
      =================================================== */

      if (
        !employeeId
      ) {
        setFormError(
          "Employee ID could not be found."
        );

        return;
      }

      /* ===================================================
         TITLE
      =================================================== */

      if (
        !cleanTitle
      ) {
        setFormError(
          "Document title is required."
        );

        return;
      }

      /* ===================================================
         FILE
      =================================================== */

      if (
        !selectedFile
      ) {
        setFormError(
          "Please select a document file."
        );

        return;
      }

      if (
        selectedFile.size <=
        0
      ) {
        setFormError(
          "Selected document is empty."
        );

        return;
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
      ];

      if (
        !allowedTypes.includes(
          selectedFile.type
        )
      ) {
        setFormError(
          "Only PDF, JPG and PNG documents are allowed."
        );

        return;
      }

      if (
        selectedFile.size >
        15 *
          1024 *
          1024
      ) {
        setFormError(
          "Document cannot exceed 15 MB."
        );

        return;
      }

      /* ===================================================
         UPLOAD
      =================================================== */

      setFormError(
        ""
      );

      setUploadSuccess(
        ""
      );

      setLocalUploading(
        true
      );

      try {
        const payload = {
          file:
            selectedFile,

          category:
            "JOINING",

          documentType,

          label:
            cleanTitle,

          description:
            String(
              description ||
              ""
            ).trim(),
        };

        console.log(
          "[DocumentsStep] Direct upload:",
          {
            employeeId,

            fileName:
              selectedFile.name,

            fileType:
              selectedFile.type,

            fileSize:
              selectedFile.size,

            title:
              cleanTitle,

            documentType,
          }
        );

        /*
         * DIRECT SERVICE CALL.
         *
         * This guarantees the request reaches:
         *
         * POST /api/v1/employee-documents/:employeeId
         */
        const result =
          await uploadEmployeeDocument(
            employeeId,
            payload
          );

        /*
         * Reload central document record.
         */
        const vault =
          await refreshDocuments();

        setUploadSuccess(
          "Document uploaded successfully."
        );

        /*
         * Optional notification to parent AFTER success.
         * It is not used to perform the upload.
         */
        if (
          typeof onUploaded ===
          "function"
        ) {
          await onUploaded({
            result,

            vault,
          });
        }

        /*
         * Small delay so success state is visible.
         */
        window.setTimeout(
          () => {
            setUploadOpen(
              false
            );

            resetUploadForm();
          },
          350
        );
      } catch (
        error
      ) {
        console.error(
          "[DocumentsStep] Upload failed:",
          error
        );

        setFormError(
          error?.message ||
          "Document could not be uploaded."
        );
      } finally {
        setLocalUploading(
          false
        );
      }
    };

  /* =======================================================
     FILE SELECT
  ======================================================= */

  const handleFileSelection =
    (
      event
    ) => {
      const file =
        event.target
          .files?.[0] ||
        null;

      setFormError(
        ""
      );

      if (
        !file
      ) {
        setSelectedFile(
          null
        );

        return;
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
      ];

      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        setSelectedFile(
          null
        );

        setFormError(
          "Only PDF, JPG and PNG documents are allowed."
        );

        event.target.value =
          "";

        return;
      }

      if (
        file.size >
        15 *
          1024 *
          1024
      ) {
        setSelectedFile(
          null
        );

        setFormError(
          "Document cannot exceed 15 MB."
        );

        event.target.value =
          "";

        return;
      }

      setSelectedFile(
        file
      );

      /*
       * Auto-fill title from filename only if HR hasn't
       * already entered one.
       */
      if (
        !String(
          title ||
          ""
        ).trim()
      ) {
        const autoTitle =
          file.name
            .replace(
              /\.[^/.]+$/,
              ""
            )
            .replace(
              /[-_]+/g,
              " "
            )
            .trim();

        setTitle(
          autoTitle
        );
      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <OnboardingStepCard
        number="03"
        title="Employee Documents"
        description="Maintain joining documents, signed HR forms and candidate submissions."
        status={
          totalDocuments >
          0
            ? "IN_PROGRESS"
            : "READY"
        }
      >

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="onboarding-documents-summary">

          <div>

            <span>
              DOCUMENTS AVAILABLE
            </span>

            <strong>
              {totalDocuments}
            </strong>

            <small>
              Central employee record
            </small>

          </div>

          <div>

            <span>
              HR UPLOAD CAPACITY
            </span>

            <strong>
              {hrUploaded}
              /
              {maxDocuments}
            </strong>

            <small>
              HR uploaded documents only
            </small>

          </div>

          <div>

            <span>
              RECRUITMENT RECORDS
            </span>

            <strong>
              {recruitmentDocuments.length}
            </strong>

            <small>
              Candidate + recruitment files
            </small>

          </div>

        </div>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className="onboarding-document-toolbar">

          <div>

            <strong>
              Employee Document Vault
            </strong>

            <span>
              Recruitment records and HR joining documents
              are maintained in one central employee record.
            </span>

          </div>

          <div>

            {onOpenDocumentVault ? (
              <button
                type="button"
                className="onboarding-secondary-button"
                onClick={
                  onOpenDocumentVault
                }
              >
                Open Document Vault
              </button>
            ) : null}

            <button
              type="button"
              className="onboarding-upload-button"
              disabled={
                busy ||
                hrCapacityReached
              }
              onClick={
                openUploadModal
              }
            >
              {busy
                ? "Uploading..."
                : hrCapacityReached
                  ? "Upload Limit Reached"
                  : "+ Upload Document"}
            </button>

          </div>

        </div>

        {/* =================================================
            LIST
        ================================================= */}

        {totalDocuments ? (
          <div className="onboarding-document-list">

            {documentList.map(
              (
                document,
                index
              ) => {
                const id =
                  getDocumentId(
                    document
                  );

                const source =
                  getDocumentSource(
                    document
                  );

                const isHrDocument =
                  source ===
                  "HR_UPLOAD";

                return (
                  <div
                    className="onboarding-document-row"
                    key={
                      id ||
                      `${getDocumentName(
                        document,
                        index
                      )}-${index}`
                    }
                  >

                    <div className="onboarding-document-type">
                      {getFileBadge(
                        document
                      )}
                    </div>

                    <div className="onboarding-document-name">

                      <strong>
                        {getDocumentName(
                          document,
                          index
                        )}
                      </strong>

                      <span>
                        {getDocumentType(
                          document
                        )}
                      </span>

                    </div>

                    <span
                      className={[
                        "onboarding-document-source",

                        isHrDocument
                          ? "is-hr"
                          : "is-recruitment",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " "
                        )}
                    >
                      {isHrDocument
                        ? "HR UPLOAD"
                        : source.replaceAll(
                            "_",
                            " "
                          )}
                    </span>

                    <div className="onboarding-document-actions">

                      <button
                        type="button"
                        className="onboarding-document-view-button"
                        disabled={
                          !id
                        }
                        onClick={() =>
                          onOpen?.(
                            document
                          )
                        }
                      >
                        View
                      </button>

                      {onDelete &&
                      isHrDocument ? (
                        <button
                          type="button"
                          className="onboarding-document-remove-button"
                          onClick={() =>
                            onDelete(
                              document
                            )
                          }
                        >
                          Remove
                        </button>
                      ) : null}

                    </div>

                  </div>
                );
              }
            )}

          </div>
        ) : (
          <div className="onboarding-empty-state">

            <strong>
              No employee documents available
            </strong>

            <span>
              Recruitment documents will appear automatically.
              HR can upload signed joining documents here.
            </span>

          </div>
        )}

      </OnboardingStepCard>

      {/* ===================================================
          UPLOAD MODAL
      =================================================== */}

      {uploadOpen ? (
        <div
          className="employee-document-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeUploadModal();
            }
          }}
        >

          <div
            className="employee-document-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Upload Employee Document"
          >

            {/* HEADER */}

            <div className="employee-document-modal-header">

              <div>

                <span>
                  EMPLOYEE DOCUMENT
                </span>

                <h3>
                  Upload Joining Document
                </h3>

                <p>
                  Add signed HR documents such as NDA,
                  declarations, joining forms and company
                  policy records.
                </p>

              </div>

              <button
                type="button"
                className="employee-document-modal-close"
                onClick={
                  closeUploadModal
                }
                disabled={
                  busy
                }
              >
                ×
              </button>

            </div>

            {/* BODY */}

            <div className="employee-document-modal-body">

              <div className="employee-document-form-grid">

                {/* TITLE */}

                <div className="employee-document-field employee-document-field--wide">

                  <label>
                    Document Title *
                  </label>

                  <input
                    type="text"
                    value={
                      title
                    }
                    placeholder="Example: Employee NDA"
                    maxLength={
                      160
                    }
                    disabled={
                      busy
                    }
                    onChange={(
                      event
                    ) =>
                      setTitle(
                        event.target
                          .value
                      )
                    }
                  />

                </div>

                {/* TYPE */}

                <div className="employee-document-field">

                  <label>
                    Document Type *
                  </label>

                  <select
                    value={
                      documentType
                    }
                    disabled={
                      busy
                    }
                    onChange={(
                      event
                    ) =>
                      setDocumentType(
                        event.target
                          .value
                      )
                    }
                  >
                    {DOCUMENT_TYPES.map(
                      (
                        option
                      ) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {option.label}
                        </option>
                      )
                    )}
                  </select>

                </div>

                {/* CATEGORY */}

                <div className="employee-document-field">

                  <label>
                    Category
                  </label>

                  <div className="employee-document-readonly">
                    Joining Document
                  </div>

                </div>

                {/* DESCRIPTION */}

                <div className="employee-document-field employee-document-field--wide">

                  <label>
                    Description
                  </label>

                  <textarea
                    value={
                      description
                    }
                    placeholder="Optional remarks about this document..."
                    rows={
                      3
                    }
                    disabled={
                      busy
                    }
                    onChange={(
                      event
                    ) =>
                      setDescription(
                        event.target
                          .value
                      )
                    }
                  />

                </div>

                {/* FILE */}

                <div className="employee-document-field employee-document-field--wide">

                  <label>
                    File *
                  </label>

                  <label className="employee-document-file-picker">

                    <div>

                      <strong>
                        {selectedFile
                          ? selectedFile.name
                          : "Choose document"}
                      </strong>

                      <span>
                        {selectedFile
                          ? `${(
                              selectedFile.size /
                              1024 /
                              1024
                            ).toFixed(
                              2
                            )} MB · ${selectedFile.type}`
                          : "PDF, JPG or PNG · Maximum 15 MB"}
                      </span>

                    </div>

                    <span className="employee-document-file-button">
                      {selectedFile
                        ? "Change"
                        : "Browse"}
                    </span>

                    <input
                      type="file"
                      hidden
                      disabled={
                        busy
                      }
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={
                        handleFileSelection
                      }
                    />

                  </label>

                </div>

              </div>

              {/* ERROR */}

              {formError ? (
                <div className="employee-document-form-error">
                  {formError}
                </div>
              ) : null}

              {/* SUCCESS */}

              {uploadSuccess ? (
                <div className="employee-document-form-success">
                  {uploadSuccess}
                </div>
              ) : null}

            </div>

            {/* FOOTER */}

            <div className="employee-document-modal-footer">

              <div>

                <span>
                  HR UPLOAD CAPACITY
                </span>

                <strong>
                  {hrUploaded}
                  /
                  {maxDocuments}
                </strong>

              </div>

              <div>

                <button
                  type="button"
                  className="employee-document-cancel-button"
                  disabled={
                    busy
                  }
                  onClick={
                    closeUploadModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="employee-document-submit-button"
                  disabled={
                    busy ||
                    !selectedFile ||
                    !String(
                      title ||
                      ""
                    ).trim()
                  }
                  onClick={
                    submitUpload
                  }
                >
                  {busy
                    ? "Uploading..."
                    : "Upload Document"}
                </button>

              </div>

            </div>

          </div>

        </div>
      ) : null}
    </>
  );
}

export default DocumentsStep;