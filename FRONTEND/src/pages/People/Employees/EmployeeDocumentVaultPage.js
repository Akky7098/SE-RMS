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

const MAX_FILE_SIZE = 15 * 1024 * 1024;

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

const extractDocuments = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.documents)) {
    return value.documents;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.vault?.documents)) {
    return value.vault.documents;
  }

  return [];
};

const documentId = (document) =>
  document?._id ||
  document?.id ||
  document?.documentId ||
  "";

const documentName = (document) =>
  document?.label ||
  document?.name ||
  document?.documentName ||
  document?.fileName ||
  document?.originalName ||
  "Employee Document";

const pretty = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatBytes = (bytes) => {
  const size = Number(bytes);

  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return "";
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(0)} KB`;
  }

  return `${(
    size /
    1024 /
    1024
  ).toFixed(2)} MB`;
};

const getErrorMessage = (
  error,
  fallback
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getFileType = (document) => {
  const mimeType = String(
    document?.mimeType ||
      document?.contentType ||
      ""
  ).toLowerCase();

  const fileName = String(
    document?.fileName ||
      document?.originalName ||
      document?.name ||
      ""
  ).toLowerCase();

  if (
    mimeType.includes("pdf") ||
    fileName.endsWith(".pdf")
  ) {
    return "PDF";
  }

  if (
    mimeType.includes("image") ||
    /\.(jpg|jpeg|png)$/i.test(fileName)
  ) {
    return "IMG";
  }

  return "DOC";
};

const getDepartmentName = (employee) => {
  if (!employee) {
    return "";
  }

  if (
    typeof employee.department ===
    "string"
  ) {
    return employee.department;
  }

  return (
    employee?.department?.name ||
    employee?.departmentName ||
    ""
  );
};

/* =========================================================
   COMPONENT
========================================================= */

function EmployeeDocumentVaultPage() {
  const { employeeId } = useParams();

  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [
    employee,
    setEmployee,
  ] = useState(null);

  const [
    documents,
    setDocuments,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    selected,
    setSelected,
  ] = useState([]);

  const [
    showUpload,
    setShowUpload,
  ] = useState(false);

  const [
    uploadForm,
    setUploadForm,
  ] = useState({
    title: "",
    documentType: "OTHER",

    // Keep this internally.
    // It is no longer shown to the user.
    category: "EMPLOYEE_DOCUMENT",

    description: "",
    file: null,
  });

  /* =====================================================
     LOAD
  ===================================================== */

  const load = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const [
          employeeResult,
          vaultResult,
        ] = await Promise.all([
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
            "Employee documents could not be loaded."
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [employeeId]
  );

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     ACTIVE DOCUMENTS
  ===================================================== */

  const activeDocuments =
    useMemo(
      () =>
        documents.filter(
          (document) =>
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
      [documents]
    );

  /* =====================================================
     SELECTION
  ===================================================== */

  const selectedCount =
    selected.length;

  const allSelected =
    activeDocuments.length > 0 &&
    activeDocuments.every(
      (document) =>
        selected.includes(
          String(
            documentId(
              document
            )
          )
        )
    );

  const toggleDocument = (
    id
  ) => {
    const safeId =
      String(id);

    if (!safeId) {
      return;
    }

    setSelected(
      (current) =>
        current.includes(
          safeId
        )
          ? current.filter(
              (value) =>
                value !==
                safeId
            )
          : [
              ...current,
              safeId,
            ]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
      return;
    }

    setSelected(
      activeDocuments
        .map((document) =>
          String(
            documentId(
              document
            )
          )
        )
        .filter(Boolean)
    );
  };

  /* =====================================================
     OPEN DOCUMENT
  ===================================================== */

  const handleOpen =
    async (document) => {
      const id =
        documentId(
          document
        );

      if (!id) {
        setError(
          "Document ID is unavailable."
        );

        return;
      }

      try {
        setBusy(
          `OPEN:${id}`
        );

        setError("");

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
        setBusy("");
      }
    };

  /* =====================================================
     DELETE DOCUMENT
  ===================================================== */

  const handleDelete =
    async (document) => {
      const id =
        documentId(
          document
        );

      if (!id) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove "${documentName(
            document
          )}" from the employee record?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setBusy(
          `DELETE:${id}`
        );

        setError("");
        setSuccess("");

        await deleteEmployeeDocument(
          employeeId,
          id
        );

        setSelected(
          (current) =>
            current.filter(
              (value) =>
                value !==
                String(id)
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
        setBusy("");
      }
    };

  /* =====================================================
     FILE SELECTION
  ===================================================== */

  const selectFile = (
    file
  ) => {
    setError("");

    if (!file) {
      setUploadForm(
        (current) => ({
          ...current,
          file: null,
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
      (current) => ({
        ...current,
        file,
      })
    );
  };

  /* =====================================================
     OPEN UPLOAD MODAL
  ===================================================== */

  const openUploadModal =
    () => {
      setError("");
      setSuccess("");

      setUploadForm({
        title: "",
        documentType:
          "OTHER",
        category:
          "EMPLOYEE_DOCUMENT",
        description: "",
        file: null,
      });

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      setShowUpload(true);
    };

  const closeUploadModal =
    () => {
      if (
        busy === "UPLOAD"
      ) {
        return;
      }

      setShowUpload(false);

      setError("");

      setUploadForm({
        title: "",
        documentType:
          "OTHER",
        category:
          "EMPLOYEE_DOCUMENT",
        description: "",
        file: null,
      });

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    };

  /* =====================================================
     UPLOAD
  ===================================================== */

  const handleUpload =
    async (event) => {
      event.preventDefault();

      const title =
        uploadForm.title.trim();

      if (!title) {
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
        setBusy("UPLOAD");

        setError("");
        setSuccess("");

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
              uploadForm.description.trim(),
          }
        );

        setShowUpload(
          false
        );

        setUploadForm({
          title: "",
          documentType:
            "OTHER",
          category:
            "EMPLOYEE_DOCUMENT",
          description: "",
          file: null,
        });

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }

        setSuccess(
          "Document uploaded successfully."
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Document could not be uploaded."
          )
        );
      } finally {
        setBusy("");
      }
    };

  /* =====================================================
     CREATE MASTER PDF
  ===================================================== */

  const handleGenerateMasterFile =
    async () => {
      if (
        selected.length ===
        0
      ) {
        setError(
          "Select at least one document to create the Master PDF."
        );

        return;
      }

      try {
        setBusy("MERGE");

        setError("");
        setSuccess("");

        await generateEmployeeDocumentBundle(
          employeeId,
          {
            documentIds:
              selected,

            includeCover:
              true,
          }
        );

        setSelected([]);

        setSuccess(
          "Master PDF generated successfully."
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Master PDF could not be generated."
          )
        );
      } finally {
        setBusy("");
      }
    };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="employee-vault-page">
        <div className="employee-vault-loading">
          <span className="employee-vault-loading-spinner" />

          <strong>
            Loading documents
          </strong>

          <small>
            Please wait...
          </small>
        </div>
      </div>
    );
  }

  const departmentName =
    getDepartmentName(
      employee
    );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="employee-vault-page">

      {/* ===============================================
          TOP BAR
      ================================================ */}

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
          <span>
            ←
          </span>

          Employee Profile
        </button>

      </div>

      {/* ===============================================
          HERO
      ================================================ */}

      <section className="employee-vault-hero">

        <div className="employee-vault-hero-content">

          <span className="employee-vault-eyebrow">
            DOCUMENTS
          </span>

          <h1>
            {employee?.fullName ||
              "Employee"}
          </h1>

          <div className="employee-vault-identity">

            <span>
              {employee?.employeeCode ||
                "Employee ID pending"}
            </span>

            {departmentName ? (
              <>
                <i />
                <span>
                  {departmentName}
                </span>
              </>
            ) : null}

          </div>

        </div>

        <button
          type="button"
          className="employee-vault-primary employee-vault-upload-top"
          onClick={
            openUploadModal
          }
        >
          <span className="employee-vault-button-plus">
            +
          </span>

          Upload Document
        </button>

      </section>

      {/* ===============================================
          ALERTS
      ================================================ */}

      {error ? (
        <div className="employee-vault-alert is-error">

          <span className="employee-vault-alert-icon">
            !
          </span>

          <span>
            {error}
          </span>

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

      {success ? (
        <div className="employee-vault-alert is-success">

          <span className="employee-vault-alert-icon">
            ✓
          </span>

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
          >
            ×
          </button>

        </div>
      ) : null}

      {/* ===============================================
          DOCUMENT WORKSPACE
      ================================================ */}

      <section className="employee-vault-workspace">

        <div className="employee-vault-workspace-header">

          <div className="employee-vault-workspace-title">

            <div>
              <h2>
                Employee Documents
              </h2>

              <div className="employee-vault-counts">

                <span>
                  <strong>
                    {activeDocuments.length}
                  </strong>

                  {activeDocuments.length ===
                  1
                    ? " Document"
                    : " Documents"}
                </span>

                <i />

                <span
                  className={
                    selectedCount
                      ? "has-selection"
                      : ""
                  }
                >
                  <strong>
                    {selectedCount}
                  </strong>{" "}
                  Selected
                </span>

              </div>
            </div>

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
              <span className="employee-vault-select-icon">
                ✓
              </span>

              {allSelected
                ? "Clear Selection"
                : "Select All"}
            </button>

            <button
              type="button"
              className="employee-vault-master-button"
              disabled={
                !selected.length ||
                busy === "MERGE"
              }
              onClick={
                handleGenerateMasterFile
              }
            >
              <span className="employee-vault-pdf-icon">
                PDF
              </span>

              {busy ===
              "MERGE"
                ? "Creating..."
                : `Create Master PDF (${selectedCount})`}
            </button>

          </div>

        </div>

        {/* =============================================
            DOCUMENT CARDS
        ============================================== */}

        {activeDocuments.length ? (

          <div className="employee-vault-grid">

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

                const type =
                  document?.documentType ||
                  document?.category ||
                  "DOCUMENT";

                const fileType =
                  getFileType(
                    document
                  );

                const size =
                  formatBytes(
                    document?.size ||
                      document?.fileSize
                  );

                const addedDate =
                  formatDate(
                    document?.uploadedAt ||
                      document?.createdAt
                  );

                return (
                  <article
                    key={
                      id ||
                      index
                    }
                    className={`employee-vault-card ${
                      checked
                        ? "is-selected"
                        : ""
                    }`}
                  >

                    {/* CARD TOP */}

                    <div className="employee-vault-card-top">

                      <label className="employee-vault-card-check">

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

                      <span
                        className={`employee-vault-card-file-badge is-${fileType.toLowerCase()}`}
                      >
                        {fileType}
                      </span>

                    </div>

                    {/* ICON */}

                    <div
                      className={`employee-vault-card-icon is-${fileType.toLowerCase()}`}
                    >
                      <span className="employee-vault-card-icon-fold" />

                      <strong>
                        {fileType}
                      </strong>
                    </div>

                    {/* CONTENT */}

                    <div className="employee-vault-card-content">

                      <span className="employee-vault-card-category">
                        {pretty(
                          type
                        )}
                      </span>

                      <h3
                        title={
                          documentName(
                            document
                          )
                        }
                      >
                        {documentName(
                          document
                        )}
                      </h3>

                      {document?.description ? (
                        <p className="employee-vault-card-description">
                          {
                            document.description
                          }
                        </p>
                      ) : (
                        <p className="employee-vault-card-description is-empty">
                          Employee document
                        </p>
                      )}

                    </div>

                    {/* META */}

                    <div className="employee-vault-card-meta">

                      <div>
                        <span>
                          Added
                        </span>

                        <strong>
                          {addedDate}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Size
                        </span>

                        <strong>
                          {size ||
                            "—"}
                        </strong>
                      </div>

                    </div>

                    {/* ACTIONS */}

                    <div className="employee-vault-card-actions">

                      <button
                        type="button"
                        className="employee-vault-card-view"
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
                        <span>
                          ↗
                        </span>

                        {busy ===
                        `OPEN:${id}`
                          ? "Opening..."
                          : "View"}
                      </button>

                      <button
                        type="button"
                        className="employee-vault-card-remove"
                        disabled={
                          busy ===
                          `DELETE:${id}`
                        }
                        onClick={() =>
                          handleDelete(
                            document
                          )
                        }
                        title="Remove document"
                      >
                        {busy ===
                        `DELETE:${id}`
                          ? "..."
                          : "×"}
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>

        ) : (

          <div className="employee-vault-empty">

            <div className="employee-vault-empty-icon">
              <span>
                PDF
              </span>
            </div>

            <h3>
              No documents uploaded
            </h3>

            <p>
              Upload the employee's first document to start the document record.
            </p>

            <button
              type="button"
              className="employee-vault-primary"
              onClick={
                openUploadModal
              }
            >
              + Upload Document
            </button>

          </div>

        )}

      </section>

      {/* ===============================================
          UPLOAD MODAL
      ================================================ */}

      {showUpload ? (

        <div
          className="employee-vault-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              busy !== "UPLOAD"
            ) {
              closeUploadModal();
            }
          }}
        >

          <form
            className="employee-vault-modal"
            onSubmit={
              handleUpload
            }
          >

            {/* MODAL HEADER */}

            <div className="employee-vault-modal-header">

              <div className="employee-vault-modal-heading">

                <div className="employee-vault-modal-heading-icon">
                  +
                </div>

                <div>
                  <h2>
                    Upload Document
                  </h2>

                  <p>
                    {employee?.fullName ||
                      "Employee"}

                    {employee?.employeeCode
                      ? ` · ${employee.employeeCode}`
                      : ""}
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="employee-vault-modal-close"
                disabled={
                  busy ===
                  "UPLOAD"
                }
                onClick={
                  closeUploadModal
                }
              >
                ×
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="employee-vault-modal-body">

              <label className="employee-vault-field">

                <span>
                  Document Title
                  <b>
                    *
                  </b>
                </span>

                <input
                  type="text"
                  autoFocus
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

              <label className="employee-vault-field">

                <span>
                  Document Type
                  <b>
                    *
                  </b>
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
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}

                </select>

              </label>

              <label className="employee-vault-field">

                <span>
                  Description
                  <small>
                    Optional
                  </small>
                </span>

                <textarea
                  rows="3"
                  value={
                    uploadForm.description
                  }
                  placeholder="Add a short note about this document..."
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

              {/* FILE PICKER */}

              <div className="employee-vault-field">

                <span>
                  Document File
                  <b>
                    *
                  </b>
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
                  }}
                />

                <button
                  type="button"
                  className={`employee-vault-file-picker ${
                    uploadForm.file
                      ? "has-file"
                      : ""
                  }`}
                  onClick={() =>
                    fileInputRef
                      .current
                      ?.click()
                  }
                >

                  <div className="employee-vault-file-picker-icon">
                    {uploadForm.file
                      ? "✓"
                      : "↑"}
                  </div>

                  <div className="employee-vault-file-picker-copy">

                    {uploadForm.file ? (
                      <>
                        <strong>
                          {
                            uploadForm
                              .file
                              .name
                          }
                        </strong>

                        <span>
                          {formatBytes(
                            uploadForm
                              .file
                              .size
                          )}

                          {" · "}

                          {uploadForm.file.type ===
                          "application/pdf"
                            ? "PDF"
                            : "Image"}
                        </span>
                      </>
                    ) : (
                      <>
                        <strong>
                          Choose document
                        </strong>

                        <span>
                          PDF, JPG or PNG · Maximum 15 MB
                        </span>
                      </>
                    )}

                  </div>

                  <b className="employee-vault-file-picker-action">
                    {uploadForm.file
                      ? "Change"
                      : "Browse"}
                  </b>

                </button>

              </div>

              {error ? (
                <div className="employee-vault-modal-error">
                  {error}
                </div>
              ) : null}

            </div>

            {/* MODAL FOOTER */}

            <div className="employee-vault-modal-footer">

              <button
                type="button"
                className="employee-vault-secondary"
                disabled={
                  busy ===
                  "UPLOAD"
                }
                onClick={
                  closeUploadModal
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="employee-vault-primary"
                disabled={
                  busy ===
                    "UPLOAD" ||
                  !uploadForm.title.trim() ||
                  !uploadForm.file
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