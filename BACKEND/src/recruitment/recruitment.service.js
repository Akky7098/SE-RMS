const mongoose =
  require("mongoose");

const {
  Candidate,
} = require(
  "./candidate.model"
);

const {
  CandidateScreening,
} = require(
  "./candidateScreening.model"
);

const {
  RecruitmentActivity,
} = require(
  "./recruitmentActivity.model"
);

const {
  makeResumePermanent,
} = require(
  "../resumeParser/resumeStorage.service"
);

const {
  ManpowerRequirement,
} = require(
  "../manpower/manpowerRequirement.model"
);

const ApiError =
  require(
    "../utils/ApiError"
  );

const {
  validateCreateCandidate,
  validateScreening,
  normalizeEmail,
  normalizeMobile,
} = require(
  "./recruitment.validation"
);

/* =========================================================
   WORKFLOW RULES
========================================================= */

const TERMINAL_STATUSES =
  new Set([
    "NOT_INTERESTED",
    "REJECTED_SCREENING",
    "REJECTED_INTERVIEW",
    "LOI_DECLINED",
    "OFFER_DECLINED",
    "JOINED",
    "CLOSED",
  ]);

const SELECTED_OR_LATER =
  new Set([
    "SELECTED",
    "LOI_PENDING",
    "LOI_SENT",
    "LOI_ACCEPTED",
    "OFFER_PENDING",
    "OFFER_SENT",
    "OFFER_ACCEPTED",
    "JOINING_CONFIRMED",
    "DOCUMENT_PENDING",
    "DOCUMENT_VERIFICATION",
    "READY_FOR_ONBOARDING",
    "JOINED",
  ]);

/* =========================================================
   NORMALIZE STATUS
========================================================= */

const normalizeStatus = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
};

/* =========================================================
   WORKFLOW ERROR
========================================================= */

const workflowError = (
  message
) => {
  throw new ApiError(
    409,
    message
  );
};

/* =========================================================
   ASSERT ACTION
========================================================= */

const assertCandidateActionAllowed = (
  candidate,
  action
) => {
  const status =
    normalizeStatus(
      candidate?.status
    );

  const normalizedAction =
    normalizeStatus(
      action
    );

  /* =====================================================
     TERMINAL
  ===================================================== */

  if (
    TERMINAL_STATUSES.has(
      status
    )
  ) {
    workflowError(
      `Candidate recruitment is already closed with status ${status.replaceAll(
        "_",
        " "
      )}`
    );
  }

  /* =====================================================
     CALL

     Calls may still be recorded during active recruitment.
  ===================================================== */

  if (
    normalizedAction ===
    "CALL"
  ) {
    return true;
  }

  /* =====================================================
     SCREENING
  ===================================================== */

  if (
    normalizedAction ===
    "SCREEN"
  ) {
    if (
      status !==
      "SCREENING_PENDING"
    ) {
      if (
        [
          "SCREENED",
          "SHORTLISTED",
          "INTERVIEW_PENDING",
          "INTERVIEW_SCHEDULED",
          "INTERVIEWED",
        ].includes(
          status
        )
      ) {
        workflowError(
          "Candidate screening has already been completed"
        );
      }

      workflowError(
        "Candidate must have a successful call before screening can be completed"
      );
    }

    return true;
  }

  /* =====================================================
     SHORTLIST
  ===================================================== */

  if (
    normalizedAction ===
    "SHORTLIST"
  ) {
    if (
      status ===
      "SHORTLISTED"
    ) {
      workflowError(
        "Candidate has already been shortlisted"
      );
    }

    if (
      [
        "INTERVIEW_PENDING",
        "INTERVIEW_SCHEDULED",
        "INTERVIEWED",
        "SELECTED",
      ].includes(
        status
      )
    ) {
      workflowError(
        "Candidate has already moved beyond the shortlist stage"
      );
    }

    if (
      status !==
      "SCREENED"
    ) {
      workflowError(
        "Complete candidate screening before shortlisting"
      );
    }

    return true;
  }

  /* =====================================================
     REJECT
  ===================================================== */

  if (
    normalizedAction ===
    "REJECT"
  ) {
    if (
      SELECTED_OR_LATER.has(
        status
      )
    ) {
      workflowError(
        "Candidate cannot be rejected from the screening workflow after selection"
      );
    }

    return true;
  }

  return true;
};

/* =========================================================
   CANDIDATE NUMBER
========================================================= */

const generateCandidateNumber =
  async () => {
    const year =
      new Date()
        .getFullYear();

    const prefix =
      `CAN-${year}-`;

    const latest =
      await Candidate
        .findOne({
          candidateNumber: {
            $regex:
              `^${prefix}`,
          },
        })
        .sort({
          candidateNumber:
            -1,
        })
        .select(
          "candidateNumber"
        )
        .lean();

    let next =
      1;

    if (
      latest
        ?.candidateNumber
    ) {
      const pieces =
        latest
          .candidateNumber
          .split("-");

      const lastNumber =
        Number(
          pieces[
            pieces.length -
              1
          ]
        );

      if (
        Number.isFinite(
          lastNumber
        )
      ) {
        next =
          lastNumber +
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
   ACTIVITY
========================================================= */

const createActivity =
  async ({
    candidate,
    type,
    title,
    remarks = "",
    outcome = "",
    previousStatus = "",
    newStatus = "",
    nextAction = "",
    nextActionAt = null,
    performedBy = null,
    metadata = null,
  }) => {
    return RecruitmentActivity
      .create({
        candidate:
          candidate._id,

        manpowerRequirement:
          candidate
            .manpowerRequirement,

        type,

        title,

        remarks,

        outcome,

        previousStatus,

        newStatus,

        nextAction,

        nextActionAt,

        performedBy,

        metadata,
      });
  };

/* =========================================================
   ACTIVE HIRING REQUIREMENT
========================================================= */

const getApprovedRequirement =
  async (
    requirementId
  ) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          requirementId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid manpower requirement"
      );
    }

    const requirement =
      await ManpowerRequirement
        .findById(
          requirementId
        )
        .lean();

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "Manpower requirement not found"
      );
    }

    if (
      requirement.status !==
      "HIRING_IN_PROGRESS"
    ) {
      throw new ApiError(
        400,
        "Candidates can only be added after the hiring process has been started"
      );
    }

    if (
      !requirement.assignedHr
    ) {
      throw new ApiError(
        400,
        "No HR hiring owner is assigned to this manpower requirement"
      );
    }

    return requirement;
  };

/* =========================================================
   DUPLICATE
========================================================= */

const findDuplicateCandidate =
  async ({
    mobile,
    email,
  }) => {
    const conditions =
      [];

    const cleanMobile =
      normalizeMobile(
        mobile
      );

    const cleanEmail =
      normalizeEmail(
        email
      );

    if (
      cleanMobile
    ) {
      conditions.push({
        mobile:
          cleanMobile,
      });
    }

    if (
      cleanEmail
    ) {
      conditions.push({
        email:
          cleanEmail,
      });
    }

    if (
      conditions.length ===
      0
    ) {
      return null;
    }

    return Candidate
      .findOne({
        $or:
          conditions,
      })
      .sort({
        createdAt:
          -1,
      })
      .lean();
  };

const checkDuplicate =
  async ({
    mobile,
    email,
  }) => {
    const candidate =
      await findDuplicateCandidate({
        mobile,
        email,
      });

    return {
      duplicate:
        Boolean(
          candidate
        ),

      candidate:
        candidate ||
        null,
    };
  };

/* =========================================================
   CREATE CANDIDATE
========================================================= */

const createCandidate =
  async ({
    requirementId,
    body,
    user,
  }) => {
    const requirement =
      await getApprovedRequirement(
        requirementId
      );

    const data =
      validateCreateCandidate(
        body
      );

    const duplicate =
      await findDuplicateCandidate({
        mobile:
          data.mobile,

        email:
          data.email,
      });

    if (
      duplicate
    ) {
      throw new ApiError(
        409,
        `Candidate already exists as ${duplicate.candidateNumber}`
      );
    }

    const temporaryResume =
      body.resume
        ?.tempFileName
        ? {
            tempFileName:
              body.resume
                .tempFileName,

            originalName:
              body.resume
                .originalName ||
              "",

            size:
              Number(
                body.resume
                  .size
              ) ||
              0,
          }
        : null;

    const candidateData = {
      ...data,
    };

    delete candidateData
      .resume;

    const candidateNumber =
      await generateCandidateNumber();

    const department =
      requirement
        .department
        ?._id ||
      requirement
        .department;

    const positionTitle =
      requirement
        .positionTitle ||
      requirement
        .position ||
      requirement
        .designation ||
      "";

    const assignedHr =
      requirement
        .assignedHr
        ?._id ||
      requirement
        .assignedHr;

    if (
      !department
    ) {
      throw new ApiError(
        400,
        "Manpower requirement does not contain department"
      );
    }

    if (
      !positionTitle
    ) {
      throw new ApiError(
        400,
        "Manpower requirement does not contain position title"
      );
    }

    if (
      !assignedHr
    ) {
      throw new ApiError(
        400,
        "No HR hiring owner is assigned to this manpower requirement"
      );
    }

    let candidate =
      null;

    try {
      candidate =
        await Candidate
          .create({
            candidateNumber,

            manpowerRequirement:
              requirement._id,

            department,

            positionTitle,

            ...candidateData,

            status:
              "CONTACT_PENDING",

            assignedHr,

            nextAction:
              "CALL_CANDIDATE",

            nextActionAt:
              null,

            createdBy:
              user._id,

            updatedBy:
              user._id,
          });

      if (
        temporaryResume
      ) {
        const permanentResume =
          await makeResumePermanent({
            tempFileName:
              temporaryResume
                .tempFileName,

            candidateId:
              candidate._id
                .toString(),

            originalName:
              temporaryResume
                .originalName,

            size:
              temporaryResume
                .size,
          });

        candidate.resume =
          permanentResume;

        candidate.updatedBy =
          user._id;

        await candidate.save();
      }
    } catch (
      error
    ) {
      if (
        candidate?._id
      ) {
        try {
          await Candidate
            .deleteOne({
              _id:
                candidate._id,
            });
        } catch (
          rollbackError
        ) {
          console.error(
            "Candidate rollback failed:",
            rollbackError
          );
        }
      }

      if (
        error instanceof
        ApiError
      ) {
        throw error;
      }

      console.error(
        "Candidate creation error:",
        error
      );

      throw new ApiError(
        500,

        temporaryResume
          ? "Candidate could not be created because resume attachment failed. Please try again."
          : "Candidate could not be created. Please try again."
      );
    }

    await createActivity({
      candidate,

      type:
        "CANDIDATE_CREATED",

      title:
        "Candidate created",

      remarks:
        "Candidate profile created from recruitment sourcing.",

      newStatus:
        candidate.status,

      nextAction:
        candidate
          .nextAction,

      performedBy:
        user._id,
    });

    if (
      candidate.resume
        ?.fileName
    ) {
      await createActivity({
        candidate,

        type:
          "RESUME_UPLOADED",

        title:
          "Resume uploaded",

        remarks:
          "Candidate resume attached to recruitment profile.",

        performedBy:
          user._id,

        metadata: {
          originalName:
            candidate
              .resume
              .originalName,

          fileName:
            candidate
              .resume
              .fileName,

          mimeType:
            candidate
              .resume
              .mimeType,

          size:
            candidate
              .resume
              .size,

          parsed:
            candidate
              .resume
              .parsed,

          parserProvider:
            candidate
              .resume
              .parserProvider,
        },
      });
    }

    return candidate;
  };

/* =========================================================
   LIST REQUIREMENT CANDIDATES
========================================================= */

const listRequirementCandidates =
  async ({
    requirementId,
    status,
    search,
  }) => {
    const query = {
      manpowerRequirement:
        requirementId,

      isActive:
        true,
    };

    if (
      status
    ) {
      query.status =
        String(status)
          .trim()
          .toUpperCase();
    }

    if (
      search &&
      String(search).trim()
    ) {
      const regex =
        new RegExp(
          String(search).trim(),
          "i"
        );

      query.$or = [
        {
          fullName:
            regex,
        },

        {
          candidateNumber:
            regex,
        },

        {
          mobile:
            regex,
        },

        {
          email:
            regex,
        },

        {
          currentCompany:
            regex,
        },
      ];
    }

    return Candidate
      .find(query)
      .populate(
        "assignedHr",
        "displayName email"
      )
      .sort({
        updatedAt:
          -1,
      })
      .lean();
  };

/* =========================================================
   GET CANDIDATE
========================================================= */

const getCandidate =
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
          "name code"
        )
        .populate(
          "assignedHr",
          "displayName email"
        )
        .populate(
          "manpowerRequirement"
        )
        .lean();

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
   CALL ATTEMPT
========================================================= */

const addCallAttempt =
  async ({
    candidateId,
    body,
    user,
  }) => {
    const candidate =
      await Candidate
        .findById(
          candidateId
        );

    if (
      !candidate
    ) {
      throw new ApiError(
        404,
        "Candidate not found"
      );
    }

    assertCandidateActionAllowed(
      candidate,
      "CALL"
    );

    const outcome =
      String(
        body.outcome ||
        ""
      )
        .trim()
        .toUpperCase();

    const allowed = [
      "CONNECTED",
      "NO_ANSWER",
      "BUSY",
      "SWITCHED_OFF",
      "INVALID_NUMBER",
      "CALL_BACK",
      "NOT_INTERESTED",
    ];

    if (
      !allowed.includes(
        outcome
      )
    ) {
      throw new ApiError(
        400,
        "Invalid call outcome"
      );
    }

    if (
      outcome ===
        "CALL_BACK" &&
      !body.followUpAt
    ) {
      throw new ApiError(
        400,
        "Call-back date and time are required"
      );
    }

    const previousStatus =
      candidate.status;

    let type =
      "CALL_ATTEMPT";

    let nextAction =
      candidate.nextAction ||
      "CALL_CANDIDATE";

    let nextActionAt =
      null;

    if (
      outcome ===
      "CONNECTED"
    ) {
      type =
        "CALL_CONNECTED";

      /*
       * Do not move an already advanced candidate backwards.
       */

      if (
        [
          "CONTACT_PENDING",
          "CONTACTED",
          "FOLLOW_UP",
        ].includes(
          previousStatus
        )
      ) {
        candidate.status =
          "SCREENING_PENDING";

        nextAction =
          "COMPLETE_SCREENING";
      }
    } else if (
      outcome ===
      "NO_ANSWER" ||
      outcome ===
      "BUSY" ||
      outcome ===
      "SWITCHED_OFF"
    ) {
      if (
        [
          "CONTACT_PENDING",
          "CONTACTED",
          "FOLLOW_UP",
        ].includes(
          previousStatus
        )
      ) {
        candidate.status =
          "FOLLOW_UP";

        nextAction =
          "FOLLOW_UP_CALL";
      }
    } else if (
      outcome ===
      "CALL_BACK"
    ) {
      if (
        [
          "CONTACT_PENDING",
          "CONTACTED",
          "FOLLOW_UP",
        ].includes(
          previousStatus
        )
      ) {
        candidate.status =
          "FOLLOW_UP";
      }

      nextAction =
        "FOLLOW_UP_CALL";

      nextActionAt =
        body.followUpAt;
    } else if (
      outcome ===
      "INVALID_NUMBER"
    ) {
      nextAction =
        candidate.nextAction ||
        "CALL_CANDIDATE";
    } else if (
      outcome ===
      "NOT_INTERESTED"
    ) {
      candidate.status =
        "NOT_INTERESTED";

      nextAction =
        "NONE";

      nextActionAt =
        null;

      type =
        "CALL_CONNECTED";
    }

    candidate.nextAction =
      nextAction;

    candidate.nextActionAt =
      nextActionAt;

    candidate.updatedBy =
      user._id;

    await candidate.save();

    await createActivity({
      candidate,

      type,

      title:
        `Call ${outcome
          .replaceAll(
            "_",
            " "
          )
          .toLowerCase()}`,

      remarks:
        body.remarks ||
        "",

      outcome,

      previousStatus,

      newStatus:
        candidate.status,

      nextAction,

      nextActionAt,

      performedBy:
        user._id,
    });

    return candidate;
  };

/* =========================================================
   SCREEN CANDIDATE
========================================================= */

const screenCandidate =
  async ({
    candidateId,
    body,
    user,
  }) => {
    const candidate =
      await Candidate
        .findById(
          candidateId
        );

    if (
      !candidate
    ) {
      throw new ApiError(
        404,
        "Candidate not found"
      );
    }

    assertCandidateActionAllowed(
      candidate,
      "SCREEN"
    );

    const data =
      validateScreening(
        body
      );

    const screening =
      await CandidateScreening
        .create({
          candidate:
            candidate._id,

          manpowerRequirement:
            candidate
              .manpowerRequirement,

          screenedBy:
            user._id,

          createdBy:
            user._id,

          ...data,
        });

    const copyFields = [
      "currentCompany",
      "currentDesignation",
      "totalExperienceYears",
      "relevantExperienceYears",
      "currentSalary",
      "expectedSalary",
      "noticePeriodDays",
      "earliestJoiningDate",
    ];

    for (
      const field
      of copyFields
    ) {
      if (
        data[field] !==
          undefined &&
        data[field] !==
          null &&
        data[field] !==
          ""
      ) {
        candidate[field] =
          data[field];
      }
    }

    if (
      data.currentLocation
    ) {
      candidate.city =
        data.currentLocation;
    }

    const previousStatus =
      candidate.status;

    let newStatus =
      "SCREENED";

    let nextAction =
      "NONE";

    let nextActionAt =
      null;

    if (
      data.interested ===
      "NO"
    ) {
      newStatus =
        "NOT_INTERESTED";
    } else if (
      data.interested ===
      "FOLLOW_UP"
    ) {
      newStatus =
        "FOLLOW_UP";

      nextAction =
        "FOLLOW_UP_CALL";

      nextActionAt =
        data.followUpAt;
    } else if (
      data.result ===
      "SHORTLIST"
    ) {
      newStatus =
        "SHORTLISTED";

      nextAction =
        "SCHEDULE_INTERVIEW";
    } else if (
      data.result ===
      "REJECT"
    ) {
      newStatus =
        "REJECTED_SCREENING";
    } else if (
      data.result ===
      "HOLD"
    ) {
      newStatus =
        "FOLLOW_UP";

      nextAction =
        "FOLLOW_UP_CALL";

      nextActionAt =
        data.followUpAt ||
        null;
    } else {
      newStatus =
        "SCREENED";

      /*
       * Now Shortlist is the next logical step.
       */

      nextAction =
        "NONE";
    }

    candidate.status =
      newStatus;

    candidate.nextAction =
      nextAction;

    candidate.nextActionAt =
      nextActionAt;

    candidate.updatedBy =
      user._id;

    await candidate.save();

    await createActivity({
      candidate,

      type:
        "SCREENING_COMPLETED",

      title:
        "Candidate screening completed",

      remarks:
        data.remarks ||
        "",

      outcome:
        data.result,

      previousStatus,

      newStatus,

      nextAction,

      nextActionAt,

      performedBy:
        user._id,

      metadata: {
        screeningId:
          screening._id,

        interested:
          data.interested,
      },
    });

    if (
      newStatus ===
      "SHORTLISTED"
    ) {
      await createActivity({
        candidate,

        type:
          "SHORTLISTED",

        title:
          "Candidate shortlisted",

        previousStatus,

        newStatus,

        nextAction:
          "SCHEDULE_INTERVIEW",

        performedBy:
          user._id,
      });
    }

    return {
      candidate,

      screening,
    };
  };

/* =========================================================
   SHORTLIST
========================================================= */

const shortlistCandidate =
  async ({
    candidateId,
    user,
    remarks = "",
  }) => {
    const candidate =
      await Candidate
        .findById(
          candidateId
        );

    if (
      !candidate
    ) {
      throw new ApiError(
        404,
        "Candidate not found"
      );
    }

    assertCandidateActionAllowed(
      candidate,
      "SHORTLIST"
    );

    const previousStatus =
      candidate.status;

    candidate.status =
      "SHORTLISTED";

    candidate.nextAction =
      "SCHEDULE_INTERVIEW";

    candidate.nextActionAt =
      null;

    candidate.updatedBy =
      user._id;

    await candidate.save();

    await createActivity({
      candidate,

      type:
        "SHORTLISTED",

      title:
        "Candidate shortlisted",

      remarks,

      previousStatus,

      newStatus:
        "SHORTLISTED",

      nextAction:
        "SCHEDULE_INTERVIEW",

      performedBy:
        user._id,
    });

    return candidate;
  };

/* =========================================================
   REJECT
========================================================= */

const rejectCandidate =
  async ({
    candidateId,
    user,
    remarks = "",
  }) => {
    const candidate =
      await Candidate
        .findById(
          candidateId
        );

    if (
      !candidate
    ) {
      throw new ApiError(
        404,
        "Candidate not found"
      );
    }

    assertCandidateActionAllowed(
      candidate,
      "REJECT"
    );

    if (
      !String(
        remarks || ""
      ).trim()
    ) {
      throw new ApiError(
        400,
        "Rejection reason is required"
      );
    }

    const previousStatus =
      candidate.status;

    candidate.status =
      "REJECTED_SCREENING";

    candidate.nextAction =
      "NONE";

    candidate.nextActionAt =
      null;

    candidate.updatedBy =
      user._id;

    await candidate.save();

    await createActivity({
      candidate,

      type:
        "REJECTED",

      title:
        "Candidate rejected",

      remarks,

      previousStatus,

      newStatus:
        candidate.status,

      nextAction:
        "NONE",

      performedBy:
        user._id,
    });

    return candidate;
  };

/* =========================================================
   TIMELINE
========================================================= */

const getCandidateTimeline =
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

    return RecruitmentActivity
      .find({
        candidate:
          candidateId,
      })
      .populate(
        "performedBy",
        "displayName email"
      )
      .sort({
        performedAt:
          -1,

        createdAt:
          -1,
      })
      .lean();
  };

/* =========================================================
   HR TASKS
========================================================= */

const getMyRecruitmentTasks =
  async (
    userId
  ) => {
    const now =
      new Date();

    const candidates =
      await Candidate
        .find({
          assignedHr:
            userId,

          isActive:
            true,

          nextAction: {
            $ne:
              "NONE",
          },
        })
        .populate(
          "department",
          "name code"
        )
        .populate(
          "manpowerRequirement"
        )
        .sort({
          nextActionAt:
            1,

          updatedAt:
            1,
        })
        .lean();

    return candidates.map(
      (
        candidate
      ) => ({
        ...candidate,

        overdue:
          candidate
            .nextActionAt
            ? new Date(
                candidate
                  .nextActionAt
              ) < now
            : false,
      })
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createCandidate,

  listRequirementCandidates,

  getCandidate,

  checkDuplicate,

  addCallAttempt,

  screenCandidate,

  shortlistCandidate,

  rejectCandidate,

  getCandidateTimeline,

  getMyRecruitmentTasks,
};