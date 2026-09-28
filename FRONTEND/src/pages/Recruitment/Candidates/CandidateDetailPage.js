import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../../../services/api";

import {
  getCandidate,
  getCandidateTimeline,
} from "../../../services/recruitmentService";

import {
  getInterviews,
} from "../../../services/interviewService";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import CandidateActionPanel from "./CandidateActionPanel";

import {
  buildRecruitmentUrl,
  formatRecruitmentDate,
  formatRecruitmentDateTime,
  getApiErrorMessage,
  getCandidateStatusMeta,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./Candidates.css";
import "../Interviews/Interviews.css";

/* =========================================================
   CONSTANTS
========================================================= */

const TABS = [
  "overview",
  "profile",
  "interviews",
  "activity",
];

/* =========================================================
   HELPERS
========================================================= */

const interviewTone = (status) => {
  const value = String(status || "")
    .trim()
    .toUpperCase();

  if (value === "COMPLETED") {
    return "success";
  }

  if (
    value === "CANCELLED" ||
    value === "NO_SHOW"
  ) {
    return "danger";
  }

  if (value === "RESCHEDULED") {
    return "warning";
  }

  if (value === "CHECKED_IN") {
    return "purple";
  }

  return "blue";
};

const formatMoney = (value) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(number);
};

const cleanValue = (
  value,
  fallback = "—"
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value)
    .replaceAll("_", " ")
    .trim();
};

const getInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "C";
  }

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};

/* =========================================================
   COMPONENT
========================================================= */

const CandidateDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(
    () =>
      new URLSearchParams(
        location.search
      ),
    [location.search]
  );

  const candidateId = String(
    params.get("id") || ""
  ).trim();

  const requestedTab = String(
    params.get("tab") || "overview"
  )
    .trim()
    .toLowerCase();

  const activeTab = TABS.includes(
    requestedTab
  )
    ? requestedTab
    : "overview";

  /* =====================================================
     STATE
  ===================================================== */

  const [
    candidate,
    setCandidate,
  ] = useState(null);

  const [
    timeline,
    setTimeline,
  ] = useState([]);

  const [
    interviews,
    setInterviews,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    cvOpening,
    setCvOpening,
  ] = useState(false);

  const [
    cvError,
    setCvError,
  ] = useState("");

  /* =====================================================
     MISSING CANDIDATE ID
  ===================================================== */

  useEffect(() => {
    if (candidateId) {
      return;
    }

    navigate(
      buildRecruitmentUrl(
        "candidates"
      ),
      {
        replace: true,
      }
    );
  }, [
    candidateId,
    navigate,
  ]);

  /* =====================================================
     LOAD CANDIDATE
  ===================================================== */

  const loadCandidate =
    useCallback(
      async () => {
        if (!candidateId) {
          return;
        }

        try {
          setLoading(true);
          setError("");

          const results =
            await Promise.allSettled([
              getCandidate(
                candidateId
              ),

              getCandidateTimeline(
                candidateId
              ),

              getInterviews({
                candidate:
                  candidateId,
              }),
            ]);

          /* CANDIDATE */

          if (
            results[0].status ===
            "fulfilled"
          ) {
            setCandidate(
              results[0].value
            );
          } else {
            setCandidate(null);

            setError(
              getApiErrorMessage(
                results[0].reason,
                "Candidate could not be loaded."
              )
            );
          }

          /* TIMELINE */

          if (
            results[1].status ===
            "fulfilled"
          ) {
            setTimeline(
              Array.isArray(
                results[1].value
              )
                ? results[1].value
                : []
            );
          } else {
            setTimeline([]);
          }

          /* INTERVIEWS */

          if (
            results[2].status ===
            "fulfilled"
          ) {
            const records =
              Array.isArray(
                results[2].value
              )
                ? results[2].value
                : [];

            const candidateInterviews =
              records.filter(
                (interview) => {
                  if (
                    !interview
                      ?.candidate
                  ) {
                    return true;
                  }

                  const interviewCandidateId =
                    String(
                      interview
                        ?.candidate
                        ?._id ||
                      interview
                        ?.candidate ||
                      ""
                    );

                  return (
                    interviewCandidateId ===
                    candidateId
                  );
                }
              );

            setInterviews(
              candidateInterviews
            );
          } else {
            setInterviews([]);
          }
        } finally {
          setLoading(false);
        }
      },
      [candidateId]
    );

  useEffect(() => {
    if (candidateId) {
      loadCandidate();
    }
  }, [
    candidateId,
    loadCandidate,
  ]);

  /* =====================================================
     DERIVED DATA
  ===================================================== */

  const status =
    getCandidateStatusMeta(
      candidate?.status
    );

  const requirement =
    candidate
      ?.manpowerRequirement ||
    {};

  const requirementId =
    getRecordId(
      requirement
    );

  const candidateName =
    safeText(
      candidate?.fullName,
      "Candidate"
    );

  const candidateNumber =
    safeText(
      candidate?.candidateNumber,
      "Candidate"
    );

  const positionTitle =
    safeText(
      candidate?.positionTitle ||
        requirement
          ?.positionTitle,
      "Position not specified"
    );

  const departmentName =
    safeText(
      candidate
        ?.department
        ?.name ||
        requirement
          ?.department
          ?.name,
      "Department not specified"
    );

  const requestNumber =
    safeText(
      requirement
        ?.requestNumber,
      "—"
    );

  const designation =
    cleanValue(
      candidate
        ?.currentDesignation
    );

  const company =
    cleanValue(
      candidate
        ?.currentCompany
    );

  const locationText =
    [
      candidate?.city,
      candidate?.state,
    ]
      .filter(Boolean)
      .join(", ") ||
    "—";

  const totalExperience =
    candidate
      ?.totalExperienceYears ??
    "—";

  const relevantExperience =
    candidate
      ?.relevantExperienceYears ??
    "—";

  const noticePeriod =
    candidate
      ?.noticePeriodDays ??
    "—";

  const earliestJoining =
    formatRecruitmentDate(
      candidate
        ?.earliestJoiningDate
    );

  const nextAction =
    cleanValue(
      candidate?.nextAction,
      "None"
    );

  const source =
    cleanValue(
      candidate?.source
    );

  const hasResume =
    Boolean(
      candidate
        ?.resume
        ?.fileName ||
      candidate
        ?.resume
        ?.fileUrl
    );

  const skills =
    Array.isArray(
      candidate?.skills
    )
      ? candidate.skills.filter(
          Boolean
        )
      : [];

  /* =====================================================
     CHANGE TAB
  ===================================================== */

  const setTab = (value) => {
    navigate(
      buildRecruitmentUrl(
        "candidate",
        {
          id: candidateId,
          tab: value,
        }
      ),
      {
        replace: true,
      }
    );
  };

  /* =====================================================
     VIEW CV
  ===================================================== */

  const handleViewCv =
    async () => {
      if (
        !candidateId ||
        cvOpening
      ) {
        return;
      }

      try {
        setCvOpening(true);
        setCvError("");

        const response =
          await api.get(
            `/resume-parser/candidate-resume/${candidateId}`,
            {
              responseType:
                "blob",
            }
          );

        const contentType =
          response?.headers?.[
            "content-type"
          ] ||
          "application/pdf";

        const blob =
          new Blob(
            [response.data],
            {
              type:
                contentType,
            }
          );

        const objectUrl =
          window.URL
            .createObjectURL(
              blob
            );

        const newWindow =
          window.open(
            objectUrl,
            "_blank",
            "noopener,noreferrer"
          );

        if (!newWindow) {
          const anchor =
            document.createElement(
              "a"
            );

          anchor.href =
            objectUrl;

          anchor.target =
            "_blank";

          anchor.rel =
            "noopener noreferrer";

          document.body
            .appendChild(
              anchor
            );

          anchor.click();
          anchor.remove();
        }

        window.setTimeout(
          () => {
            window.URL
              .revokeObjectURL(
                objectUrl
              );
          },
          60000
        );
      } catch (
        cvRequestError
      ) {
        setCvError(
          getApiErrorMessage(
            cvRequestError,
            "Candidate CV could not be opened."
          )
        );
      } finally {
        setCvOpening(false);
      }
    };

  /* =====================================================
     OPEN INTERVIEW
  ===================================================== */

  const handleOpenInterview =
    (interview) => {
      const interviewId =
        getRecordId(
          interview
        );

      if (!interviewId) {
        return;
      }

      navigate(
        buildRecruitmentUrl(
          "interview",
          {
            id:
              interviewId,
          }
        )
      );
    };

  /* =====================================================
     REDIRECT
  ===================================================== */

  if (!candidateId) {
    return null;
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <section className="se-candidate-detail-page se-candidate-detail-production">
        <div className="se-candidate-detail-loading">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (!candidate) {
    return (
      <section className="se-candidate-detail-page se-candidate-detail-production">
        <div className="se-candidate-detail-fatal">
          <span>!</span>

          <h2>
            Candidate unavailable
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                buildRecruitmentUrl(
                  "candidates"
                )
              )
            }
          >
            ← Back to Candidates
          </button>
        </div>
      </section>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <section className="se-candidate-detail-page se-candidate-detail-production">
      {/* =================================================
          PAGE TOOLBAR
      ================================================== */}

      <div className="se-cd-toolbar">
        <button
          type="button"
          className="se-cd-back"
          onClick={() =>
            navigate(
              buildRecruitmentUrl(
                "candidates"
              )
            )
          }
        >
          <span>←</span>
          Candidates
        </button>

        <button
          type="button"
          className="se-cd-refresh"
          onClick={
            loadCandidate
          }
        >
          <span>↻</span>
          Refresh
        </button>
      </div>

      {/* =================================================
          CANDIDATE HERO
      ================================================== */}

      <section className="se-cd-hero">
        <div className="se-cd-hero-main">
          <div className="se-cd-avatar">
            {getInitials(
              candidateName
            )}
          </div>

          <div className="se-cd-identity">
            <div className="se-cd-identity-meta">
              <span className="se-cd-number">
                {candidateNumber}
              </span>

              <RecruitmentStatusBadge
                label={
                  status.label
                }
                tone={
                  status.tone
                }
              />
            </div>

            <h1>
              {candidateName}
            </h1>

            <div className="se-cd-workline">
              {designation !==
              "—" ? (
                <strong>
                  {designation}
                </strong>
              ) : null}

              {designation !==
                "—" &&
              company !==
                "—" ? (
                <span>at</span>
              ) : null}

              {company !==
              "—" ? (
                <strong>
                  {company}
                </strong>
              ) : null}
            </div>

            <div className="se-cd-contact">
              {candidate?.mobile ? (
                <a
                  href={`tel:${candidate.mobile}`}
                >
                  <span>☎</span>
                  {
                    candidate.mobile
                  }
                </a>
              ) : null}

              {candidate?.email ? (
                <a
                  href={`mailto:${candidate.email}`}
                >
                  <span>✉</span>
                  {
                    candidate.email
                  }
                </a>
              ) : null}

              {locationText !==
              "—" ? (
                <span>
                  <i>●</i>
                  {locationText}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="se-cd-requirement">
          <span className="se-cd-section-label">
            HIRING FOR
          </span>

          <strong>
            {positionTitle}
          </strong>

          <div className="se-cd-requirement-meta">
            <span>
              {requestNumber}
            </span>

            <i />

            <span>
              {departmentName}
            </span>
          </div>

          {requirementId ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "hiring-workspace",
                    {
                      id:
                        requirementId,
                      tab:
                        "candidates",
                      from:
                        "candidate",
                    }
                  )
                )
              }
            >
              Hiring Workspace
              <span>→</span>
            </button>
          ) : null}
        </div>
      </section>

      {/* =================================================
          KEY BUSINESS INSIGHT
      ================================================== */}

      <section className="se-cd-insight-strip">
        <div>
          <span>
            EXPERIENCE
          </span>

          <strong>
            {totalExperience !==
            "—"
              ? `${totalExperience} yrs`
              : "—"}
          </strong>
        </div>

        <div>
          <span>
            CURRENT CTC
          </span>

          <strong>
            {formatMoney(
              candidate
                ?.currentSalary
            )}
          </strong>
        </div>

        <div>
          <span>
            EXPECTED CTC
          </span>

          <strong>
            {formatMoney(
              candidate
                ?.expectedSalary
            )}
          </strong>
        </div>

        <div>
          <span>
            NOTICE PERIOD
          </span>

          <strong>
            {noticePeriod !==
            "—"
              ? `${noticePeriod} days`
              : "—"}
          </strong>
        </div>

        <div>
          <span>
            JOINING
          </span>

          <strong>
            {earliestJoining}
          </strong>
        </div>

        <div className="se-cd-next-action">
          <span>
            NEXT ACTION
          </span>

          <strong>
            {nextAction}
          </strong>
        </div>
      </section>

      {/* =================================================
          WORKFLOW ACTIONS
      ================================================== */}

      <section className="se-cd-action-section">
        <div className="se-cd-action-heading">
          <div>
            <span>
              RECRUITMENT WORKFLOW
            </span>

            <strong>
              Candidate Actions
            </strong>
          </div>
        </div>

        <CandidateActionPanel
          candidate={
            candidate
          }
          interviews={
            interviews
          }
          onChanged={
            loadCandidate
          }
          onOpenInterview={
            handleOpenInterview
          }
        />
      </section>

      {/* =================================================
          TABS
      ================================================== */}

      <div className="se-cd-tabs">
        <button
          type="button"
          className={
            activeTab ===
            "overview"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "overview"
            )
          }
        >
          Overview
        </button>

        <button
          type="button"
          className={
            activeTab ===
            "profile"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "profile"
            )
          }
        >
          Profile
        </button>

        <button
          type="button"
          className={
            activeTab ===
            "interviews"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "interviews"
            )
          }
        >
          Interviews

          <span>
            {
              interviews.length
            }
          </span>
        </button>

        <button
          type="button"
          className={
            activeTab ===
            "activity"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "activity"
            )
          }
        >
          Activity

          <span>
            {
              timeline.length
            }
          </span>
        </button>
      </div>

      {/* =================================================
          OVERVIEW
      ================================================== */}

      {activeTab ===
      "overview" ? (
        <div className="se-cd-overview-grid">
          {/* =============================================
              PROFESSIONAL DETAILS
          ============================================== */}

          <article className="se-cd-card se-cd-professional-card">
            <header className="se-cd-card-header">
              <div>
                <span>
                  CANDIDATE PROFILE
                </span>

                <h2>
                  Professional Details
                </h2>
              </div>
            </header>

            <div className="se-cd-detail-table">
              <div>
                <span>
                  Total Experience
                </span>

                <strong>
                  {totalExperience !==
                  "—"
                    ? `${totalExperience} years`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Relevant Experience
                </span>

                <strong>
                  {relevantExperience !==
                  "—"
                    ? `${relevantExperience} years`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Current CTC
                </span>

                <strong>
                  {formatMoney(
                    candidate
                      ?.currentSalary
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Expected CTC
                </span>

                <strong>
                  {formatMoney(
                    candidate
                      ?.expectedSalary
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Notice Period
                </span>

                <strong>
                  {noticePeriod !==
                  "—"
                    ? `${noticePeriod} days`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Earliest Joining
                </span>

                <strong>
                  {earliestJoining}
                </strong>
              </div>

              <div>
                <span>
                  Source
                </span>

                <strong>
                  {source}
                </strong>
              </div>

              <div>
                <span>
                  Next Action
                </span>

                <strong className="se-cd-action-value">
                  {nextAction}
                </strong>
              </div>
            </div>

            {skills.length >
            0 ? (
              <div className="se-cd-skills">
                <span>
                  KEY SKILLS
                </span>

                <div>
                  {skills.map(
                    (
                      skill,
                      index
                    ) => (
                      <b
                        key={`${skill}-${index}`}
                      >
                        {skill}
                      </b>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </article>

          {/* =============================================
              RESUME
          ============================================== */}

          <article className="se-cd-card se-cd-resume-panel">
            <header className="se-cd-card-header">
              <div>
                <span>
                  DOCUMENT
                </span>

                <h2>
                  Candidate Resume
                </h2>
              </div>
            </header>

            {hasResume ? (
              <>
                <div className="se-cd-resume-file">
                  <span className="se-cd-pdf-icon">
                    PDF
                  </span>

                  <div>
                    <strong>
                      {safeText(
                        candidate
                          ?.resume
                          ?.originalName,
                        "Candidate Resume.pdf"
                      )}
                    </strong>

                    <small>
                      Resume attached
                    </small>
                  </div>
                </div>

                <button
                  type="button"
                  className="se-cd-resume-button"
                  onClick={
                    handleViewCv
                  }
                  disabled={
                    cvOpening
                  }
                >
                  {cvOpening
                    ? "Opening..."
                    : "View Resume"}

                  {!cvOpening ? (
                    <span>↗</span>
                  ) : null}
                </button>

                {cvError ? (
                  <div className="se-cd-error">
                    {cvError}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="se-cd-no-data">
                <span>CV</span>

                <strong>
                  No resume attached
                </strong>
              </div>
            )}
          </article>
        </div>
      ) : null}

      {/* =================================================
          PROFILE
      ================================================== */}

      {activeTab ===
      "profile" ? (
        <div className="se-cd-profile-layout">
          {/* EDUCATION */}

          <article className="se-cd-card">
            <header className="se-cd-card-header">
              <div>
                <span>
                  EDUCATION
                </span>

                <h2>
                  Academic History
                </h2>
              </div>
            </header>

            {Array.isArray(
              candidate?.education
            ) &&
            candidate
              .education
              .length >
              0 ? (
              <div className="se-cd-history">
                {candidate
                  .education
                  .map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        className="se-cd-history-row"
                        key={
                          item._id ||
                          index
                        }
                      >
                        <div className="se-cd-history-icon">
                          E
                        </div>

                        <div className="se-cd-history-main">
                          <strong>
                            {safeText(
                              item
                                ?.qualification,
                              "Qualification"
                            )}
                          </strong>

                          {item
                            ?.specialization ? (
                            <span>
                              {
                                item
                                  .specialization
                              }
                            </span>
                          ) : null}

                          <p>
                            {safeText(
                              item
                                ?.institute ||
                                item
                                  ?.university,
                              "—"
                            )}
                          </p>
                        </div>

                        {item?.year ? (
                          <time>
                            {
                              item.year
                            }
                          </time>
                        ) : null}
                      </div>
                    )
                  )}
              </div>
            ) : (
              <div className="se-cd-no-data">
                <span>E</span>

                <strong>
                  No education data
                </strong>
              </div>
            )}
          </article>

          {/* EXPERIENCE */}

          <article className="se-cd-card">
            <header className="se-cd-card-header">
              <div>
                <span>
                  EXPERIENCE
                </span>

                <h2>
                  Employment History
                </h2>
              </div>
            </header>

            {Array.isArray(
              candidate
                ?.experienceHistory
            ) &&
            candidate
              .experienceHistory
              .length >
              0 ? (
              <div className="se-cd-history">
                {candidate
                  .experienceHistory
                  .map(
                    (
                      item,
                      index
                    ) => {
                      const period =
                        item
                          ?.current
                          ? `${
                              formatRecruitmentDate(
                                item
                                  ?.from
                              ) !==
                              "—"
                                ? `${formatRecruitmentDate(
                                    item
                                      ?.from
                                  )} — `
                                : ""
                            }Present`
                          : [
                              formatRecruitmentDate(
                                item
                                  ?.from
                              ),
                              formatRecruitmentDate(
                                item
                                  ?.to
                              ),
                            ]
                              .filter(
                                (
                                  value
                                ) =>
                                  value &&
                                  value !==
                                    "—"
                              )
                              .join(
                                " — "
                              );

                      return (
                        <div
                          className="se-cd-history-row"
                          key={
                            item._id ||
                            index
                          }
                        >
                          <div className="se-cd-history-icon">
                            W
                          </div>

                          <div className="se-cd-history-main">
                            <strong>
                              {safeText(
                                item
                                  ?.designation,
                                "Designation"
                              )}
                            </strong>

                            <span>
                              {safeText(
                                item
                                  ?.company,
                                "Company"
                              )}
                            </span>

                            {item
                              ?.description ? (
                              <p>
                                {
                                  item
                                    .description
                                }
                              </p>
                            ) : null}
                          </div>

                          {period ? (
                            <time>
                              {period}
                            </time>
                          ) : null}
                        </div>
                      );
                    }
                  )}
              </div>
            ) : (
              <div className="se-cd-no-data">
                <span>W</span>

                <strong>
                  No employment history
                </strong>
              </div>
            )}
          </article>
        </div>
      ) : null}

      {/* =================================================
          INTERVIEWS
      ================================================== */}

      {activeTab ===
      "interviews" ? (
        <article className="se-cd-card">
          <header className="se-cd-card-header">
            <div>
              <span>
                INTERVIEWS
              </span>

              <h2>
                Interview History
              </h2>
            </div>

            <strong className="se-cd-header-count">
              {interviews.length}
            </strong>
          </header>

          {interviews.length >
          0 ? (
            <div className="se-cd-interviews">
              {interviews.map(
                (interview) => {
                  const id =
                    getRecordId(
                      interview
                    );

                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() =>
                        handleOpenInterview(
                          interview
                        )
                      }
                    >
                      <span className="se-cd-interview-icon">
                        I
                      </span>

                      <span className="se-cd-interview-main">
                        <strong>
                          {safeText(
                            interview
                              ?.roundName,
                            `Round ${
                              interview
                                ?.roundNumber ||
                              1
                            }`
                          )}
                        </strong>

                        <small>
                          {formatRecruitmentDateTime(
                            interview
                              ?.scheduledAt
                          )}
                        </small>
                      </span>

                      <RecruitmentStatusBadge
                        label={safeText(
                          interview
                            ?.status,
                          "Scheduled"
                        ).replaceAll(
                          "_",
                          " "
                        )}
                        tone={interviewTone(
                          interview
                            ?.status
                        )}
                      />

                      <span className="se-cd-row-arrow">
                        →
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <div className="se-cd-no-data">
              <span>I</span>

              <strong>
                No interviews
              </strong>
            </div>
          )}
        </article>
      ) : null}

      {/* =================================================
          ACTIVITY
      ================================================== */}

      {activeTab ===
      "activity" ? (
        <article className="se-cd-card">
          <header className="se-cd-card-header">
            <div>
              <span>
                ACTIVITY
              </span>

              <h2>
                Recruitment Activity
              </h2>
            </div>

            <strong className="se-cd-header-count">
              {timeline.length}
            </strong>
          </header>

          {timeline.length >
          0 ? (
            <div className="se-cd-timeline">
              {timeline.map(
                (
                  item,
                  index
                ) => (
                  <div
                    className="se-cd-timeline-row"
                    key={
                      item._id ||
                      index
                    }
                  >
                    <div className="se-cd-timeline-track">
                      <span />

                      {index <
                      timeline.length -
                        1 ? (
                        <i />
                      ) : null}
                    </div>

                    <div className="se-cd-timeline-content">
                      <div className="se-cd-timeline-heading">
                        <strong>
                          {safeText(
                            item
                              ?.type ||
                              item
                                ?.activityType,
                            "Activity"
                          ).replaceAll(
                            "_",
                            " "
                          )}
                        </strong>

                        <time>
                          {formatRecruitmentDateTime(
                            item
                              ?.createdAt ||
                              item
                                ?.activityAt
                          )}
                        </time>
                      </div>

                      {item
                        ?.description ||
                      item?.remarks ||
                      item?.note ? (
                        <p>
                          {safeText(
                            item
                              ?.description ||
                              item
                                ?.remarks ||
                              item
                                ?.note,
                            ""
                          )}
                        </p>
                      ) : null}

                      {item
                        ?.createdBy
                        ?.displayName ? (
                        <small>
                          {
                            item
                              .createdBy
                              .displayName
                          }
                        </small>
                      ) : null}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="se-cd-no-data">
              <span>A</span>

              <strong>
                No activity
              </strong>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
};

export default CandidateDetailPage;