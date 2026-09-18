const crypto =
  require(
    "crypto"
  );

const fs =
  require(
    "fs"
  );

const path =
  require(
    "path"
  );

const mongoose =
  require(
    "mongoose"
  );

const {
  EmployeeDocument,
  EMPLOYEE_DOCUMENT_CATEGORIES,
} =
  require(
    "./employeeDocument.model"
  );

const {
  Employee,
} =
  require(
    "../employee.model"
  );

const {
  EmployeeOnboarding,
} =
  require(
    "../onboarding/onboarding.model"
  );

const {
  Selection,
} =
  require(
    "../../selection/selection.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

const {
  mergeEmployeeDocuments,
} =
  require(
    "./employeeDocumentMerge.service"
  );

/* =========================================================
   RECRUITMENT DOCUMENT STORAGE

   Candidate portal documents are stored by the recruitment
   module and use relativePath. We must resolve that path
   through the recruitment storage service.
========================================================= */

let getRecruitmentStoredDocumentPath =
  null;

try {
  const recruitmentStorage =
    require(
      "../../selection/documents/documentStorage.service"
    );

  getRecruitmentStoredDocumentPath =
    recruitmentStorage
      .getStoredDocumentPath ||
    null;
} catch (
  error
) {
  console.warn(
    "[Employee Documents] Recruitment document storage service unavailable:",
    error?.message
  );
}

/* =========================================================
   REGISTER CANDIDATE DOCUMENT MODEL

   Actual recruitment candidate documents may be registered
   under candidateDocument.model.
========================================================= */

try {
  require(
    "../../selection/documents/candidateDocument.model"
  );
} catch (
  error
) {
  /*
   * Do not crash People module.
   * Model may already be registered elsewhere.
   */
}

/*
 * Keep compatibility with older recruitment structure.
 */
try {
  require(
    "../../selection/documents/document.model"
  );
} catch {
  /*
   * Optional legacy model.
   */
}

/* =========================================================
   STORAGE
========================================================= */

const EMPLOYEE_DOCUMENT_STORAGE_PATH =
  process.env
    .EMPLOYEE_DOCUMENT_STORAGE_PATH ||
  path.join(
    process.env.HOME ||
      process.cwd(),

    ".se-rms-data",

    "employee-documents"
  );

/* =========================================================
   LIMITS
========================================================= */

const MAX_DOCUMENT_SIZE =
  15 *
  1024 *
  1024;

const MAX_HR_UPLOAD_DOCUMENTS =
  10;

/* =========================================================
   MIME
========================================================= */

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

/* =========================================================
   CANDIDATE DOCUMENT LABELS
========================================================= */

const DOCUMENT_LABELS = {
  AADHAAR:
    "Aadhaar Card",

  AADHAR:
    "Aadhaar Card",

  AADHAAR_CARD:
    "Aadhaar Card",

  AADHAR_CARD:
    "Aadhaar Card",

  PAN:
    "PAN Card",

  PAN_CARD:
    "PAN Card",

  BANK_PROOF:
    "Bank Proof",

  CANCELLED_CHEQUE:
    "Cancelled Cheque",

  BANK_DETAILS:
    "Bank Details",

  HIGHEST_QUALIFICATION:
    "Highest Qualification",

  QUALIFICATION:
    "Qualification Document",

  EDUCATION:
    "Education Document",

  PHOTO:
    "Photograph",

  PHOTOGRAPH:
    "Photograph",

  SIGNATURE:
    "Signature",

  EXPERIENCE:
    "Experience Document",

  EXPERIENCE_LETTER:
    "Experience Letter",

  RELIEVING_LETTER:
    "Relieving Letter",

  SALARY_SLIP:
    "Salary Slip",

  PAYSLIP:
    "Salary Slip",

  PREVIOUS_APPOINTMENT_LETTER:
    "Previous Appointment Letter",

  APPOINTMENT_LETTER:
    "Appointment Letter",

  FORM16:
    "Form 16",

  FORM_16:
    "Form 16",

  LOI:
    "Letter of Intent",

  LETTER_OF_INTENT:
    "Letter of Intent",

  OFFER:
    "Offer Letter",

  OFFER_LETTER:
    "Offer Letter",

  RESUME:
    "Resume",

  CV:
    "Resume",

  ADDRESS_PROOF:
    "Address Proof",

  ID_PROOF:
    "Identity Proof",

  OTHER:
    "Other Document",
};

/* =========================================================
   HELPERS
========================================================= */

const validId =
  (
    value
  ) =>
    mongoose.Types
      .ObjectId
      .isValid(
        value
      );

const clean =
  (
    value
  ) =>
    String(
      value ??
        ""
    ).trim();

const cleanUpper =
  (
    value
  ) =>
    clean(
      value
    )
      .toUpperCase()
      .replace(
        /[^A-Z0-9]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      );

const safeFilePart =
  (
    value
  ) =>
    clean(
      value
    )
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .slice(
        0,
        100
      ) ||
    "document";

/* =========================================================
   CATEGORY NORMALIZER

   Prevent frontend aliases such as DOCUMENT, HR_DOCUMENT,
   etc. from producing "Invalid employee document category".
========================================================= */

const normalizeEmployeeCategory =
  (
    value,
    fallback =
      "OTHER"
  ) => {
    const normalized =
      cleanUpper(
        value
      );

    if (
      normalized &&
      EMPLOYEE_DOCUMENT_CATEGORIES.includes(
        normalized
      )
    ) {
      return normalized;
    }

    const aliases = {
      DOCUMENT:
        "JOINING",

      DOCUMENTS:
        "JOINING",

      JOINING_DOCUMENT:
        "JOINING",

      JOINING_DOCUMENTS:
        "JOINING",

      HR:
        "JOINING",

      HR_DOCUMENT:
        "JOINING",

      HR_DOCUMENTS:
        "JOINING",

      PDF:
        "JOINING",

      IMAGE:
        "JOINING",

      ID:
        "IDENTITY",

      ID_PROOF:
        "IDENTITY",

      IDENTITY_DOCUMENT:
        "IDENTITY",

      AADHAAR:
        "IDENTITY",

      AADHAR:
        "IDENTITY",

      PAN:
        "IDENTITY",

      ADDRESS_PROOF:
        "ADDRESS",

      EDUCATIONAL:
        "EDUCATION",

      QUALIFICATION:
        "EDUCATION",

      HIGHEST_QUALIFICATION:
        "EDUCATION",

      EXPERIENCE:
        "EXPERIENCE",

      EXPERIENCE_LETTER:
        "EXPERIENCE",

      RELIEVING_LETTER:
        "EXPERIENCE",

      OFFER:
        "OFFER",

      OFFER_LETTER:
        "OFFER",

      LOI:
        "OFFER",

      LETTER_OF_INTENT:
        "OFFER",
    };

    const alias =
      aliases[
        normalized
      ];

    if (
      alias &&
      EMPLOYEE_DOCUMENT_CATEGORIES.includes(
        alias
      )
    ) {
      return alias;
    }

    const normalizedFallback =
      cleanUpper(
        fallback
      );

    if (
      EMPLOYEE_DOCUMENT_CATEGORIES.includes(
        normalizedFallback
      )
    ) {
      return normalizedFallback;
    }

    /*
     * Last-resort fallback.
     */
    if (
      EMPLOYEE_DOCUMENT_CATEGORIES.includes(
        "OTHER"
      )
    ) {
      return "OTHER";
    }

    return EMPLOYEE_DOCUMENT_CATEGORIES[
      0
    ];
  };

const ensureDirectory =
  async (
    directory
  ) => {
    await fs.promises
      .mkdir(
        directory,
        {
          recursive:
            true,
        }
      );
  };

const checksumBuffer =
  (
    buffer
  ) =>
    crypto
      .createHash(
        "sha256"
      )
      .update(
        buffer
      )
      .digest(
        "hex"
      );

const sha256 =
  (
    value
  ) =>
    crypto
      .createHash(
        "sha256"
      )
      .update(
        String(
          value ??
            ""
        )
      )
      .digest(
        "hex"
      );

const extensionFromMime =
  (
    mimeType
  ) => {
    if (
      mimeType ===
      "application/pdf"
    ) {
      return ".pdf";
    }

    if (
      mimeType ===
      "image/png"
    ) {
      return ".png";
    }

    if (
      mimeType ===
      "image/jpeg"
    ) {
      return ".jpg";
    }

    return "";
  };

/* =========================================================
   MAGIC BYTES
========================================================= */

const validateFileSignature =
  ({
    buffer,
    mimeType,
  }) => {
    if (
      !Buffer.isBuffer(
        buffer
      ) ||
      buffer.length <
        4
    ) {
      throw new ApiError(
        400,
        "Uploaded document is empty or invalid."
      );
    }

    if (
      mimeType ===
      "application/pdf"
    ) {
      if (
        buffer
          .subarray(
            0,
            4
          )
          .toString(
            "ascii"
          ) !==
        "%PDF"
      ) {
        throw new ApiError(
          400,
          "The uploaded file is not a valid PDF."
        );
      }

      return;
    }

    if (
      mimeType ===
      "image/png"
    ) {
      const pngSignature =
        Buffer.from([
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a,
        ]);

      if (
        buffer.length <
          8 ||
        !buffer
          .subarray(
            0,
            8
          )
          .equals(
            pngSignature
          )
      ) {
        throw new ApiError(
          400,
          "The uploaded file is not a valid PNG image."
        );
      }

      return;
    }

    if (
      mimeType ===
      "image/jpeg"
    ) {
      if (
        buffer[0] !==
          0xff ||
        buffer[1] !==
          0xd8 ||
        buffer[2] !==
          0xff
      ) {
        throw new ApiError(
          400,
          "The uploaded file is not a valid JPEG image."
        );
      }
    }
  };

/* =========================================================
   EMPLOYEE
========================================================= */

const getEmployee =
  async (
    employeeId
  ) => {
    if (
      !validId(
        employeeId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Employee ID."
      );
    }

    const employee =
      await Employee
        .findById(
          employeeId
        )
        .populate(
          "department",
          "name code"
        )
        .populate(
          "reportsTo",
          "employeeCode fullName designation officialEmail"
        );

    if (
      !employee
    ) {
      throw new ApiError(
        404,
        "Employee not found."
      );
    }

    return employee;
  };

/* =========================================================
   DOCUMENT
========================================================= */

const getDocument =
  async ({
    employeeId,
    documentId,
  }) => {
    if (
      !validId(
        employeeId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Employee ID."
      );
    }

    if (
      !validId(
        documentId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Document ID."
      );
    }

    const document =
      await EmployeeDocument
        .findOne({
          _id:
            documentId,

          employee:
            employeeId,

          status: {
            $ne:
              "DELETED",
          },
        });

    if (
      !document
    ) {
      throw new ApiError(
        404,
        "Employee document not found."
      );
    }

    return document;
  };

/* =========================================================
   STORAGE FILE
========================================================= */

const writeEmployeeFile =
  async ({
    employee,
    buffer,
    mimeType,
    baseName,
  }) => {
    const extension =
      extensionFromMime(
        mimeType
      );

    const employeeFolder =
      path.join(
        EMPLOYEE_DOCUMENT_STORAGE_PATH,

        safeFilePart(
          employee.employeeCode ||
          employee._id
        )
      );

    await ensureDirectory(
      employeeFolder
    );

    const storedFileName =
      `${Date.now()}-${crypto
        .randomBytes(
          5
        )
        .toString(
          "hex"
        )}-${safeFilePart(
          baseName
        )}${extension}`;

    const absolutePath =
      path.join(
        employeeFolder,
        storedFileName
      );

    await fs.promises
      .writeFile(
        absolutePath,
        buffer
      );

    const relativePath =
      path.relative(
        EMPLOYEE_DOCUMENT_STORAGE_PATH,
        absolutePath
      );

    return {
      storedFileName,

      absolutePath,

      relativePath,

      extension,
    };
  };

/* =========================================================
   REGISTER BUFFER
========================================================= */

const registerDocumentBuffer =
  async ({
    employeeId,
    buffer,
    originalFileName,
    mimeType,
    category =
      "OTHER",
    documentType,
    label,
    description =
      "",
    source =
      "GENERATED",
    sourceRecordType =
      "",
    sourceRecordId =
      "",
    sourceDocumentId =
      "",
    signedDate =
      null,
    expiryDate =
      null,
    remarks =
      "",
    actorUserId =
      null,
    allowDuplicate =
      false,
    generatedFromDocuments =
      [],
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const normalizedCategory =
      normalizeEmployeeCategory(
        category,
        "OTHER"
      );

    if (
      !EMPLOYEE_DOCUMENT_CATEGORIES.includes(
        normalizedCategory
      )
    ) {
      throw new ApiError(
        400,
        "Invalid employee document category."
      );
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        mimeType
      )
    ) {
      throw new ApiError(
        400,
        "Only PDF, JPG and PNG documents are supported."
      );
    }

    if (
      !Buffer.isBuffer(
        buffer
      ) ||
      buffer.length ===
        0
    ) {
      throw new ApiError(
        400,
        "Document file is required."
      );
    }

    if (
      buffer.length >
      MAX_DOCUMENT_SIZE
    ) {
      throw new ApiError(
        400,
        "Document exceeds the 15 MB file limit."
      );
    }

    validateFileSignature({
      buffer,

      mimeType,
    });

    const normalizedType =
      cleanUpper(
        documentType
      );

    if (
      !normalizedType
    ) {
      throw new ApiError(
        400,
        "Document type is required."
      );
    }

    const normalizedLabel =
      clean(
        label
      );

    if (
      !normalizedLabel
    ) {
      throw new ApiError(
        400,
        "Document label is required."
      );
    }

    const checksum =
      checksumBuffer(
        buffer
      );

    if (
      !allowDuplicate
    ) {
      const duplicate =
        await EmployeeDocument
          .findOne({
            employee:
              employee._id,

            checksum,

            status:
              "ACTIVE",

            isCurrent:
              true,
          })
          .lean();

      if (
        duplicate
      ) {
        throw new ApiError(
          409,
          `The same file already exists as "${duplicate.label}".`
        );
      }
    }

    const fingerprintSource =
      [
        source,
        sourceRecordType,
        sourceRecordId,
        sourceDocumentId,
      ]
        .map(
          clean
        )
        .filter(
          Boolean
        )
        .join(
          "|"
        );

    const sourceFingerprint =
      fingerprintSource
        ? sha256(
            fingerprintSource
          )
        : "";

    if (
      sourceFingerprint
    ) {
      const existing =
        await EmployeeDocument
          .findOne({
            employee:
              employee._id,

            sourceFingerprint,

            status: {
              $ne:
                "DELETED",
            },
          });

      if (
        existing
      ) {
        return existing;
      }
    }

    const storage =
      await writeEmployeeFile({
        employee,

        buffer,

        mimeType,

        baseName:
          normalizedType,
      });

    try {
      return await EmployeeDocument
        .create({
          employee:
            employee._id,

          onboarding:
            employee.onboarding ||
            null,

          category:
            normalizedCategory,

          documentType:
            normalizedType,

          label:
            normalizedLabel,

          description:
            clean(
              description
            ),

          source,

          sourceRecordType:
            clean(
              sourceRecordType
            ),

          sourceRecordId:
            clean(
              sourceRecordId
            ),

          sourceDocumentId:
            clean(
              sourceDocumentId
            ),

          sourceFingerprint,

          originalFileName:
            safeFilePart(
              originalFileName ||
              `${normalizedType}${storage.extension}`
            ),

          storedFileName:
            storage.storedFileName,

          absolutePath:
            storage.absolutePath,

          relativePath:
            storage.relativePath,

          mimeType,

          extension:
            storage.extension,

          fileSize:
            buffer.length,

          checksum,

          version:
            1,

          isCurrent:
            true,

          signedDate,

          expiryDate,

          remarks:
            clean(
              remarks
            ),

          status:
            "ACTIVE",

          generatedFromDocuments,

          uploadedBy:
            actorUserId ||
            null,

          updatedBy:
            actorUserId ||
            null,

          syncedAt:
            [
              "RECRUITMENT",
              "CANDIDATE_PORTAL",
            ].includes(
              source
            )
              ? new Date()
              : null,
        });
    } catch (
      error
    ) {
      await fs.promises
        .unlink(
          storage.absolutePath
        )
        .catch(
          () => {}
        );

      throw error;
    }
  };

/* =========================================================
   HR UPLOAD
========================================================= */

const uploadDocument =
  async ({
    employeeId,
    file,
    body =
      {},
    actorUserId =
      null,
  }) => {
    if (
      !file
    ) {
      throw new ApiError(
        400,
        "Please select a document."
      );
    }

    const employee =
      await getEmployee(
        employeeId
      );

    const hrUploadCount =
      await EmployeeDocument
        .countDocuments({
          employee:
            employee._id,

          source:
            "HR_UPLOAD",

          status:
            "ACTIVE",

          isCurrent:
            true,
        });

    if (
      hrUploadCount >=
      MAX_HR_UPLOAD_DOCUMENTS
    ) {
      throw new ApiError(
        409,
        `Maximum ${MAX_HR_UPLOAD_DOCUMENTS} HR onboarding documents can be uploaded.`
      );
    }

    const fallbackLabel =
      clean(
        body.label
      ) ||
      clean(
        file.originalname
      ) ||
      "Employee Document";

    const fallbackType =
      cleanUpper(
        body.documentType ||
        fallbackLabel ||
        "EMPLOYEE_DOCUMENT"
      );

    const normalizedCategory =
      normalizeEmployeeCategory(
        body.category,
        "JOINING"
      );

    return registerDocumentBuffer({
      employeeId:
        employee._id,

      buffer:
        file.buffer,

      originalFileName:
        file.originalname,

      mimeType:
        file.mimetype,

      category:
        normalizedCategory,

      documentType:
        fallbackType,

      label:
        fallbackLabel,

      description:
        body.description,

      source:
        "HR_UPLOAD",

      signedDate:
        body.signedDate ||
        null,

      expiryDate:
        body.expiryDate ||
        null,

      remarks:
        body.remarks,

      actorUserId,

      allowDuplicate:
        String(
          body.allowDuplicate
        ).toLowerCase() ===
        "true",
    });
  };

/* =========================================================
   REPLACE DOCUMENT
========================================================= */

const replaceDocument =
  async ({
    employeeId,
    documentId,
    file,
    body =
      {},
    actorUserId =
      null,
  }) => {
    if (
      !file
    ) {
      throw new ApiError(
        400,
        "Replacement file is required."
      );
    }

    const existing =
      await getDocument({
        employeeId,

        documentId,
      });

    if (
      existing.status !==
        "ACTIVE" ||
      !existing.isCurrent
    ) {
      throw new ApiError(
        409,
        "Only the current document version can be replaced."
      );
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype
      )
    ) {
      throw new ApiError(
        400,
        "Only PDF, JPG and PNG documents are supported."
      );
    }

    if (
      !file.buffer ||
      file.buffer.length >
        MAX_DOCUMENT_SIZE
    ) {
      throw new ApiError(
        400,
        "Document exceeds the 15 MB file limit."
      );
    }

    validateFileSignature({
      buffer:
        file.buffer,

      mimeType:
        file.mimetype,
    });

    const employee =
      await getEmployee(
        employeeId
      );

    const checksum =
      checksumBuffer(
        file.buffer
      );

    if (
      checksum ===
      existing.checksum
    ) {
      throw new ApiError(
        409,
        "The replacement file is identical to the current document."
      );
    }

    const newCategory =
      normalizeEmployeeCategory(
        body.category ||
        existing.category,
        existing.category
      );

    const newType =
      cleanUpper(
        body.documentType ||
        existing.documentType
      );

    const newLabel =
      clean(
        body.label ||
        existing.label
      );

    const storage =
      await writeEmployeeFile({
        employee,

        buffer:
          file.buffer,

        mimeType:
          file.mimetype,

        baseName:
          newType ||
          existing.documentType,
      });

    let newDocument;

    try {
      newDocument =
        await EmployeeDocument
          .create({
            employee:
              employee._id,

            onboarding:
              existing.onboarding,

            category:
              newCategory,

            documentType:
              newType,

            label:
              newLabel,

            description:
              body.description !==
              undefined
                ? clean(
                    body.description
                  )
                : existing.description,

            source:
              "HR_UPLOAD",

            sourceRecordType:
              "",

            sourceRecordId:
              "",

            sourceDocumentId:
              "",

            sourceFingerprint:
              "",

            originalFileName:
              safeFilePart(
                file.originalname
              ),

            storedFileName:
              storage.storedFileName,

            absolutePath:
              storage.absolutePath,

            relativePath:
              storage.relativePath,

            mimeType:
              file.mimetype,

            extension:
              storage.extension,

            fileSize:
              file.buffer.length,

            checksum,

            version:
              Number(
                existing.version ||
                1
              ) +
              1,

            isCurrent:
              true,

            replacesDocument:
              existing._id,

            signedDate:
              body.signedDate !==
              undefined
                ? body.signedDate ||
                  null
                : existing.signedDate,

            expiryDate:
              body.expiryDate !==
              undefined
                ? body.expiryDate ||
                  null
                : existing.expiryDate,

            remarks:
              body.remarks !==
              undefined
                ? clean(
                    body.remarks
                  )
                : existing.remarks,

            status:
              "ACTIVE",

            uploadedBy:
              actorUserId ||
              null,

            updatedBy:
              actorUserId ||
              null,
          });

      existing.status =
        "REPLACED";

      existing.isCurrent =
        false;

      existing.replacedByDocument =
        newDocument._id;

      existing.updatedBy =
        actorUserId ||
        null;

      await existing.save();

      return newDocument;
    } catch (
      error
    ) {
      await fs.promises
        .unlink(
          storage.absolutePath
        )
        .catch(
          () => {}
        );

      throw error;
    }
  };

/* =========================================================
   UPDATE METADATA
========================================================= */

const updateDocument =
  async ({
    employeeId,
    documentId,
    payload =
      {},
    actorUserId =
      null,
  }) => {
    const document =
      await getDocument({
        employeeId,

        documentId,
      });

    if (
      payload.category !==
      undefined
    ) {
      document.category =
        normalizeEmployeeCategory(
          payload.category,
          document.category
        );
    }

    if (
      payload.documentType !==
      undefined
    ) {
      const value =
        cleanUpper(
          payload.documentType
        );

      if (
        !value
      ) {
        throw new ApiError(
          400,
          "Document type cannot be empty."
        );
      }

      document.documentType =
        value;
    }

    if (
      payload.label !==
      undefined
    ) {
      const label =
        clean(
          payload.label
        );

      if (
        !label
      ) {
        throw new ApiError(
          400,
          "Document label cannot be empty."
        );
      }

      document.label =
        label;
    }

    for (
      const field
      of [
        "description",
        "remarks",
      ]
    ) {
      if (
        payload[field] !==
        undefined
      ) {
        document[field] =
          clean(
            payload[field]
          );
      }
    }

    if (
      payload.signedDate !==
      undefined
    ) {
      document.signedDate =
        payload.signedDate ||
        null;
    }

    if (
      payload.expiryDate !==
      undefined
    ) {
      document.expiryDate =
        payload.expiryDate ||
        null;
    }

    document.updatedBy =
      actorUserId ||
      null;

    await document.save();

    return document;
  };

/* =========================================================
   DELETE
========================================================= */

const deleteDocument =
  async ({
    employeeId,
    documentId,
    actorUserId =
      null,
  }) => {
    const document =
      await getDocument({
        employeeId,

        documentId,
      });

    document.status =
      "DELETED";

    document.isCurrent =
      false;

    document.updatedBy =
      actorUserId ||
      null;

    await document.save();

    return {
      deleted:
        true,

      documentId:
        document._id,
    };
  };

/* =========================================================
   OPEN FILE
========================================================= */

const getDocumentFile =
  async ({
    employeeId,
    documentId,
  }) => {
    const document =
      await getDocument({
        employeeId,

        documentId,
      });

    /*
     * Employee documents should normally have absolutePath.
     *
     * relativePath fallback is included for older records.
     */
    const candidates = [];

    if (
      document.absolutePath
    ) {
      candidates.push(
        document.absolutePath
      );
    }

    if (
      document.relativePath
    ) {
      candidates.push(
        path.join(
          EMPLOYEE_DOCUMENT_STORAGE_PATH,
          document.relativePath
        )
      );
    }

    let resolvedPath =
      "";

    for (
      const candidate
      of candidates
    ) {
      if (
        candidate &&
        fs.existsSync(
          candidate
        )
      ) {
        resolvedPath =
          candidate;

        break;
      }
    }

    if (
      !resolvedPath
    ) {
      throw new ApiError(
        404,
        "Employee document file is unavailable."
      );
    }

    return {
      path:
        resolvedPath,

      fileName:
        document.originalFileName ||
        document.storedFileName ||
        "document",

      mimeType:
        document.mimeType ||
        "application/octet-stream",
    };
  };

/* =========================================================
   RECRUITMENT FILE EXTRACTION
========================================================= */

const getPossibleFilePath =
  (
    value
  ) => {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return "";
    }

    /*
     * relativePath is essential for CandidateDocumentRecord.
     */
    return (
      value.absolutePath ||
      value.filePath ||
      value.path ||
      value.storagePath ||
      value.relativePath ||
      ""
    );
  };

/* =========================================================
   COLLECT FILE OBJECTS

   Used mainly for LOI / Offer / legacy recruitment records.
========================================================= */

const collectFileObjects =
  (
    value,
    trail =
      [],
    output =
      [],
    visited =
      new Set()
  ) => {
    if (
      value ===
        null ||
      value ===
        undefined
    ) {
      return output;
    }

    if (
      typeof value !==
      "object"
    ) {
      return output;
    }

    if (
      visited.has(
        value
      )
    ) {
      return output;
    }

    visited.add(
      value
    );

    if (
      Buffer.isBuffer(
        value
      )
    ) {
      return output;
    }

    const possiblePath =
      getPossibleFilePath(
        value
      );

    if (
      possiblePath
    ) {
      output.push({
        value,

        trail,
      });

      /*
       * Once this object itself represents a file,
       * do not recursively inspect its scalar metadata.
       */
      return output;
    }

    if (
      Array.isArray(
        value
      )
    ) {
      value.forEach(
        (
          item,
          index
        ) => {
          collectFileObjects(
            item,
            [
              ...trail,
              String(
                index
              ),
            ],
            output,
            visited
          );
        }
      );

      return output;
    }

    for (
      const [
        key,
        child,
      ]
      of Object.entries(
        value
      )
    ) {
      collectFileObjects(
        child,
        [
          ...trail,
          key,
        ],
        output,
        visited
      );
    }

    return output;
  };

/* =========================================================
   SOURCE FILE PATH RESOLVER
========================================================= */

const resolveExistingSourcePath =
  (
    rawPath,
    {
      recruitmentFile =
        false,
    } = {}
  ) => {
    const value =
      clean(
        rawPath
      );

    if (
      !value
    ) {
      return "";
    }

    /* =====================================================
       ABSOLUTE PATH
    ===================================================== */

    if (
      path.isAbsolute(
        value
      ) &&
      fs.existsSync(
        value
      )
    ) {
      return value;
    }

    /* =====================================================
       CANDIDATE PORTAL / RECRUITMENT STORAGE
    ===================================================== */

    if (
      recruitmentFile &&
      typeof getRecruitmentStoredDocumentPath ===
        "function"
    ) {
      try {
        const recruitmentPath =
          getRecruitmentStoredDocumentPath(
            value
          );

        if (
          recruitmentPath &&
          fs.existsSync(
            recruitmentPath
          )
        ) {
          return recruitmentPath;
        }
      } catch (
        error
      ) {
        console.warn(
          "[Employee Documents] Recruitment file path resolution failed:",
          {
            relativePath:
              value,

            message:
              error?.message,
          }
        );
      }
    }

    /* =====================================================
       FALLBACK PATHS

       These preserve LOI / Offer / legacy compatibility.
    ===================================================== */

    const candidates = [
      path.resolve(
        process.cwd(),
        value
      ),

      path.resolve(
        process.cwd(),
        "src",
        value
      ),

      path.resolve(
        process.cwd(),
        "uploads",
        value
      ),

      path.resolve(
        process.cwd(),
        "storage",
        value
      ),
    ];

    for (
      const candidate
      of candidates
    ) {
      if (
        fs.existsSync(
          candidate
        )
      ) {
        return candidate;
      }
    }

    return "";
  };

/* =========================================================
   LABEL / TYPE
========================================================= */

const inferDocumentIdentity =
  ({
    fileObject =
      {},
    trail =
      [],
    forcedType =
      "",
    forcedLabel =
      "",
  }) => {
    const rawType =
      forcedType ||
      fileObject.documentType ||
      fileObject.type ||
      fileObject.documentCode ||
      "";

    const normalizedType =
      cleanUpper(
        rawType
      );

    const rawLabel =
      forcedLabel ||
      fileObject.documentLabel ||
      fileObject.label ||
      fileObject.title ||
      DOCUMENT_LABELS[
        normalizedType
      ] ||
      fileObject.name ||
      fileObject.originalName ||
      fileObject.originalFileName ||
      fileObject.fileName ||
      trail[
        trail.length -
        1
      ] ||
      "Recruitment Document";

    const label =
      clean(
        rawLabel
      )
        .replace(
          /_/g,
          " "
        ) ||
      "Recruitment Document";

    return {
      label,

      documentType:
        normalizedType ||
        cleanUpper(
          rawLabel
        ) ||
        "RECRUITMENT_DOCUMENT",
    };
  };

/* =========================================================
   MIME
========================================================= */

const inferMime =
  (
    filePath,
    declaredMime
  ) => {
    const normalizedDeclaredMime =
      clean(
        declaredMime
      )
        .toLowerCase();

    if (
      ALLOWED_MIME_TYPES.includes(
        normalizedDeclaredMime
      )
    ) {
      return normalizedDeclaredMime;
    }

    const extension =
      path
        .extname(
          filePath
        )
        .toLowerCase();

    if (
      extension ===
      ".pdf"
    ) {
      return "application/pdf";
    }

    if (
      [
        ".jpg",
        ".jpeg",
      ].includes(
        extension
      )
    ) {
      return "image/jpeg";
    }

    if (
      extension ===
      ".png"
    ) {
      return "image/png";
    }

    return "";
  };

/* =========================================================
   IMPORT ONE EXISTING FILE
========================================================= */

const importExistingFile =
  async ({
    employee,
    sourceRecordType,
    sourceRecordId,
    sourceDocumentId,
    fileObject,
    trail =
      [],
    category,
    source =
      "RECRUITMENT",
    actorUserId =
      null,
    recruitmentFile =
      false,
    forcedType =
      "",
    forcedLabel =
      "",
  }) => {
    const rawPath =
      getPossibleFilePath(
        fileObject
      );

    if (
      !rawPath
    ) {
      return {
        imported:
          false,

        reason:
          "PATH_MISSING",

        sourceRecordType,

        sourceRecordId:
          String(
            sourceRecordId ||
            ""
          ),

        sourceDocumentId:
          String(
            sourceDocumentId ||
            ""
          ),
      };
    }

    const sourcePath =
      resolveExistingSourcePath(
        rawPath,
        {
          recruitmentFile,
        }
      );

    if (
      !sourcePath
    ) {
      console.warn(
        "[Employee Documents] Recruitment source file not found:",
        {
          sourceRecordType,

          sourceRecordId:
            String(
              sourceRecordId ||
              ""
            ),

          sourceDocumentId:
            String(
              sourceDocumentId ||
              ""
            ),

          rawPath,
        }
      );

      return {
        imported:
          false,

        reason:
          "FILE_NOT_FOUND",

        rawPath,
      };
    }

    const mimeType =
      inferMime(
        sourcePath,
        fileObject.mimeType ||
        fileObject.mimetype
      );

    if (
      !mimeType
    ) {
      return {
        imported:
          false,

        reason:
          "UNSUPPORTED_TYPE",

        sourcePath,
      };
    }

    let buffer;

    try {
      buffer =
        await fs.promises
          .readFile(
            sourcePath
          );
    } catch (
      error
    ) {
      console.error(
        "[Employee Documents] Could not read recruitment file:",
        {
          sourcePath,

          message:
            error?.message,
        }
      );

      return {
        imported:
          false,

        reason:
          "FILE_READ_FAILED",

        sourcePath,
      };
    }

    const identity =
      inferDocumentIdentity({
        fileObject,

        trail,

        forcedType,

        forcedLabel,
      });

    const originalFileName =
      fileObject.originalName ||
      fileObject.fileName ||
      fileObject.originalFileName ||
      fileObject.storedName ||
      path.basename(
        sourcePath
      );

    try {
      const document =
        await registerDocumentBuffer({
          employeeId:
            employee._id,

          buffer,

          originalFileName,

          mimeType,

          category,

          documentType:
            identity.documentType,

          label:
            identity.label,

          source,

          sourceRecordType,

          sourceRecordId:
            String(
              sourceRecordId ||
              ""
            ),

          sourceDocumentId:
            String(
              sourceDocumentId ||
              trail.join(
                "."
              )
            ),

          actorUserId,

          allowDuplicate:
            true,
        });

      return {
        imported:
          true,

        document,
      };
    } catch (
      error
    ) {
      if (
        error.statusCode ===
          409 ||
        error.status ===
          409 ||
        error.code ===
          11000
      ) {
        return {
          imported:
            false,

          reason:
            "ALREADY_IMPORTED",
        };
      }

      throw error;
    }
  };

/* =========================================================
   RECRUITMENT DOCUMENT MODEL RESOLVER
========================================================= */

const resolveCandidateDocumentModel =
  () => {
    const possibleNames = [
      "CandidateDocumentRecord",
      "CandidateDocument",
      "SelectionDocument",
      "CandidateDocuments",
    ];

    for (
      const modelName
      of possibleNames
    ) {
      if (
        mongoose.models[
          modelName
        ]
      ) {
        return mongoose.models[
          modelName
        ];
      }
    }

    return null;
  };

/* =========================================================
   IMPORT LOI / OFFER OBJECT

   LOI and Offer structures may differ from CandidateDocument.
========================================================= */

const importFilesFromRecruitmentObject =
  async ({
    employee,
    object,
    sourceRecordType,
    sourceRecordId,
    category,
    actorUserId,
    forcedType =
      "",
    forcedLabel =
      "",
  }) => {
    const results =
      [];

    if (
      !object
    ) {
      return results;
    }

    const files =
      collectFileObjects(
        object
      );

    for (
      const item
      of files
    ) {
      const result =
        await importExistingFile({
          employee,

          sourceRecordType,

          sourceRecordId,

          sourceDocumentId:
            item
              .value
              ?._id
              ? String(
                  item
                    .value
                    ._id
                )
              : item
                  .trail
                  .join(
                    "."
                  ),

          fileObject:
            item.value,

          trail:
            item.trail,

          category,

          source:
            "RECRUITMENT",

          actorUserId,

          /*
           * Try recruitment storage first for relative paths.
           */
          recruitmentFile:
            Boolean(
              item
                .value
                ?.relativePath
            ),

          forcedType,

          forcedLabel,
        });

      results.push(
        result
      );
    }

    return results;
  };

/* =========================================================
   SYNC RECRUITMENT DOCUMENTS
========================================================= */

const syncRecruitmentDocuments =
  async ({
    employeeId,
    actorUserId =
      null,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    if (
      !employee.recruitmentSelection
    ) {
      return {
        employeeId:
          employee._id,

        imported:
          0,

        skipped:
          0,

        details:
          [],

        message:
          "This employee was not created from recruitment. No recruitment documents are available to sync.",
      };
    }

    const selection =
      await Selection
        .findById(
          employee.recruitmentSelection
        )
        .populate(
          "candidate"
        )
        .populate(
          "currentLoi"
        )
        .populate(
          "currentOffer"
        )
        .lean();

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Recruitment selection record could not be found."
      );
    }

    let imported =
      0;

    let skipped =
      0;

    const details =
      [];

    const addResults =
      (
        results
      ) => {
        for (
          const result
          of results
        ) {
          if (
            result.imported
          ) {
            imported++;
          } else {
            skipped++;
          }

          details.push(
            result
          );
        }
      };

    /* =====================================================
       LOI
    ===================================================== */

    if (
      selection.currentLoi
    ) {
      const loiResults =
        await importFilesFromRecruitmentObject({
          employee,

          object:
            selection.currentLoi,

          sourceRecordType:
            "Loi",

          sourceRecordId:
            selection
              .currentLoi
              ._id,

          category:
            "OFFER",

          actorUserId,

          forcedType:
            "LOI",

          forcedLabel:
            "Letter of Intent",
        });

      addResults(
        loiResults
      );
    }

    /* =====================================================
       OFFER LETTER
    ===================================================== */

    if (
      selection.currentOffer
    ) {
      const offerResults =
        await importFilesFromRecruitmentObject({
          employee,

          object:
            selection.currentOffer,

          sourceRecordType:
            "Offer",

          sourceRecordId:
            selection
              .currentOffer
              ._id,

          category:
            "OFFER",

          actorUserId,

          forcedType:
            "OFFER_LETTER",

          forcedLabel:
            "Offer Letter",
        });

      addResults(
        offerResults
      );
    }

    /* =====================================================
       CANDIDATE PORTAL DOCUMENTS

       IMPORTANT:
       CandidateDocumentRecord stores uploaded candidate
       documents in record.documents[].

       Do NOT recursively scan the whole record here.
    ===================================================== */

    const CandidateDocumentModel =
      resolveCandidateDocumentModel();

    if (
      CandidateDocumentModel
    ) {
      const candidateId =
        selection
          ?.candidate
          ?._id ||
        selection
          ?.candidate ||
        employee
          .recruitmentCandidate ||
        null;

      const queryOr = [
        {
          selection:
            selection._id,
        },
      ];

      if (
        candidateId
      ) {
        queryOr.push({
          candidate:
            candidateId,
        });
      }

      const sourceRecords =
        await CandidateDocumentModel
          .find({
            $or:
              queryOr,
          })
          .lean();

      for (
        const record
        of sourceRecords
      ) {
        const candidateDocuments =
          Array.isArray(
            record.documents
          )
            ? record.documents
            : [];

        for (
          let index =
            0;
          index <
          candidateDocuments.length;
          index++
        ) {
          const candidateDocument =
            candidateDocuments[
              index
            ];

          if (
            !candidateDocument
          ) {
            skipped++;

            details.push({
              imported:
                false,

              reason:
                "EMPTY_DOCUMENT_RECORD",
            });

            continue;
          }

          /*
           * Ignore historical/replaced versions.
           */
          if (
            candidateDocument
              .isCurrent ===
              false ||
            cleanUpper(
              candidateDocument
                .status
            ) ===
              "REPLACED" ||
            cleanUpper(
              candidateDocument
                .status
            ) ===
              "DELETED"
          ) {
            skipped++;

            details.push({
              imported:
                false,

              reason:
                "HISTORICAL_VERSION",

              documentId:
                candidateDocument
                  ?._id ||
                null,

              type:
                candidateDocument
                  ?.type ||
                "",
            });

            continue;
          }

          const documentType =
            cleanUpper(
              candidateDocument
                .type ||
              candidateDocument
                .documentType ||
              "RECRUITMENT_DOCUMENT"
            );

          const documentLabel =
            DOCUMENT_LABELS[
              documentType
            ] ||
            clean(
              candidateDocument
                .documentLabel
            ) ||
            clean(
              candidateDocument
                .label
            ) ||
            clean(
              candidateDocument
                .originalName
            ) ||
            documentType
              .replace(
                /_/g,
                " "
              );

          const stableDocumentId =
            candidateDocument
              ?._id
              ? String(
                  candidateDocument
                    ._id
                )
              : sha256(
                  [
                    documentType,
                    candidateDocument
                      .relativePath ||
                      "",
                    candidateDocument
                      .storedName ||
                      "",
                    index,
                  ].join(
                    "|"
                  )
                );

          const result =
            await importExistingFile({
              employee,

              sourceRecordType:
                CandidateDocumentModel
                  .modelName ||
                "CandidateDocumentRecord",

              sourceRecordId:
                record._id,

              sourceDocumentId:
                stableDocumentId,

              fileObject: {
                ...candidateDocument,

                /*
                 * importExistingFile accepts all these,
                 * but explicitly supplying path makes the
                 * intent clear and keeps legacy compatibility.
                 */
                path:
                  candidateDocument
                    .relativePath ||
                  candidateDocument
                    .path ||
                  candidateDocument
                    .filePath ||
                  "",
              },

              trail: [
                "documents",
                String(
                  index
                ),
              ],

              category:
                "RECRUITMENT",

              source:
                "CANDIDATE_PORTAL",

              actorUserId,

              recruitmentFile:
                true,

              forcedType:
                documentType,

              forcedLabel:
                documentLabel,
            });

          if (
            result.imported
          ) {
            imported++;
          } else {
            skipped++;
          }

          details.push({
            ...result,

            candidateDocumentType:
              documentType,

            candidateDocumentId:
              candidateDocument
                ?._id ||
              null,

            originalName:
              candidateDocument
                ?.originalName ||
              "",
          });
        }
      }
    } else {
      console.warn(
        "[Employee Documents] Candidate document model is not registered."
      );

      details.push({
        imported:
          false,

        reason:
          "CANDIDATE_DOCUMENT_MODEL_NOT_REGISTERED",
      });
    }

    /* =====================================================
       CHECKLIST
    ===================================================== */

    const hasRecruitmentDocuments =
      Boolean(
        await EmployeeDocument
          .exists({
            employee:
              employee._id,

            status:
              "ACTIVE",

            isCurrent:
              true,

            source: {
              $in: [
                "RECRUITMENT",
                "CANDIDATE_PORTAL",
              ],
            },
          })
      );

    if (
      (
        imported >
          0 ||
        hasRecruitmentDocuments
      ) &&
      employee.onboarding
    ) {
      await EmployeeOnboarding
        .findByIdAndUpdate(
          employee.onboarding,
          {
            $set: {
              "checklist.employeeDocuments":
                true,

              updatedBy:
                actorUserId ||
                null,
            },

            $push: {
              auditTrail: {
                event:
                  "EMPLOYEE_DOCUMENTS_SYNCED",

                remarks:
                  "Recruitment and candidate documents synchronized with the Employee Document Vault.",

                performedBy:
                  actorUserId ||
                  null,

                metadata: {
                  imported,

                  skipped,
                },

                at:
                  new Date(),
              },
            },
          }
        );
    }

    return {
      employeeId:
        employee._id,

      candidateId:
        selection
          ?.candidate
          ?._id ||
        selection
          ?.candidate ||
        employee
          .recruitmentCandidate ||
        null,

      selectionId:
        selection._id,

      imported,

      skipped,

      details,
    };
  };

/* =========================================================
   VAULT
========================================================= */

const getEmployeeDocumentVault =
  async (
    employeeId,
    {
      actorUserId =
        null,

      autoSync =
        true,
    } = {}
  ) => {
    const employee =
      await getEmployee(
        employeeId
      );

    /* =====================================================
       AUTO-SYNC RECRUITMENT DOCUMENTS
    ===================================================== */

    let syncResult =
      null;

    let syncWarning =
      "";

    if (
      autoSync &&
      employee.recruitmentSelection
    ) {
      try {
        syncResult =
          await syncRecruitmentDocuments({
            employeeId:
              employee._id,

            actorUserId,
          });
      } catch (
        error
      ) {
        syncWarning =
          error?.message ||
          "Recruitment documents could not be synchronized.";

        console.error(
          "[Employee Documents] Automatic recruitment sync failed:",
          {
            employeeId:
              String(
                employee._id
              ),

            selectionId:
              String(
                employee.recruitmentSelection ||
                ""
              ),

            message:
              error?.message,

            stack:
              error?.stack,
          }
        );
      }
    }

    /* =====================================================
       DOCUMENTS
    ===================================================== */

    const documents =
      await EmployeeDocument
        .find({
          employee:
            employee._id,

          status:
            "ACTIVE",

          isCurrent:
            true,
        })
        .populate(
          "uploadedBy",
          "displayName email"
        )
        .sort({
          category:
            1,

          createdAt:
            -1,
        })
        .lean();

    /* =====================================================
       GROUPED
    ===================================================== */

    const grouped =
      {};

    for (
      const document
      of documents
    ) {
      const category =
        document.category ||
        "OTHER";

      if (
        !grouped[
          category
        ]
      ) {
        grouped[
          category
        ] = [];
      }

      grouped[
        category
      ].push(
        document
      );
    }

    /* =====================================================
       SOURCE GROUPS
    ===================================================== */

    const recruitmentDocuments =
      documents.filter(
        (
          document
        ) =>
          [
            "RECRUITMENT",
            "CANDIDATE_PORTAL",
          ].includes(
            document.source
          )
      );

    const candidatePortalDocuments =
      documents.filter(
        (
          document
        ) =>
          document.source ===
          "CANDIDATE_PORTAL"
      );

    const hrDocuments =
      documents.filter(
        (
          document
        ) =>
          document.source ===
          "HR_UPLOAD"
      );

    const generatedDocuments =
      documents.filter(
        (
          document
        ) =>
          [
            "GENERATED",
            "SYSTEM",
          ].includes(
            document.source
          )
      );

    const masterFiles =
      documents.filter(
        (
          document
        ) =>
          document.category ===
          "MASTER_FILE"
      );

    const mergeEligible =
      documents.filter(
        (
          document
        ) =>
          [
            "application/pdf",
            "image/jpeg",
            "image/png",
          ].includes(
            document.mimeType
          ) &&
          document.category !==
            "MASTER_FILE"
      );

    /* =====================================================
       CAPACITY
    ===================================================== */

    const hrUploadCount =
      hrDocuments.length;

    const hrUploadRemaining =
      Math.max(
        0,
        MAX_HR_UPLOAD_DOCUMENTS -
        hrUploadCount
      );

    return {
      employee: {
        _id:
          employee._id,

        employeeCode:
          employee.employeeCode,

        fullName:
          employee.fullName,

        designation:
          employee.designation,

        officialEmail:
          employee.officialEmail,

        personalEmail:
          employee.personalEmail,

        status:
          employee.status,

        recruitmentCandidate:
          employee.recruitmentCandidate ||
          null,

        recruitmentSelection:
          employee.recruitmentSelection ||
          null,

        onboarding:
          employee.onboarding ||
          null,
      },

      counts: {
        total:
          documents.length,

        recruitment:
          recruitmentDocuments.length,

        candidatePortal:
          candidatePortalDocuments.length,

        hrUploaded:
          hrDocuments.length,

        generated:
          generatedDocuments.length,

        mergeEligible:
          mergeEligible.length,

        generatedMasterFiles:
          masterFiles.length,
      },

      uploadCapacity: {
        used:
          hrUploadCount,

        maximum:
          MAX_HR_UPLOAD_DOCUMENTS,

        remaining:
          hrUploadRemaining,

        full:
          hrUploadCount >=
          MAX_HR_UPLOAD_DOCUMENTS,
      },

      documents,

      recruitmentDocuments,

      candidatePortalDocuments,

      hrDocuments,

      generatedDocuments,

      masterFiles,

      mergeEligible,

      grouped,

      recruitmentSync: {
        attempted:
          Boolean(
            autoSync &&
            employee.recruitmentSelection
          ),

        imported:
          Number(
            syncResult?.imported ||
            0
          ),

        skipped:
          Number(
            syncResult?.skipped ||
            0
          ),

        warning:
          syncWarning,

        success:
          !syncWarning,

        details:
          syncResult?.details ||
          [],
      },
    };
  };

/* =========================================================
   MERGE
========================================================= */

const generateMasterEmployeeFile =
  async ({
    employeeId,
    documentIds,
    includeCover =
      true,
    actorUserId =
      null,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    if (
      !Array.isArray(
        documentIds
      ) ||
      documentIds.length ===
        0
    ) {
      throw new ApiError(
        400,
        "Select at least one document."
      );
    }

    if (
      documentIds.length >
      50
    ) {
      throw new ApiError(
        400,
        "A maximum of 50 documents can be merged at one time."
      );
    }

    for (
      const documentId
      of documentIds
    ) {
      if (
        !validId(
          documentId
        )
      ) {
        throw new ApiError(
          400,
          "One or more selected Document IDs are invalid."
        );
      }
    }

    const selected =
      await EmployeeDocument
        .find({
          _id: {
            $in:
              documentIds,
          },

          employee:
            employee._id,

          status:
            "ACTIVE",

          isCurrent:
            true,
        })
        .lean();

    const byId =
      new Map(
        selected.map(
          (
            document
          ) => [
            String(
              document._id
            ),
            document,
          ]
        )
      );

    const ordered =
      documentIds.map(
        (
          documentId
        ) =>
          byId.get(
            String(
              documentId
            )
          )
      );

    if (
      ordered.some(
        (
          document
        ) =>
          !document
      )
    ) {
      throw new ApiError(
        400,
        "One or more selected documents are unavailable."
      );
    }

    if (
      ordered.some(
        (
          document
        ) =>
          document.category ===
          "MASTER_FILE"
      )
    ) {
      throw new ApiError(
        400,
        "A previously generated Master File cannot be nested inside another Master File."
      );
    }

    let buffer;

    try {
      buffer =
        await mergeEmployeeDocuments({
          employee,

          documents:
            ordered,

          includeCover:
            Boolean(
              includeCover
            ),
        });
    } catch (
      error
    ) {
      throw new ApiError(
        422,
        error.message ||
        "Employee Master File could not be generated."
      );
    }

    const existingCount =
      await EmployeeDocument
        .countDocuments({
          employee:
            employee._id,

          category:
            "MASTER_FILE",
        });

    const version =
      existingCount +
      1;

    return registerDocumentBuffer({
      employeeId:
        employee._id,

      buffer,

      originalFileName:
        `${safeFilePart(
          employee.employeeCode
        )}-${safeFilePart(
          employee.fullName
        )}-Employee-File-V${version}.pdf`,

      mimeType:
        "application/pdf",

      category:
        "MASTER_FILE",

      documentType:
        "MASTER_EMPLOYEE_FILE",

      label:
        `Employee Master File V${version}`,

      description:
        "Merged employee dossier generated from the Employee Document Vault.",

      source:
        "GENERATED",

      sourceRecordType:
        "EmployeeMasterFile",

      sourceRecordId:
        employee._id,

      sourceDocumentId:
        `${Date.now()}-${version}`,

      actorUserId,

      allowDuplicate:
        true,

      generatedFromDocuments:
        ordered.map(
          (
            item
          ) =>
            item._id
        ),
    });
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  EMPLOYEE_DOCUMENT_STORAGE_PATH,

  MAX_HR_UPLOAD_DOCUMENTS,

  getEmployeeDocumentVault,

  getDocumentFile,

  uploadDocument,

  replaceDocument,

  updateDocument,

  deleteDocument,

  syncRecruitmentDocuments,

  generateMasterEmployeeFile,

  registerDocumentBuffer,
};