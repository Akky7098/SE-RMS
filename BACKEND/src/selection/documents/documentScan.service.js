const fs =
  require("fs");

const crypto =
  require("crypto");

const sharp =
  require("sharp");

const pdfParse =
  require("pdf-parse");

const {
  createWorker,
} =
  require(
    "tesseract.js"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   MIME TYPES
========================================================= */

const IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
  ]);

const PDF_TYPES =
  new Set([
    "application/pdf",
  ]);

/* =========================================================
   DOCUMENTS THAT REQUIRE TEXT / TYPE VERIFICATION
========================================================= */

const TEXT_DOCUMENT_TYPES =
  new Set([
    "AADHAAR",
    "PAN",
    "BANK_PROOF",
    "HIGHEST_QUALIFICATION",
    "EXPERIENCE_LETTER",
    "RELIEVING_LETTER",
    "SALARY_SLIP",
    "PREVIOUS_APPOINTMENT_LETTER",
    "FORM16",
  ]);

const IMAGE_ONLY_TYPES =
  new Set([
    "PHOTO",
    "SIGNATURE",
  ]);

/* =========================================================
   HELPERS
========================================================= */

const normalizeText =
  (
    value
  ) =>
    String(
      value ||
        ""
    )
      .replace(
        /\u00a0/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .toUpperCase();

const normalizeDigits =
  (
    value
  ) =>
    String(
      value ||
        ""
    ).replace(
      /\D/g,
      ""
    );

const deleteTempFile =
  async (
    filePath
  ) => {
    try {
      if (
        filePath &&
        fs.existsSync(
          filePath
        )
      ) {
        await fs.promises
          .unlink(
            filePath
          );
      }
    } catch (
      error
    ) {
      console.warn(
        "[Document Scan] Temp cleanup failed:",
        error?.message
      );
    }
  };

/* =========================================================
   SHA-256 FINGERPRINT
========================================================= */

const createFileFingerprint =
  async (
    filePath
  ) => {
    if (
      !filePath ||
      !fs.existsSync(
        filePath
      )
    ) {
      throw new ApiError(
        400,
        "Uploaded file is not available for fingerprinting"
      );
    }

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const hash =
          crypto.createHash(
            "sha256"
          );

        const stream =
          fs.createReadStream(
            filePath
          );

        stream.on(
          "error",
          reject
        );

        stream.on(
          "data",
          (
            chunk
          ) => {
            hash.update(
              chunk
            );
          }
        );

        stream.on(
          "end",
          () => {
            resolve(
              hash.digest(
                "hex"
              )
            );
          }
        );
      }
    );
  };

/* =========================================================
   SHA-256 TEXT VALUE

   Used for account number comparison without storing the
   complete OCR-extracted account number.
========================================================= */

const hashSensitiveValue =
  (
    value
  ) => {
    const normalized =
      normalizeDigits(
        value
      );

    if (
      !normalized
    ) {
      return "";
    }

    return crypto
      .createHash(
        "sha256"
      )
      .update(
        normalized
      )
      .digest(
        "hex"
      );
  };

/* =========================================================
   IMAGE QUALITY
========================================================= */

const inspectImageQuality =
  async (
    filePath,
    documentType
  ) => {
    try {
      const image =
        sharp(
          filePath
        );

      const metadata =
        await image
          .metadata();

      const width =
        Number(
          metadata?.width ||
            0
        );

      const height =
        Number(
          metadata?.height ||
            0
        );

      const type =
        String(
          documentType ||
            ""
        ).toUpperCase();

      /*
       * Signature crops can legitimately be shorter.
       */
      const minWidth =
        type ===
        "SIGNATURE"
          ? 250
          : 500;

      const minHeight =
        type ===
        "SIGNATURE"
          ? 80
          : type ===
              "PHOTO"
            ? 350
            : 300;

      if (
        width <
          minWidth ||
        height <
          minHeight
      ) {
        return {
          valid: false,

          reason:
            "LOW_RESOLUTION",

          message:
            type ===
            "SIGNATURE"
              ? "The signature image is too small. Please upload a clearer signature."
              : "This image is too small or unclear. Please upload a clearer copy.",
        };
      }

      const {
        data,
        info,
      } =
        await image
          .clone()
          .greyscale()
          .resize({
            width:
              Math.min(
                width,
                1200
              ),

            withoutEnlargement:
              true,
          })
          .raw()
          .toBuffer({
            resolveWithObject:
              true,
          });

      if (
        !data?.length
      ) {
        return {
          valid: false,

          reason:
            "UNREADABLE_IMAGE",

          message:
            "This image could not be read. Please upload another copy.",
        };
      }

      let sum =
        0;

      let sumSquares =
        0;

      const channels =
        info.channels ||
        1;

      for (
        let index = 0;
        index < data.length;
        index += channels
      ) {
        const value =
          data[index];

        sum +=
          value;

        sumSquares +=
          value *
          value;
      }

      const count =
        Math.max(
          1,
          Math.floor(
            data.length /
              channels
          )
        );

      const mean =
        sum /
        count;

      const variance =
        Math.max(
          0,
          sumSquares /
            count -
            mean *
              mean
        );

      const contrastScore =
        Math.sqrt(
          variance
        );

      /*
       * Conservative threshold.
       *
       * Avoid rejecting ordinary mobile-camera uploads.
       */
      if (
        contrastScore <
        16
      ) {
        return {
          valid: false,

          reason:
            "LOW_QUALITY",

          message:
            "This image appears blurred, blank or unclear. Please upload a sharper image.",
        };
      }

      return {
        valid: true,

        width,

        height,

        contrastScore:
          Number(
            contrastScore
              .toFixed(
                2
              )
          ),
      };
    } catch (
      error
    ) {
      console.error(
        "[Document Scan] Image quality check failed:",
        error
      );

      return {
        valid: false,

        reason:
          "UNREADABLE_IMAGE",

        message:
          "We could not read this image. Please upload a valid JPG or PNG file.",
      };
    }
  };

/* =========================================================
   OCR IMAGE
========================================================= */

const extractImageText =
  async (
    filePath
  ) => {
    let worker =
      null;

    try {
      worker =
        await createWorker(
          "eng"
        );

      const result =
        await worker
          .recognize(
            filePath
          );

      return {
        text:
          normalizeText(
            result?.data?.text
          ),

        confidence:
          Number(
            result?.data?.confidence ||
              0
          ),
      };
    } finally {
      if (
        worker
      ) {
        try {
          await worker
            .terminate();
        } catch {
          // Ignore.
        }
      }
    }
  };

/* =========================================================
   PDF TEXT
========================================================= */

const extractPdfText =
  async (
    filePath
  ) => {
    const buffer =
      await fs.promises
        .readFile(
          filePath
        );

    const result =
      await pdfParse(
        buffer
      );

    return {
      text:
        normalizeText(
          result?.text
        ),

      confidence:
        null,

      pages:
        Number(
          result?.numpages ||
            0
        ),
    };
  };

/* =========================================================
   GENERIC TEXT HELPERS
========================================================= */

const countKeywordHits =
  (
    text,
    keywords
  ) =>
    keywords.filter(
      (
        keyword
      ) =>
        text.includes(
          keyword
        )
    ).length;

const hasResumeSignals =
  (
    text
  ) => {
    const keywords = [
      "CURRICULUM VITAE",
      "RESUME",
      "CAREER OBJECTIVE",
      "PROFESSIONAL SUMMARY",
      "WORK EXPERIENCE",
      "PERSONAL PROFILE",
      "SKILLS",
      "PROJECTS",
    ];

    return (
      countKeywordHits(
        text,
        keywords
      ) >=
      2
    );
  };

/* =========================================================
   PAN
========================================================= */

const validatePan =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const match =
      normalized.match(
        /\b[A-Z]{5}[0-9]{4}[A-Z]\b/
      );

    const keywordHits =
      countKeywordHits(
        normalized,
        [
          "INCOME TAX",
          "PERMANENT ACCOUNT NUMBER",
          "GOVT. OF INDIA",
          "GOVERNMENT OF INDIA",
        ]
      );

    if (
      match &&
      keywordHits >=
        1
    ) {
      const pan =
        match[0];

      return {
        valid: true,

        detectedType:
          "PAN",

        extracted: {
          panMasked:
            `${pan.slice(
              0,
              3
            )}******${pan.slice(
              -1
            )}`,
        },
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be a PAN Card. Please upload the correct PAN Card.",
    };
  };

/* =========================================================
   AADHAAR
========================================================= */

const validateAadhaar =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const compactDigits =
      normalizeDigits(
        normalized
      );

    const aadhaarMatch =
      compactDigits.match(
        /\d{12}/
      );

    const keywordHits =
      countKeywordHits(
        normalized,
        [
          "AADHAAR",
          "AADHAR",
          "UNIQUE IDENTIFICATION",
          "GOVERNMENT OF INDIA",
          "GOVT OF INDIA",
          "YEAR OF BIRTH",
          "DOB",
        ]
      );

    if (
      (
        aadhaarMatch &&
        keywordHits >=
          1
      ) ||
      keywordHits >=
        2
    ) {
      return {
        valid: true,

        detectedType:
          "AADHAAR",

        extracted: {
          aadhaarLast4:
            aadhaarMatch
              ? aadhaarMatch[0]
                  .slice(
                    -4
                  )
              : "",
        },
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be an Aadhaar Card. Please upload the correct Aadhaar Card.",
    };
  };

/* =========================================================
   BANK INFORMATION EXTRACTION
========================================================= */

const extractIfsc =
  (
    text
  ) => {
    const match =
      normalizeText(
        text
      ).match(
        /\b[A-Z]{4}0[A-Z0-9]{6}\b/
      );

    return match?.[0] ||
      "";
  };

const extractLikelyAccountNumber =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const patterns = [
      /ACCOUNT\s*(?:NO|NUMBER|NO\.|#)?\s*[:\-]?\s*([0-9]{6,20})/,
      /A\/C\s*(?:NO|NUMBER|NO\.|#)?\s*[:\-]?\s*([0-9]{6,20})/,
      /AC\s*(?:NO|NUMBER|NO\.|#)?\s*[:\-]?\s*([0-9]{6,20})/,
    ];

    for (
      const pattern
      of patterns
    ) {
      const match =
        normalized.match(
          pattern
        );

      if (
        match?.[1]
      ) {
        return normalizeDigits(
          match[1]
        );
      }
    }

    return "";
  };

/* =========================================================
   BANK PROOF
========================================================= */

const validateBankProof =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const keywordHits =
      countKeywordHits(
        normalized,
        [
          "ACCOUNT",
          "A/C",
          "IFSC",
          "BANK",
          "BRANCH",
          "CHEQUE",
          "MICR",
          "ACCOUNT NUMBER",
          "AC NO",
          "PASSBOOK",
          "STATEMENT",
        ]
      );

    const ifsc =
      extractIfsc(
        normalized
      );

    const accountNumber =
      extractLikelyAccountNumber(
        normalized
      );

    if (
      keywordHits >=
        2 &&
      (
        ifsc ||
        accountNumber ||
        normalized.includes(
          "CHEQUE"
        ) ||
        normalized.includes(
          "PASSBOOK"
        )
      )
    ) {
      return {
        valid: true,

        detectedType:
          "BANK_PROOF",

        extracted: {
          ifsc,

          accountHash:
            accountNumber
              ? hashSensitiveValue(
                  accountNumber
                )
              : "",

          accountLast4:
            accountNumber
              ? accountNumber.slice(
                  -4
                )
              : "",
        },
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be valid bank proof. Please upload a cancelled cheque, passbook page or bank statement showing account details.",
    };
  };

/* =========================================================
   HIGHEST QUALIFICATION
========================================================= */

const validateQualification =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const hits =
      countKeywordHits(
        normalized,
        [
          "CERTIFICATE",
          "DEGREE",
          "DIPLOMA",
          "UNIVERSITY",
          "COLLEGE",
          "INSTITUTE",
          "MARKSHEET",
          "MARK SHEET",
          "SEMESTER",
          "ROLL NO",
          "ROLL NUMBER",
          "BACHELOR",
          "MASTER",
          "B.TECH",
          "M.TECH",
          "B.COM",
          "M.COM",
          "BBA",
          "MBA",
          "GRADUATION",
        ]
      );

    if (
      hasResumeSignals(
        normalized
      ) &&
      hits <
        4
    ) {
      return {
        valid: false,

        reason:
          "WRONG_DOCUMENT",

        message:
          "This appears to be a resume rather than a qualification certificate. Please upload your degree, diploma or highest qualification document.",
      };
    }

    if (
      hits >=
        2
    ) {
      return {
        valid: true,

        detectedType:
          "HIGHEST_QUALIFICATION",
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be a qualification certificate or marksheet.",
    };
  };

/* =========================================================
   EXPERIENCE LETTER
========================================================= */

const validateExperienceLetter =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const strong =
      [
        "EXPERIENCE CERTIFICATE",
        "EXPERIENCE LETTER",
        "CERTIFICATE OF EXPERIENCE",
      ];

    const support =
      [
        "TO WHOM IT MAY CONCERN",
        "WORKED WITH",
        "WORKED IN",
        "EMPLOYED WITH",
        "EMPLOYED AS",
        "DESIGNATION",
        "TENURE",
        "SERVICES",
      ];

    if (
      countKeywordHits(
        normalized,
        strong
      ) >=
        1 &&
      countKeywordHits(
        normalized,
        support
      ) >=
        1
    ) {
      return {
        valid: true,

        detectedType:
          "EXPERIENCE_LETTER",
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be an Experience Letter or Experience Certificate.",
    };
  };

/* =========================================================
   RELIEVING LETTER
========================================================= */

const validateRelievingLetter =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const strong =
      [
        "RELIEVING LETTER",
        "RELIEVED FROM",
        "RELIEVED OF",
        "RELEASED FROM SERVICES",
        "LAST WORKING DAY",
      ];

    const support =
      [
        "EMPLOYEE",
        "EMPLOYMENT",
        "DESIGNATION",
        "SERVICES",
        "COMPANY",
        "ORGANIZATION",
      ];

    if (
      countKeywordHits(
        normalized,
        strong
      ) >=
        1 &&
      countKeywordHits(
        normalized,
        support
      ) >=
        1
    ) {
      return {
        valid: true,

        detectedType:
          "RELIEVING_LETTER",
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be a Relieving Letter.",
    };
  };

/* =========================================================
   SALARY SLIP
========================================================= */

const validateSalarySlip =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const strong =
      [
        "SALARY SLIP",
        "PAYSLIP",
        "PAY SLIP",
        "PAY STATEMENT",
      ];

    const support =
      [
        "BASIC",
        "HRA",
        "GROSS",
        "NET PAY",
        "DEDUCTIONS",
        "PF",
        "EMPLOYEE ID",
        "EMPLOYEE CODE",
        "EARNINGS",
      ];

    if (
      countKeywordHits(
        normalized,
        strong
      ) >=
        1 &&
      countKeywordHits(
        normalized,
        support
      ) >=
        2
    ) {
      return {
        valid: true,

        detectedType:
          "SALARY_SLIP",
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be a salary slip or payslip.",
    };
  };

/* =========================================================
   PREVIOUS APPOINTMENT LETTER
========================================================= */

const validateAppointmentLetter =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const strong =
      [
        "APPOINTMENT LETTER",
        "LETTER OF APPOINTMENT",
        "APPOINTED AS",
        "APPOINTMENT AS",
      ];

    const support =
      [
        "DESIGNATION",
        "DATE OF JOINING",
        "JOINING DATE",
        "SALARY",
        "COMPENSATION",
        "TERMS AND CONDITIONS",
        "EMPLOYMENT",
      ];

    if (
      countKeywordHits(
        normalized,
        strong
      ) >=
        1 &&
      countKeywordHits(
        normalized,
        support
      ) >=
        1
    ) {
      return {
        valid: true,

        detectedType:
          "PREVIOUS_APPOINTMENT_LETTER",
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be an Appointment Letter.",
    };
  };

/* =========================================================
   FORM 16
========================================================= */

const validateForm16 =
  (
    text
  ) => {
    const normalized =
      normalizeText(
        text
      );

    const strong =
      [
        "FORM NO. 16",
        "FORM 16",
        "CERTIFICATE UNDER SECTION 203",
      ];

    const support =
      [
        "TDS",
        "TAX DEDUCTED",
        "PAN OF THE EMPLOYEE",
        "ASSESSMENT YEAR",
        "DEDUCTOR",
      ];

    if (
      countKeywordHits(
        normalized,
        strong
      ) >=
        1 &&
      countKeywordHits(
        normalized,
        support
      ) >=
        1
    ) {
      return {
        valid: true,

        detectedType:
          "FORM16",
      };
    }

    return {
      valid: false,

      reason:
        "WRONG_DOCUMENT",

      message:
        "This file does not appear to be Form 16.",
    };
  };

/* =========================================================
   TEXT DOCUMENT DISPATCH
========================================================= */

const validateTextDocument =
  (
    type,
    text
  ) => {
    switch (
      type
    ) {
      case "AADHAAR":
        return validateAadhaar(
          text
        );

      case "PAN":
        return validatePan(
          text
        );

      case "BANK_PROOF":
        return validateBankProof(
          text
        );

      case "HIGHEST_QUALIFICATION":
        return validateQualification(
          text
        );

      case "EXPERIENCE_LETTER":
        return validateExperienceLetter(
          text
        );

      case "RELIEVING_LETTER":
        return validateRelievingLetter(
          text
        );

      case "SALARY_SLIP":
        return validateSalarySlip(
          text
        );

      case "PREVIOUS_APPOINTMENT_LETTER":
        return validateAppointmentLetter(
          text
        );

      case "FORM16":
        return validateForm16(
          text
        );

      default:
        return {
          valid: true,
          detectedType:
            type,
        };
    }
  };

/* =========================================================
   PHOTO / SIGNATURE IMAGE VALIDATION
========================================================= */

const validateImageOnlyDocument =
  async ({
    type,
    filePath,
    quality,
  }) => {
    /*
     * OCR is not used as positive identification here.
     *
     * It is used to detect obvious wrong uploads such as
     * resumes, certificates and text-heavy documents.
     */

    let ocr =
      {
        text: "",
        confidence: 0,
      };

    try {
      ocr =
        await extractImageText(
          filePath
        );
    } catch (
      error
    ) {
      /*
       * A real portrait/signature may legitimately have no
       * readable OCR text, so OCR failure alone should not
       * reject an otherwise valid image.
       */
      console.warn(
        "[Document Scan] Optional OCR check failed:",
        error?.message
      );
    }

    const text =
      normalizeText(
        ocr?.text
      );

    const obviousDocumentHits =
      countKeywordHits(
        text,
        [
          "RESUME",
          "CURRICULUM VITAE",
          "AADHAAR",
          "PERMANENT ACCOUNT NUMBER",
          "INCOME TAX",
          "SALARY SLIP",
          "PAYSLIP",
          "EXPERIENCE LETTER",
          "RELIEVING LETTER",
          "APPOINTMENT LETTER",
          "UNIVERSITY",
          "MARKSHEET",
          "BANK STATEMENT",
        ]
      );

    /*
     * Text-heavy file uploaded as photograph/signature.
     */
    if (
      text.length >
        120 &&
      obviousDocumentHits >=
        1
    ) {
      return {
        valid: false,

        reason:
          "WRONG_DOCUMENT",

        message:
          type ===
          "PHOTO"
            ? "This file appears to be a text document rather than a photograph. Please upload a recent passport-size photograph."
            : "This file appears to be a text document rather than a signature image. Please upload a clear signature image.",
      };
    }

    return {
      valid: true,

      detectedType:
        type,

      confidence:
        ocr?.confidence ||
        null,

      quality: {
        width:
          quality.width,

        height:
          quality.height,

        contrastScore:
          quality
            .contrastScore,
      },
    };
  };

/* =========================================================
   MAIN SCAN
========================================================= */

const scanUploadedDocument =
  async ({
    documentType,
    file,
  }) => {
    const type =
      String(
        documentType ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !file?.path
    ) {
      throw new ApiError(
        400,
        "Uploaded document is not available for validation"
      );
    }

    const mimeType =
      String(
        file?.mimetype ||
          ""
      )
        .trim()
        .toLowerCase();

    const fingerprint =
      await createFileFingerprint(
        file.path
      );

    /* =====================================================
       PHOTO / SIGNATURE
    ===================================================== */

    if (
      IMAGE_ONLY_TYPES.has(
        type
      )
    ) {
      if (
        !IMAGE_TYPES.has(
          mimeType
        )
      ) {
        return {
          valid: false,

          scanned: true,

          fingerprint,

          reason:
            "IMAGE_REQUIRED",

          message:
            type ===
            "PHOTO"
              ? "Photograph must be uploaded as a JPG or PNG image. PDF files are not accepted for Photograph."
              : "Signature must be uploaded as a JPG or PNG image. PDF files are not accepted for Signature.",
        };
      }

      const quality =
        await inspectImageQuality(
          file.path,
          type
        );

      if (
        !quality.valid
      ) {
        return {
          valid: false,

          scanned: true,

          fingerprint,

          ...quality,
        };
      }

      const result =
        await validateImageOnlyDocument({
          type,

          filePath:
            file.path,

          quality,
        });

      return {
        ...result,

        scanned: true,

        fingerprint,

        sourceKind:
          "IMAGE",

        confidence:
          result
            ?.confidence ||
          null,

        quality:
          result
            ?.quality ||
          {
            width:
              quality.width,

            height:
              quality.height,

            contrastScore:
              quality
                .contrastScore,
          },

        extracted:
          {},
      };
    }

    /* =====================================================
       OTHER

       OTHER is optional and intentionally flexible, but
       still receives a fingerprint.
    ===================================================== */

    if (
      type ===
      "OTHER"
    ) {
      return {
        valid: true,

        scanned: false,

        fingerprint,

        sourceKind:
          IMAGE_TYPES.has(
            mimeType
          )
            ? "IMAGE"
            : PDF_TYPES.has(
                mimeType
              )
              ? "PDF_TEXT"
              : "",

        detectedType:
          "OTHER",

        extracted:
          {},
      };
    }

    /* =====================================================
       TEXT DOCUMENTS
    ===================================================== */

    if (
      TEXT_DOCUMENT_TYPES.has(
        type
      )
    ) {
      let text =
        "";

      let confidence =
        null;

      let quality =
        null;

      let sourceKind =
        "";

      /* ===================================================
         IMAGE
      =================================================== */

      if (
        IMAGE_TYPES.has(
          mimeType
        )
      ) {
        quality =
          await inspectImageQuality(
            file.path,
            type
          );

        if (
          !quality.valid
        ) {
          return {
            valid: false,

            scanned: true,

            fingerprint,

            ...quality,
          };
        }

        try {
          const ocr =
            await extractImageText(
              file.path
            );

          text =
            ocr.text;

          confidence =
            ocr.confidence;

          sourceKind =
            "IMAGE";
        } catch (
          error
        ) {
          console.error(
            "[Document Scan] OCR failed:",
            error
          );

          return {
            valid: false,

            scanned: true,

            fingerprint,

            reason:
              "OCR_FAILED",

            message:
              "The document text could not be read clearly. Please upload a clearer JPG or PNG image.",
          };
        }
      }

      /* ===================================================
         PDF
      =================================================== */

      else if (
        PDF_TYPES.has(
          mimeType
        )
      ) {
        try {
          const pdf =
            await extractPdfText(
              file.path
            );

          text =
            pdf.text;

          sourceKind =
            "PDF_TEXT";
        } catch (
          error
        ) {
          console.error(
            "[Document Scan] PDF parsing failed:",
            error
          );

          return {
            valid: false,

            scanned: true,

            fingerprint,

            reason:
              "PDF_READ_FAILED",

            message:
              "This PDF could not be read. Please upload a valid text PDF or a clear JPG/PNG image.",
          };
        }

        /*
         * CRITICAL:
         *
         * Never silently approve a scanned PDF.
         *
         * pdf-parse can read normal/text PDFs. If there is
         * no extractable text, require JPG/PNG so OCR can
         * actually verify it.
         */
        if (
          !text ||
          text.length <
            20
        ) {
          return {
            valid: false,

            scanned: true,

            fingerprint,

            reason:
              "SCANNED_PDF_NOT_VERIFIABLE",

            message:
              "This PDF appears to be an image-only scan and cannot be verified automatically. Please upload a clear JPG or PNG image of this document.",
          };
        }
      }

      /* ===================================================
         INVALID MIME
      =================================================== */

      else {
        return {
          valid: false,

          scanned: true,

          fingerprint,

          reason:
            "UNSUPPORTED_FILE",

          message:
            "Only PDF, JPG and PNG files are supported.",
        };
      }

      /* ===================================================
         TEXT READABILITY
      =================================================== */

      if (
        !text ||
        text.length <
          10
      ) {
        return {
          valid: false,

          scanned: true,

          fingerprint,

          reason:
            "TEXT_NOT_READABLE",

          message:
            "The text on this document could not be read. Please upload a clearer copy.",
        };
      }

      /* ===================================================
         EXPECTED DOCUMENT TYPE
      =================================================== */

      const detected =
        validateTextDocument(
          type,
          text
        );

      if (
        !detected.valid
      ) {
        return {
          valid: false,

          scanned: true,

          fingerprint,

          sourceKind,

          confidence,

          ...detected,
        };
      }

      return {
        valid: true,

        scanned: true,

        fingerprint,

        sourceKind,

        detectedType:
          detected
            .detectedType ||
          type,

        confidence,

        extracted:
          detected
            .extracted ||
          {},

        quality:
          quality
            ? {
                width:
                  quality.width,

                height:
                  quality.height,

                contrastScore:
                  quality
                    .contrastScore,
              }
            : null,
      };
    }

    /* =====================================================
       FALLBACK
    ===================================================== */

    return {
      valid: true,

      scanned: false,

      fingerprint,

      detectedType:
        type,

      sourceKind:
        "",

      extracted:
        {},
    };
  };

/* =========================================================
   THROW HELPER
========================================================= */

const assertUploadedDocumentValid =
  async ({
    documentType,
    file,
  }) => {
    const result =
      await scanUploadedDocument({
        documentType,
        file,
      });

    if (
      !result.valid
    ) {
      await deleteTempFile(
        file?.path
      );

      const error =
        new ApiError(
          422,
          result.message ||
            "The uploaded document could not be verified"
        );

      error.code =
        result.reason ||
        "DOCUMENT_SCAN_FAILED";

      error.validation =
        result;

      throw error;
    }

    return result;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  scanUploadedDocument,

  assertUploadedDocumentValid,

  createFileFingerprint,

  hashSensitiveValue,

  deleteTempFile,
};