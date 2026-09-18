const fs =
  require("fs");

const crypto =
  require("crypto");

const mongoose =
  require("mongoose");

const {
  CandidateDocumentRecord,
  DOCUMENT_TYPES,
} =
  require(
    "./candidateDocument.model"
  );

const {
  Selection,
} =
  require(
    "../selection.model"
  );

const {
  Candidate,
} =
  require(
    "../../recruitment/candidate.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

const {
  resolvePortalToken,
} =
  require(
    "../portal/candidatePortal.service"
  );

const {
  transitionSelectionStatus,
} =
  require(
    "../selection.service"
  );

const {
  makeDocumentPermanent,
  deleteStoredDocument,
  getStoredDocumentPath,
} =
  require(
    "./documentStorage.service"
  );

const {
  assertUploadedDocumentValid,
  deleteTempFile,
  hashSensitiveValue,
} =
  require(
    "./documentScan.service"
  );

const transporter =
  require(
    "../../config/mailTransporter"
  );

const {
  buildDocumentsReceivedCandidateEmail,
} =
  require(
    "../emails/documentsReceivedCandidate.template"
  );

const {
  buildDocumentsSubmittedHrEmail,
} =
  require(
    "../emails/documentsSubmittedHr.template"
  );

const {
  buildDocumentQueryEmail,
} =
  require(
    "../emails/documentQuery.template"
  );

const {
  buildDocumentsVerifiedEmail,
} =
  require(
    "../emails/documentsVerified.template"
  );

/* =========================================================
   HELPERS
========================================================= */

const clean =
  (
    value,
    max = 1000
  ) =>
    String(
      value ??
        ""
    )
      .trim()
      .slice(
        0,
        max
      );

const userId =
  (
    user
  ) =>
    user?._id ||
    user?.id ||
    null;

const normalizeDocumentType =
  (
    value
  ) => {
    const type =
      String(
        value ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !DOCUMENT_TYPES.includes(
        type
      )
    ) {
      throw new ApiError(
        400,
        "Invalid document type"
      );
    }

    return type;
  };

const cleanPhone =
  (
    value
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
        10
      );

const normalizeBankText =
  (
    value
  ) =>
    String(
      value ||
        ""
    )
      .toUpperCase()
      .replace(
        /[^A-Z0-9]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

/* =========================================================
   BANK DIRECTORY

   IFSC first four letters identify the bank.

   Add more aliases/codes here whenever needed.
========================================================= */

const BANK_DIRECTORY = {
  HDFC: {
    name:
      "HDFC Bank",

    aliases: [
      "HDFC",
      "HDFC BANK",
    ],
  },

  ICIC: {
    name:
      "ICICI Bank",

    aliases: [
      "ICICI",
      "ICICI BANK",
    ],
  },

  SBIN: {
    name:
      "State Bank of India",

    aliases: [
      "SBI",
      "STATE BANK",
      "STATE BANK OF INDIA",
    ],
  },

  CNRB: {
    name:
      "Canara Bank",

    aliases: [
      "CANARA",
      "CANARA BANK",
    ],
  },

  PUNB: {
    name:
      "Punjab National Bank",

    aliases: [
      "PNB",
      "PUNJAB NATIONAL BANK",
    ],
  },

  BARB: {
    name:
      "Bank of Baroda",

    aliases: [
      "BOB",
      "BANK OF BARODA",
    ],
  },

  UBIN: {
    name:
      "Union Bank of India",

    aliases: [
      "UNION BANK",
      "UNION BANK OF INDIA",
    ],
  },

  BKID: {
    name:
      "Bank of India",

    aliases: [
      "BOI",
      "BANK OF INDIA",
    ],
  },

  IDIB: {
    name:
      "Indian Bank",

    aliases: [
      "INDIAN BANK",
    ],
  },

  IOBA: {
    name:
      "Indian Overseas Bank",

    aliases: [
      "IOB",
      "INDIAN OVERSEAS BANK",
    ],
  },

  UTIB: {
    name:
      "Axis Bank",

    aliases: [
      "AXIS",
      "AXIS BANK",
    ],
  },

  KKBK: {
    name:
      "Kotak Mahindra Bank",

    aliases: [
      "KOTAK",
      "KOTAK BANK",
      "KOTAK MAHINDRA",
      "KOTAK MAHINDRA BANK",
    ],
  },

  YESB: {
    name:
      "Yes Bank",

    aliases: [
      "YES BANK",
    ],
  },

  INDB: {
    name:
      "IndusInd Bank",

    aliases: [
      "INDUSIND",
      "INDUSIND BANK",
    ],
  },

  FDRL: {
    name:
      "Federal Bank",

    aliases: [
      "FEDERAL BANK",
    ],
  },

  IDFB: {
    name:
      "IDFC First Bank",

    aliases: [
      "IDFC",
      "IDFC FIRST",
      "IDFC FIRST BANK",
    ],
  },
};

/* =========================================================
   CURRENT DOCUMENTS
========================================================= */

const currentDocuments =
  (
    record
  ) =>
    (
      record?.documents ||
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

/* =========================================================
   BANK CONSISTENCY
========================================================= */

const getBankFromIfsc =
  (
    ifsc
  ) => {
    const normalized =
      String(
        ifsc ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      normalized.length <
      4
    ) {
      return null;
    }

    return (
      BANK_DIRECTORY[
        normalized.slice(
          0,
          4
        )
      ] ||
      null
    );
  };

const detectNamedBank =
  (
    value
  ) => {
    const normalized =
      normalizeBankText(
        value
      );

    if (
      !normalized
    ) {
      return null;
    }

    for (
      const [
        code,
        bank,
      ]
      of Object.entries(
        BANK_DIRECTORY
      )
    ) {
      const matched =
        bank.aliases.some(
          (
            alias
          ) =>
            normalized ===
              normalizeBankText(
                alias
              ) ||
            normalized.includes(
              normalizeBankText(
                alias
              )
            )
        );

      if (
        matched
      ) {
        return {
          code,
          ...bank,
        };
      }
    }

    return null;
  };

const assertBankConsistency =
  ({
    bankName,
    ifscCode,
    branch,
  }) => {
    if (
      !ifscCode
    ) {
      return;
    }

    const ifscBank =
      getBankFromIfsc(
        ifscCode
      );

    /*
     * Unknown IFSC prefixes are not automatically rejected.
     *
     * Format validation still applies.
     */
    if (
      !ifscBank
    ) {
      return;
    }

    const namedBank =
      detectNamedBank(
        bankName
      );

    if (
      namedBank &&
      namedBank.code !==
        String(
          ifscCode
        )
          .slice(
            0,
            4
          )
          .toUpperCase()
    ) {
      throw new ApiError(
        422,
        `Bank Name does not match the IFSC code. ${ifscCode} belongs to ${ifscBank.name}.`
      );
    }

    /*
     * Branch is free text, but if the candidate actually
     * writes another recognisable bank name into Branch,
     * flag it.
     */
    const branchBank =
      detectNamedBank(
        branch
      );

    if (
      branchBank &&
      branchBank.code !==
        String(
          ifscCode
        )
          .slice(
            0,
            4
          )
          .toUpperCase()
    ) {
      throw new ApiError(
        422,
        `Branch details appear inconsistent. The IFSC belongs to ${ifscBank.name}, but the Branch field mentions ${branchBank.name}.`
      );
    }
  };

/* =========================================================
   BANK PROOF CROSS-CHECK
========================================================= */

const getCurrentBankProof =
  (
    record
  ) =>
    currentDocuments(
      record
    ).find(
      (
        document
      ) =>
        document.type ===
        "BANK_PROOF"
    );

const assertBankMatchesProof =
  ({
    record,
    accountNumber,
    ifscCode,
  }) => {
    const bankProof =
      getCurrentBankProof(
        record
      );

    if (
      !bankProof
    ) {
      return;
    }

    const extracted =
      bankProof
        ?.scan
        ?.extracted ||
      {};

    const proofIfsc =
      String(
        extracted.ifsc ||
          ""
      )
        .trim()
        .toUpperCase();

    const enteredIfsc =
      String(
        ifscCode ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      proofIfsc &&
      enteredIfsc &&
      proofIfsc !==
        enteredIfsc
    ) {
      throw new ApiError(
        422,
        `IFSC Code does not match the uploaded Bank Proof. Bank Proof shows ${proofIfsc}.`
      );
    }

    const proofAccountHash =
      String(
        extracted.accountHash ||
          ""
      );

    if (
      proofAccountHash &&
      accountNumber
    ) {
      const enteredHash =
        hashSensitiveValue(
          accountNumber
        );

      if (
        enteredHash !==
        proofAccountHash
      ) {
        const last4 =
          extracted.accountLast4
            ? ` ending in ${extracted.accountLast4}`
            : "";

        throw new ApiError(
          422,
          `Account Number does not match the uploaded Bank Proof${last4}.`
        );
      }
    }
  };

/* =========================================================
   RECRUITMENT PROFILE → EMPLOYMENT TYPE
========================================================= */

const resolveCandidateIsFresher =
  (
    candidate
  ) => {
    const experience =
      Number(
        candidate
          ?.totalExperienceYears ||
          0
      );

    const company =
      clean(
        candidate
          ?.currentCompany,
        250
      );

    const designation =
      clean(
        candidate
          ?.currentDesignation,
        250
      );

    const history =
      Array.isArray(
        candidate
          ?.experienceHistory
      )
        ? candidate
            .experienceHistory
        : [];

    return !(
      experience >
        0 ||
      company ||
      designation ||
      history.length >
        0
    );
  };

/* =========================================================
   EMPLOYMENT SYNC
========================================================= */

const syncRecordEmploymentFromCandidate =
  async (
    record,
    candidate
  ) => {
    const isFresher =
      resolveCandidateIsFresher(
        candidate
      );

    if (
      !record.employment
    ) {
      record.employment =
        {};
    }

    let changed =
      false;

    if (
      record
        .employment
        .isFresher !==
      isFresher
    ) {
      record
        .employment
        .isFresher =
        isFresher;

      changed =
        true;
    }

    if (
      !isFresher
    ) {
      if (
        !record
          .employment
          .previousCompany &&
        candidate
          ?.currentCompany
      ) {
        record
          .employment
          .previousCompany =
          clean(
            candidate
              .currentCompany,
            250
          );

        changed =
          true;
      }

      if (
        !record
          .employment
          .previousDesignation &&
        candidate
          ?.currentDesignation
      ) {
        record
          .employment
          .previousDesignation =
          clean(
            candidate
              .currentDesignation,
            250
          );

        changed =
          true;
      }
    }

    if (
      changed
    ) {
      await record.save();
    }

    return record;
  };

/* =========================================================
   GET / CREATE RECORD
========================================================= */

const getOrCreateRecord =
  async (
    selection
  ) => {
    let record =
      await CandidateDocumentRecord
        .findOne({
          selection:
            selection._id,
        });

    if (
      record
    ) {
      return syncRecordEmploymentFromCandidate(
        record,
        selection
          .candidate
      );
    }

    const isFresher =
      resolveCandidateIsFresher(
        selection
          .candidate
      );

    record =
      await CandidateDocumentRecord
        .create({
          selection:
            selection._id,

          candidate:
            selection
              .candidate
              ?._id ||
            selection
              .candidate,

          employment: {
            isFresher,

            previousCompany:
              isFresher
                ? ""
                : clean(
                    selection
                      ?.candidate
                      ?.currentCompany,
                    250
                  ),

            previousDesignation:
              isFresher
                ? ""
                : clean(
                    selection
                      ?.candidate
                      ?.currentDesignation,
                    250
                  ),
          },
        });

    return record;
  };

/* =========================================================
   PUBLIC CONTEXT
========================================================= */

const resolveCandidateContext =
  async ({
    rawToken,
    ip,
    userAgent,
  }) => {
    const tokenRecord =
      await resolvePortalToken({
        rawToken,
        ip,
        userAgent,
      });

    const selection =
      await Selection
        .findById(
          tokenRecord
            .selection
        )
        .populate(
          "candidate"
        )
        .populate(
          "hiringHr",
          "displayName email"
        );

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found"
      );
    }

    if (
      ![
        "PRE_JOINING_DOCUMENTS",
        "DOCUMENT_QUERY",
        "DOCUMENTS_SUBMITTED",
        "DOCUMENT_VERIFICATION",
      ].includes(
        selection.status
      )
    ) {
      throw new ApiError(
        409,
        "Pre-joining documents are not available at the current stage"
      );
    }

    return {
      tokenRecord,
      selection,
    };
  };

/* =========================================================
   DOCUMENT REQUIREMENTS
========================================================= */

const getRequiredDocumentTypes =
  (
    isFresher
  ) => {
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
  };

const getOptionalDocumentTypes =
  () => [
    "FORM16",
    "OTHER",
  ];

/* =========================================================
   PUBLIC RECORD
========================================================= */

const getCandidateDocuments =
  async ({
    rawToken,
    ip,
    userAgent,
  }) => {
    const {
      selection,
    } =
      await resolveCandidateContext({
        rawToken,
        ip,
        userAgent,
      });

    const record =
      await getOrCreateRecord(
        selection
      );

    const isFresher =
      record
        ?.employment
        ?.isFresher;

    const data =
      record.toObject();

    data.documents =
      currentDocuments(
        record
      ).map(
        (
          item
        ) =>
          item.toObject
            ? item.toObject()
            : item
      );

    return {
      selection: {
        selectionNumber:
          selection
            .selectionNumber,

        status:
          selection
            .status,

        positionTitle:
          selection
            .positionTitle,

        proposedJoiningDate:
          selection
            .proposedJoiningDate,
      },

      candidate: {
        fullName:
          selection
            ?.candidate
            ?.fullName ||
          "",

        email:
          selection
            ?.candidate
            ?.email ||
          "",

        mobile:
          selection
            ?.candidate
            ?.mobile ||
          "",

        totalExperienceYears:
          Number(
            selection
              ?.candidate
              ?.totalExperienceYears ||
              0
          ),
      },

      record:
        data,

      requirements: {
        requiredDocuments:
          getRequiredDocumentTypes(
            isFresher
          ),

        optionalDocuments:
          getOptionalDocumentTypes(),

        allowedFileTypes: [
          "PDF",
          "JPG",
          "JPEG",
          "PNG",
        ],

        /*
         * Photograph and Signature are actually restricted
         * to JPG/PNG by server scan.
         */
        imageOnlyDocuments: [
          "PHOTO",
          "SIGNATURE",
        ],

        maxFileSizeMb:
          10,
      },
    };
  };

/* =========================================================
   SAVE PROFILE
========================================================= */

const saveCandidateDocumentProfile =
  async ({
    rawToken,
    body = {},
    ip,
    userAgent,
  }) => {
    const {
      selection,
    } =
      await resolveCandidateContext({
        rawToken,
        ip,
        userAgent,
      });

    if (
      ![
        "PRE_JOINING_DOCUMENTS",
        "DOCUMENT_QUERY",
      ].includes(
        selection.status
      )
    ) {
      throw new ApiError(
        409,
        "Submitted documents cannot currently be edited"
      );
    }

    const record =
      await getOrCreateRecord(
        selection
      );

    /* =====================================================
       PERSONAL
    ===================================================== */

    if (
      body.personal
    ) {
      const emergencyContactNumber =
        cleanPhone(
          body
            ?.personal
            ?.emergencyContactNumber
        );

      if (
        body
          ?.personal
          ?.emergencyContactNumber &&
        !/^\d{10}$/.test(
          emergencyContactNumber
        )
      ) {
        throw new ApiError(
          422,
          "Please enter a valid 10-digit emergency contact number"
        );
      }

      let dateOfBirth =
        null;

      if (
        body
          ?.personal
          ?.dateOfBirth
      ) {
        dateOfBirth =
          new Date(
            body
              .personal
              .dateOfBirth
          );

        if (
          Number.isNaN(
            dateOfBirth
              .getTime()
          )
        ) {
          throw new ApiError(
            422,
            "Please enter a valid date of birth"
          );
        }

        if (
          dateOfBirth >
          new Date()
        ) {
          throw new ApiError(
            422,
            "Date of birth cannot be in the future"
          );
        }
      }

      record.personal = {
        currentAddress:
          clean(
            body
              .personal
              .currentAddress,
            1500
          ),

        permanentAddress:
          clean(
            body
              .personal
              .permanentAddress,
            1500
          ),

        dateOfBirth,

        emergencyContactName:
          "",

        emergencyContactNumber,
      };
    }

    /* =====================================================
       EMPLOYMENT
    ===================================================== */

    if (
      !record.employment
    ) {
      record.employment =
        {};
    }

    record
      .employment
      .isFresher =
      resolveCandidateIsFresher(
        selection
          .candidate
      );

    if (
      body.employment
    ) {
      record
        .employment
        .previousCompany =
        clean(
          body
            .employment
            .previousCompany,
          250
        );

      record
        .employment
        .previousDesignation =
        clean(
          body
            .employment
            .previousDesignation,
          250
        );

      if (
        body
          .employment
          .lastWorkingDate
      ) {
        const lastWorkingDate =
          new Date(
            body
              .employment
              .lastWorkingDate
          );

        if (
          Number.isNaN(
            lastWorkingDate
              .getTime()
          )
        ) {
          throw new ApiError(
            422,
            "Please enter a valid last working date"
          );
        }

        record
          .employment
          .lastWorkingDate =
          lastWorkingDate;
      } else {
        record
          .employment
          .lastWorkingDate =
          null;
      }
    }

    /* =====================================================
       BANK
    ===================================================== */

    if (
      body.bank
    ) {
      const accountHolderName =
        clean(
          body
            .bank
            .accountHolderName,
          200
        );

      const bankName =
        clean(
          body
            .bank
            .bankName,
          200
        );

      const accountNumber =
        clean(
          body
            .bank
            .accountNumber,
          50
        )
          .replace(
            /\s+/g,
            ""
          );

      const ifscCode =
        clean(
          body
            .bank
            .ifscCode,
          20
        )
          .replace(
            /\s+/g,
            ""
          )
          .toUpperCase();

      const branch =
        clean(
          body
            .bank
            .branch,
          200
        );

      if (
        accountNumber &&
        !/^[0-9]{6,30}$/.test(
          accountNumber
        )
      ) {
        throw new ApiError(
          422,
          "Please enter a valid numeric bank account number"
        );
      }

      if (
        ifscCode &&
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
          ifscCode
        )
      ) {
        throw new ApiError(
          422,
          "Please enter a valid 11-character IFSC code"
        );
      }

      assertBankConsistency({
        bankName,
        ifscCode,
        branch,
      });

      /*
       * If Bank Proof already exists and OCR extracted
       * readable bank data, cross-check it now.
       */
      assertBankMatchesProof({
        record,
        accountNumber,
        ifscCode,
      });

      record.bank = {
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        branch,
      };
    }

    await record.save();

    return record;
  };

/* =========================================================
   NEXT VERSION
========================================================= */

const nextDocumentVersion =
  (
    record,
    type
  ) => {
    const versions =
      (
        record?.documents ||
        []
      )
        .filter(
          (
            document
          ) =>
            document.type ===
            type
        )
        .map(
          (
            document
          ) =>
            Number(
              document.version ||
                1
            )
        );

    return versions.length
      ? Math.max(
          ...versions
        ) +
          1
      : 1;
  };

/* =========================================================
   DUPLICATE FILE DETECTION
========================================================= */

const findDuplicateFingerprint =
  ({
    record,
    fingerprint,
    incomingType,
  }) => {
    if (
      !fingerprint
    ) {
      return null;
    }

    return (
      record
        ?.documents ||
      []
    ).find(
      (
        document
      ) =>
        document.fingerprint &&
        document.fingerprint ===
          fingerprint &&
        document.isCurrent !==
          false &&
        document.status !==
          "REPLACED" &&
        document.type !==
          incomingType
    );
  };

/* =========================================================
   BANK PROOF UPLOAD CROSS-CHECK
========================================================= */

const assertUploadedBankProofMatchesForm =
  ({
    record,
    scanResult,
  }) => {
    const extracted =
      scanResult
        ?.extracted ||
      {};

    const savedAccount =
      clean(
        record
          ?.bank
          ?.accountNumber,
        50
      ).replace(
        /\s+/g,
        ""
      );

    const savedIfsc =
      clean(
        record
          ?.bank
          ?.ifscCode,
        20
      ).toUpperCase();

    const proofIfsc =
      clean(
        extracted.ifsc,
        20
      ).toUpperCase();

    if (
      savedIfsc &&
      proofIfsc &&
      savedIfsc !==
        proofIfsc
    ) {
      throw new ApiError(
        422,
        `Uploaded Bank Proof does not match the entered IFSC Code. The document appears to show ${proofIfsc}.`
      );
    }

    if (
      savedAccount &&
      extracted.accountHash
    ) {
      const savedHash =
        hashSensitiveValue(
          savedAccount
        );

      if (
        savedHash !==
        extracted.accountHash
      ) {
        const last4 =
          extracted.accountLast4
            ? ` ending in ${extracted.accountLast4}`
            : "";

        throw new ApiError(
          422,
          `Uploaded Bank Proof does not match the entered Account Number${last4}.`
        );
      }
    }
  };

/* =========================================================
   UPLOAD
========================================================= */

const uploadCandidateFile =
  async ({
    rawToken,
    documentType,
    file,
    ip,
    userAgent,
  }) => {
    if (
      !file
    ) {
      throw new ApiError(
        400,
        "Please select a document to upload"
      );
    }

    const {
      selection,
    } =
      await resolveCandidateContext({
        rawToken,
        ip,
        userAgent,
      });

    if (
      ![
        "PRE_JOINING_DOCUMENTS",
        "DOCUMENT_QUERY",
      ].includes(
        selection.status
      )
    ) {
      await deleteTempFile(
        file?.path
      );

      throw new ApiError(
        409,
        "Documents cannot currently be changed"
      );
    }

    const type =
      normalizeDocumentType(
        documentType
      );

    /*
     * Load record BEFORE permanent move so that:
     *
     * - duplicate check happens first
     * - Bank Proof can be checked against saved form
     */
    const record =
      await getOrCreateRecord(
        selection
      );

    /* =====================================================
       SCAN / TYPE VALIDATE / HASH
    ===================================================== */

    let scanResult;

    try {
      scanResult =
        await assertUploadedDocumentValid({
          documentType:
            type,

          file,
        });
    } catch (
      error
    ) {
      /*
       * assertUploadedDocumentValid already deletes rejected
       * temp files.
       */
      throw error;
    }

    /* =====================================================
       DUPLICATE EXACT FILE
    ===================================================== */

    const duplicate =
      findDuplicateFingerprint({
        record,

        fingerprint:
          scanResult
            ?.fingerprint,

        incomingType:
          type,
      });

    if (
      duplicate
    ) {
      await deleteTempFile(
        file?.path
      );

      const labelMap = {
        AADHAAR:
          "Aadhaar Card",

        PAN:
          "PAN Card",

        BANK_PROOF:
          "Bank Proof",

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

      const previousLabel =
        labelMap[
          duplicate.type
        ] ||
        duplicate.type;

      const error =
        new ApiError(
          422,
          `This exact file has already been uploaded as ${previousLabel}. Please upload the correct document for this field.`
        );

      error.code =
        "DUPLICATE_DOCUMENT_FILE";

      throw error;
    }

    /* =====================================================
       BANK PROOF VS FORM
    ===================================================== */

    if (
      type ===
      "BANK_PROOF"
    ) {
      try {
        assertUploadedBankProofMatchesForm({
          record,
          scanResult,
        });
      } catch (
        error
      ) {
        await deleteTempFile(
          file?.path
        );

        throw error;
      }
    }

    /* =====================================================
       VERSION
    ===================================================== */

    const version =
      nextDocumentVersion(
        record,
        type
      );

    /* =====================================================
       MOVE PERMANENT
    ===================================================== */

    const moved =
      await makeDocumentPermanent({
        tempPath:
          file.path,

        storedName:
          file.filename,

        selectionId:
          selection._id,
      });

    /* =====================================================
       PRESERVE PREVIOUS VERSION
    ===================================================== */

    let oldCurrent =
      null;

    if (
      type !==
      "OTHER"
    ) {
      oldCurrent =
        record
          .documents
          .find(
            (
              document
            ) =>
              document.type ===
                type &&
              document
                .isCurrent !==
                false &&
              document
                .status !==
                "REPLACED"
          );

      if (
        oldCurrent
      ) {
        oldCurrent.isCurrent =
          false;

        oldCurrent.status =
          "REPLACED";

        oldCurrent.replacedAt =
          new Date();
      }
    }

    /* =====================================================
       STORE SCAN METADATA
    ===================================================== */

    const quality =
      scanResult
        ?.quality ||
      {};

    record.documents.push({
      type,

      originalName:
        file.originalname,

      storedName:
        file.filename,

      mimeType:
        file.mimetype,

      size:
        file.size,

      relativePath:
        moved.relativePath,

      fingerprint:
        scanResult
          ?.fingerprint ||
        "",

      scan: {
        scanned:
          Boolean(
            scanResult
              ?.scanned
          ),

        sourceKind:
          scanResult
            ?.sourceKind ||
          "",

        detectedType:
          scanResult
            ?.detectedType ||
          type,

        confidence:
          scanResult
            ?.confidence ??
          null,

        qualityScore:
          quality
            ?.contrastScore ??
          null,

        width:
          quality
            ?.width ??
          null,

        height:
          quality
            ?.height ??
          null,

        warning:
          scanResult
            ?.warning ||
          "",

        extracted: {
          ifsc:
            scanResult
              ?.extracted
              ?.ifsc ||
            "",

          accountHash:
            scanResult
              ?.extracted
              ?.accountHash ||
            "",

          accountLast4:
            scanResult
              ?.extracted
              ?.accountLast4 ||
            "",

          panMasked:
            scanResult
              ?.extracted
              ?.panMasked ||
            "",

          aadhaarLast4:
            scanResult
              ?.extracted
              ?.aadhaarLast4 ||
            "",
        },

        checkedAt:
          new Date(),
      },

      version,

      isCurrent:
        true,

      status:
        "PENDING",

      queryMessage:
        "",

      uploadedAt:
        new Date(),
    });

    await record.save();

    const inserted =
      record.documents[
        record.documents.length -
          1
      ];

    /* =====================================================
       LINK PREVIOUS VERSION
    ===================================================== */

    if (
      oldCurrent
    ) {
      oldCurrent
        .replacedByDocument =
        inserted._id;

      await record.save();
    }

    return inserted;
  };

/* =========================================================
   REMOVE FILE
========================================================= */

const removeCandidateFile =
  async ({
    rawToken,
    documentId,
    ip,
    userAgent,
  }) => {
    const {
      selection,
    } =
      await resolveCandidateContext({
        rawToken,
        ip,
        userAgent,
      });

    if (
      ![
        "PRE_JOINING_DOCUMENTS",
        "DOCUMENT_QUERY",
      ].includes(
        selection.status
      )
    ) {
      throw new ApiError(
        409,
        "Documents cannot currently be removed"
      );
    }

    const record =
      await CandidateDocumentRecord
        .findOne({
          selection:
            selection._id,
        });

    if (
      !record
    ) {
      throw new ApiError(
        404,
        "Document record not found"
      );
    }

    const document =
      record.documents.id(
        documentId
      );

    if (
      !document ||
      document.isCurrent ===
        false ||
      document.status ===
        "REPLACED"
    ) {
      throw new ApiError(
        404,
        "Current document not found"
      );
    }

    await deleteStoredDocument(
      document.relativePath
    );

    document.deleteOne();

    await record.save();

    return {
      removed: true,
    };
  };

/* =========================================================
   CANDIDATE OPEN FILE
========================================================= */

const getCandidateFile =
  async ({
    rawToken,
    documentId,
    ip,
    userAgent,
  }) => {
    const {
      selection,
    } =
      await resolveCandidateContext({
        rawToken,
        ip,
        userAgent,
      });

    const record =
      await CandidateDocumentRecord
        .findOne({
          selection:
            selection._id,
        })
        .lean();

    const document =
      record
        ?.documents
        ?.find(
          (
            item
          ) =>
            String(
              item._id
            ) ===
              String(
                documentId
              ) &&
            item
              .isCurrent !==
              false &&
            item
              .status !==
              "REPLACED"
        );

    if (
      !document
    ) {
      throw new ApiError(
        404,
        "Document not found"
      );
    }

    const filePath =
      getStoredDocumentPath(
        document.relativePath
      );

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      throw new ApiError(
        404,
        "Uploaded document file was not found"
      );
    }

    return {
      path:
        filePath,

      fileName:
        document.originalName,

      mimeType:
        document.mimeType,
    };
  };

/* =========================================================
   VALIDATE SUBMISSION
========================================================= */

const validateSubmission =
  (
    record
  ) => {
    const missing =
      [];

    const isFresher =
      record
        ?.employment
        ?.isFresher;

    if (
      typeof isFresher !==
      "boolean"
    ) {
      missing.push(
        "Employment profile"
      );
    }

    if (
      !record
        ?.personal
        ?.currentAddress
    ) {
      missing.push(
        "Current Address"
      );
    }

    if (
      !record
        ?.personal
        ?.dateOfBirth
    ) {
      missing.push(
        "Date of Birth"
      );
    }

    if (
      !/^\d{10}$/.test(
        String(
          record
            ?.personal
            ?.emergencyContactNumber ||
            ""
        )
      )
    ) {
      missing.push(
        "Valid 10-digit Emergency Contact Number"
      );
    }

    if (
      !record
        ?.bank
        ?.accountHolderName
    ) {
      missing.push(
        "Account Holder Name"
      );
    }

    if (
      !record
        ?.bank
        ?.bankName
    ) {
      missing.push(
        "Bank Name"
      );
    }

    if (
      !/^[0-9]{6,30}$/.test(
        String(
          record
            ?.bank
            ?.accountNumber ||
            ""
        )
      )
    ) {
      missing.push(
        "Valid Bank Account Number"
      );
    }

    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
        String(
          record
            ?.bank
            ?.ifscCode ||
            ""
        )
      )
    ) {
      missing.push(
        "Valid IFSC Code"
      );
    }

    /*
     * Final server-side bank consistency check.
     */
    if (
      !missing.includes(
        "Valid IFSC Code"
      )
    ) {
      assertBankConsistency({
        bankName:
          record
            ?.bank
            ?.bankName,

        ifscCode:
          record
            ?.bank
            ?.ifscCode,

        branch:
          record
            ?.bank
            ?.branch,
      });

      assertBankMatchesProof({
        record,

        accountNumber:
          record
            ?.bank
            ?.accountNumber,

        ifscCode:
          record
            ?.bank
            ?.ifscCode,
      });
    }

    const docs =
      currentDocuments(
        record
      );

    const types =
      new Set(
        docs.map(
          (
            document
          ) =>
            document.type
        )
      );

    getRequiredDocumentTypes(
      isFresher
    ).forEach(
      (
        type
      ) => {
        if (
          !types.has(
            type
          )
        ) {
          missing.push(
            `Document: ${type}`
          );
        }
      }
    );

    /*
     * Required files must also have scan metadata from the
     * new pipeline.
     *
     * Existing legacy documents uploaded before this update
     * may not have scan data, so HR can still inspect them.
     *
     * New uploads will always receive checkedAt.
     */
    docs.forEach(
      (
        document
      ) => {
        if (
          getRequiredDocumentTypes(
            isFresher
          ).includes(
            document.type
          ) &&
          document.scan &&
          document.scan.scanned ===
            true &&
          !document
            .scan
            .detectedType
        ) {
          missing.push(
            `Verified document: ${document.type}`
          );
        }
      }
    );

    if (
      missing.length
    ) {
      throw new ApiError(
        422,
        `Please complete the required information before submitting: ${missing.join(
          ", "
        )}`
      );
    }
  };

/* =========================================================
   EMAIL RESULT
========================================================= */

const applyMailResult =
  (
    target,
    result
  ) => {
    if (
      !target
    ) {
      return;
    }

    target.email =
      result?.email ||
      "";

    target.cc =
      result?.cc ||
      [];

    target.subject =
      result?.subject ||
      "";

    target.lastAttemptAt =
      new Date();

    if (
      result?.success
    ) {
      target.status =
        "SENT";

      target.sentAt =
        new Date();

      target.failedAt =
        null;

      target.messageId =
        result.messageId ||
        "";

      target.error =
        "";

      return;
    }

    target.status =
      "FAILED";

    target.failedAt =
      new Date();

    target.error =
      result?.error ||
      "Email could not be sent";
  };

/* =========================================================
   HR ATTACHMENTS
========================================================= */

const buildHrAttachments =
  (
    record
  ) =>
    currentDocuments(
      record
    )
      .map(
        (
          document,
          index
        ) => {
          try {
            const filePath =
              getStoredDocumentPath(
                document
                  .relativePath
              );

            if (
              !filePath ||
              !fs.existsSync(
                filePath
              )
            ) {
              return null;
            }

            return {
              filename:
                `${String(
                  index +
                    1
                ).padStart(
                  2,
                  "0"
                )}-${clean(
                  document.type,
                  50
                )}-${clean(
                  document.originalName,
                  250
                )}`,

              path:
                filePath,

              contentType:
                document.mimeType ||
                undefined,
            };
          } catch (
            error
          ) {
            console.warn(
              "[Selection Documents] Attachment preparation failed:",
              error?.message
            );

            return null;
          }
        }
      )
      .filter(
        Boolean
      );

/* =========================================================
   SEND MAIL
========================================================= */

const sendMail =
  async ({
    to,
    cc = [],
    template,
    attachments = [],
  }) => {
    try {
      if (
        !to
      ) {
        return {
          success: false,
          email: "",
          cc,

          subject:
            template?.subject ||
            "",

          error:
            "Recipient email is not available",
        };
      }

      const result =
        await transporter
          .sendMail({
            from: {
              name:
                process
                  .env
                  .MAIL_FROM_NAME ||
                "Sandeep Edge Tech",

              address:
                process
                  .env
                  .MAIL_USER,
            },

            replyTo:
              process
                .env
                .MAIL_REPLY_TO ||
              process
                .env
                .MAIL_USER,

            to,

            cc:
              cc.length
                ? cc
                : undefined,

            subject:
              template.subject,

            text:
              template.text,

            html:
              template.html,

            attachments:
              attachments.length
                ? attachments
                : undefined,
          });

      return {
        success: true,
        email: to,
        cc,

        subject:
          template.subject,

        messageId:
          result?.messageId ||
          "",
      };
    } catch (
      error
    ) {
      console.error(
        "[Selection Documents] Email failed:",
        error
      );

      return {
        success: false,
        email: to,
        cc,

        subject:
          template?.subject ||
          "",

        error:
          error?.message ||
          "Email could not be sent",
      };
    }
  };

/* =========================================================
   CLOSE QUERY CYCLE
========================================================= */

const closeQueryCycle =
  (
    record,
    now
  ) => {
    if (
      record.status !==
      "QUERY"
    ) {
      return;
    }

    const openQuery =
      [
        ...(
          record.queryHistory ||
          []
        ),
      ]
        .reverse()
        .find(
          (
            item
          ) =>
            !item
              .resubmittedAt
        );

    if (
      openQuery
    ) {
      openQuery.resubmittedAt =
        now;
    }

    record.lastResubmittedAt =
      now;

    record.fieldQueries =
      {};

    record.generalQueryMessage =
      "";

    currentDocuments(
      record
    ).forEach(
      (
        document
      ) => {
        document.status =
          "PENDING";

        document.queryMessage =
          "";

        document.queriedAt =
          null;
      }
    );
  };

/* =========================================================
   SUBMIT DOCUMENTS
========================================================= */

const submitCandidateDocuments =
  async ({
    rawToken,
    declarationAccepted,
    ip,
    userAgent,
  }) => {
    const {
      selection,
    } =
      await resolveCandidateContext({
        rawToken,
        ip,
        userAgent,
      });

    if (
      ![
        "PRE_JOINING_DOCUMENTS",
        "DOCUMENT_QUERY",
      ].includes(
        selection.status
      )
    ) {
      throw new ApiError(
        409,
        "Documents have already been submitted or cannot currently be submitted"
      );
    }

    if (
      declarationAccepted !==
      true
    ) {
      throw new ApiError(
        400,
        "Please confirm that the information and documents provided are correct"
      );
    }

    let record =
      await CandidateDocumentRecord
        .findOne({
          selection:
            selection._id,
        });

    if (
      !record
    ) {
      throw new ApiError(
        422,
        "Please complete your pre-joining information first"
      );
    }

    record =
      await syncRecordEmploymentFromCandidate(
        record,
        selection
          .candidate
      );

    /*
     * Mandatory final server validation.
     */
    validateSubmission(
      record
    );

    const now =
      new Date();

    const previousStatus =
      selection.status;

    if (
      previousStatus ===
      "DOCUMENT_QUERY"
    ) {
      closeQueryCycle(
        record,
        now
      );
    }

    record.status =
      "UNDER_VERIFICATION";

    record.declarationAcceptedAt =
      now;

    record.submittedAt =
      now;

    await record.save();

    /* =====================================================
       WORKFLOW
    ===================================================== */

    if (
      previousStatus ===
      "PRE_JOINING_DOCUMENTS"
    ) {
      await transitionSelectionStatus({
        selectionId:
          selection._id,

        toStatus:
          "DOCUMENTS_SUBMITTED",

        event:
          "DOCUMENTS_SUBMITTED",

        remarks:
          "Candidate submitted pre-joining information and documents through the secure portal.",

        metadata: {
          documentCount:
            currentDocuments(
              record
            ).length,
        },
      });
    } else {
      await transitionSelectionStatus({
        selectionId:
          selection._id,

        toStatus:
          "DOCUMENTS_SUBMITTED",

        event:
          "DOCUMENT_QUERY_RESUBMITTED",

        remarks:
          "Candidate corrected the requested information/documents and resubmitted for HR verification.",

        metadata: {
          documentCount:
            currentDocuments(
              record
            ).length,
        },
      });
    }

    await transitionSelectionStatus({
      selectionId:
        selection._id,

      toStatus:
        "DOCUMENT_VERIFICATION",

      event:
        previousStatus ===
          "DOCUMENT_QUERY"
          ? "DOCUMENT_REVERIFICATION_STARTED"
          : "DOCUMENT_VERIFICATION_STARTED",

      remarks:
        previousStatus ===
          "DOCUMENT_QUERY"
          ? "Document re-verification started after candidate resubmission."
          : "Document verification opened automatically after candidate submission.",
    });

    /* =====================================================
       EMAIL
    ===================================================== */

    const candidate =
      await Candidate
        .findById(
          selection
            .candidate
            ?._id ||
          selection
            .candidate
        )
        .lean();

    const refreshedSelection =
      await Selection
        .findById(
          selection._id
        )
        .populate(
          "hiringHr",
          "displayName email"
        )
        .lean();

    const candidateEmail =
      candidate?.email ||
      "";

    const hrEmail =
      refreshedSelection
        ?.hiringHr
        ?.email ||
      "";

    const appBase =
      String(
        process
          .env
          .APP_BASE_URL ||
        "http://localhost:3000"
      ).replace(
        /\/+$/,
        ""
      );

    const internalUrl =
      `${appBase}/dashboard?app=recruitment&page=selection&id=${selection._id}`;

    const hrAttachments =
      buildHrAttachments(
        record
      );

    if (
      hrEmail
    ) {
      try {
        const template =
          buildDocumentsSubmittedHrEmail({
            candidate,

            selection:
              refreshedSelection,

            record:
              record.toObject(),

            internalUrl,
          });

        const result =
          await sendMail({
            to:
              hrEmail,

            cc: [],

            template,

            attachments:
              hrAttachments,
          });

        applyMailResult(
          record
            .hrNotificationEmail,
          result
        );
      } catch (
        error
      ) {
        console.error(
          "[Selection Documents] HR email failed:",
          error
        );
      }
    }

    if (
      candidateEmail
    ) {
      try {
        const template =
          buildDocumentsReceivedCandidateEmail({
            candidate,

            selection:
              refreshedSelection,
          });

        const result =
          await sendMail({
            to:
              candidateEmail,

            cc:
              hrEmail
                ? [
                    hrEmail,
                  ]
                : [],

            template,
          });

        applyMailResult(
          record
            .candidateConfirmationEmail,
          result
        );
      } catch (
        error
      ) {
        console.error(
          "[Selection Documents] Candidate confirmation failed:",
          error
        );
      }
    }

    try {
      await record.save();
    } catch (
      error
    ) {
      console.error(
        "[Selection Documents] Email tracking save failed:",
        error
      );
    }

    return {
      submitted: true,

      status:
        "DOCUMENT_VERIFICATION",

      submittedAt:
        record.submittedAt,

      documentCount:
        currentDocuments(
          record
        ).length,

      message:
        previousStatus ===
          "DOCUMENT_QUERY"
          ? "Your corrected documents have been resubmitted successfully and are now under HR verification."
          : "Your documents have been submitted successfully and are now under HR verification.",
    };
  };

/* =========================================================
   INTERNAL HR RECORD
========================================================= */

const getInternalDocumentRecord =
  async (
    selectionId
  ) => {
    if (
      !mongoose
        .Types
        .ObjectId
        .isValid(
          selectionId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid selection ID"
      );
    }

    const record =
      await CandidateDocumentRecord
        .findOne({
          selection:
            selectionId,
        })
        .populate(
          "candidate",
          "candidateNumber fullName email mobile totalExperienceYears currentCompany currentDesignation"
        )
        .populate(
          "selection",
          "selectionNumber positionTitle status hiringHr proposedJoiningDate currentLoi loiAcceptedAt"
        )
        .populate(
          "queriedBy",
          "displayName email"
        )
        .populate(
          "verifiedBy",
          "displayName email"
        )
        .lean();

    if (
      !record
    ) {
      throw new ApiError(
        404,
        "Candidate document record not found"
      );
    }

    return {
      ...record,

      currentDocuments:
        (
          record.documents ||
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
        ),

      historicalDocuments:
        (
          record.documents ||
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
        ),
    };
  };

/* =========================================================
   HR OPEN ANY VERSION
========================================================= */

const getInternalDocumentFile =
  async ({
    selectionId,
    documentId,
  }) => {
    const record =
      await getInternalDocumentRecord(
        selectionId
      );

    const document =
      (
        record.documents ||
        []
      ).find(
        (
          item
        ) =>
          String(
            item._id
          ) ===
          String(
            documentId
          )
      );

    if (
      !document
    ) {
      throw new ApiError(
        404,
        "Document not found"
      );
    }

    const filePath =
      getStoredDocumentPath(
        document.relativePath
      );

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      throw new ApiError(
        404,
        "Document file was not found"
      );
    }

    return {
      path:
        filePath,

      fileName:
        document.originalName,

      mimeType:
        document.mimeType,
    };
  };

/* =========================================================
   FRESH CANDIDATE PORTAL
========================================================= */

const createFreshPortalUrl =
  async (
    selection
  ) => {
    const {
      createPortalToken,
    } =
      require(
        "../portal/candidatePortal.service"
      );

    const result =
      await createPortalToken({
        selectionId:
          selection._id,

        candidateId:
          selection
            .candidate
            ?._id ||
          selection
            .candidate,

        createdBy:
          null,
      });

    const appBase =
      String(
        process
          .env
          .APP_BASE_URL ||
        "http://localhost:3000"
      ).replace(
        /\/+$/,
        ""
      );

    return {
      url:
        `${appBase}/candidate/selection/${result.rawToken}`,

      expiresAt:
        result.expiresAt,
    };
  };

/* =========================================================
   REQUEST RESUBMISSION
========================================================= */

const requestDocumentResubmission =
  async ({
    selectionId,
    body = {},
    user,
  }) => {
    if (
      !mongoose
        .Types
        .ObjectId
        .isValid(
          selectionId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid selection ID"
      );
    }

    const selection =
      await Selection
        .findById(
          selectionId
        )
        .populate(
          "candidate"
        )
        .populate(
          "hiringHr",
          "displayName email"
        );

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found"
      );
    }

    if (
      selection.status !==
      "DOCUMENT_VERIFICATION"
    ) {
      throw new ApiError(
        409,
        "A correction request can only be raised while HR document verification is active"
      );
    }

    const record =
      await CandidateDocumentRecord
        .findOne({
          selection:
            selection._id,
        });

    if (
      !record
    ) {
      throw new ApiError(
        404,
        "Candidate document record not found"
      );
    }

    const generalComment =
      clean(
        body?.generalComment,
        2000
      );

    const allowedFields = [
      "currentAddress",
      "permanentAddress",
      "dateOfBirth",
      "emergencyContactNumber",

      "previousCompany",
      "previousDesignation",
      "lastWorkingDate",

      "accountHolderName",
      "bankName",
      "accountNumber",
      "ifscCode",
      "branch",
    ];

    const requestedFields =
      [];

    if (
      Array.isArray(
        body?.fieldQueries
      )
    ) {
      body
        .fieldQueries
        .forEach(
          (
            field
          ) => {
            const value =
              clean(
                field,
                100
              );

            if (
              allowedFields.includes(
                value
              ) &&
              !requestedFields.includes(
                value
              )
            ) {
              requestedFields.push(
                value
              );
            }
          }
        );
    } else if (
      body?.fieldQueries &&
      typeof
        body.fieldQueries ===
        "object"
    ) {
      Object.keys(
        body.fieldQueries
      ).forEach(
        (
          field
        ) => {
          if (
            allowedFields.includes(
              field
            ) &&
            !requestedFields.includes(
              field
            )
          ) {
            requestedFields.push(
              field
            );
          }
        }
      );
    }

    const fieldQueryMap =
      {};

    requestedFields
      .forEach(
        (
          field
        ) => {
          fieldQueryMap[
            field
          ] =
            true;
        }
      );

    const requestedDocumentIds =
      [];

    const incomingDocumentQueries =
      Array.isArray(
        body?.documentQueries
      )
        ? body
            .documentQueries
        : [];

    incomingDocumentQueries
      .forEach(
        (
          item
        ) => {
          const documentId =
            clean(
              typeof item ===
                "string"
                ? item
                : item
                    ?.documentId,
              100
            );

          if (
            documentId &&
            !requestedDocumentIds.includes(
              documentId
            )
          ) {
            requestedDocumentIds.push(
              documentId
            );
          }
        }
      );

    if (
      requestedFields.length ===
        0 &&
      requestedDocumentIds.length ===
        0
    ) {
      throw new ApiError(
        422,
        "Please select at least one field or document that requires correction"
      );
    }

    const now =
      new Date();

    currentDocuments(
      record
    ).forEach(
      (
        document
      ) => {
        if (
          document.status ===
          "QUERY"
        ) {
          document.status =
            "PENDING";
        }

        document.queryMessage =
          "";

        document.queriedAt =
          null;
      }
    );

    const preparedDocumentQueries =
      [];

    requestedDocumentIds
      .forEach(
        (
          documentId
        ) => {
          const document =
            record
              .documents
              .id(
                documentId
              );

          if (
            !document ||
            document.isCurrent ===
              false ||
            document.status ===
              "REPLACED"
          ) {
            return;
          }

          document.status =
            "QUERY";

          document.queryMessage =
            generalComment ||
            "HR has requested a corrected copy of this document.";

          document.queriedAt =
            now;

          preparedDocumentQueries.push({
            documentId:
              document._id,

            type:
              document.type,

            originalName:
              document.originalName,
          });
        }
      );

    record.status =
      "QUERY";

    record.fieldQueries =
      fieldQueryMap;

    record.generalQueryMessage =
      generalComment;

    record.queriedAt =
      now;

    record.queriedBy =
      userId(
        user
      );

    const cycle =
      (
        record.queryHistory
          ?.length ||
        0
      ) +
      1;

    record.queryHistory.push({
      cycle,

      generalComment,

      fieldQueries:
        fieldQueryMap,

      documentQueries:
        preparedDocumentQueries
          .map(
            (
              item
            ) => ({
              documentId:
                item.documentId,

              type:
                item.type,

              originalName:
                item.originalName,

              comment:
                generalComment,
            })
          ),

      requestedAt:
        now,

      requestedBy:
        userId(
          user
        ),
    });

    await record.save();

    await transitionSelectionStatus({
      selectionId:
        selection._id,

      toStatus:
        "DOCUMENT_QUERY",

      event:
        "DOCUMENT_QUERY",

      remarks:
        generalComment ||
        "HR requested correction of selected pre-joining information/documents.",

      metadata: {
        cycle,

        queriedFields:
          requestedFields,

        queriedDocuments:
          preparedDocumentQueries
            .map(
              (
                item
              ) =>
                String(
                  item.documentId
                )
            ),
      },

      user,
    });

    let portal =
      null;

    try {
      portal =
        await createFreshPortalUrl(
          selection
        );
    } catch (
      error
    ) {
      console.error(
        "[Selection Documents] Fresh candidate portal link failed:",
        error
      );
    }

    const selectedLabels =
      [];

    const fieldLabels = {
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
        "Bank Account Number",

      ifscCode:
        "IFSC Code",

      branch:
        "Bank Branch",
    };

    requestedFields.forEach(
      (
        field
      ) => {
        selectedLabels.push(
          fieldLabels[field] ||
          field
        );
      }
    );

    const documentLabels = {
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

    preparedDocumentQueries
      .forEach(
        (
          item
        ) => {
          selectedLabels.push(
            documentLabels[
              item.type
            ] ||
            item.type
          );
        }
      );

    const documentLabel =
      selectedLabels.length ===
      1
        ? selectedLabels[0]
        : `${selectedLabels.length} items require correction`;

    const queryMessage =
      generalComment ||
      "Please review the highlighted items in your secure candidate portal, make the required corrections, and resubmit them for HR verification.";

    const candidateEmail =
      selection
        ?.candidate
        ?.email ||
      "";

    const hrEmail =
      selection
        ?.hiringHr
        ?.email ||
      "";

    let mail =
      null;

    if (
      candidateEmail &&
      portal?.url
    ) {
      try {
        const template =
          buildDocumentQueryEmail({
            candidate:
              selection.candidate,

            selection,

            documentLabel,

            queryMessage,

            portalUrl:
              portal.url,
          });

        mail =
          await sendMail({
            to:
              candidateEmail,

            cc:
              hrEmail
                ? [
                    hrEmail,
                  ]
                : [],

            template,
          });

        applyMailResult(
          record
            .queryNotificationEmail,
          mail
        );
      } catch (
        error
      ) {
        console.error(
          "[Selection Documents] Query email failed:",
          error
        );
      }
    }

    try {
      await record.save();
    } catch (
      error
    ) {
      console.error(
        "[Selection Documents] Query mail state save failed:",
        error
      );
    }

    return {
      requested: true,

      status:
        "DOCUMENT_QUERY",

      cycle,

      queriedFields:
        requestedFields,

      queriedDocuments:
        preparedDocumentQueries,

      generalQueryMessage:
        generalComment,

      portalExpiresAt:
        portal?.expiresAt ||
        null,

      mail,
    };
  };

/* =========================================================
   VERIFY DOCUMENTS
========================================================= */

const verifyCandidateDocuments =
  async ({
    selectionId,
    user,
  }) => {
    if (
      !mongoose
        .Types
        .ObjectId
        .isValid(
          selectionId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid selection ID"
      );
    }

    const selection =
      await Selection
        .findById(
          selectionId
        )
        .populate(
          "candidate"
        )
        .populate(
          "hiringHr",
          "displayName email"
        );

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found"
      );
    }

    if (
      selection.status !==
      "DOCUMENT_VERIFICATION"
    ) {
      throw new ApiError(
        409,
        "Documents can only be verified while HR verification is active"
      );
    }

    const record =
      await CandidateDocumentRecord
        .findOne({
          selection:
            selection._id,
        });

    if (
      !record
    ) {
      throw new ApiError(
        404,
        "Candidate document record not found"
      );
    }

    validateSubmission(
      record
    );

    const unresolved =
      currentDocuments(
        record
      ).filter(
        (
          document
        ) =>
          document.status ===
          "QUERY"
      );

    if (
      unresolved.length
    ) {
      throw new ApiError(
        409,
        "One or more documents still have unresolved HR queries"
      );
    }

    const now =
      new Date();

    currentDocuments(
      record
    ).forEach(
      (
        document
      ) => {
        document.status =
          "VERIFIED";

        document.queryMessage =
          "";

        document.verifiedAt =
          now;
      }
    );

    record.status =
      "VERIFIED";

    record.fieldQueries =
      {};

    record.generalQueryMessage =
      "";

    record.verifiedAt =
      now;

    record.verifiedBy =
      userId(
        user
      );

    const lastQuery =
      [
        ...(
          record.queryHistory ||
          []
        ),
      ]
        .reverse()
        .find(
          (
            item
          ) =>
            !item
              .resolvedAt
        );

    if (
      lastQuery
    ) {
      lastQuery.resolvedAt =
        now;
    }

    await record.save();

    await transitionSelectionStatus({
      selectionId:
        selection._id,

      toStatus:
        "DOCUMENTS_VERIFIED",

      event:
        "DOCUMENTS_VERIFIED",

      remarks:
        "HR verified all submitted pre-joining information and candidate documents.",

      user,
    });

    await transitionSelectionStatus({
      selectionId:
        selection._id,

      toStatus:
        "READY_FOR_OFFER",

      event:
        "READY_FOR_OFFER",

      remarks:
        "Document verification completed successfully. Candidate is ready for Offer Letter preparation.",

      user,
    });

    let mail =
      null;

    if (
      selection
        ?.candidate
        ?.email
    ) {
      try {
        const template =
          buildDocumentsVerifiedEmail({
            candidate:
              selection.candidate,

            selection,
          });

        mail =
          await sendMail({
            to:
              selection
                .candidate
                .email,

            cc:
              selection
                ?.hiringHr
                ?.email
                ? [
                    selection
                      .hiringHr
                      .email,
                  ]
                : [],

            template,
          });

        applyMailResult(
          record
            .verificationEmail,
          mail
        );
      } catch (
        error
      ) {
        console.error(
          "[Selection Documents] Verification email failed:",
          error
        );
      }
    }

    try {
      await record.save();
    } catch (
      error
    ) {
      console.error(
        "[Selection Documents] Verification email tracking failed:",
        error
      );
    }

    return {
      verified: true,

      verifiedAt:
        now,

      documentStatus:
        "VERIFIED",

      selectionStatus:
        "READY_FOR_OFFER",

      nextStage:
        "READY_FOR_OFFER",

      mail,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getCandidateDocuments,

  saveCandidateDocumentProfile,

  uploadCandidateFile,

  removeCandidateFile,

  getCandidateFile,

  submitCandidateDocuments,

  getInternalDocumentRecord,

  getInternalDocumentFile,

  getRequiredDocumentTypes,

  requestDocumentResubmission,

  verifyCandidateDocuments,
};