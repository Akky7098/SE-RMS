const mongoose =
  require("mongoose");

const {
  EmployeeAppointment,
  EmployeeAppointmentCounter,
} =
  require(
    "./appointment.model"
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

const employeeDocumentService =
  require(
    "../documents/employeeDocument.service"
  );

const {
  buildAppointmentHtml,
} =
  require(
    "./appointment.template"
  );

const {
  generateAppointmentPdfBuffer,
} =
  require(
    "./appointmentPdf.service"
  );

const {
  validateGenerateAppointment,
} =
  require(
    "./appointment.validation"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   CONSTANT
========================================================= */

const APPOINTMENT_WAIT_DAYS =
  Number(
    process.env
      .APPOINTMENT_WAIT_DAYS ||
    7
  );

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

const startOfDay =
  (
    value
  ) => {
    const date =
      new Date(
        value
      );

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  };

/* =========================================================
   ELIGIBLE DATE
========================================================= */

const getEligibleDate =
  (
    joiningDate
  ) => {
    if (!joiningDate) {
      return null;
    }

    const eligible =
      startOfDay(
        joiningDate
      );

    eligible.setDate(
      eligible.getDate() +
        APPOINTMENT_WAIT_DAYS
    );

    return eligible;
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

    if (!employee) {
      throw new ApiError(
        404,
        "Employee not found."
      );
    }

    return employee;
  };

/* =========================================================
   REFERENCE
========================================================= */

const generateReferenceNumber =
  async (
    date =
      new Date()
  ) => {
    const year =
      date
        .getFullYear();

    const key =
      `APPOINTMENT-${year}`;

    const counter =
      await EmployeeAppointmentCounter
        .findOneAndUpdate(
          {
            key,
          },
          {
            $inc: {
              sequence: 1,
            },
          },
          {
            new: true,

            upsert: true,

            setDefaultsOnInsert:
              true,
          }
        );

    return (
      `SET/APPT/${year}/${String(
        counter.sequence
      ).padStart(
        4,
        "0"
      )}`
    );
  };

/* =========================================================
   ELIGIBILITY
========================================================= */

const getAppointmentReadiness =
  async (
    employeeId
  ) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const joiningDate =
      employee
        .joiningDate;

    if (!joiningDate) {
      return {
        ready: false,

        reason:
          "JOINING_DATE_MISSING",

        joiningDate:
          null,

        eligibleAt:
          null,

        remainingDays:
          null,

        currentAppointment:
          null,
      };
    }

    const eligibleAt =
      getEligibleDate(
        joiningDate
      );

    const today =
      startOfDay(
        new Date()
      );

    const millisecondsRemaining =
      Math.max(
        0,
        eligibleAt.getTime() -
          today.getTime()
      );

    const remainingDays =
      Math.ceil(
        millisecondsRemaining /
          (
            24 *
            60 *
            60 *
            1000
          )
      );

    const currentAppointment =
      await EmployeeAppointment
        .findOne({
          employee:
            employee._id,

          isCurrent:
            true,
        })
        .populate(
          "document"
        )
        .lean();

    return {
      ready:
        today >=
        eligibleAt,

      reason:
        today >=
        eligibleAt
          ? ""
          : "WAITING_PERIOD",

      waitDays:
        APPOINTMENT_WAIT_DAYS,

      joiningDate,

      eligibleAt,

      remainingDays,

      hasAppointment:
        Boolean(
          currentAppointment
        ),

      currentAppointment,
    };
  };

/* =========================================================
   ASSERT ELIGIBLE
========================================================= */

const assertEligible =
  async (
    employee
  ) => {
    if (
      !employee
        .joiningDate
    ) {
      throw new ApiError(
        422,
        "Employee joining date is required before generating an Appointment Letter."
      );
    }

    const eligibleAt =
      getEligibleDate(
        employee
          .joiningDate
      );

    const today =
      startOfDay(
        new Date()
      );

    if (
      today <
      eligibleAt
    ) {
      throw new ApiError(
        409,
        `Appointment Letter can be generated only after ${APPOINTMENT_WAIT_DAYS} days of joining. Eligible date: ${eligibleAt.toLocaleDateString(
          "en-IN"
        )}.`
      );
    }

    return eligibleAt;
  };

/* =========================================================
   CURRENT
========================================================= */

const getCurrentAppointment =
  async (
    employeeId
  ) => {
    await getEmployee(
      employeeId
    );

    return EmployeeAppointment
      .findOne({
        employee:
          employeeId,

        isCurrent:
          true,
      })
      .populate(
        "document"
      )
      .populate(
        "reviewedBy",
        "displayName email"
      )
      .populate(
        "issuedBy",
        "displayName email"
      );
  };

/* =========================================================
   HISTORY
========================================================= */

const getAppointmentHistory =
  async (
    employeeId
  ) => {
    await getEmployee(
      employeeId
    );

    return EmployeeAppointment
      .find({
        employee:
          employeeId,
      })
      .populate(
        "document"
      )
      .sort({
        version: -1,
        createdAt: -1,
      });
  };

/* =========================================================
   GENERATE
========================================================= */

const generateAppointment =
  async ({
    employeeId,
    payload = {},
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    await assertEligible(
      employee
    );

    const validation =
      validateGenerateAppointment(
        payload
      );

    const current =
      await EmployeeAppointment
        .findOne({
          employee:
            employee._id,

          isCurrent:
            true,
        });

    const version =
      current
        ? current.version +
          1
        : 1;

    const referenceNumber =
      await generateReferenceNumber(
        validation.issueDate
      );

    const appointment =
      new EmployeeAppointment({
        employee:
          employee._id,

        onboarding:
          employee.onboarding ||
          null,

        referenceNumber,

        version,

        isCurrent:
          true,

        status:
          "DRAFT",

        employeeCode:
          employee
            .employeeCode,

        employeeName:
          employee
            .fullName,

        designation:
          employee
            .designation,

        departmentName:
          employee
            ?.department
            ?.name ||
          employee
            .orgUnitCode ||
          "",

        companyCode:
          employee
            .companyCode ||
          "",

        joiningDate:
          employee
            .joiningDate,

        issueDate:
          validation
            .issueDate,

        workLocation:
          employee
            .workLocation ||
          "",

        reportingManagerName:
          employee
            ?.reportsTo
            ?.fullName ||
          "",

        employmentType:
          employee
            .employmentType ||
          "",

        createdBy:
          actorUserId,

        updatedBy:
          actorUserId,

        auditTrail: [
          {
            event:
              "APPOINTMENT_GENERATION_STARTED",

            remarks:
              `Appointment Letter version ${version} prepared.`,

            performedBy:
              actorUserId,
          },
        ],
      });

    const html =
      buildAppointmentHtml({
        employee,

        appointment,
      });

    const buffer =
      await generateAppointmentPdfBuffer(
        html
      );

    const document =
      await employeeDocumentService
        .registerDocumentBuffer({
          employeeId:
            employee._id,

          buffer,

          originalFileName:
            `${employee.employeeCode}-Appointment-Letter-V${version}.pdf`,

          mimeType:
            "application/pdf",

          category:
            "APPOINTMENT",

          documentType:
            "APPOINTMENT_LETTER",

          label:
            `Appointment Letter V${version}`,

          description:
            `Controlled Appointment Letter ${referenceNumber}.`,

          source:
            "GENERATED",

          sourceRecordType:
            "EmployeeAppointment",

          sourceRecordId:
            appointment._id,

          sourceDocumentId:
            `${referenceNumber}-V${version}`,

          actorUserId,

          allowDuplicate:
            true,
        });

    appointment.document =
      document._id;

    appointment.status =
      "GENERATED";

    appointment.generatedAt =
      new Date();

    appointment.auditTrail.push({
      event:
        "APPOINTMENT_GENERATED",

      remarks:
        "Appointment Letter PDF generated and stored in Employee Document Vault.",

      performedBy:
        actorUserId,

      metadata: {
        documentId:
          document._id,
      },
    });

    await appointment.save();

    if (current) {
      current.isCurrent =
        false;

      current.updatedBy =
        actorUserId;

      await current.save();
    }

    return getCurrentAppointment(
      employee._id
    );
  };

/* =========================================================
   REVIEW
========================================================= */

const reviewAppointment =
  async ({
    employeeId,
    actorUserId,
  }) => {
    const appointment =
      await EmployeeAppointment
        .findOne({
          employee:
            employeeId,

          isCurrent:
            true,
        });

    if (!appointment) {
      throw new ApiError(
        404,
        "Appointment Letter has not been generated."
      );
    }

    if (
      ![
        "GENERATED",
        "REVIEWED",
      ].includes(
        appointment.status
      )
    ) {
      throw new ApiError(
        409,
        "This Appointment Letter cannot be reviewed in its current status."
      );
    }

    appointment.status =
      "REVIEWED";

    appointment.reviewedAt =
      appointment.reviewedAt ||
      new Date();

    appointment.reviewedBy =
      actorUserId;

    appointment.updatedBy =
      actorUserId;

    appointment.auditTrail.push({
      event:
        "APPOINTMENT_REVIEWED",

      remarks:
        "Appointment Letter reviewed by HR.",

      performedBy:
        actorUserId,
    });

    await appointment.save();

    return getCurrentAppointment(
      employeeId
    );
  };

/* =========================================================
   ISSUE
========================================================= */

const issueAppointment =
  async ({
    employeeId,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const appointment =
      await EmployeeAppointment
        .findOne({
          employee:
            employee._id,

          isCurrent:
            true,
        });

    if (!appointment) {
      throw new ApiError(
        404,
        "Appointment Letter has not been generated."
      );
    }

    if (
      appointment.status !==
      "REVIEWED"
    ) {
      throw new ApiError(
        409,
        "HR must review the Appointment Letter before issuing it."
      );
    }

    appointment.status =
      "ISSUED";

    appointment.issuedAt =
      new Date();

    appointment.issuedBy =
      actorUserId;

    appointment.updatedBy =
      actorUserId;

    appointment.auditTrail.push({
      event:
        "APPOINTMENT_ISSUED",

      remarks:
        "Appointment Letter issued successfully.",

      performedBy:
        actorUserId,
    });

    await appointment.save();

    if (
      employee.onboarding
    ) {
      await EmployeeOnboarding
        .findByIdAndUpdate(
          employee
            .onboarding,
          {
            $set: {
              "checklist.appointmentLetter":
                true,
            },

            $push: {
              auditTrail: {
                event:
                  "APPOINTMENT_LETTER_ISSUED",

                remarks:
                  `Appointment Letter ${appointment.referenceNumber} issued.`,

                performedBy:
                  actorUserId,

                at:
                  new Date(),
              },
            },

            updatedBy:
              actorUserId,
          }
        );
    }

    return getCurrentAppointment(
      employee._id
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  APPOINTMENT_WAIT_DAYS,

  getAppointmentReadiness,

  getCurrentAppointment,

  getAppointmentHistory,

  generateAppointment,

  reviewAppointment,

  issueAppointment,
};