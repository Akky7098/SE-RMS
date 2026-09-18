const mongoose =
  require("mongoose");

const path =
  require("path");

const {
  Candidate,
} =
  require(
    "../recruitment/candidate.model"
  );

const {
  parseResumeForRequirement,
} =
  require(
    "./resumeParser.service"
  );

const {
  getTemporaryResumeData,
  deleteTemporaryResume,
  findCandidateResume,
} =
  require(
    "./resumeStorage.service"
  );

/* =========================================================
   SAFE INLINE FILE NAME
========================================================= */

const getSafeDownloadName =
  (
    value
  ) => {
    return path
      .basename(
        String(
          value ||
            "Candidate Resume.pdf"
        )
      )
      .replace(
        /[\r\n"]/g,
        ""
      )
      .slice(
        0,
        180
      );
  };

/* =========================================================
   PARSE PDF
========================================================= */

const parseResume =
  async (
    req,
    res,
    next
  ) => {
    try {
      if (
        !req.file
      ) {
        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "Resume PDF is required",
          });
      }

      const requirementId =
        String(
          req.body
            ?.requirementId ||
            ""
        ).trim();

      if (
        !requirementId
      ) {
        await deleteTemporaryResume(
          req.file
            .filename
        );

        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "requirementId is required",
          });
      }

      if (
        !mongoose.Types
          .ObjectId
          .isValid(
            requirementId
          )
      ) {
        await deleteTemporaryResume(
          req.file
            .filename
        );

        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "Invalid manpower requirement ID",
          });
      }

      const result =
        await parseResumeForRequirement({
          filePath:
            req.file.path,

          requirementId,

          user:
            req.user ||
            null,
        });

      const resume =
        getTemporaryResumeData(
          req.file
        );

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          message:
            result
              ?.parserMeta
              ?.needsReview
              ? "Resume parsed. Some fields require HR review before candidate creation."
              : "Resume parsed successfully. Please review the extracted details before creating the candidate.",

          data: {
            requirement:
              result.requirement,

            candidate:
              result.candidate,

            resume: {
              ...resume,

              temporary:
                true,

              parsed:
                true,

              parserProvider:
                "LOCAL_PDF_PARSER",

              parserConfidence:
                result
                  ?.parserMeta
                  ?.confidence ??
                null,
            },

            duplicate:
              result.duplicate,

            match:
              result.match,

            reviewFields:
              result.reviewFields,

            parserMeta:
              result.parserMeta,
          },
        });
    } catch (
      error
    ) {
      if (
        req.file
          ?.filename
      ) {
        await deleteTemporaryResume(
          req.file
            .filename
        );
      }

      next(
        error
      );
    }
  };

/* =========================================================
   CANCEL TEMP UPLOAD
========================================================= */

const cancelTemporaryResume =
  async (
    req,
    res,
    next
  ) => {
    try {
      const tempFileName =
        String(
          req.body
            ?.tempFileName ||
            ""
        ).trim();

      if (
        !tempFileName
      ) {
        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "tempFileName is required",
          });
      }

      await deleteTemporaryResume(
        tempFileName
      );

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          message:
            "Temporary resume removed successfully",
        });
    } catch (
      error
    ) {
      next(
        error
      );
    }
  };

/* =========================================================
   VIEW CANDIDATE CV
========================================================= */

const viewCandidateResume =
  async (
    req,
    res,
    next
  ) => {
    try {
      const candidateId =
        String(
          req.params
            ?.candidateId ||
            ""
        ).trim();

      if (
        !mongoose.Types
          .ObjectId
          .isValid(
            candidateId
          )
      ) {
        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "Invalid candidate ID",
          });
      }

      const candidate =
        await Candidate
          .findById(
            candidateId
          )
          .select(
            "_id fullName candidateNumber resume assignedHr createdBy"
          )
          .lean();

      if (
        !candidate
      ) {
        return res
          .status(
            404
          )
          .json({
            success:
              false,

            message:
              "Candidate not found",
          });
      }

      if (
        !candidate
          .resume
          ?.fileName
      ) {
        return res
          .status(
            404
          )
          .json({
            success:
              false,

            message:
              "Resume not available for this candidate",
          });
      }

      const filePath =
        await findCandidateResume(
          candidateId,
          candidate
            .resume
            .fileName
        );

      if (
        !filePath
      ) {
        return res
          .status(
            404
          )
          .json({
            success:
              false,

            message:
              "Resume file not found",
          });
      }

      const downloadName =
        getSafeDownloadName(
          candidate
            .resume
            .originalName ||
          `${candidate.candidateNumber}-resume.pdf`
        );

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${downloadName}"`
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store"
      );

      return res.sendFile(
        filePath
      );
    } catch (
      error
    ) {
      next(
        error
      );
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  parseResume,

  cancelTemporaryResume,

  viewCandidateResume,
};