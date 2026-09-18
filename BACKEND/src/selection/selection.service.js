const mongoose =
  require("mongoose");

const {
  Selection,
  SelectionCounter,
  SELECTION_STATUSES,
} =
  require(
    "./selection.model"
  );

const {
  InterviewEvaluation,
} =
  require(
    "../interview/interviewEvaluation.model"
  );

const {
  Interview,
} =
  require(
    "../interview/interview.model"
  );

const {
  Candidate,
} =
  require(
    "../recruitment/candidate.model"
  );

const {
  ManpowerRequirement,
} =
  require(
    "../manpower/manpowerRequirement.model"
  );

const UserModule =
  require(
    "../user/user.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

const loiService =
  require(
    "./loi/loi.service"
  );

const User =
  UserModule.User ||
  UserModule;

/* =========================================================
   STATUS TRANSITIONS
========================================================= */

const ALLOWED_TRANSITIONS = {
  LOI_PENDING: [
    "LOI_DRAFT",
    "CLOSED",
  ],

  LOI_DRAFT: [
    "LOI_PENDING",
    "LOI_SENT",
    "CLOSED",
  ],

  LOI_SENT: [
    "LOI_ACCEPTED",
    "LOI_DECLINED",
    "CLOSED",
  ],

  LOI_ACCEPTED: [
    "PRE_JOINING_DOCUMENTS",
    "CLOSED",
  ],

  LOI_DECLINED: [
    "LOI_PENDING",
    "CLOSED",
  ],

  PRE_JOINING_DOCUMENTS: [
    "DOCUMENTS_SUBMITTED",
    "CLOSED",
  ],

  DOCUMENTS_SUBMITTED: [
    "DOCUMENT_VERIFICATION",
    "CLOSED",
  ],

  DOCUMENT_VERIFICATION: [
    "DOCUMENT_QUERY",
    "DOCUMENTS_VERIFIED",
    "CLOSED",
  ],

  DOCUMENT_QUERY: [
    "DOCUMENTS_SUBMITTED",
    "DOCUMENT_VERIFICATION",
    "CLOSED",
  ],

  DOCUMENTS_VERIFIED: [
    "READY_FOR_OFFER",
    "CLOSED",
  ],

  READY_FOR_OFFER: [
    "OFFER_DRAFT",
    "OFFER_SENT",
    "CLOSED",
  ],

  OFFER_DRAFT: [
    "READY_FOR_OFFER",
    "OFFER_SENT",
    "CLOSED",
  ],

  OFFER_SENT: [
    "OFFER_ACCEPTED",
    "OFFER_DECLINED",
    "CLOSED",
  ],

  OFFER_ACCEPTED: [
    "JOINING_PENDING",
    "CLOSED",
  ],

  OFFER_DECLINED: [
    "READY_FOR_OFFER",
    "CLOSED",
  ],

  JOINING_PENDING: [
    "JOINING_CONFIRMED",
    "CLOSED",
  ],

  JOINING_CONFIRMED: [
    "CLOSED",
  ],

  CLOSED: [],
};

/* =========================================================
   ID
========================================================= */

const assertObjectId =
  (
    value,
    label
  ) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          value
        )
    ) {
      throw new ApiError(
        400,
        `Invalid ${label}`
      );
    }
  };

/* =========================================================
   SELECTION NUMBER
========================================================= */

const generateSelectionNumber =
  async () => {
    const year =
      new Date()
        .getFullYear();

    const key =
      `SELECTION:${year}`;

    const counter =
      await SelectionCounter
        .findOneAndUpdate(
          {
            key,
          },

          {
            $setOnInsert: {
              key,
            },

            $inc: {
              sequence:
                1,
            },
          },

          {
            new:
              true,

            upsert:
              true,

            setDefaultsOnInsert:
              true,
          }
        )
        .lean();

    return (
      `SEL-${year}-` +
      String(
        counter.sequence
      ).padStart(
        6,
        "0"
      )
    );
  };

/* =========================================================
   OFFICE
========================================================= */

const normalizeOfficeLocation =
  (
    value
  ) => {
    const text =
      String(
        value ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      text.includes(
        "SONIPAT"
      ) ||
      text.includes(
        "SONEPAT"
      )
    ) {
      return "SONIPAT";
    }

    if (
      text.includes(
        "DELHI"
      )
    ) {
      return "DELHI";
    }

    return "";
  };

/* =========================================================
   WORKFLOW META
========================================================= */

const WORKFLOW_META = {
  LOI_PENDING: {
    stage:
      "LOI",

    stageLabel:
      "Letter of Intent",

    progressPercent:
      10,

    nextAction:
      "PREPARE_LOI",

    nextActionLabel:
      "Prepare LOI",
  },

  LOI_DRAFT: {
    stage:
      "LOI",

    stageLabel:
      "LOI Ready",

    progressPercent:
      15,

    nextAction:
      "SEND_LOI",

    nextActionLabel:
      "Send LOI",
  },

  LOI_SENT: {
    stage:
      "LOI",

    stageLabel:
      "Awaiting Candidate",

    progressPercent:
      22,

    nextAction:
      "WAIT_FOR_LOI_RESPONSE",

    nextActionLabel:
      "Awaiting LOI Response",
  },

  LOI_ACCEPTED: {
    stage:
      "DOCUMENTS",

    stageLabel:
      "LOI Accepted",

    progressPercent:
      30,

    nextAction:
      "START_DOCUMENTS",

    nextActionLabel:
      "Start Pre-Joining",
  },

  LOI_DECLINED: {
    stage:
      "LOI",

    stageLabel:
      "LOI Declined",

    progressPercent:
      20,

    nextAction:
      "REVIEW_LOI",

    nextActionLabel:
      "Review LOI",
  },

  PRE_JOINING_DOCUMENTS: {
    stage:
      "DOCUMENTS",

    stageLabel:
      "Pre-Joining Documents",

    progressPercent:
      40,

    nextAction:
      "WAIT_FOR_DOCUMENTS",

    nextActionLabel:
      "Awaiting Candidate Documents",
  },

  DOCUMENTS_SUBMITTED: {
    stage:
      "DOCUMENTS",

    stageLabel:
      "Documents Submitted",

    progressPercent:
      52,

    nextAction:
      "START_VERIFICATION",

    nextActionLabel:
      "Start Verification",
  },

  DOCUMENT_VERIFICATION: {
    stage:
      "DOCUMENTS",

    stageLabel:
      "HR Verification",

    progressPercent:
      62,

    nextAction:
      "VERIFY_DOCUMENTS",

    nextActionLabel:
      "Verify Documents",
  },

  DOCUMENT_QUERY: {
    stage:
      "DOCUMENTS",

    stageLabel:
      "Candidate Action Required",

    progressPercent:
      57,

    nextAction:
      "WAIT_FOR_CORRECTION",

    nextActionLabel:
      "Awaiting Corrected Document",
  },

  DOCUMENTS_VERIFIED: {
    stage:
      "DOCUMENTS",

    stageLabel:
      "Documents Verified",

    progressPercent:
      70,

    nextAction:
      "MARK_READY_FOR_OFFER",

    nextActionLabel:
      "Proceed to Offer",
  },

  READY_FOR_OFFER: {
    stage:
      "OFFER",

    stageLabel:
      "Ready for Offer",

    progressPercent:
      76,

    nextAction:
      "PREPARE_OFFER",

    nextActionLabel:
      "Prepare Offer",
  },

  OFFER_DRAFT: {
    stage:
      "OFFER",

    stageLabel:
      "Offer Draft",

    progressPercent:
      80,

    nextAction:
      "SEND_OFFER",

    nextActionLabel:
      "Send Offer",
  },

  OFFER_SENT: {
    stage:
      "OFFER",

    stageLabel:
      "Offer Sent",

    progressPercent:
      85,

    nextAction:
      "WAIT_FOR_OFFER_RESPONSE",

    nextActionLabel:
      "Awaiting Offer Response",
  },

  OFFER_ACCEPTED: {
    stage:
      "JOINING",

    stageLabel:
      "Offer Accepted",

    progressPercent:
      90,

    nextAction:
      "CONFIRM_JOINING",

    nextActionLabel:
      "Confirm Joining",
  },

  OFFER_DECLINED: {
    stage:
      "OFFER",

    stageLabel:
      "Offer Declined",

    progressPercent:
      82,

    nextAction:
      "REVIEW_OFFER",

    nextActionLabel:
      "Review Offer",
  },

  JOINING_PENDING: {
    stage:
      "JOINING",

    stageLabel:
      "Joining Pending",

    progressPercent:
      95,

    nextAction:
      "CONFIRM_JOINING",

    nextActionLabel:
      "Confirm Joining",
  },

  JOINING_CONFIRMED: {
    stage:
      "COMPLETE",

    stageLabel:
      "Joining Confirmed",

    progressPercent:
      100,

    nextAction:
      "CREATE_EMPLOYEE",

    nextActionLabel:
      "Create Employee",
  },

  CLOSED: {
    stage:
      "CLOSED",

    stageLabel:
      "Closed",

    progressPercent:
      100,

    nextAction:
      "NONE",

    nextActionLabel:
      "No Action",
  },
};

/* =========================================================
   DECORATE
========================================================= */

const decorateSelection =
  (
    selection
  ) => {
    if (
      !selection
    ) {
      return selection;
    }

    const plain =
      selection?.toObject
        ? selection.toObject()
        : {
            ...selection,
          };

    const status =
      String(
        plain.status ||
          "LOI_PENDING"
      ).toUpperCase();

    const workflow =
      WORKFLOW_META[
        status
      ] ||
      WORKFLOW_META
        .LOI_PENDING;

    return {
      ...plain,

      workflow: {
        status,

        ...workflow,
      },
    };
  };

/* =========================================================
   HIRING HR
========================================================= */

const resolveHiringHr =
  async (
    requirement
  ) => {
    const value =
      requirement
        ?.assignedHr
        ?._id ||
      requirement
        ?.assignedHr ||
      null;

    if (
      !value
    ) {
      return null;
    }

    if (
      value?.email
    ) {
      return value;
    }

    if (
      !mongoose.Types.ObjectId
        .isValid(
          value
        )
    ) {
      return null;
    }

    return User
      .findById(
        value
      )
      .select(
        "_id displayName email status"
      )
      .lean();
  };

/* =========================================================
   CREATE SELECTION FROM EVALUATION
========================================================= */

/* =========================================================
   CREATE / REPAIR SELECTION FROM EVALUATION

   AUTHORITATIVE POST-EVALUATION HANDOVER

   SELECTED evaluation
       ↓
   Selection must exist
       ↓
   LOI_PENDING

   SAFE / IDEMPOTENT:
   Calling this repeatedly will never intentionally create
   a second Selection for the same evaluation.
========================================================= */

const ensureSelectionFromEvaluation =
  async ({
    evaluationId,
    userId =
      null,
  }) => {
    assertObjectId(
      evaluationId,
      "evaluation ID"
    );

    /* =====================================================
       EXISTING

       First and most important idempotency check.
    ===================================================== */

    const existing =
      await Selection
        .findOne({
          evaluation:
            evaluationId,
        })
        .select(
          "_id"
        )
        .lean();

    if (
      existing?._id
    ) {
      return getSelectionById(
        existing._id
      );
    }

    /* =====================================================
       EVALUATION
    ===================================================== */

    const evaluation =
      await InterviewEvaluation
        .findById(
          evaluationId
        )
        .lean();

    if (
      !evaluation
    ) {
      throw new ApiError(
        404,
        "Evaluation not found"
      );
    }

    const finalDecision =
      String(
        evaluation
          .finalDecision ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      finalDecision !==
      "SELECTED"
    ) {
      throw new ApiError(
        409,
        "Selection record can only be created for a selected candidate"
      );
    }

    /* =====================================================
       SOURCE RECORDS
    ===================================================== */

    const [
      candidate,
      interview,
      requirement,
    ] =
      await Promise.all([
        Candidate
          .findById(
            evaluation.candidate
          )
          .populate(
            "department",
            "name code"
          )
          .lean(),

        Interview
          .findById(
            evaluation.interview
          )
          .populate(
            "department",
            "name code"
          )
          .lean(),

        ManpowerRequirement
          .findById(
            evaluation
              .manpowerRequirement
          )
          .populate(
            "department",
            "name code"
          )
          .populate(
            "assignedHr",
            "displayName email status"
          )
          .lean(),
      ]);

    if (
      !candidate
    ) {
      throw new ApiError(
        404,
        "Selected candidate was not found"
      );
    }

    if (
      !interview
    ) {
      throw new ApiError(
        404,
        "Interview linked with the evaluation was not found"
      );
    }

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "Manpower Requirement linked with the evaluation was not found"
      );
    }

    /* =====================================================
       HIRING HR
    ===================================================== */

    const hiringHr =
      await resolveHiringHr(
        requirement
      );

    /* =====================================================
       DEPARTMENT

       IMPORTANT FIX:

       Newer Candidate records may not independently store
       department.

       Manpower Requirement is the strongest source.
       Interview is second.
       Candidate is final fallback.
    ===================================================== */

    const department =
      requirement
        ?.department
        ?._id ||
      requirement
        ?.department ||
      interview
        ?.department
        ?._id ||
      interview
        ?.department ||
      candidate
        ?.department
        ?._id ||
      candidate
        ?.department ||
      null;

    if (
      !department
    ) {
      throw new ApiError(
        422,
        "Department could not be resolved for the selected candidate."
      );
    }

    /* =====================================================
       POSITION
    ===================================================== */

    const positionTitle =
      String(
        requirement
          ?.positionTitle ||
        interview
          ?.positionTitle ||
        candidate
          ?.positionTitle ||
        "Position"
      ).trim();

    /* =====================================================
       EMPLOYMENT TYPE

       Recruitment uses:
       FULL_TIME
       PART_TIME
       CONTRACT
       TEMPORARY
       INTERN

       Preserve that vocabulary here.
    ===================================================== */

    const allowedEmploymentTypes = [
      "FULL_TIME",
      "PART_TIME",
      "CONTRACT",
      "TEMPORARY",
      "INTERN",
    ];

    let employmentType =
      String(
        requirement
          ?.employmentType ||
        "FULL_TIME"
      )
        .trim()
        .toUpperCase();

    if (
      !allowedEmploymentTypes
        .includes(
          employmentType
        )
    ) {
      /*
       * Compatibility with any newer HR vocabulary.
       */
      if (
        employmentType ===
        "PERMANENT"
      ) {
        employmentType =
          "FULL_TIME";
      } else if (
        employmentType ===
        "TRAINEE"
      ) {
        employmentType =
          "TEMPORARY";
      } else {
        employmentType =
          "FULL_TIME";
      }
    }

    /* =====================================================
       OFFICE LOCATION

       Do not fail Selection creation simply because the
       location is missing.

       LOI readiness is specifically designed to request
       missing office/date fields later.
    ===================================================== */

    const rawLocation =
      requirement
        ?.location ||
      interview
        ?.officeLocation ||
      "";

    const officeLocation =
      normalizeOfficeLocation(
        rawLocation
      );

    /* =====================================================
       SELECTION NUMBER
    ===================================================== */

    const selectionNumber =
      await generateSelectionNumber();

    /* =====================================================
       CREATE
    ===================================================== */

    try {
      const selection =
        await Selection
          .create({
            selectionNumber,

            candidate:
              candidate._id,

            evaluation:
              evaluation._id,

            interview:
              interview._id,

            manpowerRequirement:
              requirement._id,

            department,

            positionTitle,

            employmentType,

            /*
             * Empty is intentional when Recruitment does
             * not yet know the office.
             *
             * LOI stage can ask HR for it.
             */
            officeLocation:
              officeLocation ||
              "",

            proposedJoiningDate:
              null,

            hiringHr:
              hiringHr?._id ||
              hiringHr ||
              requirement
                ?.assignedHr
                ?._id ||
              requirement
                ?.assignedHr ||
              null,

            status:
              "LOI_PENDING",

            selectedAt:
              evaluation
                ?.evaluatedAt ||
              new Date(),

            isActive:
              true,

            createdBy:
              userId,

            updatedBy:
              userId,

            auditTrail: [
              {
                event:
                  "SELECTION_CREATED",

                fromStatus:
                  "",

                toStatus:
                  "LOI_PENDING",

                remarks:
                  "Selection workflow automatically created after candidate selection.",

                performedBy:
                  userId,

                at:
                  new Date(),

                metadata: {
                  evaluationId:
                    evaluation._id,

                  interviewId:
                    interview._id,

                  candidateId:
                    candidate._id,

                  manpowerRequirementId:
                    requirement._id,
                },
              },
            ],
          });

      return getSelectionById(
        selection._id
      );
    } catch (
      error
    ) {
      /* ===================================================
         CONCURRENT / DUPLICATE PROTECTION
      =================================================== */

      if (
        error?.code ===
        11000
      ) {
        const duplicate =
          await Selection
            .findOne({
              evaluation:
                evaluationId,
            })
            .select(
              "_id"
            )
            .lean();

        if (
          duplicate?._id
        ) {
          return getSelectionById(
            duplicate._id
          );
        }
      }

      /*
       * IMPORTANT:
       * Do not hide Mongoose validation anymore.
       */
      console.error(
        "[Selection] Creation from evaluation failed:",
        {
          evaluationId:
            String(
              evaluationId
            ),

          candidateId:
            String(
              candidate?._id ||
              ""
            ),

          requirementId:
            String(
              requirement?._id ||
              ""
            ),

          department:
            String(
              department ||
              ""
            ),

          employmentType,

          officeLocation,

          error:
            error?.message,

          errors:
            error?.errors
              ? Object.fromEntries(
                  Object.entries(
                    error.errors
                  ).map(
                    ([
                      key,
                      value,
                    ]) => [
                      key,
                      value?.message,
                    ]
                  )
                )
              : undefined,
        }
      );

      throw error;
    }
  };
/* =========================================================
   TRANSITION STATUS
========================================================= */

const transitionSelectionStatus =
  async ({
    selectionId,
    toStatus,
    userId =
      null,
    remarks =
      "",
    event =
      "STATUS_CHANGED",
    metadata =
      null,
  }) => {
    assertObjectId(
      selectionId,
      "selection ID"
    );

    const target =
      String(
        toStatus ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !SELECTION_STATUSES.includes(
        target
      )
    ) {
      throw new ApiError(
        400,
        "Invalid selection status"
      );
    }

    const selection =
      await Selection
        .findById(
          selectionId
        );

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found"
      );
    }

    const current =
      String(
        selection.status
      ).toUpperCase();

    if (
      current ===
      target
    ) {
      return getSelectionById(
        selection._id
      );
    }

    const allowed =
      ALLOWED_TRANSITIONS[
        current
      ] ||
      [];

    if (
      !allowed.includes(
        target
      )
    ) {
      throw new ApiError(
        409,
        `Selection cannot move from ${current} to ${target}`
      );
    }

    const now =
      new Date();

    selection.status =
      target;

    selection.updatedBy =
      userId;

    if (
      target ===
      "LOI_SENT"
    ) {
      selection.loiSentAt =
        now;
    }

    if (
      target ===
      "LOI_ACCEPTED"
    ) {
      selection.loiAcceptedAt =
        now;

      selection.loiDeclinedAt =
        null;
    }

    if (
      target ===
      "LOI_DECLINED"
    ) {
      selection.loiDeclinedAt =
        now;
    }

    if (
      target ===
      "DOCUMENTS_SUBMITTED"
    ) {
      selection.documentsSubmittedAt =
        now;
    }

    if (
      target ===
      "DOCUMENT_VERIFICATION"
    ) {
      selection.documentVerificationStartedAt =
        now;
    }

    if (
      target ===
      "DOCUMENTS_VERIFIED"
    ) {
      selection.documentsVerifiedAt =
        now;
    }

    if (
      target ===
      "READY_FOR_OFFER"
    ) {
      selection.readyForOfferAt =
        now;
    }

    if (
      target ===
      "OFFER_SENT"
    ) {
      selection.offerSentAt =
        now;
    }

    if (
      target ===
      "OFFER_ACCEPTED"
    ) {
      selection.offerAcceptedAt =
        now;

      selection.offerDeclinedAt =
        null;
    }

    if (
      target ===
      "OFFER_DECLINED"
    ) {
      selection.offerDeclinedAt =
        now;
    }

    if (
      target ===
      "JOINING_CONFIRMED"
    ) {
      selection.joiningConfirmedAt =
        now;
    }

    if (
      target ===
      "CLOSED"
    ) {
      selection.closedAt =
        now;

      selection.isActive =
        false;
    }

    selection.auditTrail.push({
      event,

      fromStatus:
        current,

      toStatus:
        target,

      remarks:
        String(
          remarks ||
            ""
        ).trim(),

      performedBy:
        userId,

      metadata,

      at:
        now,
    });

    await selection.save();

    return getSelectionById(
      selection._id
    );
  };

/* =========================================================
   LOI

   Dedicated LOI service is now the only LOI engine.
========================================================= */

const getSelectionLoiReadiness =
  async (
    selectionId
  ) => {
    return loiService
      .getSelectionLoiReadiness(
        selectionId
      );
  };

const generateSelectionLoi =
  async ({
    selectionId,
    body =
      {},
    user,
  }) => {
    return loiService
      .generateSelectionLoi({
        selectionId,

        body,

        user,
      });
  };

const sendSelectionLoi =
  async ({
    selectionId,
    user,
  }) => {
    return loiService
      .sendSelectionLoi({
        selectionId,

        user,
      });
  };

const getCurrentLoi =
  async (
    selectionId
  ) => {
    return loiService
      .getCurrentLoi(
        selectionId
      );
  };

/* =========================================================
   DETAIL
========================================================= */

const getSelectionById =
  async (
    selectionId
  ) => {
    assertObjectId(
      selectionId,
      "selection ID"
    );

    const selection =
      await Selection
        .findById(
          selectionId
        )
        .populate(
          "candidate",
          "candidateNumber fullName email mobile city state positionTitle status"
        )
        .populate(
          "department",
          "name code"
        )
        .populate(
          "hiringHr",
          "displayName email"
        )
        .populate(
          "evaluation",
          "overallRating recommendation finalDecision evaluatedAt"
        )
        .populate(
          "interview",
          "interviewNumber roundName roundNumber scheduledAt completedAt"
        )
        .populate(
          "manpowerRequirement",
          "requestNumber positionTitle employmentType location assignedHr"
        )
        .populate(
          "currentLoi",
          "documentNumber version status issueDate sentAt acceptedAt declinedAt file"
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
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found"
      );
    }

    return decorateSelection(
      selection
    );
  };

/* =========================================================
   BY CANDIDATE
========================================================= */

const getSelectionByCandidate =
  async (
    candidateId
  ) => {
    assertObjectId(
      candidateId,
      "candidate ID"
    );

    const selection =
      await Selection
        .findOne({
          candidate:
            candidateId,

          isActive: {
            $ne:
              false,
          },
        })
        .sort({
          createdAt:
            -1,
        })
        .lean();

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Active selection record not found for this candidate"
      );
    }

    return getSelectionById(
      selection._id
    );
  };

/* =========================================================
   LIST
========================================================= */

const getSelections =
  async (
    query =
      {}
  ) => {
    const filter = {
      isActive: {
        $ne:
          false,
      },
    };

    const status =
      String(
        query?.status ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      status &&
      status !==
        "ALL"
    ) {
      if (
        !SELECTION_STATUSES.includes(
          status
        )
      ) {
        throw new ApiError(
          400,
          "Invalid selection status filter"
        );
      }

      filter.status =
        status;
    }

    if (
      query?.hiringHr
    ) {
      assertObjectId(
        query.hiringHr,
        "hiring HR ID"
      );

      filter.hiringHr =
        query.hiringHr;
    }

    const search =
      String(
        query?.search ||
          ""
      ).trim();

    if (
      search
    ) {
      const escaped =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const regex =
        new RegExp(
          escaped,
          "i"
        );

      const candidates =
        await Candidate
          .find({
            $or: [
              {
                fullName:
                  regex,
              },

              {
                candidateNumber:
                  regex,
              },

              {
                email:
                  regex,
              },

              {
                positionTitle:
                  regex,
              },
            ],
          })
          .select(
            "_id"
          )
          .lean();

      const ids =
        candidates.map(
          (
            candidate
          ) =>
            candidate._id
        );

      filter.$or = [
        {
          candidate: {
            $in:
              ids,
          },
        },

        {
          selectionNumber:
            regex,
        },

        {
          positionTitle:
            regex,
        },
      ];
    }

    const page =
      Math.max(
        1,
        Number(
          query?.page ||
            1
        )
      );

    const limit =
      Math.min(
        100,
        Math.max(
          1,
          Number(
            query?.limit ||
              25
          )
        )
      );

    const skip =
      (
        page -
        1
      ) *
      limit;

    const [
      records,
      total,
    ] =
      await Promise.all([
        Selection
          .find(
            filter
          )
          .populate(
            "candidate",
            "candidateNumber fullName email mobile status positionTitle"
          )
          .populate(
            "department",
            "name code"
          )
          .populate(
            "hiringHr",
            "displayName email"
          )
          .populate(
            "evaluation",
            "overallRating recommendation finalDecision evaluatedAt"
          )
          .populate(
            "currentLoi",
            "documentNumber version status"
          )
          .sort({
            createdAt:
              -1,
          })
          .skip(
            skip
          )
          .limit(
            limit
          )
          .lean(),

        Selection
          .countDocuments(
            filter
          ),
      ]);

    return {
      records:
        records.map(
          decorateSelection
        ),

      pagination: {
        page,

        limit,

        total,

        pages:
          Math.max(
            1,
            Math.ceil(
              total /
                limit
            )
          ),
      },
    };
  };

/* =========================================================
   SUMMARY
========================================================= */

const getSelectionSummary =
  async () => {
    const records =
      await Selection
        .aggregate([
          {
            $match: {
              isActive: {
                $ne:
                  false,
              },
            },
          },

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

    const statusCounts =
      {};

    let total =
      0;

    records.forEach(
      (
        record
      ) => {
        const count =
          Number(
            record.count ||
              0
          );

        statusCounts[
          record._id
        ] =
          count;

        total +=
          count;
      }
    );

    const loi =
      (
        statusCounts
          .LOI_PENDING ||
        0
      ) +
      (
        statusCounts
          .LOI_DRAFT ||
        0
      ) +
      (
        statusCounts
          .LOI_SENT ||
        0
      );

    const documents =
      (
        statusCounts
          .LOI_ACCEPTED ||
        0
      ) +
      (
        statusCounts
          .PRE_JOINING_DOCUMENTS ||
        0
      ) +
      (
        statusCounts
          .DOCUMENTS_SUBMITTED ||
        0
      ) +
      (
        statusCounts
          .DOCUMENT_VERIFICATION ||
        0
      ) +
      (
        statusCounts
          .DOCUMENT_QUERY ||
        0
      ) +
      (
        statusCounts
          .DOCUMENTS_VERIFIED ||
        0
      );

    const offer =
      (
        statusCounts
          .READY_FOR_OFFER ||
        0
      ) +
      (
        statusCounts
          .OFFER_DRAFT ||
        0
      ) +
      (
        statusCounts
          .OFFER_SENT ||
        0
      ) +
      (
        statusCounts
          .OFFER_ACCEPTED ||
        0
      ) +
      (
        statusCounts
          .OFFER_DECLINED ||
        0
      );

    const joining =
      (
        statusCounts
          .JOINING_PENDING ||
        0
      ) +
      (
        statusCounts
          .JOINING_CONFIRMED ||
        0
      );

    return {
      total,

      loi,

      documents,

      offer,

      joining,

      actionDue:
        (
          statusCounts
            .LOI_PENDING ||
          0
        ) +
        (
          statusCounts
            .DOCUMENTS_SUBMITTED ||
          0
        ) +
        (
          statusCounts
            .DOCUMENT_QUERY ||
          0
        ) +
        (
          statusCounts
            .DOCUMENTS_VERIFIED ||
          0
        ) +
        (
          statusCounts
            .READY_FOR_OFFER ||
          0
        ),

      statuses:
        statusCounts,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  ensureSelectionFromEvaluation,

  transitionSelectionStatus,

  getSelectionLoiReadiness,

  generateSelectionLoi,

  sendSelectionLoi,

  getCurrentLoi,

  getSelections,

  getSelectionSummary,

  getSelectionById,

  getSelectionByCandidate,

  decorateSelection,

  WORKFLOW_META,

  ALLOWED_TRANSITIONS,
};