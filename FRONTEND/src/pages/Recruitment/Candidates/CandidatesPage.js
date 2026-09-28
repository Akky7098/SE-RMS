import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  getHrHiringQueue,
  getMyHiring,
} from "../../../services/manpowerService";

import {
  getRequirementCandidates,
} from "../../../services/recruitmentService";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";
import RecruitmentEmptyState from "../components/RecruitmentEmptyState";
import RequirementSelectModal from "./RequirementSelectModal";
import AddCandidateDrawer from "./AddCandidateDrawer";

import {
  buildCandidateDetailUrl,
  formatRecruitmentDate,
  getCandidateStatusMeta,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./CandidateEntry.css";
import "./Candidates.css";

import candidateManagementHero from "../candidate-management-hero.mp4";
import candidateManagementHeroPoster from "../candidate-management-hero-poster.webp";
/* =========================================================
   CANDIDATE STATUS GROUP
========================================================= */

const candidateGroup = (status) => {
  const value = String(status || "")
    .trim()
    .toUpperCase();

  if (
    [
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
    ].includes(value)
  ) {
    return "SELECTED";
  }

  if (
    [
      "NOT_INTERESTED",
      "REJECTED",
      "REJECTED_SCREENING",
      "REJECTED_INTERVIEW",
      "LOI_DECLINED",
      "OFFER_DECLINED",
      "CLOSED",
    ].includes(value)
  ) {
    return "REJECTED";
  }

  if (
    [
      "HOLD",
      "ON_HOLD",
      "ON HOLD",
      "PAUSED",
    ].includes(value)
  ) {
    return "HOLD";
  }

  if (
    [
      "INTERVIEW_PENDING",
      "INTERVIEW_SCHEDULED",
      "INTERVIEWED",
    ].includes(value)
  ) {
    return "INTERVIEW";
  }

  return "ACTIVE";
};

/* =========================================================
   ROW STATE
========================================================= */

const getCandidateRowClass = (status) => {
  const group = candidateGroup(status);

  if (group === "SELECTED") {
    return "candidate-row-selected";
  }

  if (group === "REJECTED") {
    return "candidate-row-rejected";
  }

  if (group === "HOLD") {
    return "candidate-row-hold";
  }

  return "candidate-row-normal";
};

/* =========================================================
   UNIQUE REQUIREMENTS
========================================================= */

const uniqueRequirements = (records = []) => {
  const map = new Map();

  records.forEach((item) => {
    const id = getRecordId(item);

    if (id) {
      map.set(String(id), item);
    }
  });

  return Array.from(map.values());
};

/* =========================================================
   COMPONENT
========================================================= */

const CandidatesPage = () => {
  const navigate = useNavigate();

  const [heroVideoEnabled, setHeroVideoEnabled] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);

  useEffect(() => {
  let timerId = null;
  let idleId = null;

  const enableVideo = () => {
    setHeroVideoEnabled(true);
  };

  if ("requestIdleCallback" in window) {
    idleId = window.requestIdleCallback(enableVideo, {
      timeout: 1800,
    });
  } else {
    timerId = window.setTimeout(enableVideo, 700);
  }

  return () => {
    if (
      idleId !== null &&
      "cancelIdleCallback" in window
    ) {
      window.cancelIdleCallback(idleId);
    }

    if (timerId !== null) {
      window.clearTimeout(timerId);
    }
  };
}, []);

  const [
    requirements,
    setRequirements,
  ] = useState([]);

  const [
    candidates,
    setCandidates,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectRequirementOpen,
    setSelectRequirementOpen,
  ] = useState(false);

  const [
    selectedRequirement,
    setSelectedRequirement,
  ] = useState(null);

  /* =====================================================
     LOAD CANDIDATES
  ===================================================== */

  const loadCandidates = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const requirementResults =
          await Promise.allSettled([
            getHrHiringQueue(),
            getMyHiring(),
          ]);

        const combinedRequirements = [];

        requirementResults.forEach(
          (result) => {
            if (
              result.status ===
                "fulfilled" &&
              Array.isArray(
                result.value
              )
            ) {
              combinedRequirements.push(
                ...result.value
              );
            }
          }
        );

        const accessibleRequirements =
          uniqueRequirements(
            combinedRequirements
          );

        setRequirements(
          accessibleRequirements
        );

        const candidateResults =
          await Promise.allSettled(
            accessibleRequirements.map(
              (requirement) =>
                getRequirementCandidates(
                  getRecordId(
                    requirement
                  )
                )
            )
          );

        const combinedCandidates = [];

        candidateResults.forEach(
          (
            result,
            index
          ) => {
            if (
              result.status !==
                "fulfilled" ||
              !Array.isArray(
                result.value
              )
            ) {
              return;
            }

            const sourceRequirement =
              accessibleRequirements[
                index
              ];

            result.value.forEach(
              (candidate) => {
                combinedCandidates.push({
                  ...candidate,
                  _requirement:
                    sourceRequirement,
                });
              }
            );
          }
        );

        const candidateMap =
          new Map();

        combinedCandidates.forEach(
          (candidate) => {
            const id =
              getRecordId(
                candidate
              );

            if (id) {
              candidateMap.set(
                String(id),
                candidate
              );
            }
          }
        );

        const finalCandidates =
          Array.from(
            candidateMap.values()
          ).sort(
            (a, b) =>
              new Date(
                b?.updatedAt ||
                  b?.createdAt ||
                  0
              ).getTime() -
              new Date(
                a?.updatedAt ||
                  a?.createdAt ||
                  0
              ).getTime()
          );

        setCandidates(
          finalCandidates
        );

        if (
          accessibleRequirements.length ===
            0 &&
          requirementResults.every(
            (result) =>
              result.status ===
              "rejected"
          )
        ) {
          setError(
            "No recruitment hiring data is accessible for your account."
          );
        }
      } catch (loadError) {
        setError(
          loadError?.response?.data
            ?.message ||
            loadError?.message ||
            "Candidates could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  /* =====================================================
     SUMMARY
  ===================================================== */

  const summary = useMemo(
    () => {
      const data = {
        total: candidates.length,
        interview: 0,
        selected: 0,
        rejected: 0,
        hold: 0,
      };

      candidates.forEach(
        (candidate) => {
          const group =
            candidateGroup(
              candidate?.status
            );

          if (
            group ===
            "INTERVIEW"
          ) {
            data.interview += 1;
          }

          if (
            group ===
            "SELECTED"
          ) {
            data.selected += 1;
          }

          if (
            group ===
            "REJECTED"
          ) {
            data.rejected += 1;
          }

          if (
            group ===
            "HOLD"
          ) {
            data.hold += 1;
          }
        }
      );

      return data;
    },
    [candidates]
  );

  /* =====================================================
     SEARCH
  ===================================================== */

  const visibleCandidates =
    useMemo(() => {
      const keyword =
        String(search || "")
          .trim()
          .toLowerCase();

      if (!keyword) {
        return candidates;
      }

      return candidates.filter(
        (candidate) => {
          const requirement =
            candidate?._requirement ||
            candidate
              ?.manpowerRequirement ||
            {};

          return [
            candidate
              ?.candidateNumber,

            candidate
              ?.fullName,

            candidate
              ?.mobile,

            candidate
              ?.phone,

            candidate
              ?.email,

            candidate
              ?.currentCompany,

            candidate
              ?.currentDesignation,

            candidate
              ?.status,

            requirement
              ?.positionTitle,

            requirement
              ?.requestNumber,

            requirement
              ?.department
              ?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        }
      );
    }, [
      candidates,
      search,
    ]);

  /* =====================================================
     REQUIREMENT SELECT
  ===================================================== */

  const handleRequirementSelect =
    (requirement) => {
      setSelectRequirementOpen(
        false
      );

      setSelectedRequirement(
        requirement
      );
    };

  /* =====================================================
     CANDIDATE CREATED
  ===================================================== */

  const handleCandidateCreated =
    async (candidate) => {
      setSelectedRequirement(
        null
      );

      await loadCandidates(
        true
      );

      const id =
        getRecordId(
          candidate
        );

      if (id) {
        navigate(
          buildCandidateDetailUrl(
            id
          )
        );
      }
    };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <section className="se-candidates-page se-candidates-production">
      {/* =================================================
          TOP HEADER
      ================================================== */}

  <header className="se-candidates-command-header se-candidates-video-hero">

  <img
    className="se-candidates-hero-poster"
    src={candidateManagementHeroPoster}
    alt=""
    aria-hidden="true"
    decoding="async"
    fetchPriority="high"
  />

  {heroVideoEnabled ? (
    <video
      className={`se-candidates-hero-video ${
        heroVideoReady ? "is-ready" : ""
      }`}
      src={candidateManagementHero}
      poster={candidateManagementHeroPoster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      onCanPlay={() => setHeroVideoReady(true)}
    />
  ) : null}

  <div className="se-candidates-hero-video-blend" />

  <div className="se-candidates-command-copy">
    <span className="se-candidates-command-label">
      RECRUITMENT
    </span>

    <h1>
      Candidate Management
    </h1>

    <p>
      Search and manage every candidate from one place.
    </p>
  </div>

  <div className="se-candidates-command-actions">
    <button
      type="button"
      className="se-candidates-refresh-btn"
      disabled={refreshing}
      onClick={() => loadCandidates(true)}
    >
      <span className={refreshing ? "is-spinning" : ""}>
        ↻
      </span>

      {refreshing ? "Refreshing" : "Refresh"}
    </button>

    <button
      type="button"
      className="se-candidates-add-btn"
      onClick={() => setSelectRequirementOpen(true)}
    >
      <span>+</span>
      Add Candidate
    </button>
  </div>

</header>

      {/* =================================================
          SUMMARY
      ================================================== */}

      <div className="se-candidates-summary">
        <div className="se-candidates-summary-card total">
          <span className="summary-icon">
            C
          </span>

          <div>
            <small>
              TOTAL CANDIDATES
            </small>

            <strong>
              {summary.total}
            </strong>
          </div>
        </div>

        <div className="se-candidates-summary-card interview">
          <span className="summary-icon">
            I
          </span>

          <div>
            <small>
              INTERVIEW
            </small>

            <strong>
              {summary.interview}
            </strong>
          </div>
        </div>

        <div className="se-candidates-summary-card selected">
          <span className="summary-icon">
            ✓
          </span>

          <div>
            <small>
              SELECTED
            </small>

            <strong>
              {summary.selected}
            </strong>
          </div>
        </div>

        <div className="se-candidates-summary-card rejected">
          <span className="summary-icon">
            ×
          </span>

          <div>
            <small>
              REJECTED
            </small>

            <strong>
              {summary.rejected}
            </strong>
          </div>
        </div>

        <div className="se-candidates-summary-card hold">
          <span className="summary-icon">
            !
          </span>

          <div>
            <small>
              ON HOLD
            </small>

            <strong>
              {summary.hold}
            </strong>
          </div>
        </div>
      </div>

      {/* =================================================
          SEARCH
      ================================================== */}

      <div className="se-candidates-search-section">
        <div className="se-candidates-search-box">
          <span className="se-candidates-search-icon">
            ⌕
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search by candidate name, mobile, email, company, position or MPR number"
          />

          {search ? (
            <button
              type="button"
              className="se-candidates-search-clear"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="se-candidates-result-count">
          <strong>
            {
              visibleCandidates.length
            }
          </strong>

          <span>
            {visibleCandidates.length ===
            1
              ? "candidate"
              : "candidates"}
          </span>
        </div>
      </div>

      {/* =================================================
          STATUS GUIDE
      ================================================== */}

      <div className="se-candidates-status-guide">
        <span className="guide-title">
          ROW STATUS
        </span>

        <div>
          <span className="guide-item selected">
            <i />
            Selected
          </span>

          <span className="guide-item rejected">
            <i />
            Rejected
          </span>

          <span className="guide-item hold">
            <i />
            On Hold
          </span>

          <span className="guide-item normal">
            <i />
            In Process
          </span>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================== */}

      {error ? (
        <div className="se-candidate-global-error">
          <span>!</span>

          <p>{error}</p>
        </div>
      ) : null}

      {/* =================================================
          CANDIDATE TABLE
      ================================================== */}

      <article className="se-candidates-table-panel">
        <div className="se-candidates-table-head">
          <div>
            <span>
              CANDIDATES
            </span>

            <strong>
              Candidate List
            </strong>
          </div>

          <div className="se-candidates-table-head-count">
            <strong>
              {
                visibleCandidates.length
              }
            </strong>

            <span>
              showing
            </span>
          </div>
        </div>

        {loading ? (
          <div className="se-candidate-list-loading">
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : visibleCandidates.length >
          0 ? (
          <div className="se-candidates-table-wrap">
            <table className="se-candidates-main-table">
              <thead>
                <tr>
                  <th>
                    Candidate
                  </th>

                  <th>
                    Hiring For
                  </th>

                  <th>
                    Experience
                  </th>

                  <th>
                    Contact
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Next Action
                  </th>

                  <th>
                    Updated
                  </th>

                  <th
                    aria-label="Open candidate"
                  />
                </tr>
              </thead>

              <tbody>
                {visibleCandidates.map(
                  (candidate) => {
                    const id =
                      getRecordId(
                        candidate
                      );

                    const requirement =
                      candidate
                        ?._requirement ||
                      candidate
                        ?.manpowerRequirement ||
                      {};

                    const statusMeta =
                      getCandidateStatusMeta(
                        candidate
                          ?.status
                      );

                    const rowClass =
                      getCandidateRowClass(
                        candidate
                          ?.status
                      );

                    const group =
                      candidateGroup(
                        candidate
                          ?.status
                      );

                    return (
                      <tr
                        key={id}
                        className={
                          rowClass
                        }
                        onClick={() => {
                          if (id) {
                            navigate(
                              buildCandidateDetailUrl(
                                id
                              )
                            );
                          }
                        }}
                      >
                        <td>
                          <div className="se-candidates-person">
                            <span className="se-candidates-avatar">
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

                            <div>
                              <strong>
                                {safeText(
                                  candidate
                                    ?.fullName,
                                  "Candidate"
                                )}
                              </strong>

                              <small>
                                {safeText(
                                  candidate
                                    ?.candidateNumber,
                                  "Candidate"
                                )}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="se-candidates-role">
                            <strong>
                              {safeText(
                                requirement
                                  ?.positionTitle,
                                candidate
                                  ?.positionTitle ||
                                  "Position"
                              )}
                            </strong>

                            <small>
                              {safeText(
                                requirement
                                  ?.requestNumber,
                                "MPR"
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="se-candidates-experience">
                            <strong>
                              {candidate
                                ?.totalExperienceYears ??
                                "—"}
                            </strong>

                            <small>
                              years
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="se-candidates-contact">
                            <strong>
                              {safeText(
                                candidate
                                  ?.mobile ||
                                  candidate
                                    ?.phone,
                                "—"
                              )}
                            </strong>

                            <small>
                              {safeText(
                                candidate
                                  ?.email,
                                "Email not available"
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="se-candidates-status-cell">
                            <RecruitmentStatusBadge
                              label={
                                statusMeta.label
                              }
                              tone={
                                statusMeta.tone
                              }
                            />

                            {group ===
                            "SELECTED" ? (
                              <small>
                                Candidate selected
                              </small>
                            ) : null}

                            {group ===
                            "REJECTED" ? (
                              <small>
                                Candidate rejected
                              </small>
                            ) : null}

                            {group ===
                            "HOLD" ? (
                              <small>
                                Process on hold
                              </small>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          <span className="se-candidates-next-action">
                            {safeText(
                              candidate
                                ?.nextAction,
                              "No action"
                            ).replaceAll(
                              "_",
                              " "
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="se-candidates-date">
                            {formatRecruitmentDate(
                              candidate
                                ?.updatedAt ||
                                candidate
                                  ?.createdAt
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="se-candidates-open">
                            →
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <RecruitmentEmptyState
            icon="C"
            title="No candidates found"
            description={
              search
                ? "No candidate matches your search."
                : "No candidates are available yet."
            }
          />
        )}
      </article>

      {/* =================================================
          REQUIREMENT SELECT
      ================================================== */}

      <RequirementSelectModal
        open={
          selectRequirementOpen
        }
        onClose={() =>
          setSelectRequirementOpen(
            false
          )
        }
        onSelect={
          handleRequirementSelect
        }
      />

      {/* =================================================
          ADD CANDIDATE DRAWER
      ================================================== */}

      <AddCandidateDrawer
        open={Boolean(
          selectedRequirement
        )}
        requirement={
          selectedRequirement
        }
        onClose={() =>
          setSelectedRequirement(
            null
          )
        }
        onCreated={
          handleCandidateCreated
        }
      />
    </section>
  );
};

export default CandidatesPage;