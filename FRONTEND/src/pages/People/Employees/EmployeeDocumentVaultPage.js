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

import {
  getEmployeeById,
} from "../../../services/employeeService";

import {
  getEmployeeDocuments,
  uploadEmployeeDocument,
  openEmployeeDocument,
  deleteEmployeeDocument,
  generateEmployeeDocumentBundle,
} from "../../../services/employeeDocumentService";

import "./Employees.css";

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_FILE_SIZE =
  15 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const DOCUMENT_TYPES = [
  {
    value: "NDA",
    label: "NDA",
  },
  {
    value: "AADHAAR",
    label: "Aadhaar",
  },
  {
    value: "PAN",
    label: "PAN",
  },
  {
    value: "ADDRESS_PROOF",
    label: "Address Proof",
  },
  {
    value: "EDUCATION",
    label: "Education Certificate",
  },
  {
    value: "EXPERIENCE",
    label: "Experience Certificate",
  },
  {
    value: "OFFER_LETTER",
    label: "Offer Letter",
  },
  {
    value: "APPOINTMENT_LETTER",
    label: "Appointment Letter",
  },
  {
    value: "JOINING_FORM",
    label: "Joining Form",
  },
  {
    value: "DECLARATION",
    label: "Declaration",
  },
  {
    value: "POLICY",
    label: "Policy / Undertaking",
  },
  {
    value: "ASSET_ACKNOWLEDGEMENT",
    label: "Asset Acknowledgement",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const extractDocuments =
  (
    value
  ) => {
    if (
      Array.isArray(
        value
      )
    ) {
      return value;
    }

    if (
      Array.isArray(
        value?.documents
      )
    ) {
      return value.documents;
    }

    if (
      Array.isArray(
        value?.items
      )
    ) {
      return value.items;
    }

    if (
      Array.isArray(
        value?.data
      )
    ) {
      return value.data;
    }

    if (
      Array.isArray(
        value?.vault?.documents
      )
    ) {
      return value.vault.documents;
    }

    return [];
  };

const documentId =
  (
    document
  ) =>
    document?._id ||
    document?.id ||
    document?.documentId ||
    "";

const documentName =
  (
    document
  ) =>
    document?.label ||
    document?.name ||
    document?.documentName ||
    document?.fileName ||
    document?.originalName ||
    "Employee Document";

const pretty =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .replace(
        /_/g,
        " "
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character.toUpperCase()
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

    return date.toLocaleDateString(
      "en-IN",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
      }
    );
  };

const formatBytes =
  (
    bytes
  ) => {
    const size =
      Number(
        bytes
      );

    if (
      !Number.isFinite(
        size
      ) ||
      size <= 0
    ) {
      return "";
    }

    if (
      size <
      1024 * 1024
    ) {
      return `${(
        size / 1024
      ).toFixed(
        0
      )} KB`;
    }

    return `${(
      size /
      1024 /
      1024
    ).toFixed(
      2
    )} MB`;
  };

const getErrorMessage =
  (
    error,
    fallback
  ) =>
    error?.response?.data?.message ||
    error?.message ||
    fallback;

/* =========================================================
   COMPONENT
========================================================= */

function EmployeeDocumentVaultPage() {
  const {
    employeeId,
  } =
    useParams();

  const navigate =
    useNavigate();

  const fileInputRef =
    useRef(
      null
    );

  const [
    employee,
    setEmployee,
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
    loading,
    setLoading,
  ] =
    useState(
      true
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
    success,
    setSuccess,
  ] =
    useState(
      ""
    );

  const [
    selected,
    setSelected,
  ] =
    useState(
      []
    );

  const [
    showUpload,
    setShowUpload,
  ] =
    useState(
      false
    );

  const [
    uploadForm,
    setUploadForm,
  ] =
    useState({
      title:
        "",

      documentType:
        "OTHER",

      category:
        "EMPLOYEE_DOCUMENT",

      description:
        "",

      file:
        null,
    });

  /* =====================================================
     LOAD
  ===================================================== */

  const load =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const [
            employeeResult,
            vaultResult,
          ] =
            await Promise.all([
              getEmployeeById(
                employeeId
              ),

              getEmployeeDocuments(
                employeeId
              ),
            ]);

          setEmployee(
            employeeResult
          );

          setDocuments(
            extractDocuments(
              vaultResult
            )
          );
        } catch (
          requestError
        ) {
          setError(
            getErrorMessage(
              requestError,
              "Employee Document Vault could not be loaded."
            )
          );
        } finally {
          setLoading(
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
      load();
    },
    [
      load,
    ]
  );

  /* =====================================================
     ACTIVE DOCUMENTS
  ===================================================== */

  const activeDocuments =
    useMemo(
      () =>
        documents.filter(
          (
            document
          ) =>
            ![
              "DELETED",
              "REMOVED",
              "ARCHIVED",
            ].includes(
              String(
                document?.status ||
                ""
              ).toUpperCase()
            )
        ),
      [
        documents,
      ]
    );

  /* =====================================================
     SELECTION
  ===================================================== */

  const selectedCount =
    selected.length;

  const allSelected =
    activeDocuments.length >
      0 &&
    activeDocuments.every(
      (
        document
      ) =>
        selected.includes(
          String(
            documentId(
              document
            )
          )
        )
    );

  const toggleDocument =
    (
      id
    ) => {
      const safeId =
        String(
          id
        );

      if (
        !safeId
      ) {
        return;
      }

      setSelected(
        (
          current
        ) =>
          current.includes(
            safeId
          )
            ? current.filter(
                (
                  value
                ) =>
                  value !==
                  safeId
              )
            : [
                ...current,
                safeId,
              ]
      );
    };

  const toggleAll =
    () => {
      if (
        allSelected
      ) {
        setSelected(
          []
        );

        return;
      }

      setSelected(
        activeDocuments
          .map(
            (
              document
            ) =>
              String(
                documentId(
                  document
                )
              )
          )
          .filter(
            Boolean
          )
      );
    };

  /* =====================================================
     OPEN
  ===================================================== */

  const handleOpen =
    async (
      document
    ) => {
      const id =
        documentId(
          document
        );

      if (
        !id
      ) {
        setError(
          "Document ID is unavailable."
        );

        return;
      }

      try {
        setBusy(
          `OPEN:${id}`
        );

        setError(
          ""
        );

        await openEmployeeDocument(
          employeeId,
          id
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Document could not be opened."
          )
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete =
    async (
      document
    ) => {
      const id =
        documentId(
          document
        );

      if (
        !id
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove "${documentName(
            document
          )}" from the employee record?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {
        setBusy(
          `DELETE:${id}`
        );

        setError(
          ""
        );

        setSuccess(
          ""
        );

        await deleteEmployeeDocument(
          employeeId,
          id
        );

        setSelected(
          (
            current
          ) =>
            current.filter(
              (
                value
              ) =>
                value !==
                String(
                  id
                )
            )
        );

        setSuccess(
          "Document removed successfully."
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Document could not be removed."
          )
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     FILE
  ===================================================== */

  const selectFile =
    (
      file
    ) => {
      setError(
        ""
      );

      if (
        !file
      ) {
        setUploadForm(
          (
            current
          ) => ({
            ...current,

            file:
              null,
          })
        );

        return;
      }

      if (
        !ALLOWED_TYPES.includes(
          file.type
        )
      ) {
        setError(
          "Only PDF, JPG and PNG documents are allowed."
        );

        return;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        setError(
          "Document must be 15 MB or smaller."
        );

        return;
      }

      setUploadForm(
        (
          current
        ) => ({
          ...current,

          file,
        })
      );
    };

  /* =====================================================
     UPLOAD
  ===================================================== */

  const handleUpload =
    async (
      event
    ) => {
      event.preventDefault();

      const title =
        uploadForm.title
          .trim();

      if (
        !title
      ) {
        setError(
          "Please enter the document title."
        );

        return;
      }

      if (
        !uploadForm.file
      ) {
        setError(
          "Please select a document."
        );

        return;
      }

      try {
        setBusy(
          "UPLOAD"
        );

        setError(
          ""
        );

        setSuccess(
          ""
        );

        await uploadEmployeeDocument(
          employeeId,
          {
            file:
              uploadForm.file,

            category:
              uploadForm.category,

            documentType:
              uploadForm.documentType,

            label:
              title,

            description:
              uploadForm.description
                .trim(),
          }
        );

        setShowUpload(
          false
        );

        setUploadForm({
          title:
            "",

          documentType:
            "OTHER",

          category:
            "EMPLOYEE_DOCUMENT",

          description:
            "",

          file:
            null,
        });

        setSuccess(
          "Employee document uploaded successfully."
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Employee document could not be uploaded."
          )
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     MERGE
  ===================================================== */

  const handleGenerateMasterFile =
    async () => {
      if (
        selected.length ===
        0
      ) {
        setError(
          "Select at least one document to create the Employee Master File."
        );

        return;
      }

      try {
        setBusy(
          "MERGE"
        );

        setError(
          ""
        );

        setSuccess(
          ""
        );

        await generateEmployeeDocumentBundle(
          employeeId,
          {
            documentIds:
              selected,

            includeCover:
              true,
          }
        );

        setSelected(
          []
        );

        setSuccess(
          "Employee Master File generated successfully."
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Employee Master File could not be generated."
          )
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
      <div className="employee-vault-page">

        <div className="employee-vault-loading">
          Loading Employee Document Vault...
        </div>

      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="employee-vault-page">

      {/* =================================================
          TOP BAR
      ================================================== */}

      <div className="employee-vault-topbar">

        <button
          type="button"
          className="employee-vault-back"
          onClick={() =>
            navigate(
              `/people/employees/${employeeId}`
            )
          }
        >
          ← Employee Profile
        </button>

      </div>

      {/* =================================================
          HERO
      ================================================== */}

      <section className="employee-vault-hero">

        <div>

          <span className="employee-vault-eyebrow">
            EMPLOYEE RECORD
          </span>

          <h1>
            Document Vault
          </h1>

          <p>
            Permanent employee documents,
            recruitment records, HR forms and
            generated employee files.
          </p>

        </div>

        <div className="employee-vault-employee">

          <span>
            EMPLOYEE
          </span>

          <strong>
            {employee?.fullName ||
              "Employee"}
          </strong>

          <small>
            {employee?.employeeCode ||
              "Employee ID pending"}
          </small>

        </div>

      </section>

      {/* =================================================
          STATS
      ================================================== */}

      <section className="employee-vault-stats">

        <div>

          <span>
            TOTAL DOCUMENTS
          </span>

          <strong>
            {activeDocuments.length}
          </strong>

          <small>
            Active employee records
          </small>

        </div>

        <div>

          <span>
            SELECTED
          </span>

          <strong>
            {selectedCount}
          </strong>

          <small>
            For Master File
          </small>

        </div>

        <div>

          <span>
            EMPLOYEE ID
          </span>

          <strong>
            {employee?.employeeCode ||
              "Pending"}
          </strong>

          <small>
            Permanent record
          </small>

        </div>

      </section>

      {/* =================================================
          ALERTS
      ================================================== */}

      {error ? (
        <div className="employee-vault-alert is-error">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="employee-vault-alert is-success">
          {success}
        </div>
      ) : null}

      {/* =================================================
          TOOLBAR
      ================================================== */}

      <section className="employee-vault-toolbar">

        <div>

          <span className="employee-vault-eyebrow">
            DOCUMENT REGISTER
          </span>

          <h2>
            Employee Documents
          </h2>

          <p>
            Select documents to create one
            consolidated Employee Master PDF.
          </p>

        </div>

        <div className="employee-vault-toolbar-actions">

          <button
            type="button"
            className="employee-vault-secondary"
            disabled={
              !activeDocuments.length
            }
            onClick={
              toggleAll
            }
          >
            {allSelected
              ? "Clear Selection"
              : "Select All"}
          </button>

          <button
            type="button"
            className="employee-vault-secondary"
            disabled={
              !selected.length ||
              busy ===
                "MERGE"
            }
            onClick={
              handleGenerateMasterFile
            }
          >
            {busy ===
            "MERGE"
              ? "Generating..."
              : `Create Master PDF (${selectedCount})`}
          </button>

          <button
            type="button"
            className="employee-vault-primary"
            onClick={() => {
              setError(
                ""
              );

              setSuccess(
                ""
              );

              setShowUpload(
                true
              );
            }}
          >
            + Upload Document
          </button>

        </div>

      </section>

      {/* =================================================
          DOCUMENTS
      ================================================== */}

      <section className="employee-vault-register">

        {activeDocuments.length ? (
          <div className="employee-vault-list">

            {activeDocuments.map(
              (
                document,
                index
              ) => {
                const id =
                  String(
                    documentId(
                      document
                    )
                  );

                const checked =
                  selected.includes(
                    id
                  );

                const source =
                  document?.source ||
                  document?.uploadedByType ||
                  "HR";

                const type =
                  document?.documentType ||
                  document?.category ||
                  "DOCUMENT";

                const mimeType =
                  String(
                    document?.mimeType ||
                    document?.contentType ||
                    ""
                  );

                const fileType =
                  mimeType.includes(
                    "pdf"
                  )
                    ? "PDF"
                    : mimeType.includes(
                        "image"
                      )
                    ? "IMG"
                    : "DOC";

                return (
                  <article
                    key={
                      id ||
                      index
                    }
                    className={`employee-vault-document ${
                      checked
                        ? "is-selected"
                        : ""
                    }`}
                  >

                    <label className="employee-vault-check">

                      <input
                        type="checkbox"
                        checked={
                          checked
                        }
                        onChange={() =>
                          toggleDocument(
                            id
                          )
                        }
                      />

                      <span />

                    </label>

                    <div className="employee-vault-file-icon">
                      {fileType}
                    </div>

                    <div className="employee-vault-document-main">

                      <strong>
                        {documentName(
                          document
                        )}
                      </strong>

                      <span>
                        {pretty(
                          type
                        )}
                      </span>

                    </div>

                    <div className="employee-vault-document-meta">

                      <span>
                        SOURCE
                      </span>

                      <strong>
                        {pretty(
                          source
                        )}
                      </strong>

                    </div>

                    <div className="employee-vault-document-meta">

                      <span>
                        ADDED
                      </span>

                      <strong>
                        {formatDate(
                          document?.uploadedAt ||
                          document?.createdAt
                        )}
                      </strong>

                    </div>

                    <div className="employee-vault-document-meta">

                      <span>
                        SIZE
                      </span>

                      <strong>
                        {formatBytes(
                          document?.size ||
                          document?.fileSize
                        ) ||
                          "—"}
                      </strong>

                    </div>

                    <div className="employee-vault-document-actions">

                      <button
                        type="button"
                        disabled={
                          busy ===
                          `OPEN:${id}`
                        }
                        onClick={() =>
                          handleOpen(
                            document
                          )
                        }
                      >
                        {busy ===
                        `OPEN:${id}`
                          ? "Opening..."
                          : "View"}
                      </button>

                      <button
                        type="button"
                        className="is-danger"
                        disabled={
                          busy ===
                          `DELETE:${id}`
                        }
                        onClick={() =>
                          handleDelete(
                            document
                          )
                        }
                      >
                        Remove
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        ) : (
          <div className="employee-vault-empty">

            <div>
              D
            </div>

            <strong>
              No employee documents
            </strong>

            <p>
              Upload HR documents or complete
              onboarding to build the permanent
              employee record.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowUpload(
                  true
                )
              }
            >
              Upload First Document
            </button>

          </div>
        )}

      </section>

      {/* =================================================
          MERGE INFORMATION
      ================================================== */}

      <section className="employee-vault-master-info">

        <div className="employee-vault-master-icon">
          M
        </div>

        <div>

          <strong>
            Employee Master File
          </strong>

          <p>
            Select the required documents above
            and create one consolidated PDF for
            the permanent employee record.
          </p>

        </div>

        <button
          type="button"
          disabled={
            !selected.length ||
            busy ===
              "MERGE"
          }
          onClick={
            handleGenerateMasterFile
          }
        >
          {busy ===
          "MERGE"
            ? "Generating..."
            : "Generate Master PDF"}
        </button>

      </section>

      {/* =================================================
          UPLOAD MODAL
      ================================================== */}

      {showUpload ? (
        <div
          className="employee-vault-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget &&
              busy !==
                "UPLOAD"
            ) {
              setShowUpload(
                false
              );
            }
          }}
        >

          <form
            className="employee-vault-modal"
            onSubmit={
              handleUpload
            }
          >

            <div className="employee-vault-modal-header">

              <div>

                <span>
                  EMPLOYEE DOCUMENT
                </span>

                <h2>
                  Upload Document
                </h2>

                <p>
                  Add a permanent HR document
                  to {employee?.fullName ||
                    "this employee"}.
                </p>

              </div>

              <button
                type="button"
                disabled={
                  busy ===
                  "UPLOAD"
                }
                onClick={() =>
                  setShowUpload(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="employee-vault-modal-body">

              <label className="employee-vault-field">

                <span>
                  Document Title *
                </span>

                <input
                  type="text"
                  value={
                    uploadForm.title
                  }
                  placeholder="Example: Signed NDA"
                  onChange={(
                    event
                  ) =>
                    setUploadForm(
                      (
                        current
                      ) => ({
                        ...current,

                        title:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

              </label>

              <div className="employee-vault-form-grid">

                <label className="employee-vault-field">

                  <span>
                    Document Type *
                  </span>

                  <select
                    value={
                      uploadForm.documentType
                    }
                    onChange={(
                      event
                    ) =>
                      setUploadForm(
                        (
                          current
                        ) => ({
                          ...current,

                          documentType:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >

                    {DOCUMENT_TYPES.map(
                      (
                        item
                      ) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {item.label}
                        </option>
                      )
                    )}

                  </select>

                </label>

                <label className="employee-vault-field">

                  <span>
                    Category
                  </span>

                  <input
                    type="text"
                    value="Employee Record"
                    readOnly
                  />

                </label>

              </div>

              <label className="employee-vault-field">

                <span>
                  Description
                </span>

                <textarea
                  rows="3"
                  value={
                    uploadForm.description
                  }
                  placeholder="Optional remarks about this document..."
                  onChange={(
                    event
                  ) =>
                    setUploadForm(
                      (
                        current
                      ) => ({
                        ...current,

                        description:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

              </label>

              <div className="employee-vault-field">

                <span>
                  File *
                </span>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(
                    event
                  ) => {
                    selectFile(
                      event
                        .target
                        .files?.[0]
                    );

                    /*
                     * Do NOT clear event.target.value here.
                     *
                     * The selected File object is retained
                     * inside React state and passed directly
                     * to FormData during submission.
                     */
                  }}
                />

                <button
                  type="button"
                  className="employee-vault-file-picker"
                  onClick={() =>
                    fileInputRef
                      .current
                      ?.click()
                  }
                >

                  {uploadForm.file ? (
                    <>
                      <strong>
                        {uploadForm.file.name}
                      </strong>

                      <span>
                        {formatBytes(
                          uploadForm
                            .file
                            .size
                        )}
                        {" · "}
                        {uploadForm.file.type}
                      </span>

                      <b>
                        Change
                      </b>
                    </>
                  ) : (
                    <>
                      <strong>
                        Select PDF, JPG or PNG
                      </strong>

                      <span>
                        Maximum file size 15 MB
                      </span>

                      <b>
                        Browse
                      </b>
                    </>
                  )}

                </button>

              </div>

              {error ? (
                <div className="employee-vault-modal-error">
                  {error}
                </div>
              ) : null}

            </div>

            <div className="employee-vault-modal-footer">

              <button
                type="button"
                className="employee-vault-secondary"
                disabled={
                  busy ===
                  "UPLOAD"
                }
                onClick={() =>
                  setShowUpload(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="employee-vault-primary"
                disabled={
                  busy ===
                  "UPLOAD"
                }
              >
                {busy ===
                "UPLOAD"
                  ? "Uploading..."
                  : "Upload Document"}
              </button>

            </div>

          </form>

        </div>
      ) : null}

    </div>
  );
}

export default EmployeeDocumentVaultPage;