const mongoose =
  require(
    "mongoose"
  );

const {
  Interview,
} =
  require(
    "../interview/interview.model"
  );

const {
  InterviewEvaluation,
} =
  require(
    "../interview/interviewEvaluation.model"
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

const UserModule =
  require(
    "../user/user.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

const {
  validateEvaluationInput,
  normalizeEvaluationFilter,
} =
  require(
    "./evaluation.validation"
  );

const {
  sendEvaluationDecisionEmail,
} =
  require(
    "./evaluationMail.service"
  );

const {
  makeAttachmentPermanent,
  getPermanentAttachmentPath,
} =
  require(
    "../interview/interviewEvaluationStorage.service"
  );

/* =========================================================
   SELECTION MODEL

   IMPORTANT:
   Required by self-healing evaluation detail.
========================================================= */

const {
  Selection,
} =
  require(
    "../selection/selection.model"
  );

/* =========================================================
   SELECTION SERVICE

   Selected candidates automatically enter the
   post-selection workflow.

   Idempotent:
   calling twice will not create duplicate Selection.
========================================================= */

const {
  ensureSelectionFromEvaluation,
} =
  require(
    "../selection/selection.service"
  );

const User =
  UserModule.User ||
  UserModule;

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
   HR USER
========================================================= */

const resolveHiringHr =
  async (
    requirement
  ) => {
    const assignedHrId =
      requirement
        ?.assignedHr
        ?._id ||
      requirement
        ?.assignedHr ||
      requirement
        ?.hiringOwner
        ?._id ||
      requirement
        ?.hiringOwner ||
      null;

    if (
      !assignedHrId
    ) {
      return null;
    }

    if (
      typeof assignedHrId ===
        "object" &&
      assignedHrId.email
    ) {
      return assignedHrId;
    }

    if (
      !mongoose.Types.ObjectId
        .isValid(
          assignedHrId
        )
    ) {
      return null;
    }

    return User
      .findById(
        assignedHrId
      )
      .select(
        "_id displayName email status"
      )
      .lean();
  };

/* =========================================================
   APPLY EMAIL RESULT
========================================================= */

const applyDecisionEmailResult =
  (
    evaluation,
    result
  ) => {
    if (
      !evaluation
        .decisionEmail
    ) {
      evaluation
        .decisionEmail =
        {};
    }

    evaluation
      .decisionEmail
      .email =
        result
          ?.email ||
        "";

    evaluation
      .decisionEmail
      .cc =
        result
          ?.cc ||
        [];

    evaluation
      .decisionEmail
      .subject =
        result
          ?.subject ||
        "";

    evaluation
      .decisionEmail
      .lastAttemptAt =
        new Date();

    if (
      result
        ?.success
    ) {
      evaluation
        .decisionEmail
        .status =
          "SENT";

      evaluation
        .decisionEmail
        .sentAt =
          new Date();

      evaluation
        .decisionEmail
        .failedAt =
          null;

      evaluation
        .decisionEmail
        .messageId =
          result
            ?.messageId ||
          "";

      evaluation
        .decisionEmail
        .error =
          "";

      return;
    }

    evaluation
      .decisionEmail
      .status =
        result
          ?.skipped
          ? "NOT_SENT"
          : "FAILED";

    evaluation
      .decisionEmail
      .sentAt =
        null;

    evaluation
      .decisionEmail
      .failedAt =
        result
          ?.skipped
          ? null
          : new Date();

    evaluation
      .decisionEmail
      .messageId =
        "";

    evaluation
      .decisionEmail
      .error =
        result
          ?.error ||
        "Decision email could not be sent";
  };

/* =========================================================
   NEXT STAGE
========================================================= */

const getNextStage =
  (
    decision
  ) => {
    if (
      decision ===
      "SELECTED"
    ) {
      return "LOI_PENDING";
    }

    if (
      decision ===
      "HOLD"
    ) {
      return "UNDER_REVIEW";
    }

    return "CLOSED";
  };

/* =========================================================
   UPDATE CANDIDATE
========================================================= */

const applyCandidateDecision =
  (
    candidate,
    decision,
    userId
  ) => {
    if (
      decision ===
      "SELECTED"
    ) {
      candidate.status =
        "SELECTED";

      candidate.nextAction =
        "PREPARE_LOI";

      candidate.nextActionAt =
        null;

      candidate.updatedBy =
        userId;

      return;
    }

    if (
      decision ===
      "HOLD"
    ) {
      candidate.status =
        "INTERVIEWED";

      candidate.nextAction =
        "NONE";

      candidate.nextActionAt =
        null;

      candidate.updatedBy =
        userId;

      return;
    }

    candidate.status =
      "REJECTED_INTERVIEW";

    candidate.nextAction =
      "NONE";

    candidate.nextActionAt =
      null;

    candidate.updatedBy =
      userId;
  };

/* =========================================================
   CREATE ACTIVITY
========================================================= */

const createEvaluationActivity =
  async ({
    evaluation,
    interview,
    candidate,
    previousCandidateStatus,
    user,
  }) => {
    try {
      await RecruitmentActivity
        .create({
          candidate:
            candidate._id,

          manpowerRequirement:
            interview
              .manpowerRequirement,

          type:
            "INTERVIEW_EVALUATED",

          title:
            "Interview evaluation completed",

          remarks:
            evaluation
              .remarks ||
            `Interview completed with ${evaluation.finalDecision} decision.`,

          previousStatus:
            previousCandidateStatus,

          newStatus:
            candidate.status,

          nextAction:
            candidate
              .nextAction ||
            "NONE",

          nextActionAt:
            candidate
              .nextActionAt ||
            null,

          performedBy:
            user._id,

          metadata: {
            interviewId:
              interview._id,

            interviewNumber:
              interview
                .interviewNumber,

            evaluationId:
              evaluation._id,

            recommendation:
              evaluation
                .recommendation,

            finalDecision:
              evaluation
                .finalDecision,

            overallRating:
              evaluation
                .overallRating,

            nextStage:
              evaluation
                .nextStage,
          },
        });
    } catch (
      error
    ) {
      console.error(
        "[Evaluation] Recruitment activity failed:",
        error
      );
    }
  };

/* =========================================================
   DETAIL BY EVALUATION ID

   SELF-HEALING

   If:
   finalDecision = SELECTED

   but Selection is missing,
   opening evaluation safely recreates it.
========================================================= */

const getEvaluationById =
  async (
    evaluationId,
    {
      repairSelection =
        true,

      userId =
        null,
    } = {}
  ) => {
    assertObjectId(
      evaluationId,
      "evaluation ID"
    );

    const evaluation =
      await InterviewEvaluation
        .findById(
          evaluationId
        )
        .populate(
          "candidate"
        )
        .populate(
          "interviewer",
          "displayName email"
        )
        .populate(
          "evaluatedBy",
          "displayName email"
        )
        .populate({
          path:
            "manpowerRequirement",

          populate: [
            {
              path:
                "department",

              select:
                "name code",
            },

            {
              path:
                "assignedHr",

              select:
                "displayName email status",
            },
          ],
        })
        .populate({
          path:
            "interview",

          populate: [
            {
              path:
                "department",

              select:
                "name code",
            },

            {
              path:
                "interviewer",

              select:
                "displayName email",
            },
          ],
        })
        .lean();

    if (
      !evaluation
    ) {
      throw new ApiError(
        404,
        "Evaluation not found"
      );
    }

    /* =====================================================
       FIND EXISTING SELECTION
    ===================================================== */

    let selectionReference =
      await Selection
        .findOne({
          evaluation:
            evaluation._id,
        })
        .select(
          "_id"
        )
        .lean();

    /* =====================================================
       REPAIR MISSING SELECTION
    ===================================================== */

    if (
      !selectionReference &&
      repairSelection &&
      String(
        evaluation
          .finalDecision ||
          ""
      )
        .trim()
        .toUpperCase() ===
        "SELECTED"
    ) {
      try {
        const repaired =
          await ensureSelectionFromEvaluation({
            evaluationId:
              evaluation._id,

            userId:
              userId ||
              evaluation
                ?.evaluatedBy
                ?._id ||
              evaluation
                ?.evaluatedBy ||
              null,
          });

        if (
          repaired?._id
        ) {
          selectionReference = {
            _id:
              repaired._id,
          };
        }
      } catch (
        repairError
      ) {
        console.error(
          "[Evaluation] Selection self-repair failed:",
          {
            evaluationId:
              String(
                evaluation._id
              ),

            message:
              repairError
                ?.message,

            errors:
              repairError
                ?.errors
                ? Object.fromEntries(
                    Object.entries(
                      repairError
                        .errors
                    ).map(
                      ([
                        key,
                        value,
                      ]) => [
                        key,
                        value
                          ?.message,
                      ]
                    )
                  )
                : undefined,

            stack:
              repairError
                ?.stack,
          }
        );
      }
    }

    /* =====================================================
       FULL SELECTION DETAIL
    ===================================================== */

    let selection =
      null;

    if (
      selectionReference
        ?._id
    ) {
      try {
        selection =
          await ensureSelectionFromEvaluation({
            evaluationId:
              evaluation._id,

            userId:
              userId ||
              null,
          });
      } catch (
        selectionError
      ) {
        console.error(
          "[Evaluation] Selection detail could not be resolved:",
          {
            evaluationId:
              String(
                evaluation._id
              ),

            message:
              selectionError
                ?.message,
          }
        );
      }
    }

    return {
      ...evaluation,

      selection:
        selection ||
        null,

      selectionId:
        selection?._id ||
        selectionReference
          ?._id ||
        null,

      postSelectionReady:
        Boolean(
          selection?._id ||
          selectionReference
            ?._id
        ),
    };
  };

/* =========================================================
   COMPLETE EVALUATION
========================================================= */

const completeEvaluation =
  async ({
    interviewId,
    body,
    user,
  }) => {
    assertObjectId(
      interviewId,
      "interview ID"
    );

    /* =====================================================
       INTERVIEW
    ===================================================== */

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

    /* =====================================================
       CHECK-IN REQUIRED
    ===================================================== */

    const interviewStatus =
      String(
        interview.status ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      interviewStatus !==
      "CHECKED_IN"
    ) {
      if (
        interviewStatus ===
        "COMPLETED"
      ) {
        throw new ApiError(
          409,
          "This interview has already been completed."
        );
      }

      throw new ApiError(
        409,
        "Candidate must be checked in before interview evaluation can be completed."
      );
    }

    /* =====================================================
       DUPLICATE EVALUATION
    ===================================================== */

    const existing =
      await InterviewEvaluation
        .findOne({
          interview:
            interview._id,
        })
        .lean();

    if (
      existing
    ) {
      throw new ApiError(
        409,
        "This interview has already been evaluated."
      );
    }

    /* =====================================================
       VALIDATE
    ===================================================== */

    const input =
      validateEvaluationInput(
        body
      );

    /* =====================================================
       CANDIDATE
    ===================================================== */

    const candidate =
      await Candidate
        .findById(
          interview.candidate
        );

    if (
      !candidate
    ) {
      throw new ApiError(
        404,
        "Candidate linked with this interview was not found."
      );
    }

    /* =====================================================
       REQUIREMENT
    ===================================================== */

    const requirement =
      await ManpowerRequirement
        .findById(
          interview
            .manpowerRequirement
        )
        .populate(
          "assignedHr",
          "displayName email status"
        );

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "Manpower Requirement linked with this interview was not found."
      );
    }

    /* =====================================================
       ATTACHMENT
    ===================================================== */

    let attachment =
      null;

    if (
      input
        ?.attachment
        ?.storedName
    ) {
      attachment =
        await makeAttachmentPermanent({
          storedName:
            input
              .attachment
              .storedName,

          originalName:
            input
              .attachment
              .originalName,

          mimeType:
            input
              .attachment
              .mimeType,

          size:
            input
              .attachment
              .size,

          interviewId:
            interview._id,

          userId:
            user._id,
        });
    }

    /* =====================================================
       CREATE EVALUATION
    ===================================================== */

    const evaluation =
      await InterviewEvaluation
        .create({
          interview:
            interview._id,

          candidate:
            candidate._id,

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

          nextStage:
            getNextStage(
              input
                .finalDecision
            ),

          decisionEmail: {
            status:
              candidate.email
                ? "PENDING"
                : "NOT_SENT",

            email:
              candidate
                .email ||
              "",
          },

          evaluatedBy:
            user._id,

          evaluatedAt:
            new Date(),
        });

    /* =====================================================
       INTERVIEW COMPLETE
    ===================================================== */

    interview.status =
      "COMPLETED";

    interview.completedAt =
      new Date();

    interview.updatedBy =
      user._id;

    await interview.save();

    /* =====================================================
       CANDIDATE DECISION
    ===================================================== */

    const previousCandidateStatus =
      candidate.status;

    applyCandidateDecision(
      candidate,
      input.finalDecision,
      user._id
    );

    await candidate.save();

    /* =====================================================
       ACTIVITY
    ===================================================== */

    await createEvaluationActivity({
      evaluation,

      interview,

      candidate,

      previousCandidateStatus,

      user,
    });

    /* =====================================================
       AUTOMATIC SELECTION
    ===================================================== */

    let selection =
      null;

    let selectionCreationError =
      null;

    if (
      input.finalDecision ===
      "SELECTED"
    ) {
      try {
        selection =
          await ensureSelectionFromEvaluation({
            evaluationId:
              evaluation._id,

            userId:
              user._id,
          });
      } catch (
        selectionError
      ) {
        selectionCreationError =
          selectionError;

        console.error(
          "[Evaluation] Automatic Selection creation failed:",
          {
            evaluationId:
              String(
                evaluation._id
              ),

            candidateId:
              String(
                candidate._id
              ),

            requirementId:
              String(
                interview
                  .manpowerRequirement ||
                  ""
              ),

            message:
              selectionError
                ?.message,

            errors:
              selectionError
                ?.errors
                ? Object.fromEntries(
                    Object.entries(
                      selectionError
                        .errors
                    ).map(
                      ([
                        key,
                        value,
                      ]) => [
                        key,
                        value
                          ?.message,
                      ]
                    )
                  )
                : undefined,

            stack:
              selectionError
                ?.stack,
          }
        );
      }
    }

    /* =====================================================
       DECISION EMAIL
    ===================================================== */

    try {
      const hiringHr =
        requirement
          ?.assignedHr ||
        await resolveHiringHr(
          requirement
        );

      const mailResult =
        await sendEvaluationDecisionEmail({
          candidate:
            candidate.toObject(),

          evaluation:
            evaluation.toObject(),

          interview:
            interview.toObject(),

          hiringHr:
            hiringHr
              ?.toObject
              ? hiringHr
                  .toObject()
              : hiringHr,
        });

      applyDecisionEmailResult(
        evaluation,
        mailResult
      );

      await evaluation.save();
    } catch (
      mailError
    ) {
      console.error(
        "[Evaluation] Decision mail processing failed:",
        mailError
      );

      evaluation
        .decisionEmail
        .status =
          "FAILED";

      evaluation
        .decisionEmail
        .failedAt =
          new Date();

      evaluation
        .decisionEmail
        .lastAttemptAt =
          new Date();

      evaluation
        .decisionEmail
        .error =
          mailError
            ?.message ||
          "Decision email could not be sent";

      await evaluation.save();
    }

    /* =====================================================
       FINAL RESULT

       Self-healing detail gives Selection another safe
       opportunity to be created if the first attempt failed.
    ===================================================== */

    const result =
      await getEvaluationById(
        evaluation._id,
        {
          repairSelection:
            true,

          userId:
            user._id,
        }
      );

    return {
      ...result,

      selection:
        result?.selection ||
        selection ||
        null,

      selectionId:
        result?.selectionId ||
        selection?._id ||
        null,

      postSelectionReady:
        Boolean(
          result
            ?.selectionId ||
          selection?._id
        ),

      selectionCreationWarning:
        selectionCreationError
          ? selectionCreationError
              .message
          : "",
    };
  };

/* =========================================================
   LIST
========================================================= */

const getEvaluations =
  async (
    query = {}
  ) => {
    const input =
      normalizeEvaluationFilter(
        query
      );

    const filter =
      {};

    if (
      input.decision &&
      input.decision !==
        "ALL"
    ) {
      filter.finalDecision =
        input.decision;
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    if (
      input.search
    ) {
      const escaped =
        input.search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const searchRegex =
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
                  searchRegex,
              },

              {
                candidateNumber:
                  searchRegex,
              },

              {
                email:
                  searchRegex,
              },

              {
                positionTitle:
                  searchRegex,
              },
            ],
          })
          .select(
            "_id"
          )
          .lean();

      const candidateIds =
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
              candidateIds,
          },
        },

        {
          remarks:
            searchRegex,
        },
      ];
    }

    const skip =
      (
        input.page -
        1
      ) *
      input.limit;

    const [
      records,
      total,
    ] =
      await Promise.all([
        InterviewEvaluation
          .find(
            filter
          )
          .populate(
            "candidate",
            "candidateNumber fullName email mobile city status positionTitle"
          )
          .populate(
            "interviewer",
            "displayName email"
          )
          .populate(
            "evaluatedBy",
            "displayName email"
          )
          .populate(
            "manpowerRequirement",
            "requestNumber positionTitle department assignedHr"
          )
          .populate({
            path:
              "interview",

            select:
              "interviewNumber positionTitle roundName roundNumber scheduledAt completedAt mode status",
          })
          .sort({
            evaluatedAt:
              -1,
          })
          .skip(
            skip
          )
          .limit(
            input.limit
          )
          .lean(),

        InterviewEvaluation
          .countDocuments(
            filter
          ),
      ]);

    return {
      records,

      pagination: {
        page:
          input.page,

        limit:
          input.limit,

        total,

        pages:
          Math.max(
            1,
            Math.ceil(
              total /
                input.limit
            )
          ),
      },
    };
  };

/* =========================================================
   SUMMARY
========================================================= */

const getEvaluationSummary =
  async () => {
    const result =
      await InterviewEvaluation
        .aggregate([
          {
            $group: {
              _id:
                "$finalDecision",

              count: {
                $sum:
                  1,
              },
            },
          },
        ]);

    const summary = {
      total:
        0,

      selected:
        0,

      hold:
        0,

      rejected:
        0,
    };

    result.forEach(
      (
        item
      ) => {
        const count =
          Number(
            item.count ||
              0
          );

        summary.total +=
          count;

        if (
          item._id ===
          "SELECTED"
        ) {
          summary.selected =
            count;
        }

        if (
          item._id ===
          "HOLD"
        ) {
          summary.hold =
            count;
        }

        if (
          item._id ===
          "REJECTED"
        ) {
          summary.rejected =
            count;
        }
      }
    );

    return summary;
  };

/* =========================================================
   DETAIL BY INTERVIEW

   Reuse normal evaluation detail so selected candidates
   also benefit from Selection repair.
========================================================= */

const getEvaluationByInterview =
  async (
    interviewId
  ) => {
    assertObjectId(
      interviewId,
      "interview ID"
    );

    const record =
      await InterviewEvaluation
        .findOne({
          interview:
            interviewId,
        })
        .select(
          "_id"
        )
        .lean();

    if (
      !record
    ) {
      throw new ApiError(
        404,
        "Evaluation not found"
      );
    }

    return getEvaluationById(
      record._id,
      {
        repairSelection:
          true,
      }
    );
  };

/* =========================================================
   RESEND DECISION EMAIL
========================================================= */

const resendDecisionEmail =
  async ({
    evaluationId,
  }) => {
    assertObjectId(
      evaluationId,
      "evaluation ID"
    );

    const evaluation =
      await InterviewEvaluation
        .findById(
          evaluationId
        );

    if (
      !evaluation
    ) {
      throw new ApiError(
        404,
        "Evaluation not found"
      );
    }

    const interview =
      await Interview
        .findById(
          evaluation.interview
        )
        .lean();

    const candidate =
      await Candidate
        .findById(
          evaluation.candidate
        )
        .lean();

    const requirement =
      await ManpowerRequirement
        .findById(
          evaluation
            .manpowerRequirement
        )
        .populate(
          "assignedHr",
          "displayName email status"
        );

    if (
      !candidate ||
      !interview
    ) {
      throw new ApiError(
        404,
        "Candidate or interview information is unavailable"
      );
    }

    if (
      !evaluation
        .decisionEmail
    ) {
      evaluation.decisionEmail =
        {};
    }

    evaluation
      .decisionEmail
      .status =
        "PENDING";

    evaluation
      .decisionEmail
      .lastAttemptAt =
        new Date();

    await evaluation.save();

    const hiringHr =
      requirement
        ?.assignedHr ||
      await resolveHiringHr(
        requirement
      );

    const result =
      await sendEvaluationDecisionEmail({
        candidate,

        evaluation:
          evaluation
            .toObject(),

        interview,

        hiringHr:
          hiringHr
            ?.toObject
            ? hiringHr
                .toObject()
            : hiringHr,
      });

    applyDecisionEmailResult(
      evaluation,
      result
    );

    await evaluation.save();

    if (
      !result.success
    ) {
      throw new ApiError(
        502,
        result.error ||
          "Decision email could not be sent"
      );
    }

    return getEvaluationById(
      evaluation._id,
      {
        repairSelection:
          true,
      }
    );
  };

/* =========================================================
   ATTACHMENT
========================================================= */

const getEvaluationAttachment =
  async (
    evaluationId
  ) => {
    assertObjectId(
      evaluationId,
      "evaluation ID"
    );

    const evaluation =
      await InterviewEvaluation
        .findById(
          evaluationId
        )
        .select(
          "interview attachment"
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

    if (
      !evaluation
        ?.attachment
        ?.storedName
    ) {
      throw new ApiError(
        404,
        "Evaluation document was not uploaded"
      );
    }

    return {
      path:
        getPermanentAttachmentPath(
          evaluation.interview,

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
          .mimeType ||
        "application/octet-stream",
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  completeEvaluation,

  getEvaluations,

  getEvaluationSummary,

  getEvaluationById,

  getEvaluationByInterview,

  resendDecisionEmail,

  getEvaluationAttachment,
};