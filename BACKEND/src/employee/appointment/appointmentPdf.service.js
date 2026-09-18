const PDFDocument =
  require("pdfkit");

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   HELPERS
========================================================= */

const safeText = (
  value,
  fallback = "-"
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
};

const formatDate = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
};

/* =========================================================
   BUILD PDF BUFFER
========================================================= */

const generateAppointmentPdf =
  async ({
    appointment,
    employee,
  }) => {
    if (!appointment) {
      throw new ApiError(
        400,
        "Appointment record is required"
      );
    }

    if (!employee) {
      throw new ApiError(
        400,
        "Employee record is required"
      );
    }

    return new Promise(
      (
        resolve,
        reject
      ) => {
        try {
          const doc =
            new PDFDocument({
              size: "A4",

              margins: {
                top: 55,
                bottom: 55,
                left: 60,
                right: 60,
              },
            });

          const chunks = [];

          doc.on(
            "data",
            (chunk) => {
              chunks.push(
                chunk
              );
            }
          );

          doc.on(
            "end",
            () => {
              resolve(
                Buffer.concat(
                  chunks
                )
              );
            }
          );

          doc.on(
            "error",
            reject
          );

          /* ===============================================
             HEADER
          =============================================== */

          doc
            .font("Helvetica-Bold")
            .fontSize(18)
            .text(
              "SANDEEP EDGE TECH",
              {
                align:
                  "center",
              }
            );

          doc
            .moveDown(0.3)
            .font("Helvetica")
            .fontSize(10)
            .text(
              "Appointment Letter",
              {
                align:
                  "center",
              }
            );

          doc.moveDown(2);

          /* ===============================================
             REFERENCE
          =============================================== */

          doc
            .font("Helvetica")
            .fontSize(10);

          doc.text(
            `Date: ${formatDate(
              appointment.issueDate ||
                appointment.createdAt ||
                new Date()
            )}`
          );

          if (
            appointment.referenceNumber
          ) {
            doc.text(
              `Reference: ${safeText(
                appointment.referenceNumber
              )}`
            );
          }

          doc.moveDown(2);

          /* ===============================================
             EMPLOYEE
          =============================================== */

          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .text(
              `Dear ${safeText(
                employee.fullName,
                "Employee"
              )},`
            );

          doc.moveDown();

          /* ===============================================
             BODY
          =============================================== */

          doc
            .font("Helvetica")
            .fontSize(11)
            .text(
              `We are pleased to appoint you as ${safeText(
                employee.designation
              )} with Sandeep Edge Tech.`,
              {
                align:
                  "justify",

                lineGap:
                  4,
              }
            );

          doc.moveDown();

          doc.text(
            `Your Employee ID is ${safeText(
              employee.employeeCode
            )}.`,
            {
              lineGap:
                4,
            }
          );

          doc.moveDown();

          doc.text(
            `Your date of joining is ${formatDate(
              employee.joiningDate
            )}.`,
            {
              lineGap:
                4,
            }
          );

          if (
            employee.workLocation
          ) {
            doc.moveDown();

            doc.text(
              `Your work location will be ${safeText(
                employee.workLocation
              )}.`,
              {
                lineGap:
                  4,
              }
            );
          }

          doc.moveDown();

          doc.text(
            "Your employment will be governed by the policies, rules, procedures and conditions of employment applicable to the organisation from time to time.",
            {
              align:
                "justify",

              lineGap:
                4,
            }
          );

          doc.moveDown();

          doc.text(
            "You are expected to maintain confidentiality, professional conduct and comply with all applicable company policies during your employment.",
            {
              align:
                "justify",

              lineGap:
                4,
            }
          );

          doc.moveDown();

          doc.text(
            "We welcome you to the organisation and look forward to a successful and mutually rewarding association.",
            {
              align:
                "justify",

              lineGap:
                4,
            }
          );

          /* ===============================================
             SIGNATURE
          =============================================== */

          doc.moveDown(4);

          doc
            .font("Helvetica-Bold")
            .text(
              "For Sandeep Edge Tech"
            );

          doc.moveDown(3);

          doc
            .font("Helvetica")
            .text(
              "Authorised Signatory"
            );

          doc.moveDown(4);

          doc
            .font("Helvetica-Bold")
            .text(
              "Employee Acceptance"
            );

          doc.moveDown();

          doc
            .font("Helvetica")
            .text(
              `Employee Name: ${safeText(
                employee.fullName
              )}`
            );

          doc.moveDown();

          doc.text(
            "Signature: ______________________________"
          );

          doc.moveDown();

          doc.text(
            "Date: ______________________________"
          );

          /* ===============================================
             END
          =============================================== */

          doc.end();
        } catch (
          error
        ) {
          reject(
            error
          );
        }
      }
    );
  };

/* =========================================================
   ALIASES

   Keep aliases so appointment.service.js can use either
   naming style without another missing import problem.
========================================================= */

const buildAppointmentPdf =
  generateAppointmentPdf;

const createAppointmentPdf =
  generateAppointmentPdf;

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generateAppointmentPdf,
  buildAppointmentPdf,
  createAppointmentPdf,
};