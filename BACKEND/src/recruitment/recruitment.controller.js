const asyncHandler =
  require("../utils/asyncHandler");

const recruitmentService =
  require(
    "./recruitment.service"
  );

/* =========================================================
   CREATE CANDIDATE
========================================================= */

const createCandidate =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const candidate =
        await recruitmentService
          .createCandidate({
            requirementId:
              req.params
                .requirementId,

            body:
              req.body,

            user:
              req.user,
          });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Candidate created successfully",

          data: {
            candidate,
          },
        });
    }
  );

/* =========================================================
   DUPLICATE CHECK
========================================================= */

const checkDuplicate =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await recruitmentService
          .checkDuplicate({
            mobile:
              req.query.mobile,

            email:
              req.query.email,
          });

      return res
        .status(200)
        .json({
          success: true,
          data:
            result,
        });
    }
  );

/* =========================================================
   LIST REQUIREMENT CANDIDATES
========================================================= */

const listRequirementCandidates =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const candidates =
        await recruitmentService
          .listRequirementCandidates({
            requirementId:
              req.params
                .requirementId,

            status:
              req.query.status,

            search:
              req.query.search,
          });

      return res
        .status(200)
        .json({
          success: true,

          data: {
            candidates,
          },
        });
    }
  );

/* =========================================================
   GET CANDIDATE
========================================================= */

const getCandidate =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const candidate =
        await recruitmentService
          .getCandidate(
            req.params
              .candidateId
          );

      return res
        .status(200)
        .json({
          success: true,

          data: {
            candidate,
          },
        });
    }
  );

/* =========================================================
   CALL
========================================================= */

const addCallAttempt =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const candidate =
        await recruitmentService
          .addCallAttempt({
            candidateId:
              req.params
                .candidateId,

            body:
              req.body,

            user:
              req.user,
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Call activity recorded",

          data: {
            candidate,
          },
        });
    }
  );

/* =========================================================
   SCREEN
========================================================= */

const screenCandidate =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await recruitmentService
          .screenCandidate({
            candidateId:
              req.params
                .candidateId,

            body:
              req.body,

            user:
              req.user,
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Candidate screening completed",

          data:
            result,
        });
    }
  );

/* =========================================================
   SHORTLIST
========================================================= */

const shortlistCandidate =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const candidate =
        await recruitmentService
          .shortlistCandidate({
            candidateId:
              req.params
                .candidateId,

            user:
              req.user,

            remarks:
              req.body
                .remarks ||
              "",
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Candidate shortlisted",

          data: {
            candidate,
          },
        });
    }
  );

/* =========================================================
   REJECT
========================================================= */

const rejectCandidate =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const candidate =
        await recruitmentService
          .rejectCandidate({
            candidateId:
              req.params
                .candidateId,

            user:
              req.user,

            remarks:
              req.body
                .remarks ||
              "",
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Candidate rejected",

          data: {
            candidate,
          },
        });
    }
  );

/* =========================================================
   TIMELINE
========================================================= */

const getCandidateTimeline =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const activities =
        await recruitmentService
          .getCandidateTimeline(
            req.params
              .candidateId
          );

      return res
        .status(200)
        .json({
          success: true,

          data: {
            activities,
          },
        });
    }
  );

/* =========================================================
   MY TASKS
========================================================= */

const getMyRecruitmentTasks =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const tasks =
        await recruitmentService
          .getMyRecruitmentTasks(
            req.user._id
          );

      return res
        .status(200)
        .json({
          success: true,

          data: {
            tasks,
          },
        });
    }
  );

module.exports = {
  createCandidate,
  checkDuplicate,

  listRequirementCandidates,
  getCandidate,

  addCallAttempt,
  screenCandidate,

  shortlistCandidate,
  rejectCandidate,

  getCandidateTimeline,
  getMyRecruitmentTasks,
};