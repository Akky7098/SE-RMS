const mongoose =
  require(
    "mongoose"
  );

const {
  Joining,
} =
  require(
    "./joining.model"
  );

const {
  Selection,
} =
  require(
    "../selection.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   CONSTANTS
========================================================= */

const UPDATE_ACTIONS = [
  "CONFIRM_DATE",
  "RESCHEDULE",
  "FOLLOW_UP",
  "NO_SHOW",
  "DECLINED",
];

/* =========================================================
   HELPERS
========================================================= */

const objectId =
  (
    value
  ) => {
    if (
      !value
    ) {
      return null;
    }

    if (
      typeof value ===
        "object" &&
      value._id
    ) {
      return value._id;
    }

    return value;
  };

const actorId =
  (
    actor
  ) =>
    objectId(
      actor?._id ||
      actor?.id ||
      actor
    );

const validId =
  (
    value
  ) =>
    mongoose.Types
      .ObjectId
      .isValid(
        value
      );

const parseDate =
  (
    value,
    fieldName
  ) => {
    if (
      !value
    ) {
      return null;
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
      throw new ApiError(
        400,
        `${fieldName} is invalid.`
      );
    }

    return date;
  };

const cleanText =
  (
    value
  ) =>
    String(
      value ||
        ""
    )
      .trim();

/* =========================================================
   POPULATE
========================================================= */

const populateJoining =
  (
    query
  ) =>
    query
      .populate(
        "candidate"
      )
      .populate(
        "employee"
      )
      .populate(
        "createdBy",
        "name fullName displayName email"
      )
      .populate(
        "updatedBy",
        "name fullName displayName email"
      )
      .populate(
        "day1ConfirmedBy",
        "name fullName displayName email"
      )
      .populate(
        "history.performedBy",
        "name fullName displayName email"
      );

/* =========================================================
   LOAD SELECTION
========================================================= */

const getSelection =
  async (
    selectionId
  ) => {
    if (
      !validId(
        selectionId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Selection ID."
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
          "department"
        )
        .populate(
          "hiringHr",
          "name fullName displayName email designation"
        )
        .populate(
          "currentOffer"
        );

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found."
      );
    }

    return selection;
  };

/* =========================================================
   JOINING DATE FROM SELECTION
========================================================= */

const resolveJoiningDate =
  (
    selection
  ) => {
    const date =
      selection
        ?.finalJoiningDate ||
      selection
        ?.currentOffer
        ?.reportingDate ||
      selection
        ?.proposedJoiningDate;

    if (
      !date
    ) {
      throw new ApiError(
        422,
        "Joining date is not available. Please set a joining date before starting the Joining workflow."
      );
    }

    return new Date(
      date
    );
  };

/* =========================================================
   ENSURE JOINING

   Called automatically after Offer is sent,
   or lazily when HR first opens Joining workspace.
========================================================= */

const ensureJoiningRecord =
  async ({
    selectionId,
    actor =
      null,
  }) => {
    const selection =
      await getSelection(
        selectionId
      );

    const existing =
      await Joining
        .findOne({
          selection:
            selection._id,
        });

    if (
      existing
    ) {
      return populateJoining(
        Joining
          .findById(
            existing._id
          )
      );
    }

    if (
      ![
        "OFFER_SENT",
        "JOINING_PENDING",
        "JOINING_RESCHEDULED",
        "NO_SHOW",
        "JOINING_CONFIRMED",
      ].includes(
        selection.status
      )
    ) {
      throw new ApiError(
        409,
        "Joining workflow can begin only after the Offer Letter has been sent."
      );
    }

    const joiningDate =
      resolveJoiningDate(
        selection
      );

    const user =
      actorId(
        actor
      );

    const joining =
      await Joining.create({
        selection:
          selection._id,

        candidate:
          selection
            .candidate
            ?._id ||
          selection
            .candidate,

        originalJoiningDate:
          joiningDate,

        expectedJoiningDate:
          joiningDate,

        status:
          "PENDING",

        createdBy:
          user,

        updatedBy:
          user,

        history: [
          {
            action:
              "JOINING_CREATED",

            joiningDate,

            performedBy:
              user,

            remarks:
              "Joining workflow created after Offer release.",
          },
        ],
      });

    /*
     * OFFER_SENT now naturally moves to JOINING_PENDING.
     *
     * We do NOT remove Offer information.
     */

    if (
      selection.status ===
      "OFFER_SENT"
    ) {
      selection.status =
        "JOINING_PENDING";

      selection.updatedBy =
        user;

      await selection.save();
    }

    return populateJoining(
      Joining
        .findById(
          joining._id
        )
    );
  };

/* =========================================================
   GET JOINING
========================================================= */

const getJoiningBySelection =
  async (
    selectionId
  ) => {
    if (
      !validId(
        selectionId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Selection ID."
      );
    }

    const joining =
      await populateJoining(
        Joining
          .findOne({
            selection:
              selectionId,
          })
      );

    if (
      !joining
    ) {
      return null;
    }

    return joining;
  };

/* =========================================================
   JOINING READINESS

   Frontend can call this before rendering controls.
========================================================= */

const getJoiningReadiness =
  async (
    selectionId
  ) => {
    const selection =
      await getSelection(
        selectionId
      );

    const joining =
      await Joining
        .findOne({
          selection:
            selection._id,
        });

    const joiningDate =
      joining
        ?.expectedJoiningDate ||
      selection
        ?.finalJoiningDate ||
      selection
        ?.currentOffer
        ?.reportingDate ||
      selection
        ?.proposedJoiningDate ||
      null;

    return {
      ready:
        Boolean(
          joiningDate
        ),

      selectionStatus:
        selection
          .status,

      joiningDate,

      hasJoiningRecord:
        Boolean(
          joining
        ),

      canStart:
        [
          "OFFER_SENT",
          "JOINING_PENDING",
          "JOINING_RESCHEDULED",
          "NO_SHOW",
          "JOINING_CONFIRMED",
        ].includes(
          selection
            .status
        ),
    };
  };

/* =========================================================
   UPDATE JOINING

   action:
   CONFIRM_DATE
   RESCHEDULE
   FOLLOW_UP
   NO_SHOW
   DECLINED
========================================================= */

const updateJoining =
  async ({
    selectionId,
    body =
      {},
    actor =
      null,
  }) => {
    const action =
      String(
        body.action ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !UPDATE_ACTIONS.includes(
        action
      )
    ) {
      throw new ApiError(
        400,
        "Invalid joining action."
      );
    }

    let joining =
      await Joining
        .findOne({
          selection:
            selectionId,
        });

    if (
      !joining
    ) {
      await ensureJoiningRecord({
        selectionId,

        actor,
      });

      joining =
        await Joining
          .findOne({
            selection:
              selectionId,
          });
    }

    if (
      !joining
    ) {
      throw new ApiError(
        404,
        "Joining record could not be created."
      );
    }

    if (
      [
        "DAY1_CONFIRMED",
        "COMPLETED",
        "DECLINED",
      ].includes(
        joining.status
      )
    ) {
      throw new ApiError(
        409,
        "This Joining record can no longer be updated using this action."
      );
    }

    const selection =
      await getSelection(
        selectionId
      );

    const user =
      actorId(
        actor
      );

    const now =
      new Date();

    const remarks =
      cleanText(
        body.remarks
      );

    const reason =
      cleanText(
        body.reason
      );

    /* =====================================================
       CONFIRM CURRENT DATE
    ===================================================== */

    if (
      action ===
      "CONFIRM_DATE"
    ) {
      joining.status =
        "CONFIRMED";

      joining
        .candidateConfirmedAt =
        now;

      joining
        .lastContactedAt =
        now;

      joining
        .nextFollowUpAt =
        null;

      joining.history.push({
        action:
          "DATE_CONFIRMED",

        joiningDate:
          joining
            .expectedJoiningDate,

        remarks,

        performedBy:
          user,

        at:
          now,
      });

      selection.status =
        "JOINING_PENDING";
    }

    /* =====================================================
       RESCHEDULE
    ===================================================== */

    if (
      action ===
      "RESCHEDULE"
    ) {
      const newDate =
        parseDate(
          body.joiningDate,
          "New joining date"
        );

      if (
        !newDate
      ) {
        throw new ApiError(
          400,
          "New joining date is required."
        );
      }

      if (
        !reason
      ) {
        throw new ApiError(
          400,
          "Reason is required when the joining date is rescheduled."
        );
      }

      const previousDate =
        joining
          .expectedJoiningDate;

      joining
        .expectedJoiningDate =
        newDate;

      joining.status =
        "RESCHEDULED";

      joining
        .candidateConfirmedAt =
        now;

      joining
        .lastContactedAt =
        now;

      joining
        .nextFollowUpAt =
        null;

      joining.history.push({
        action:
          "JOINING_RESCHEDULED",

        previousJoiningDate:
          previousDate,

        joiningDate:
          newDate,

        reason,

        remarks,

        performedBy:
          user,

        at:
          now,
      });

      selection
        .finalJoiningDate =
        newDate;

      selection.status =
        "JOINING_RESCHEDULED";
    }

    /* =====================================================
       FOLLOW-UP
    ===================================================== */

    if (
      action ===
      "FOLLOW_UP"
    ) {
      const nextFollowUp =
        parseDate(
          body.nextFollowUpAt,
          "Next follow-up"
        );

      joining.status =
        "FOLLOW_UP";

      joining
        .lastContactedAt =
        now;

      joining
        .nextFollowUpAt =
        nextFollowUp;

      joining.history.push({
        action:
          "FOLLOW_UP_REQUIRED",

        joiningDate:
          joining
            .expectedJoiningDate,

        reason,

        remarks,

        performedBy:
          user,

        metadata: {
          nextFollowUpAt:
            nextFollowUp,
        },

        at:
          now,
      });

      /*
       * Keep selection operationally pending.
       */
      selection.status =
        "JOINING_PENDING";
    }

    /* =====================================================
       NO SHOW
    ===================================================== */

    if (
      action ===
      "NO_SHOW"
    ) {
      joining.status =
        "NO_SHOW";

      joining.noShowAt =
        now;

      joining
        .lastContactedAt =
        now;

      joining.history.push({
        action:
          "NO_SHOW",

        joiningDate:
          joining
            .expectedJoiningDate,

        reason,

        remarks,

        performedBy:
          user,

        at:
          now,
      });

      selection.status =
        "NO_SHOW";
    }

    /* =====================================================
       DECLINED
    ===================================================== */

    if (
      action ===
      "DECLINED"
    ) {
      if (
        !reason
      ) {
        throw new ApiError(
          400,
          "Reason is required when candidate joining is declined."
        );
      }

      joining.status =
        "DECLINED";

      joining.declinedAt =
        now;

      joining.declinedReason =
        reason;

      joining
        .lastContactedAt =
        now;

      joining.history.push({
        action:
          "JOINING_DECLINED",

        joiningDate:
          joining
            .expectedJoiningDate,

        reason,

        remarks,

        performedBy:
          user,

        at:
          now,
      });

      selection.status =
        "JOINING_DECLINED";

      selection.closedAt =
        now;

      selection.closedReason =
        reason;

      selection.isActive =
        false;
    }

    joining.updatedBy =
      user;

    selection.updatedBy =
      user;

    await joining.save();

    await selection.save();

    return populateJoining(
      Joining
        .findById(
          joining._id
        )
    );
  };

/* =========================================================
   CONFIRM DAY 1
========================================================= */

const confirmDay1 =
  async ({
    selectionId,
    body =
      {},
    actor =
      null,
  }) => {
    const joining =
      await Joining
        .findOne({
          selection:
            selectionId,
        });

    if (
      !joining
    ) {
      throw new ApiError(
        404,
        "Joining record not found."
      );
    }

    if (
      joining.status ===
      "DECLINED"
    ) {
      throw new ApiError(
        409,
        "Candidate has already declined joining."
      );
    }

    if (
      joining.status ===
      "COMPLETED"
    ) {
      return populateJoining(
        Joining
          .findById(
            joining._id
          )
      );
    }

    const actualJoiningDate =
      parseDate(
        body.actualJoiningDate ||
        new Date(),
        "Actual joining date"
      );

    const remarks =
      cleanText(
        body.remarks
      );

    const user =
      actorId(
        actor
      );

    const now =
      new Date();

    joining.actualJoiningDate =
      actualJoiningDate;

    joining.status =
      "DAY1_CONFIRMED";

    joining.day1ConfirmedAt =
      now;

    joining.day1ConfirmedBy =
      user;

    joining.updatedBy =
      user;

    joining.history.push({
      action:
        "DAY1_CONFIRMED",

      previousJoiningDate:
        joining
          .expectedJoiningDate,

      joiningDate:
        actualJoiningDate,

      remarks,

      performedBy:
        user,

      at:
        now,
    });

    /*
     * Employee creation starts after this.
     *
     * We intentionally mark it PENDING but do not guess the
     * Employee schema.
     */
    joining.employeeCreationStatus =
      "PENDING";

    joining.employeeCreationError =
      "";

    await joining.save();

    const selection =
      await Selection
        .findById(
          selectionId
        );

    if (
      selection
    ) {
      selection.status =
        "JOINING_CONFIRMED";

      selection.finalJoiningDate =
        actualJoiningDate;

      selection.joiningConfirmedAt =
        now;

      selection.updatedBy =
        user;

      await selection.save();
    }

    return populateJoining(
      Joining
        .findById(
          joining._id
        )
    );
  };

/* =========================================================
   LINK CREATED EMPLOYEE

   After we wire your Employee service, the employee service
   will call this automatically.

   For now this endpoint also lets us safely finish the
   recruitment once an employee record exists.
========================================================= */

const linkEmployee =
  async ({
    selectionId,
    employeeId,
    actor =
      null,
  }) => {
    if (
      !validId(
        employeeId
      )
    ) {
      throw new ApiError(
        400,
        "Valid Employee ID is required."
      );
    }

    const joining =
      await Joining
        .findOne({
          selection:
            selectionId,
        });

    if (
      !joining
    ) {
      throw new ApiError(
        404,
        "Joining record not found."
      );
    }

    if (
      joining.status !==
        "DAY1_CONFIRMED" &&
      joining.status !==
        "COMPLETED"
    ) {
      throw new ApiError(
        409,
        "Day 1 must be confirmed before linking the Employee record."
      );
    }

    const user =
      actorId(
        actor
      );

    const now =
      new Date();

    joining.employee =
      employeeId;

    joining.employeeCreationStatus =
      "CREATED";

    joining.employeeCreationError =
      "";

    joining.status =
      "COMPLETED";

    joining.completedAt =
      now;

    joining.updatedBy =
      user;

    joining.history.push({
      action:
        "EMPLOYEE_CREATED",

      joiningDate:
        joining
          .actualJoiningDate,

      performedBy:
        user,

      metadata: {
        employeeId,
      },

      at:
        now,
    });

    joining.history.push({
      action:
        "JOINING_COMPLETED",

      joiningDate:
        joining
          .actualJoiningDate,

      performedBy:
        user,

      remarks:
        "Recruitment lifecycle completed and Employee record linked.",

      at:
        now,
    });

    await joining.save();

    const selection =
      await Selection
        .findById(
          selectionId
        );

    if (
      selection
    ) {
      selection.status =
        "COMPLETED";

      selection.updatedBy =
        user;

      await selection.save();
    }

    return populateJoining(
      Joining
        .findById(
          joining._id
        )
    );
  };

/* =========================================================
   SUMMARY
========================================================= */

const getJoiningSummary =
  async () => {
    const rows =
      await Joining.aggregate([
        {
          $group: {
            _id:
              "$status",

            count: {
              $sum:
                1,
            },
          },
        },
      ]);

    const counts =
      {};

    for (
      const row
      of rows
    ) {
      counts[
        row._id
      ] =
        row.count;
    }

    const todayStart =
      new Date();

    todayStart.setHours(
      0,
      0,
      0,
      0
    );

    const todayEnd =
      new Date(
        todayStart
      );

    todayEnd.setDate(
      todayEnd.getDate() +
        1
    );

    const joiningToday =
      await Joining.countDocuments({
        expectedJoiningDate: {
          $gte:
            todayStart,

          $lt:
            todayEnd,
        },

        status: {
          $nin: [
            "DECLINED",
            "COMPLETED",
          ],
        },
      });

    return {
      pending:
        (
          counts.PENDING ||
          0
        ) +
        (
          counts.CONFIRMED ||
          0
        ),

      rescheduled:
        counts.RESCHEDULED ||
        0,

      followUp:
        counts.FOLLOW_UP ||
        0,

      noShow:
        counts.NO_SHOW ||
        0,

      joined:
        (
          counts.DAY1_CONFIRMED ||
          0
        ) +
        (
          counts.COMPLETED ||
          0
        ),

      declined:
        counts.DECLINED ||
        0,

      joiningToday,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  ensureJoiningRecord,

  getJoiningBySelection,

  getJoiningReadiness,

  updateJoining,

  confirmDay1,

  linkEmployee,

  getJoiningSummary,
};