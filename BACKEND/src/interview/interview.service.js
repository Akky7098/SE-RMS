const crypto =
  require("crypto");

const mongoose =
  require("mongoose");

const {
  Interview,
} =
  require(
    "./interview.model"
  );

const {
  InterviewEvaluation,
  RECOMMENDATIONS,
  FINAL_DECISIONS,
} =
  require(
    "./interviewEvaluation.model"
  );

const {
  Candidate,
} =
  require(
    "../recruitment/candidate.model"
  );

const {
  RecruitmentActivity,
} =
  require(
    "../recruitment/recruitmentActivity.model"
  );

const {
  ManpowerRequirement,
} =
  require(
    "../manpower/manpowerRequirement.model"
  );

const {
  DepartmentMembership,
} =
  require(
    "../department/departmentMembership.model"
  );

const UserModule =
  require(
    "../user/user.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

const {
  sendInterviewScheduledEmails,
} =
  require(
    "./interviewMail.service"
  );

const {
  sendInterviewCheckInWelcomeEmail,
} =
  require(
    "./interviewCheckInMail.service"
  );

const {
  makeAttachmentPermanent,
  removeTemporaryAttachment,
  getTemporaryFilePath,
  getPermanentAttachmentPath,
} =
  require(
    "./interviewEvaluationStorage.service"
  );

const User =
  UserModule.User ||
  UserModule;

/* =========================================================
   ACTIVE INTERVIEW STATUS
========================================================= */

const ACTIVE_INTERVIEW_STATUSES = [
  "SCHEDULED",
  "RESCHEDULED",
  "CHECKED_IN",
];

/* =========================================================
   SYSTEM SUPER ADMIN QUERY
========================================================= */

const globalSuperAdminQuery =
  () => ({
    status:
      "ACTIVE",

    $or: [
      {
        systemRole:
          "SUPER_ADMIN",
      },

      {
        role:
          "SUPER_ADMIN",
      },
    ],
  });

/* =========================================================
   INTERVIEW NUMBER
========================================================= */

const generateInterviewNumber =
  async () => {
    const year =
      new Date()
        .getFullYear();

    const prefix =
      `INT-${year}-`;

    const latest =
      await Interview
        .findOne({
          interviewNumber: {
            $regex:
              `^${prefix}`,
          },
        })
        .sort({
          interviewNumber:
            -1,
        })
        .select(
          "interviewNumber"
        )
        .lean();

    let next =
      1;

    if (
      latest
        ?.interviewNumber
    ) {
      const pieces =
        latest
          .interviewNumber
          .split(
            "-"
          );

      const number =
        Number(
          pieces[
            pieces.length -
              1
          ]
        );

      if (
        Number.isFinite(
          number
        )
      ) {
        next =
          number +
          1;
      }
    }

    return (
      prefix +
      String(
        next
      ).padStart(
        6,
        "0"
      )
    );
  };

/* =========================================================
   CANDIDATE
========================================================= */

const getCandidateForInterview =
  async (
    candidateId
  ) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          candidateId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid candidate ID"
      );
    }

    const candidate =
      await Candidate
        .findById(
          candidateId
        )
        .populate(
          "department",
          "name code slug status"
        )
        .populate(
          "manpowerRequirement"
        );

    if (
      !candidate
    ) {
      throw new ApiError(
        404,
        "Candidate not found"
      );
    }

    return candidate;
  };

/* =========================================================
   INTERVIEWER DIRECTORY
========================================================= */

const getEligibleInterviewers =
  async (
    departmentId
  ) => {
    if (
      !departmentId
    ) {
      return [];
    }

    const memberships =
      await DepartmentMembership
        .find({
          department:
            departmentId,

          status:
            "ACTIVE",
        })
        .populate({
          path:
            "user",

          select:
            "_id displayName email status role systemRole",

          match: {
            status:
              "ACTIVE",
          },
        })
        .lean();

    const departmentUsers =
      memberships
        .map(
          (
            membership
          ) =>
            membership.user
        )
        .filter(
          Boolean
        );

    const globalSuperAdmins =
      await User
        .find(
          globalSuperAdminQuery()
        )
        .select(
          "_id displayName email status role systemRole"
        )
        .lean();

    const unique =
      new Map();

    [
      ...departmentUsers,
      ...globalSuperAdmins,
    ].forEach(
      (
        user
      ) => {
        const id =
          String(
            user?._id ||
              ""
          );

        if (
          !id
        ) {
          return;
        }

        unique.set(
          id,
          user
        );
      }
    );

    return Array.from(
      unique.values()
    )
      .filter(
        (
          user
        ) =>
          Boolean(
            user
              ?.displayName
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          String(
            a.displayName
          ).localeCompare(
            String(
              b.displayName
            ),
            "en",
            {
              sensitivity:
                "base",
            }
          )
      )
      .map(
        (
          user
        ) => ({
          _id:
            user._id,

          displayName:
            user.displayName,

          email:
            user.email ||
            "",
        })
      );
  };

/* =========================================================
   META
========================================================= */

const getInterviewMeta =
  async ({
    candidateId,
  } = {}) => {
    const modes = [
      "IN_PERSON",
      "ONLINE",
      "PHONE",
    ];

    const officeLocations = [
      {
        value:
          "DELHI",

        label:
          process.env
            .INTERVIEW_OFFICE_DELHI_NAME ||
          "Delhi Office",

        address:
          process.env
            .INTERVIEW_OFFICE_DELHI_ADDRESS ||
          "",
      },

      {
        value:
          "SONIPAT",

        label:
          process.env
            .INTERVIEW_OFFICE_SONIPAT_NAME ||
          "Sonipat Office",

        address:
          process.env
            .INTERVIEW_OFFICE_SONIPAT_ADDRESS ||
          "",
      },
    ];

    const durations = [
      30,
      45,
      60,
      90,
    ];

    if (
      !candidateId
    ) {
      return {
        interviewers:
          [],

        modes,

        officeLocations,

        durations,
      };
    }

    const candidate =
      await getCandidateForInterview(
        candidateId
      );

    const departmentId =
      candidate
        ?.department
        ?._id ||
      candidate
        ?.department;

    const interviewers =
      await getEligibleInterviewers(
        departmentId
      );

    return {
      candidate: {
        _id:
          candidate._id,

        candidateNumber:
          candidate.candidateNumber,

        fullName:
          candidate.fullName,

        positionTitle:
          candidate.positionTitle,

        department:
          candidate.department,
      },

      interviewers,

      modes,

      officeLocations,

      durations,
    };
  };

/* =========================================================
   VERIFY INTERVIEWER
========================================================= */

const verifyEligibleInterviewer =
  async ({
    interviewerId,
    departmentId,
  }) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          interviewerId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid interviewer"
      );
    }

    const user =
      await User
        .findOne({
          _id:
            interviewerId,

          status:
            "ACTIVE",
        })
        .select(
          "_id displayName email status role systemRole"
        )
        .lean();

    if (
      !user
    ) {
      throw new ApiError(
        404,
        "Selected interviewer was not found or is inactive"
      );
    }

    const globalSuperAdmin =
      user.systemRole ===
        "SUPER_ADMIN" ||
      user.role ===
        "SUPER_ADMIN";

    if (
      globalSuperAdmin
    ) {
      return user;
    }

    const membership =
      await DepartmentMembership
        .findOne({
          user:
            user._id,

          department:
            departmentId,

          status:
            "ACTIVE",
        })
        .lean();

    if (
      !membership
    ) {
      throw new ApiError(
        403,
        "Selected interviewer does not belong to the candidate's department"
      );
    }

    return user;
  };

/* =========================================================
   SCHEDULE VALIDATION
========================================================= */

const validateScheduleInput =
  (
    body
  ) => {
    const roundNumber =
      Number(
        body.roundNumber ||
          1
      );

    const roundName =
      String(
        body.roundName ||
          ""
      ).trim();

    const mode =
      String(
        body.mode ||
          ""
      )
        .trim()
        .toUpperCase();

    const scheduledAt =
      new Date(
        body.scheduledAt
      );

    const durationMinutes =
      Number(
        body.durationMinutes ||
          45
      );

    const interviewer =
      String(
        body.interviewer ||
          ""
      ).trim();

    if (
      !Number.isFinite(
        roundNumber
      ) ||
      roundNumber <
        1
    ) {
      throw new ApiError(
        400,
        "Invalid interview round"
      );
    }

    if (
      !roundName ||
      roundName.length <
        2
    ) {
      throw new ApiError(
        400,
        "Interview round name is required"
      );
    }

    if (
      roundName.length >
      80
    ) {
      throw new ApiError(
        400,
        "Interview round name cannot exceed 80 characters"
      );
    }

    if (
      ![
        "IN_PERSON",
        "ONLINE",
        "PHONE",
      ].includes(
        mode
      )
    ) {
      throw new ApiError(
        400,
        "Invalid interview mode"
      );
    }

    if (
      Number.isNaN(
        scheduledAt.getTime()
      )
    ) {
      throw new ApiError(
        400,
        "Invalid interview date and time"
      );
    }

    if (
      scheduledAt.getTime() <=
      Date.now()
    ) {
      throw new ApiError(
        400,
        "Interview date and time must be in the future"
      );
    }

    if (
      !Number.isFinite(
        durationMinutes
      ) ||
      durationMinutes <
        15 ||
      durationMinutes >
        240
    ) {
      throw new ApiError(
        400,
        "Interview duration must be between 15 and 240 minutes"
      );
    }

    if (
      !interviewer
    ) {
      throw new ApiError(
        400,
        "Interviewer is required"
      );
    }

    const officeLocation =
      String(
        body.officeLocation ||
          ""
      ).trim();

    const meetingLink =
      String(
        body.meetingLink ||
          ""
      ).trim();

    if (
      mode ===
        "IN_PERSON" &&
      !officeLocation
    ) {
      throw new ApiError(
        400,
        "Office location is required for an in-person interview"
      );
    }

    if (
      mode ===
      "ONLINE"
    ) {
      if (
        !meetingLink
      ) {
        throw new ApiError(
          400,
          "Meeting link is required for an online interview"
        );
      }

      try {
        const parsed =
          new URL(
            meetingLink
          );

        if (
          ![
            "http:",
            "https:",
          ].includes(
            parsed.protocol
          )
        ) {
          throw new Error();
        }
      } catch {
        throw new ApiError(
          400,
          "Invalid online meeting link"
        );
      }
    }

    return {
      roundNumber,

      roundName,

      mode,

      officeLocation,

      meetingLink,

      scheduledAt,

      durationMinutes,

      interviewer,

      timezone:
        String(
          body.timezone ||
            "Asia/Kolkata"
        ).trim(),

      remarks:
        String(
          body.remarks ||
            ""
        )
          .trim()
          .slice(
            0,
            1000
          ),
    };
  };

/* =========================================================
   DUPLICATE CHECK
========================================================= */

const assertNoActiveInterview =
  async (
    candidateId
  ) => {
    const existing =
      await Interview
        .findOne({
          candidate:
            candidateId,

          status: {
            $in:
              ACTIVE_INTERVIEW_STATUSES,
          },

          isActive: {
            $ne:
              false,
          },
        })
        .sort({
          scheduledAt:
            -1,
        })
        .lean();

    if (
      existing
    ) {
      throw new ApiError(
        409,
        "An active interview already exists for this candidate. Please manage or reschedule the existing interview."
      );
    }
  };

/* =========================================================
   ACTIVITY
========================================================= */

const createInterviewActivity =
  async ({
    candidate,
    interview,
    user,
  }) => {
    try {
      await RecruitmentActivity
        .create({
          candidate:
            candidate._id,

          manpowerRequirement:
            candidate
              .manpowerRequirement
              ?._id ||
            candidate
              .manpowerRequirement,

          type:
            "INTERVIEW_SCHEDULED",

          title:
            "Interview scheduled",

          remarks:
            `${interview.roundName} scheduled for ${interview.scheduledAt.toISOString()}`,

          previousStatus:
            candidate.status,

          newStatus:
            "INTERVIEW_SCHEDULED",

          nextAction:
            "WAIT_FOR_INTERVIEW",

          nextActionAt:
            interview
              .scheduledAt,

          performedBy:
            user._id,

          metadata: {
            interviewId:
              interview._id,

            interviewNumber:
              interview
                .interviewNumber,

            roundNumber:
              interview
                .roundNumber,

            roundName:
              interview
                .roundName,

            interviewer:
              interview
                .interviewer,

            mode:
              interview
                .mode,
          },
        });
    } catch (
      error
    ) {
      console.error(
        "[Interview] Activity creation failed:",
        error
      );
    }
  };

/* =========================================================
   APPLY EMAIL RESULT
========================================================= */

const applyEmailResult =
  (
    target,
    email,
    result
  ) => {
    target.email =
      email ||
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
      result?.skipped
        ? "NOT_SENT"
        : "FAILED";

    target.failedAt =
      result?.skipped
        ? null
        : new Date();

    target.messageId =
      "";

    target.error =
      result?.error ||
      "Email could not be sent";
  };

/* =========================================================
   SCHEDULE INTERVIEW
========================================================= */

const scheduleInterview =
  async ({
    candidateId,
    body,
    user,
  }) => {
    const candidate =
      await getCandidateForInterview(
        candidateId
      );

    const allowedCandidateStatuses = [
      "SHORTLISTED",
      "INTERVIEW_PENDING",
      "INTERVIEWED",
    ];

    if (
      !allowedCandidateStatuses.includes(
        String(
          candidate.status ||
            ""
        ).toUpperCase()
      )
    ) {
      throw new ApiError(
        409,
        "Candidate must be shortlisted before an interview can be scheduled"
      );
    }

    await assertNoActiveInterview(
      candidate._id
    );

    const input =
      validateScheduleInput(
        body
      );

    const departmentId =
      candidate
        ?.department
        ?._id ||
      candidate
        ?.department;

    if (
      !departmentId
    ) {
      throw new ApiError(
        400,
        "Candidate department is missing"
      );
    }

    const interviewer =
      await verifyEligibleInterviewer({
        interviewerId:
          input.interviewer,

        departmentId,
      });

    const requirement =
      candidate
        .manpowerRequirement ||
      await ManpowerRequirement
        .findById(
          candidate
            .manpowerRequirement
        )
        .lean();

    const interviewNumber =
      await generateInterviewNumber();

    const checkInToken =
      crypto
        .randomBytes(
          24
        )
        .toString(
          "hex"
        );

    const interview =
      await Interview.create({
        interviewNumber,

        candidate:
          candidate._id,

        manpowerRequirement:
          requirement
            ?._id ||
          candidate
            .manpowerRequirement,

        department:
          departmentId,

        positionTitle:
          candidate
            .positionTitle ||
          requirement
            ?.positionTitle ||
          "Position",

        roundNumber:
          input.roundNumber,

        roundName:
          input.roundName,

        mode:
          input.mode,

        officeLocation:
          input.mode ===
          "IN_PERSON"
            ? input.officeLocation
            : "",

        meetingLink:
          input.mode ===
          "ONLINE"
            ? input.meetingLink
            : "",

        scheduledAt:
          input.scheduledAt,

        timezone:
          input.timezone,

        durationMinutes:
          input.durationMinutes,

        interviewer:
          interviewer._id,

        status:
          "SCHEDULED",

        remarks:
          input.remarks,

        checkInToken,

        candidateEmail: {
          status:
            "PENDING",

          email:
            candidate.email ||
            "",
        },

        interviewerEmail: {
          status:
            "PENDING",

          email:
            interviewer.email ||
            "",
        },

        createdBy:
          user._id,

        updatedBy:
          user._id,
      });

    const previousCandidateStatus =
      candidate.status;

    candidate.status =
      "INTERVIEW_SCHEDULED";

    candidate.nextAction =
      "WAIT_FOR_INTERVIEW";

    candidate.nextActionAt =
      input.scheduledAt;

    candidate.updatedBy =
      user._id;

    await candidate.save();

    await createInterviewActivity({
      candidate: {
        ...candidate.toObject(),

        status:
          previousCandidateStatus,
      },

      interview,

      user,
    });

    const mailResult =
      await sendInterviewScheduledEmails({
        candidate:
          candidate.toObject(),

        interview:
          interview.toObject(),

        interviewer,

        requirement:
          requirement?.toObject
            ? requirement.toObject()
            : requirement,
      });

    applyEmailResult(
      interview.candidateEmail,
      candidate.email,
      mailResult.candidate
    );

    applyEmailResult(
      interview.interviewerEmail,
      interviewer.email,
      mailResult.interviewer
    );

    await interview.save();

    return getInterviewById(
      interview._id
    );
  };

/* =========================================================
   LIST
========================================================= */

const getInterviews =
  async (
    query = {}
  ) => {
    const filter = {
      isActive: {
        $ne:
          false,
      },
    };

    if (
      query.candidate
    ) {
      filter.candidate =
        query.candidate;
    }

    if (
      query.status
    ) {
      filter.status =
        String(
          query.status
        )
          .trim()
          .toUpperCase();
    }

    if (
      query.interviewer
    ) {
      filter.interviewer =
        query.interviewer;
    }

    if (
      query.department
    ) {
      filter.department =
        query.department;
    }

    return Interview
      .find(
        filter
      )
      .populate(
        "candidate",
        "candidateNumber fullName email mobile status"
      )
      .populate(
        "department",
        "name code"
      )
      .populate(
        "interviewer",
        "displayName email"
      )
      .sort({
        scheduledAt:
          1,
      })
      .lean();
  };

/* =========================================================
   DETAIL
========================================================= */

const getInterviewById =
  async (
    interviewId
  ) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          interviewId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid interview ID"
      );
    }

    const interview =
      await Interview
        .findById(
          interviewId
        )
        .populate(
          "candidate"
        )
        .populate(
          "department",
          "name code"
        )
        .populate(
          "interviewer",
          "displayName email"
        )
        .populate(
          "manpowerRequirement"
        )
        .populate(
          "createdBy",
          "displayName email"
        )
        .populate(
          "updatedBy",
          "displayName email"
        )
        .lean();

    if (
      !interview
    ) {
      throw new ApiError(
        404,
        "Interview not found"
      );
    }

    return interview;
  };

/* =========================================================
   RESCHEDULE
========================================================= */

const rescheduleInterview =
  async ({
    interviewId,
    body,
    user,
  }) => {
    const interview =
      await Interview
        .findById(
          interviewId
        );

    if (
      !interview
    ) {
      throw new ApiError(
        404,
        "Interview not found"
      );
    }

    if (
      [
        "COMPLETED",
        "CANCELLED",
      ].includes(
        interview.status
      )
    ) {
      throw new ApiError(
        409,
        "This interview cannot be rescheduled"
      );
    }

    const newDate =
      new Date(
        body.scheduledAt
      );

    if (
      Number.isNaN(
        newDate.getTime()
      ) ||
      newDate.getTime() <=
        Date.now()
    ) {
      throw new ApiError(
        400,
        "New interview date and time must be in the future"
      );
    }

    interview
      .rescheduleHistory
      .push({
        previousScheduledAt:
          interview.scheduledAt,

        newScheduledAt:
          newDate,

        reason:
          String(
            body.reason ||
              body.remarks ||
              ""
          ).trim(),

        changedBy:
          user._id,

        changedAt:
          new Date(),
      });

    interview.scheduledAt =
      newDate;

    interview.status =
      "RESCHEDULED";

    interview.updatedBy =
      user._id;

    await interview.save();

    return getInterviewById(
      interview._id
    );
  };

/* =========================================================
   CANCEL
========================================================= */

const cancelInterview =
  async ({
    interviewId,
    body,
    user,
  }) => {
    const interview =
      await Interview
        .findById(
          interviewId
        );

    if (
      !interview
    ) {
      throw new ApiError(
        404,
        "Interview not found"
      );
    }

    if (
      interview.status ===
      "COMPLETED"
    ) {
      throw new ApiError(
        409,
        "Completed interview cannot be cancelled"
      );
    }

    interview.status =
      "CANCELLED";

    interview.cancelledAt =
      new Date();

    interview.cancelledBy =
      user._id;

    interview.cancellationReason =
      String(
        body.reason ||
          body.remarks ||
          ""
      ).trim();

    interview.updatedBy =
      user._id;

    await interview.save();

    const candidate =
      await Candidate
        .findById(
          interview.candidate
        );

    if (
      candidate &&
      candidate.status ===
        "INTERVIEW_SCHEDULED"
    ) {
      candidate.status =
        "INTERVIEW_PENDING";

      candidate.nextAction =
        "SCHEDULE_INTERVIEW";

      candidate.nextActionAt =
        null;

      candidate.updatedBy =
        user._id;

      await candidate.save();
    }

    return getInterviewById(
      interview._id
    );
  };

/* =========================================================
   INTERVIEW DATE KEY
========================================================= */

const getInterviewDateKey =
  (
    value,
    timezone =
      "Asia/Kolkata"
  ) => {
    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const parts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            timezone,

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",
        }
      ).formatToParts(
        date
      );

    const values =
      {};

    parts.forEach(
      (
        part
      ) => {
        if (
          part.type !==
          "literal"
        ) {
          values[
            part.type
          ] =
            part.value;
        }
      }
    );

    if (
      !values.year ||
      !values.month ||
      !values.day
    ) {
      return "";
    }

    return `${values.year}-${values.month}-${values.day}`;
  };

/* =========================================================
   CHECK-IN DATE VALIDATION
========================================================= */

const assertInterviewCheckInDate =
  (
    interview
  ) => {
    const timezone =
      String(
        interview
          ?.timezone ||
          "Asia/Kolkata"
      ).trim();

    const interviewDateKey =
      getInterviewDateKey(
        interview
          ?.scheduledAt,
        timezone
      );

    const todayDateKey =
      getInterviewDateKey(
        new Date(),
        timezone
      );

    if (
      !interviewDateKey ||
      !todayDateKey
    ) {
      throw new ApiError(
        400,
        "Interview schedule is invalid. Please reschedule the interview."
      );
    }

    if (
      todayDateKey <
      interviewDateKey
    ) {
      const readableDate =
        new Intl.DateTimeFormat(
          "en-IN",
          {
            timeZone:
              timezone,

            weekday:
              "long",

            day:
              "2-digit",

            month:
              "long",

            year:
              "numeric",
          }
        ).format(
          new Date(
            interview
              .scheduledAt
          )
        );

      throw new ApiError(
        409,
        `Candidate check-in is available only on the interview date (${readableDate}).`
      );
    }

    if (
      todayDateKey >
      interviewDateKey
    ) {
      throw new ApiError(
        409,
        "The scheduled interview date has passed. Please reschedule the interview before checking in the candidate."
      );
    }
  };

/* =========================================================
   CHECK-IN
========================================================= */

const checkInInterview =
  async ({
    interviewId,
    user,
  }) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          interviewId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid interview ID"
      );
    }

    const interview =
      await Interview
        .findById(
          interviewId
        );

    if (
      !interview
    ) {
      throw new ApiError(
        404,
        "Interview not found"
      );
    }

    if (
      ![
        "SCHEDULED",
        "RESCHEDULED",
      ].includes(
        String(
          interview.status ||
            ""
        ).toUpperCase()
      )
    ) {
      if (
        interview.status ===
        "CHECKED_IN"
      ) {
        throw new ApiError(
          409,
          "Candidate has already been checked in for this interview"
        );
      }

      throw new ApiError(
        409,
        "Interview cannot be checked in at the current stage"
      );
    }

    assertInterviewCheckInDate(
      interview
    );

    const candidate =
      await Candidate
        .findById(
          interview.candidate
        )
        .lean();

    if (
      !candidate
    ) {
      throw new ApiError(
        404,
        "Candidate linked with this interview was not found"
      );
    }

    const checkedInAt =
      new Date();

    interview.status =
      "CHECKED_IN";

    interview.checkedInAt =
      checkedInAt;

    interview.checkedInBy =
      user._id;

    interview.updatedBy =
      user._id;

    if (
      interview
        .checkInWelcomeEmail
    ) {
      interview
        .checkInWelcomeEmail
        .status =
          candidate.email
            ? "PENDING"
            : "NOT_SENT";

      interview
        .checkInWelcomeEmail
        .email =
          candidate.email ||
          "";
    }

    await interview.save();

    try {
      const welcomeMailResult =
        await sendInterviewCheckInWelcomeEmail({
          candidate,

          interview:
            interview.toObject(),
        });

      if (
        interview
          .checkInWelcomeEmail
      ) {
        applyEmailResult(
          interview
            .checkInWelcomeEmail,
          candidate.email,
          welcomeMailResult
        );

        await interview.save();
      }
    } catch (
      mailError
    ) {
      console.error(
        "[Interview] Check-in welcome mail failed:",
        mailError
      );
    }

    try {
      await RecruitmentActivity
        .create({
          candidate:
            candidate._id,

          manpowerRequirement:
            interview
              .manpowerRequirement,

          type:
            "INTERVIEW_CHECKED_IN",

          title:
            "Candidate checked in",

          remarks:
            `${candidate.fullName || "Candidate"} checked in for ${interview.roundName || "interview"}`,

          previousStatus:
            candidate.status,

          newStatus:
            candidate.status,

          nextAction:
            candidate
              .nextAction ||
            "WAIT_FOR_INTERVIEW",

          nextActionAt:
            candidate
              .nextActionAt ||
            interview
              .scheduledAt,

          performedBy:
            user._id,

          metadata: {
            interviewId:
              interview._id,

            interviewNumber:
              interview
                .interviewNumber,

            checkedInAt,
          },
        });
    } catch (
      activityError
    ) {
      console.error(
        "[Interview] Check-in activity creation failed:",
        activityError
      );
    }

    return getInterviewById(
      interview._id
    );
  };

/* =========================================================
   EVALUATION VALIDATION
========================================================= */

const validateEvaluationInput =
  (
    body = {}
  ) => {
    const ratingFields = [
      "technicalSkills",
      "relevantExperience",
      "communication",
      "problemSolving",
      "roleFit",
      "professionalism",
      "overallRating",
    ];

    const ratings =
      {};

    ratingFields.forEach(
      (
        field
      ) => {
        const value =
          Number(
            body[
              field
            ]
          );

        if (
          !Number.isFinite(
            value
          ) ||
          value <
            1 ||
          value >
            5
        ) {
          throw new ApiError(
            400,
            `${field} must be between 1 and 5`
          );
        }

        ratings[
          field
        ] =
          value;
      }
    );

    const recommendation =
      String(
        body.recommendation ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !RECOMMENDATIONS.includes(
        recommendation
      )
    ) {
      throw new ApiError(
        400,
        "Invalid interview recommendation"
      );
    }

    const finalDecision =
      String(
        body.finalDecision ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !FINAL_DECISIONS.includes(
        finalDecision
      )
    ) {
      throw new ApiError(
        400,
        "Invalid final interview decision"
      );
    }

    return {
      ...ratings,

      recommendation,

      finalDecision,

      strengths:
        String(
          body.strengths ||
            ""
        )
          .trim()
          .slice(
            0,
            3000
          ),

      concerns:
        String(
          body.concerns ||
            ""
        )
          .trim()
          .slice(
            0,
            3000
          ),

      remarks:
        String(
          body.remarks ||
            ""
        )
          .trim()
          .slice(
            0,
            3000
          ),
    };
  };

/* =========================================================
   PREPARE TEMP EVALUATION ATTACHMENT
========================================================= */

const prepareEvaluationAttachment =
  async ({
    interviewId,
    file,
    user,
  }) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          interviewId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid interview ID"
      );
    }

    const interview =
      await Interview
        .findById(
          interviewId
        )
        .lean();

    if (
      !interview
    ) {
      throw new ApiError(
        404,
        "Interview not found"
      );
    }

    if (
      String(
        interview.status ||
          ""
      ).toUpperCase() !==
      "CHECKED_IN"
    ) {
      throw new ApiError(
        409,
        "Candidate must be checked in before evaluation documents can be uploaded."
      );
    }

    if (
      !file
    ) {
      throw new ApiError(
        400,
        "Please select a PDF, JPG or PNG document."
      );
    }

    return {
      storedName:
        file.filename,

      originalName:
        file.originalname,

      mimeType:
        file.mimetype,

      size:
        file.size,

      interviewId:
        String(
          interview._id
        ),

      uploadedBy:
        user?._id ||
        null,
    };
  };

/* =========================================================
   REMOVE TEMP ATTACHMENT
========================================================= */

const removeEvaluationAttachment =
  async ({
    interviewId,
    storedName,
  }) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          interviewId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid interview ID"
      );
    }

    if (
      !storedName
    ) {
      throw new ApiError(
        400,
        "Evaluation document reference is missing"
      );
    }

    const interview =
      await Interview
        .findById(
          interviewId
        )
        .select(
          "_id status"
        )
        .lean();

    if (
      !interview
    ) {
      throw new ApiError(
        404,
        "Interview not found"
      );
    }

    await removeTemporaryAttachment(
      storedName
    );

    return {
      removed:
        true,
    };
  };

/* =========================================================
   SUBMIT EVALUATION
========================================================= */

const submitInterviewEvaluation =
  async ({
    interviewId,
    body,
    user,
  }) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          interviewId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid interview ID"
      );
    }

    const interview =
      await Interview
        .findById(
          interviewId
        );

    if (
      !interview
    ) {
      throw new ApiError(
        404,
        "Interview not found"
      );
    }

    if (
      String(
        interview.status ||
          ""
      ).toUpperCase() !==
      "CHECKED_IN"
    ) {
      throw new ApiError(
        409,
        "Candidate must be checked in before interview evaluation can be completed."
      );
    }

    const existingEvaluation =
      await InterviewEvaluation
        .findOne({
          interview:
            interview._id,
        })
        .lean();

    if (
      existingEvaluation
    ) {
      throw new ApiError(
        409,
        "This interview has already been evaluated."
      );
    }

    const input =
      validateEvaluationInput(
        body
      );

    let attachment =
      null;

    const uploadedAttachment =
      body
        ?.attachment ||
      null;

    if (
      uploadedAttachment
        ?.storedName
    ) {
      attachment =
        await makeAttachmentPermanent({
          storedName:
            uploadedAttachment
              .storedName,

          originalName:
            uploadedAttachment
              .originalName,

          mimeType:
            uploadedAttachment
              .mimeType,

          size:
            uploadedAttachment
              .size,

          interviewId:
            interview._id,

          userId:
            user._id,
        });
    }

    const evaluation =
      await InterviewEvaluation
        .create({
          interview:
            interview._id,

          candidate:
            interview.candidate,

          manpowerRequirement:
            interview
              .manpowerRequirement,

          interviewer:
            interview
              .interviewer,

          technicalSkills:
            input
              .technicalSkills,

          relevantExperience:
            input
              .relevantExperience,

          communication:
            input
              .communication,

          problemSolving:
            input
              .problemSolving,

          roleFit:
            input
              .roleFit,

          professionalism:
            input
              .professionalism,

          overallRating:
            input
              .overallRating,

          recommendation:
            input
              .recommendation,

          finalDecision:
            input
              .finalDecision,

          strengths:
            input
              .strengths,

          concerns:
            input
              .concerns,

          remarks:
            input
              .remarks,

          attachment,

          evaluatedBy:
            user._id,

          evaluatedAt:
            new Date(),
        });

    interview.status =
      "COMPLETED";

    interview.completedAt =
      new Date();

    interview.updatedBy =
      user._id;

    await interview.save();

    const candidate =
      await Candidate
        .findById(
          interview.candidate
        );

    if (
      candidate
    ) {
      if (
        input.finalDecision ===
        "SELECTED"
      ) {
        candidate.status =
          "SELECTED";

        candidate.nextAction =
          "PREPARE_LOI";

        candidate.nextActionAt =
          null;
      } else if (
        input.finalDecision ===
        "REJECTED"
      ) {
        candidate.status =
          "REJECTED_INTERVIEW";

        candidate.nextAction =
          "NONE";

        candidate.nextActionAt =
          null;
      } else {
        candidate.status =
          "INTERVIEWED";

        candidate.nextAction =
          "NONE";

        candidate.nextActionAt =
          null;
      }

      candidate.updatedBy =
        user._id;

      await candidate.save();
    }

    try {
      await RecruitmentActivity
        .create({
          candidate:
            interview.candidate,

          manpowerRequirement:
            interview
              .manpowerRequirement,

          type:
            "INTERVIEW_EVALUATED",

          title:
            "Interview evaluation completed",

          remarks:
            input.remarks ||
            `Interview completed with ${input.finalDecision} decision.`,

          previousStatus:
            "INTERVIEW_SCHEDULED",

          newStatus:
            candidate
              ?.status ||
            "INTERVIEWED",

          nextAction:
            candidate
              ?.nextAction ||
            "NONE",

          nextActionAt:
            candidate
              ?.nextActionAt ||
            null,

          performedBy:
            user._id,

          metadata: {
            interviewId:
              interview._id,

            interviewNumber:
              interview
                .interviewNumber,

            recommendation:
              input
                .recommendation,

            finalDecision:
              input
                .finalDecision,

            overallRating:
              input
                .overallRating,

            attachmentName:
              attachment
                ?.originalName ||
              "",
          },
        });
    } catch (
      activityError
    ) {
      console.error(
        "[Interview] Evaluation activity creation failed:",
        activityError
      );
    }

    return InterviewEvaluation
      .findById(
        evaluation._id
      )
      .populate(
        "evaluatedBy",
        "displayName email"
      )
      .populate(
        "interviewer",
        "displayName email"
      )
      .lean();
  };

/* =========================================================
   GET EVALUATION
========================================================= */

const getInterviewEvaluation =
  async (
    interviewId
  ) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          interviewId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid interview ID"
      );
    }

    return InterviewEvaluation
      .findOne({
        interview:
          interviewId,
      })
      .populate(
        "evaluatedBy",
        "displayName email"
      )
      .populate(
        "interviewer",
        "displayName email"
      )
      .lean();
  };

/* =========================================================
   GET ATTACHMENT
========================================================= */

const getEvaluationAttachment =
  async ({
    interviewId,
    storedName,
    temporary = false,
  }) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          interviewId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid interview ID"
      );
    }

    if (
      temporary
    ) {
      if (
        !storedName
      ) {
        throw new ApiError(
          400,
          "Evaluation document reference is missing"
        );
      }

      const interview =
        await Interview
          .findById(
            interviewId
          )
          .select(
            "_id"
          )
          .lean();

      if (
        !interview
      ) {
        throw new ApiError(
          404,
          "Interview not found"
        );
      }

      return {
        path:
          getTemporaryFilePath(
            storedName
          ),

        originalName:
          storedName,
      };
    }

    const evaluation =
      await InterviewEvaluation
        .findOne({
          interview:
            interviewId,
        })
        .lean();

    if (
      !evaluation
    ) {
      throw new ApiError(
        404,
        "Interview evaluation was not found"
      );
    }

    if (
      !evaluation
        ?.attachment
        ?.storedName
    ) {
      throw new ApiError(
        404,
        "Evaluation document was not found"
      );
    }

    return {
      path:
        getPermanentAttachmentPath(
          interviewId,
          evaluation
            .attachment
            .storedName
        ),

      originalName:
        evaluation
          .attachment
          .originalName,

      mimeType:
        evaluation
          .attachment
          .mimeType,
    };
  };

/* =========================================================
   EXPORT — MUST REMAIN AT VERY END
========================================================= */

module.exports = {
  getInterviewMeta,

  getEligibleInterviewers,

  scheduleInterview,

  getInterviews,

  getInterviewById,

  rescheduleInterview,

  cancelInterview,

  checkInInterview,

  prepareEvaluationAttachment,

  removeEvaluationAttachment,

  submitInterviewEvaluation,

  getInterviewEvaluation,

  getEvaluationAttachment,
};