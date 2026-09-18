import React, {
  useMemo,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../auth/AuthContext";

/* =========================================================
   RECRUITMENT
========================================================= */

import RecruitmentOverview from "./RecruitmentOverview";

/* =========================================================
   MANPOWER
========================================================= */

import ManpowerPage from "./Manpower/ManpowerPage";

/* =========================================================
   HIRING
========================================================= */

import HiringPage from "./Hiring/HiringPage";

import MyHiringPage from "./Hiring/MyHiringPage";

import HiringWorkspacePage from "./Hiring/HiringWorkspacePage";

/* =========================================================
   CANDIDATES
========================================================= */

import CandidatesPage from "./Candidates/CandidatesPage";

import CandidateDetailPage from "./Candidates/CandidateDetailPage";

/* =========================================================
   FOLLOW UPS
========================================================= */

import FollowUpsPage from "./FollowUps/FollowUpsPage";

/* =========================================================
   INTERVIEWS
========================================================= */

import InterviewsPage from "./Interviews/InterviewsPage";

import InterviewDetailPage from "./Interviews/InterviewDetailPage";

/* =========================================================
   EVALUATIONS
========================================================= */

import EvaluationsPage from "./Evaluations/EvaluationsPage";

import EvaluationDetailPage from "./Evaluations/EvaluationDetailPage";

/* =========================================================
   SELECTION
========================================================= */

import SelectionPage from "./Selection/SelectionPage";

import SelectionDetailPage from "./Selection/SelectionDetailPage";

/* =========================================================
   HELPERS
========================================================= */

const normalizeValue = (
  value
) =>
  String(
    value || ""
  )
    .trim()
    .toUpperCase();

/* =========================================================
   HR DEPARTMENT
========================================================= */

const isHrDepartment = (
  department
) => {
  const code =
    normalizeValue(
      department?.code ||
        department
          ?.department
          ?.code
    );

  const name =
    normalizeValue(
      department?.name ||
        department
          ?.department
          ?.name
    );

  return (
    code === "HR" ||
    name === "HR" ||
    name ===
      "HUMAN RESOURCES"
  );
};

/* =========================================================
   COLLECT DEPARTMENT MEMBERSHIPS

   Handles the access shapes currently used in SE-RMS while
   keeping DepartmentMembership authoritative.
========================================================= */

const getDepartmentMemberships =
  (
    access,
    user
  ) => {
    const candidates = [
      access
        ?.departmentMemberships,

      access
        ?.memberships,

      access
        ?.departments,

      user
        ?.departmentMemberships,

      user
        ?.memberships,
    ];

    const memberships =
      candidates.find(
        Array.isArray
      ) || [];

    const primary =
      access
        ?.primaryDepartment ||
      user
        ?.primaryDepartment ||
      null;

    if (
      primary &&
      typeof primary ===
        "object"
    ) {
      return [
        ...memberships,
        primary,
      ];
    }

    return memberships;
  };

/* =========================================================
   HR ACCESS PROFILE
========================================================= */

const getHrAccessProfile =
  ({
    user,
    access,
  }) => {
    /*
     * systemRole is authoritative for global authority.
     *
     * user.role remains as temporary legacy fallback only.
     */

    const systemRole =
      normalizeValue(
        access
          ?.systemRole ||
        user
          ?.systemRole ||
        user
          ?.role
      );

    const globalSuperAdmin =
      Boolean(
        access
          ?.globalSuperAdmin ||
        access
          ?.superAdmin ||
        systemRole ===
          "SUPER_ADMIN"
      );

    /* =====================================================
       GLOBAL SUPER ADMIN
    ===================================================== */

    if (
      globalSuperAdmin
    ) {
      return {
        globalSuperAdmin:
          true,

        hrMember:
          true,

        hrManager:
          true,

        hrDepartmentRole:
          "GLOBAL_SUPER_ADMIN",
      };
    }

    /* =====================================================
       DEPARTMENT MEMBERSHIP
    ===================================================== */

    const memberships =
      getDepartmentMemberships(
        access,
        user
      );

    const hrMembership =
      memberships.find(
        (
          membership
        ) =>
          isHrDepartment(
            membership
          )
      );

    const primaryDepartment =
      access
        ?.primaryDepartment ||
      user
        ?.primaryDepartment;

    const primaryIsHr =
      isHrDepartment(
        primaryDepartment
      );

    const departmentRole =
      normalizeValue(
        hrMembership
          ?.role ||
        hrMembership
          ?.departmentRole ||
        primaryDepartment
          ?.role ||
        primaryDepartment
          ?.departmentRole
      );

    const hrMember =
      Boolean(
        hrMembership ||
        primaryIsHr
      );

    const hrManager =
      hrMember &&
      [
        "DEPARTMENT_SUPER_ADMIN",
        "HOD",
        "ADMIN",
      ].includes(
        departmentRole
      );

    return {
      globalSuperAdmin:
        false,

      hrMember,

      hrManager,

      hrDepartmentRole:
        departmentRole,
    };
  };

/* =========================================================
   ACCESS DENIED
========================================================= */

const RecruitmentAccessDenied =
  ({
    title,
    description,
  }) => {
    const navigate =
      useNavigate();

    return (
      <section className="se-rec-coming-workspace">
        <div className="se-rec-coming-icon">
          !
        </div>

        <div>
          <span>
            RESTRICTED
          </span>

          <h2>
            {title ||
              "Access unavailable"}
          </h2>

          <p>
            {description ||
              "You do not have access to this recruitment workspace."}
          </p>

          <button
            type="button"
            className="se-rec-access-back-btn"
            onClick={() =>
              navigate(
                "/dashboard?app=recruitment&page=overview"
              )
            }
          >
            Back to Recruitment
          </button>
        </div>
      </section>
    );
  };

/* =========================================================
   RECRUITMENT WORKSPACE
========================================================= */

const RecruitmentWorkspace =
  () => {
    const location =
      useLocation();

    const {
      user,
      access,
      hasModule,
    } =
      useAuth();

    /* =====================================================
       QUERY
    ===================================================== */

    const params =
      useMemo(
        () =>
          new URLSearchParams(
            location.search
          ),
        [
          location.search,
        ]
      );

    const page =
      String(
        params.get(
          "page"
        ) ||
          "overview"
      )
        .trim()
        .toLowerCase();

    /* =====================================================
       EFFECTIVE ACCESS
    ===================================================== */

    const hrAccess =
      useMemo(
        () =>
          getHrAccessProfile({
            user,
            access,
          }),
        [
          user,
          access,
        ]
      );

    const hasRecruitmentModule =
      Boolean(
        hasModule(
          "RECRUITMENT"
        )
      );

    const hasManpowerModule =
      Boolean(
        hasModule(
          "MANPOWER"
        )
      );

    /* =====================================================
       GENERAL RECRUITMENT
    ===================================================== */

    const canUseRecruitment =
      hrAccess
        .globalSuperAdmin ||
      hasRecruitmentModule ||
      hasManpowerModule ||
      hrAccess
        .hrMember;

    /* =====================================================
       MANPOWER

       Backend remains final authority for CREATE.

       This only controls whether the workspace itself can
       be opened.
    ===================================================== */

    const canUseManpower =
      hrAccess
        .globalSuperAdmin ||
      hasManpowerModule ||
      hasRecruitmentModule;

    /* =====================================================
       HIRING QUEUE

       Management only.

       Roshan:
       HR DEPARTMENT_SUPER_ADMIN
       → yes

       Renu:
       HR MEMBER
       → no
    ===================================================== */

    const canUseHiringQueue =
      hrAccess
        .globalSuperAdmin ||
      hrAccess
        .hrManager;

    /* =====================================================
       MY HIRING
    ===================================================== */

    const canUseMyHiring =
      hrAccess
        .globalSuperAdmin ||
      hrAccess
        .hrMember;

    /* =====================================================
       RECRUITMENT OPERATIONS

       Candidate
       Follow-up
       Interview
       Evaluation
       Selection

       Backend permissions remain authoritative.
    ===================================================== */

    const canUseRecruitmentOperations =
      hrAccess
        .globalSuperAdmin ||
      hrAccess
        .hrMember;

    /* =====================================================
       SELECTION WORKSPACE

       Hiring HR needs access to candidates assigned to them.

       HR management and Global Super Admin also need access
       to the complete selection pipeline.

       Backend must still limit actual records/actions.
    ===================================================== */

    const canUseSelection =
      hrAccess
        .globalSuperAdmin ||
      hrAccess
        .hrMember ||
      hrAccess
        .hrManager;

    /* =====================================================
       OVERVIEW
    ===================================================== */

    if (
      page ===
      "overview"
    ) {
      if (
        !canUseRecruitment
      ) {
        return (
          <RecruitmentAccessDenied
            title="Recruitment access unavailable"
            description="Your account does not currently have access to Recruitment."
          />
        );
      }

      return (
        <RecruitmentOverview />
      );
    }

    /* =====================================================
       MANPOWER
    ===================================================== */

    if (
      page ===
      "manpower"
    ) {
      if (
        !canUseManpower
      ) {
        return (
          <RecruitmentAccessDenied
            title="Manpower access unavailable"
            description="You do not have permission to access manpower requests."
          />
        );
      }

      return (
        <ManpowerPage />
      );
    }

    /* =====================================================
       HIRING QUEUE

       HR MANAGEMENT ONLY
    ===================================================== */

    if (
      page ===
      "hiring"
    ) {
      if (
        !canUseHiringQueue
      ) {
        return (
          <RecruitmentAccessDenied
            title="Hiring Queue restricted"
            description="Hiring Queue is available to HR management. Assigned HR employees can use My Hiring."
          />
        );
      }

      return (
        <HiringPage />
      );
    }

    /* =====================================================
       MY HIRING
    ===================================================== */

    if (
      page ===
      "my-hiring"
    ) {
      if (
        !canUseMyHiring
      ) {
        return (
          <RecruitmentAccessDenied
            title="My Hiring unavailable"
            description="This workspace is available to HR users with assigned hiring requirements."
          />
        );
      }

      return (
        <MyHiringPage />
      );
    }

    /* =====================================================
       HIRING WORKSPACE
    ===================================================== */

    if (
      page ===
      "hiring-workspace"
    ) {
      if (
        !canUseMyHiring
      ) {
        return (
          <RecruitmentAccessDenied
            title="Hiring workspace restricted"
            description="You do not have access to this hiring requirement."
          />
        );
      }

      return (
        <HiringWorkspacePage />
      );
    }

    /* =====================================================
       CANDIDATES
    ===================================================== */

    if (
      page ===
      "candidates"
    ) {
      if (
        !canUseRecruitmentOperations
      ) {
        return (
          <RecruitmentAccessDenied
            title="Candidate access restricted"
            description="Candidate management is available to the HR recruitment team."
          />
        );
      }

      return (
        <CandidatesPage />
      );
    }

    /* =====================================================
       CANDIDATE DETAIL
    ===================================================== */

    if (
      page ===
      "candidate"
    ) {
      if (
        !canUseRecruitmentOperations
      ) {
        return (
          <RecruitmentAccessDenied
            title="Candidate access restricted"
            description="You do not have access to this candidate."
          />
        );
      }

      return (
        <CandidateDetailPage />
      );
    }

    /* =====================================================
       FOLLOW UPS
    ===================================================== */

    if (
      page ===
      "follow-ups"
    ) {
      if (
        !canUseRecruitmentOperations
      ) {
        return (
          <RecruitmentAccessDenied
            title="Follow-ups restricted"
            description="Candidate follow-ups are available to the HR recruitment team."
          />
        );
      }

      return (
        <FollowUpsPage />
      );
    }

    /* =====================================================
       INTERVIEWS
    ===================================================== */

    if (
      page ===
      "interviews"
    ) {
      if (
        !canUseRecruitmentOperations
      ) {
        return (
          <RecruitmentAccessDenied
            title="Interview access restricted"
            description="Interview management is available to authorised recruitment users."
          />
        );
      }

      return (
        <InterviewsPage />
      );
    }

    /* =====================================================
       INTERVIEW DETAIL
    ===================================================== */

    if (
      page ===
      "interview"
    ) {
      if (
        !canUseRecruitmentOperations
      ) {
        return (
          <RecruitmentAccessDenied
            title="Interview access restricted"
            description="You do not have access to this interview."
          />
        );
      }

      return (
        <InterviewDetailPage />
      );
    }

    /* =====================================================
       EVALUATIONS

       IMPORTANT:
       This now uses the dedicated Evaluation workspace.

       Previously this returned:
       <InterviewsPage evaluationMode={true} />
    ===================================================== */

    if (
      page ===
      "evaluations"
    ) {
      if (
        !canUseRecruitmentOperations
      ) {
        return (
          <RecruitmentAccessDenied
            title="Evaluation access restricted"
            description="Interview evaluations are available to authorised recruitment users."
          />
        );
      }

      return (
        <EvaluationsPage />
      );
    }

    /* =====================================================
       EVALUATION DETAIL
    ===================================================== */

    if (
      page ===
      "evaluation"
    ) {
      if (
        !canUseRecruitmentOperations
      ) {
        return (
          <RecruitmentAccessDenied
            title="Evaluation access restricted"
            description="You do not have access to this interview evaluation."
          />
        );
      }

      return (
        <EvaluationDetailPage />
      );
    }

    /* =====================================================
       SELECTED CANDIDATES
    ===================================================== */

    if (
      page ===
      "selections"
    ) {
      if (
        !canUseSelection
      ) {
        return (
          <RecruitmentAccessDenied
            title="Selection access restricted"
            description="Post-selection management is available to authorised HR recruitment users."
          />
        );
      }

      return (
        <SelectionPage />
      );
    }

    /* =====================================================
       SELECTION DETAIL
    ===================================================== */

    if (
      page ===
      "selection"
    ) {
      if (
        !canUseSelection
      ) {
        return (
          <RecruitmentAccessDenied
            title="Selection access restricted"
            description="You do not have access to this candidate selection workflow."
          />
        );
      }

      return (
        <SelectionDetailPage />
      );
    }

    /* =====================================================
       FALLBACK
    ===================================================== */

    return (
      <section className="se-rec-coming-workspace">
        <div className="se-rec-coming-icon">
          R
        </div>

        <div>
          <span>
            RECRUITMENT
          </span>

          <h2>
            Recruitment
          </h2>

          <p>
            Recruitment workspace.
          </p>

          <small>
            The requested
            recruitment workspace
            is not available.
          </small>
        </div>
      </section>
    );
  };

export default RecruitmentWorkspace;