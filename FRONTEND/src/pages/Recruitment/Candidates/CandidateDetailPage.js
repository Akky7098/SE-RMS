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

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

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
   TABS
========================================================= */

const TABS = [
  "overview",
  "profile",
  "interviews",
  "activity",
];

/* =========================================================
   INTERVIEW TONE
========================================================= */

const interviewTone = (
  status
) => {
  const value =
    String(
      status ||
        ""
    ).toUpperCase();

  if (
    value ===
    "COMPLETED"
  ) {
    return "success";
  }

  if (
    value ===
      "CANCELLED" ||
    value ===
      "NO_SHOW"
  ) {
    return "danger";
  }

  if (
    value ===
    "RESCHEDULED"
  ) {
    return "warning";
  }

  if (
    value ===
    "CHECKED_IN"
  ) {
    return "purple";
  }

  return "blue";
};

/* =========================================================
   MONEY
========================================================= */

const formatMoney = (
  value
) => {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    ) ||
    number <=
      0
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style:
        "currency",

      currency:
        "INR",

      maximumFractionDigits:
        0,
    }
  ).format(
    number
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const CandidateDetailPage =
  () => {
    const location =
      useLocation();

    const navigate =
      useNavigate();

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

    const candidateId =
      String(
        params.get(
          "id"
        ) ||
        ""
      ).trim();

    const tab =
      String(
        params.get(
          "tab"
        ) ||
        "overview"
      )
        .trim()
        .toLowerCase();

    const activeTab =
      TABS.includes(
        tab
      )
        ? tab
        : "overview";

    /* =====================================================
       STATE
    ===================================================== */

    const [
      candidate,
      setCandidate,
    ] = useState(
      null
    );

    const [
      timeline,
      setTimeline,
    ] = useState(
      []
    );

    const [
      interviews,
      setInterviews,
    ] = useState(
      []
    );

    const [
      loading,
      setLoading,
    ] = useState(
      true
    );

    const [
      error,
      setError,
    ] = useState(
      ""
    );

    const [
      cvOpening,
      setCvOpening,
    ] = useState(
      false
    );

    const [
      cvError,
      setCvError,
    ] = useState(
      ""
    );

    /* =====================================================
       MISSING ID
    ===================================================== */

    useEffect(() => {
      if (
        candidateId
      ) {
        return;
      }

      navigate(
        buildRecruitmentUrl(
          "candidates"
        ),
        {
          replace:
            true,
        }
      );
    }, [
      candidateId,
      navigate,
    ]);

    /* =====================================================
       LOAD CANDIDATE + TIMELINE + INTERVIEWS
    ===================================================== */

    const loadCandidate =
      useCallback(
        async () => {
          if (
            !candidateId
          ) {
            return;
          }

          try {
            setLoading(
              true
            );

            setError(
              ""
            );

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

            /* =============================================
               CANDIDATE
            ============================================== */

            if (
              results[0]
                .status ===
              "fulfilled"
            ) {
              setCandidate(
                results[0]
                  .value
              );
            } else {
              setCandidate(
                null
              );

              setError(
                getApiErrorMessage(
                  results[0]
                    .reason,
                  "Candidate could not be loaded."
                )
              );
            }

            /* =============================================
               TIMELINE
            ============================================== */

            if (
              results[1]
                .status ===
              "fulfilled"
            ) {
              setTimeline(
                Array.isArray(
                  results[1]
                    .value
                )
                  ? results[1]
                      .value
                  : []
              );
            } else {
              setTimeline(
                []
              );
            }

            /* =============================================
               INTERVIEWS
            ============================================== */

            if (
              results[2]
                .status ===
              "fulfilled"
            ) {
              const records =
                Array.isArray(
                  results[2]
                    .value
                )
                  ? results[2]
                      .value
                  : [];

              const candidateInterviews =
                records.filter(
                  (
                    interview
                  ) => {
                    /*
                     * If backend has already filtered by
                     * candidate, records may still be returned
                     * without a populated candidate object.
                     */

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
              setInterviews(
                []
              );
            }
          } finally {
            setLoading(
              false
            );
          }
        },
        [
          candidateId,
        ]
      );

    useEffect(() => {
      if (
        candidateId
      ) {
        loadCandidate();
      }
    }, [
      candidateId,
      loadCandidate,
    ]);

    /* =====================================================
       STATUS / REQUIREMENT
    ===================================================== */

    const status =
      getCandidateStatusMeta(
        candidate?.status
      );

    const requirement =
      candidate
        ?.manpowerRequirement ||
      {};

    const hasResume =
      Boolean(
        candidate
          ?.resume
          ?.fileName ||
        candidate
          ?.resume
          ?.fileUrl
      );

    /* =====================================================
       CHANGE TAB
    ===================================================== */

    const setTab = (
      value
    ) => {
      navigate(
        buildRecruitmentUrl(
          "candidate",
          {
            id:
              candidateId,

            tab:
              value,
          }
        ),
        {
          replace:
            true,
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
          setCvOpening(
            true
          );

          setCvError(
            ""
          );

          const response =
            await api.get(
              `/resume-parser/candidate-resume/${candidateId}`,
              {
                responseType:
                  "blob",
              }
            );

          const contentType =
            response
              ?.headers
              ?.[
                "content-type"
              ] ||
            "application/pdf";

          const blob =
            new Blob(
              [
                response.data,
              ],
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

          if (
            !newWindow
          ) {
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
          setCvOpening(
            false
          );
        }
      };

    /* =====================================================
       OPEN / MANAGE INTERVIEW

       CandidateActionPanel uses this after an interview
       already exists.
    ===================================================== */

    const handleOpenInterview =
      (
        interview
      ) => {
        const interviewId =
          getRecordId(
            interview
          );

        if (
          !interviewId
        ) {
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
       WAIT FOR REDIRECT
    ===================================================== */

    if (
      !candidateId
    ) {
      return null;
    }

    /* =====================================================
       LOADING
    ===================================================== */

    if (
      loading
    ) {
      return (
        <section className="se-candidate-detail-page">
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

    if (
      !candidate
    ) {
      return (
        <section className="se-candidate-detail-page">
          <div className="se-candidate-detail-fatal">
            <span>
              !
            </span>

            <h2>
              Candidate unavailable
            </h2>

            <p>
              {
                error
              }
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
      <section className="se-candidate-detail-page">
        {/* =================================================
            TOP BAR
        ================================================== */}

        <div className="se-candidate-detail-topbar">
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
            ← Candidates
          </button>

          <button
            type="button"
            onClick={
              loadCandidate
            }
          >
            ↻ Refresh
          </button>
        </div>

        {/* =================================================
            HERO
        ================================================== */}

        <section className="se-candidate-detail-hero">
          <span className="se-candidate-detail-avatar">
            {safeText(
              candidate
                ?.fullName,
              "C"
            )
              .charAt(
                0
              )
              .toUpperCase()}
          </span>

          <div className="se-candidate-detail-identity">
            <div>
              <span>
                {safeText(
                  candidate
                    ?.candidateNumber,
                  "CANDIDATE"
                )}
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
              {safeText(
                candidate
                  ?.fullName,
                "Candidate"
              )}
            </h1>

            <p>
              {safeText(
                candidate
                  ?.currentDesignation,
                "Designation not specified"
              )}

              {" · "}

              {safeText(
                candidate
                  ?.currentCompany,
                "Company not specified"
              )}
            </p>

            <div className="se-candidate-detail-contact-row">
              {candidate
                ?.mobile ? (
                <a
                  href={`tel:${candidate.mobile}`}
                >
                  ☎{" "}
                  {
                    candidate.mobile
                  }
                </a>
              ) : null}

              {candidate
                ?.email ? (
                <a
                  href={`mailto:${candidate.email}`}
                >
                  ✉{" "}
                  {
                    candidate.email
                  }
                </a>
              ) : null}

              <span>
                ◉{" "}
                {safeText(
                  [
                    candidate
                      ?.city,

                    candidate
                      ?.state,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      ", "
                    ),
                  "Location not specified"
                )}
              </span>
            </div>
          </div>

          {/* =================================================
              HIRING REQUIREMENT
          ================================================== */}

          <div className="se-candidate-detail-role-card">
            <span>
              HIRING FOR
            </span>

            <strong>
              {safeText(
                candidate
                  ?.positionTitle ||
                requirement
                  ?.positionTitle,
                "Position"
              )}
            </strong>

            <small>
              {safeText(
                requirement
                  ?.requestNumber,
                "MPR"
              )}

              {" · "}

              {safeText(
                candidate
                  ?.department
                  ?.name ||
                requirement
                  ?.department
                  ?.name,
                "Department"
              )}
            </small>

            <button
              type="button"
              onClick={() => {
                const id =
                  getRecordId(
                    requirement
                  );

                if (
                  !id
                ) {
                  return;
                }

                navigate(
                  buildRecruitmentUrl(
                    "hiring-workspace",
                    {
                      id,

                      tab:
                        "candidates",

                      from:
                        "candidate",
                    }
                  )
                );
              }}
            >
              Open Hiring Workspace

              <span>
                →
              </span>
            </button>
          </div>
        </section>

        {/* =================================================
            CANDIDATE WORKFLOW ACTIONS

            ActionPanel now owns:
            - Call
            - Screening
            - Shortlist
            - Schedule Interview
            - Manage existing Interview
            - Reject
        ================================================== */}

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

        {/* =================================================
            TABS
        ================================================== */}

        <div className="se-candidate-detail-tabs">
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
          <div className="se-candidate-detail-grid">
            <article className="se-candidate-detail-card">
              <header>
                <span>
                  PROFILE
                </span>

                <h3>
                  Professional Summary
                </h3>
              </header>

              <div className="se-candidate-profile-grid">
                <div>
                  <span>
                    Total Experience
                  </span>

                  <strong>
                    {candidate
                      ?.totalExperienceYears ??
                      "—"}{" "}
                    years
                  </strong>
                </div>

                <div>
                  <span>
                    Relevant Experience
                  </span>

                  <strong>
                    {candidate
                      ?.relevantExperienceYears ??
                      "—"}{" "}
                    years
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
                    {candidate
                      ?.noticePeriodDays ??
                      "—"}{" "}
                    days
                  </strong>
                </div>

                <div>
                  <span>
                    Earliest Joining
                  </span>

                  <strong>
                    {formatRecruitmentDate(
                      candidate
                        ?.earliestJoiningDate
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Source
                  </span>

                  <strong>
                    {safeText(
                      candidate
                        ?.source,
                      "—"
                    ).replaceAll(
                      "_",
                      " "
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Next Action
                  </span>

                  <strong>
                    {safeText(
                      candidate
                        ?.nextAction,
                      "NONE"
                    ).replaceAll(
                      "_",
                      " "
                    )}
                  </strong>
                </div>
              </div>

              {Array.isArray(
                candidate
                  ?.skills
              ) &&
              candidate
                .skills
                .length >
                0 ? (
                <div className="se-candidate-detail-skills">
                  <span>
                    SKILLS
                  </span>

                  <div>
                    {candidate
                      .skills
                      .map(
                        (
                          skill,
                          index
                        ) => (
                          <b
                            key={`${skill}-${index}`}
                          >
                            {
                              skill
                            }
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

            <article className="se-candidate-detail-card se-candidate-cv-panel">
              <header>
                <span>
                  CV
                </span>

                <h3>
                  Candidate Resume
                </h3>
              </header>

              {hasResume ? (
                <>
                  <div className="se-candidate-resume-card">
                    <span>
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
                        {candidate
                          ?.resume
                          ?.parsed
                          ? "✓ Parsed and attached"
                          : "Resume attached"}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="se-candidate-resume-open"
                    onClick={
                      handleViewCv
                    }
                    disabled={
                      cvOpening
                    }
                  >
                    {cvOpening
                      ? "Opening CV..."
                      : "View Candidate CV"}

                    {!cvOpening ? (
                      <span>
                        ↗
                      </span>
                    ) : null}
                  </button>

                  {cvError ? (
                    <div className="se-candidate-cv-error">
                      <span>
                        !
                      </span>

                      <p>
                        {
                          cvError
                        }
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="se-candidate-no-cv">
                  <span>
                    CV
                  </span>

                  <div>
                    <strong>
                      No CV attached
                    </strong>

                    <p>
                      This candidate does not have a resume available.
                    </p>
                  </div>
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
          <div className="se-candidate-detail-grid">
            {/* =============================================
                EDUCATION
            ============================================== */}

            <article className="se-candidate-detail-card">
              <header>
                <span>
                  EDUCATION
                </span>

                <h3>
                  Academic History
                </h3>
              </header>

              {Array.isArray(
                candidate
                  ?.education
              ) &&
              candidate
                .education
                .length >
                0 ? (
                <div className="se-candidate-history-list">
                  {candidate
                    .education
                    .map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item._id ||
                            index
                          }
                        >
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
                              "Institute not specified"
                            )}

                            {item
                              ?.year
                              ? ` · ${item.year}`
                              : ""}
                          </p>
                        </div>
                      )
                    )}
                </div>
              ) : (
                <RecruitmentEmptyState
                  icon="E"
                  title="No education data"
                  description="Education information was not available in the candidate profile."
                />
              )}
            </article>

            {/* =============================================
                EXPERIENCE
            ============================================== */}

            <article className="se-candidate-detail-card">
              <header>
                <span>
                  EXPERIENCE
                </span>

                <h3>
                  Employment History
                </h3>
              </header>

              {Array.isArray(
                candidate
                  ?.experienceHistory
              ) &&
              candidate
                .experienceHistory
                .length >
                0 ? (
                <div className="se-candidate-history-list">
                  {candidate
                    .experienceHistory
                    .map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item._id ||
                            index
                          }
                        >
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

                          <p>
                            {item
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
                                  )}
                          </p>

                          {item
                            ?.description ? (
                            <small className="se-candidate-history-description">
                              {
                                item
                                  .description
                              }
                            </small>
                          ) : null}
                        </div>
                      )
                    )}
                </div>
              ) : (
                <RecruitmentEmptyState
                  icon="W"
                  title="No employment history"
                  description="Detailed experience history was not available in the profile."
                />
              )}
            </article>
          </div>
        ) : null}

        {/* =================================================
            INTERVIEWS
        ================================================== */}

        {activeTab ===
        "interviews" ? (
          <article className="se-candidate-detail-card">
            <header>
              <span>
                INTERVIEWS
              </span>

              <h3>
                Interview History
              </h3>
            </header>

            {interviews.length >
            0 ? (
              <div className="se-candidate-interview-history">
                {interviews.map(
                  (
                    interview
                  ) => {
                    const id =
                      getRecordId(
                        interview
                      );

                    return (
                      <button
                        type="button"
                        key={
                          id
                        }
                        onClick={() =>
                          handleOpenInterview(
                            interview
                          )
                        }
                      >
                        <span className="icon">
                          I
                        </span>

                        <span className="main">
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
                          label={
                            safeText(
                              interview
                                ?.status,
                              "Scheduled"
                            ).replaceAll(
                              "_",
                              " "
                            )
                          }
                          tone={
                            interviewTone(
                              interview
                                ?.status
                            )
                          }
                        />

                        <span>
                          →
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <RecruitmentEmptyState
                icon="I"
                title="No interviews yet"
                description="Schedule an interview when the candidate is shortlisted."
              />
            )}
          </article>
        ) : null}

        {/* =================================================
            ACTIVITY
        ================================================== */}

        {activeTab ===
        "activity" ? (
          <article className="se-candidate-detail-card se-candidate-activity-card">
            <header>
              <span>
                AUDIT TRAIL
              </span>

              <h3>
                Recruitment Activity
              </h3>
            </header>

            {timeline.length >
            0 ? (
              <div className="se-candidate-timeline">
                {timeline.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={
                        item._id ||
                        index
                      }
                    >
                      <span className="track">
                        <i />

                        {index <
                        timeline.length -
                          1 ? (
                          <b />
                        ) : null}
                      </span>

                      <div>
                        <span className="time">
                          {formatRecruitmentDateTime(
                            item
                              ?.createdAt ||
                            item
                              ?.activityAt
                          )}
                        </span>

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

                        <p>
                          {safeText(
                            item
                              ?.description ||
                            item
                              ?.remarks ||
                            item
                              ?.note,
                            "Recruitment activity recorded."
                          )}
                        </p>

                        {item
                          ?.createdBy
                          ?.displayName ? (
                          <small>
                            By{" "}
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
              <RecruitmentEmptyState
                icon="A"
                title="No activity yet"
                description="Candidate calls, screening, interviews and status changes will appear here."
              />
            )}
          </article>
        ) : null}
      </section>
    );
  };

export default CandidateDetailPage;