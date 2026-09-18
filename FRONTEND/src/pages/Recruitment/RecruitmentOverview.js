import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

/* =========================================================
   MANPOWER
========================================================= */

import {
  getManpowerRequirements,
  getHrHiringQueue,
  getMyHiring,
  getManpowerApprovalInbox,
} from "../../services/manpowerService";

/* =========================================================
   RECRUITMENT
========================================================= */

import {
  getMyRecruitmentTasks,
} from "../../services/recruitmentService";

/* =========================================================
   INTERVIEWS
========================================================= */

import {
  getInterviews,
} from "../../services/interviewService";

/* =========================================================
   SELECTION
========================================================= */

import {
  getSelectionSummary,
} from "../../services/selectionService";

/* =========================================================
   COMPONENTS
========================================================= */

import RecruitmentMetricCard from "./components/RecruitmentMetricCard";

import RecruitmentAttentionItem from "./components/RecruitmentAttentionItem";

import RecruitmentEmptyState from "./components/RecruitmentEmptyState";

import RecruitmentStatusBadge from "./components/RecruitmentStatusBadge";

/* =========================================================
   HELPERS
========================================================= */

import {
  buildCandidateDetailUrl,
  buildHiringWorkspaceUrl,
  buildInterviewDetailUrl,
  buildRecruitmentUrl,
  formatRecruitmentDate,
  formatRecruitmentTime,
  getApiErrorMessage,
  getNextActionMeta,
  getPriorityMeta,
  getRecordId,
  isOverdue,
  isToday,
  safeText,
  uniqueRecords,
} from "./utils/recruitmentHelpers";

/* =========================================================
   OVERVIEW
========================================================= */

const RecruitmentOverview =
  () => {
    const navigate =
      useNavigate();

    /* =====================================================
       STATE
    ===================================================== */

    const [
      loading,
      setLoading,
    ] =
      useState(
        true
      );

    const [
      refreshing,
      setRefreshing,
    ] =
      useState(
        false
      );

    const [
      error,
      setError,
    ] =
      useState(
        ""
      );

    const [
      manpower,
      setManpower,
    ] =
      useState(
        []
      );

    const [
      hiringQueue,
      setHiringQueue,
    ] =
      useState(
        []
      );

    const [
      myHiring,
      setMyHiring,
    ] =
      useState(
        []
      );

    const [
      approvalInbox,
      setApprovalInbox,
    ] =
      useState(
        []
      );

    const [
      tasks,
      setTasks,
    ] =
      useState(
        []
      );

    const [
      interviews,
      setInterviews,
    ] =
      useState(
        []
      );

    const [
      selectionSummary,
      setSelectionSummary,
    ] =
      useState({
        total: 0,
        loi: 0,
        documents: 0,
        offer: 0,
        joining: 0,
        actionDue: 0,
      });

    /* =====================================================
       LOAD OVERVIEW

       Promise.allSettled is intentional.

       Different Recruitment roles can have permission to
       different endpoints. One denied endpoint must not
       make the whole Overview fail.
    ===================================================== */

    const loadOverview =
      useCallback(
        async ({
          silent = false,
        } = {}) => {
          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          const results =
            await Promise.allSettled([
              /* 0 */
              getManpowerRequirements({
                limit:
                  100,
              }),

              /* 1 */
              getHrHiringQueue(),

              /* 2 */
              getMyHiring(),

              /* 3 */
              getManpowerApprovalInbox(),

              /* 4 */
              getMyRecruitmentTasks(),

              /* 5 */
              getInterviews(),

              /* 6 */
              getSelectionSummary(),
            ]);

          const [
            manpowerResult,
            queueResult,
            myHiringResult,
            approvalsResult,
            taskResult,
            interviewResult,
            selectionResult,
          ] =
            results;

          /* =================================================
             MANPOWER
          ================================================= */

          if (
            manpowerResult
              .status ===
            "fulfilled"
          ) {
            setManpower(
              manpowerResult
                .value
                ?.records ||
              []
            );
          } else {
            setManpower(
              []
            );
          }

          /* =================================================
             HIRING QUEUE
          ================================================= */

          if (
            queueResult
              .status ===
            "fulfilled"
          ) {
            setHiringQueue(
              Array.isArray(
                queueResult
                  .value
              )
                ? queueResult
                    .value
                : []
            );
          } else {
            setHiringQueue(
              []
            );
          }

          /* =================================================
             MY HIRING
          ================================================= */

          if (
            myHiringResult
              .status ===
            "fulfilled"
          ) {
            setMyHiring(
              Array.isArray(
                myHiringResult
                  .value
              )
                ? myHiringResult
                    .value
                : []
            );
          } else {
            setMyHiring(
              []
            );
          }

          /* =================================================
             APPROVALS
          ================================================= */

          if (
            approvalsResult
              .status ===
            "fulfilled"
          ) {
            setApprovalInbox(
              Array.isArray(
                approvalsResult
                  .value
              )
                ? approvalsResult
                    .value
                : []
            );
          } else {
            setApprovalInbox(
              []
            );
          }

          /* =================================================
             RECRUITMENT TASKS
          ================================================= */

          if (
            taskResult
              .status ===
            "fulfilled"
          ) {
            setTasks(
              Array.isArray(
                taskResult
                  .value
              )
                ? taskResult
                    .value
                : []
            );
          } else {
            setTasks(
              []
            );
          }

          /* =================================================
             INTERVIEWS
          ================================================= */

          if (
            interviewResult
              .status ===
            "fulfilled"
          ) {
            setInterviews(
              Array.isArray(
                interviewResult
                  .value
              )
                ? interviewResult
                    .value
                : []
            );
          } else {
            setInterviews(
              []
            );
          }

          /* =================================================
             SELECTION
          ================================================= */

          if (
            selectionResult
              .status ===
            "fulfilled"
          ) {
            const value =
              selectionResult
                .value ||
              {};

            setSelectionSummary({
              total:
                Number(
                  value
                    ?.total ||
                    0
                ),

              loi:
                Number(
                  value
                    ?.loi ||
                    0
                ),

              documents:
                Number(
                  value
                    ?.documents ||
                    0
                ),

              offer:
                Number(
                  value
                    ?.offer ||
                    0
                ),

              joining:
                Number(
                  value
                    ?.joining ||
                    0
                ),

              actionDue:
                Number(
                  value
                    ?.actionDue ||
                    0
                ),
            });
          } else {
            setSelectionSummary({
              total:
                0,

              loi:
                0,

              documents:
                0,

              offer:
                0,

              joining:
                0,

              actionDue:
                0,
            });
          }

          /* =================================================
             COMPLETE FAILURE
          ================================================= */

          const successful =
            results.filter(
              (
                result
              ) =>
                result.status ===
                "fulfilled"
            );

          if (
            successful.length ===
            0
          ) {
            const firstError =
              results.find(
                (
                  result
                ) =>
                  result.status ===
                  "rejected"
              );

            setError(
              getApiErrorMessage(
                firstError
                  ?.reason,

                "Recruitment overview could not be loaded."
              )
            );
          }

          setLoading(
            false
          );

          setRefreshing(
            false
          );
        },
        []
      );

    useEffect(
      () => {
        loadOverview();
      },
      [
        loadOverview,
      ]
    );

    /* =====================================================
       ACTIVE HIRING

       Merge visible manpower + HR queue + My Hiring.
    ===================================================== */

    const activeHiring =
      useMemo(
        () => {
          return uniqueRecords([
            ...manpower.filter(
              (
                item
              ) =>
                [
                  "APPROVED",
                  "HIRING_IN_PROGRESS",
                ].includes(
                  String(
                    item
                      ?.status ||
                      ""
                  ).toUpperCase()
                )
            ),

            ...hiringQueue,

            ...myHiring,
          ]);
        },
        [
          manpower,
          hiringQueue,
          myHiring,
        ]
      );

    /* =====================================================
       TASK GROUPS
    ===================================================== */

    const callsPending =
      useMemo(
        () =>
          tasks.filter(
            (
              item
            ) =>
              item
                ?.nextAction ===
              "CALL_CANDIDATE"
          ),
        [
          tasks,
        ]
      );

    const followUps =
      useMemo(
        () =>
          tasks.filter(
            (
              item
            ) =>
              item
                ?.nextAction ===
              "FOLLOW_UP_CALL"
          ),
        [
          tasks,
        ]
      );

    const overdueFollowUps =
      useMemo(
        () =>
          followUps.filter(
            (
              item
            ) =>
              Boolean(
                item
                  ?.overdue
              ) ||
              isOverdue(
                item
                  ?.nextActionAt
              )
          ),
        [
          followUps,
        ]
      );

    const screeningPending =
      useMemo(
        () =>
          tasks.filter(
            (
              item
            ) =>
              item
                ?.nextAction ===
              "COMPLETE_SCREENING"
          ),
        [
          tasks,
        ]
      );

    const shortlisted =
      useMemo(
        () =>
          tasks.filter(
            (
              item
            ) =>
              item
                ?.status ===
                "SHORTLISTED" ||
              item
                ?.nextAction ===
                "SCHEDULE_INTERVIEW"
          ),
        [
          tasks,
        ]
      );

    const interviewsToday =
      useMemo(
        () =>
          interviews.filter(
            (
              interview
            ) =>
              isToday(
                interview
                  ?.scheduledAt
              ) &&
              ![
                "CANCELLED",
                "COMPLETED",
              ].includes(
                String(
                  interview
                    ?.status ||
                    ""
                ).toUpperCase()
              )
          ),
        [
          interviews,
        ]
      );

    /* =====================================================
       METRICS
    ===================================================== */

    const metrics = [
      {
        label:
          "Open Hiring",

        value:
          activeHiring
            .length,

        description:
          "Approved and active hiring requirements.",

        icon:
          "H",

        tone:
          "blue",

        path:
          buildRecruitmentUrl(
            "hiring"
          ),
      },

      {
        label:
          "My Hiring",

        value:
          myHiring
            .length,

        description:
          "Requirements currently assigned to you.",

        icon:
          "M",

        tone:
          "purple",

        path:
          buildRecruitmentUrl(
            "my-hiring"
          ),
      },

      {
        label:
          "Calls Pending",

        value:
          callsPending
            .length,

        description:
          "Candidates waiting for first contact.",

        icon:
          "☎",

        tone:
          "orange",

        path:
          buildRecruitmentUrl(
            "candidates",
            {
              action:
                "CALL_CANDIDATE",
            }
          ),
      },

      {
        label:
          "Follow-ups Due",

        value:
          overdueFollowUps
            .length,

        description:
          "Candidate follow-ups already due.",

        icon:
          "↻",

        tone:
          overdueFollowUps
            .length >
          0
            ? "warning"
            : "green",

        path:
          buildRecruitmentUrl(
            "follow-ups",
            {
              filter:
                "due",
            }
          ),
      },

      {
        label:
          "Interviews Today",

        value:
          interviewsToday
            .length,

        description:
          "Scheduled interviews happening today.",

        icon:
          "I",

        tone:
          "cyan",

        path:
          buildRecruitmentUrl(
            "interviews",
            {
              filter:
                "today",
            }
          ),
      },

      {
        label:
          "Selected",

        value:
          selectionSummary
            .total,

        description:
          "Candidates progressing after final evaluation.",

        icon:
          "S",

        tone:
          "green",

        path:
          buildRecruitmentUrl(
            "selections"
          ),
      },

      {
        label:
          "Selection Actions",

        value:
          selectionSummary
            .actionDue,

        description:
          "LOI, document or offer actions requiring HR attention.",

        icon:
          "!",

        tone:
          selectionSummary
              .actionDue >
            0
            ? "warning"
            : "green",

        path:
          buildRecruitmentUrl(
            "selections"
          ),
      },
    ];

    /* =====================================================
       NEEDS ATTENTION
    ===================================================== */

    const attentionItems =
      useMemo(
        () => {
          const items =
            [];

          /* =================================================
             OVERDUE FOLLOW UPS
          ================================================= */

          overdueFollowUps
            .slice(
              0,
              3
            )
            .forEach(
              (
                candidate
              ) => {
                const id =
                  getRecordId(
                    candidate
                  );

                const meta =
                  getNextActionMeta(
                    candidate
                      ?.nextAction
                  );

                items.push({
                  key:
                    `followup-${id}`,

                  title:
                    safeText(
                      candidate
                        ?.fullName,

                      "Candidate"
                    ),

                  subtitle:
                    `${safeText(
                      candidate
                        ?.positionTitle,

                      "Position"
                    )} • Follow-up overdue`,

                  meta:
                    candidate
                      ?.nextActionAt
                      ? formatRecruitmentTime(
                          candidate
                            .nextActionAt
                        )
                      : "Due",

                  icon:
                    "↻",

                  tone:
                    "warning",

                  badgeLabel:
                    meta.label,

                  badgeTone:
                    meta.tone,

                  path:
                    id
                      ? buildCandidateDetailUrl(
                          id
                        )
                      : buildRecruitmentUrl(
                          "follow-ups"
                        ),
                });
              }
            );

          /* =================================================
             CALLS
          ================================================= */

          callsPending
            .slice(
              0,
              2
            )
            .forEach(
              (
                candidate
              ) => {
                const id =
                  getRecordId(
                    candidate
                  );

                items.push({
                  key:
                    `call-${id}`,

                  title:
                    safeText(
                      candidate
                        ?.fullName,

                      "Candidate"
                    ),

                  subtitle:
                    `${safeText(
                      candidate
                        ?.positionTitle,

                      "Position"
                    )} • First contact pending`,

                  meta:
                    "Call",

                  icon:
                    "☎",

                  tone:
                    "orange",

                  badgeLabel:
                    "Call Candidate",

                  badgeTone:
                    "orange",

                  path:
                    id
                      ? buildCandidateDetailUrl(
                          id
                        )
                      : buildRecruitmentUrl(
                          "candidates"
                        ),
                });
              }
            );

          /* =================================================
             APPROVALS
          ================================================= */

          approvalInbox
            .slice(
              0,
              2
            )
            .forEach(
              (
                requirement
              ) => {
                const id =
                  getRecordId(
                    requirement
                  );

                items.push({
                  key:
                    `approval-${id}`,

                  title:
                    safeText(
                      requirement
                        ?.positionTitle,

                      "Manpower Request"
                    ),

                  subtitle:
                    `${safeText(
                      requirement
                        ?.requestNumber,

                      "Request"
                    )} • Approval required`,

                  meta:
                    safeText(
                      requirement
                        ?.priority,

                      ""
                    ),

                  icon:
                    "M",

                  tone:
                    "blue",

                  badgeLabel:
                    "Pending Approval",

                  badgeTone:
                    "warning",

                  path:
                    buildRecruitmentUrl(
                      "manpower",
                      {
                        id,

                        view:
                          "approval",
                      }
                    ),
                });
              }
            );

          /* =================================================
             INTERVIEWS TODAY
          ================================================= */

          interviewsToday
            .slice(
              0,
              2
            )
            .forEach(
              (
                interview
              ) => {
                const id =
                  getRecordId(
                    interview
                  );

                const candidate =
                  interview
                    ?.candidate;

                items.push({
                  key:
                    `interview-${id}`,

                  title:
                    safeText(
                      candidate
                        ?.fullName ||
                      interview
                        ?.candidateName,

                      "Interview"
                    ),

                  subtitle:
                    `${safeText(
                      interview
                        ?.positionTitle,

                      "Position"
                    )} • Interview today`,

                  meta:
                    formatRecruitmentTime(
                      interview
                        ?.scheduledAt
                    ),

                  icon:
                    "I",

                  tone:
                    "cyan",

                  badgeLabel:
                    "Interview",

                  badgeTone:
                    "blue",

                  path:
                    id
                      ? buildInterviewDetailUrl(
                          id
                        )
                      : buildRecruitmentUrl(
                          "interviews",
                          {
                            filter:
                              "today",
                          }
                        ),
                });
              }
            );

          return items.slice(
            0,
            7
          );
        },
        [
          overdueFollowUps,
          callsPending,
          approvalInbox,
          interviewsToday,
        ]
      );

    /* =====================================================
       ACTIVE HIRING CARDS
    ===================================================== */

    const visibleHiring =
      useMemo(
        () => {
          return activeHiring
            .slice()
            .sort(
              (
                a,
                b
              ) => {
                const priorities = {
                  URGENT:
                    4,

                  HIGH:
                    3,

                  MEDIUM:
                    2,

                  NORMAL:
                    2,

                  LOW:
                    1,
                };

                return (
                  (
                    priorities[
                      String(
                        b
                          ?.priority ||
                          "NORMAL"
                      ).toUpperCase()
                    ] ||
                    0
                  ) -
                  (
                    priorities[
                      String(
                        a
                          ?.priority ||
                          "NORMAL"
                      ).toUpperCase()
                    ] ||
                    0
                  )
                );
              }
            )
            .slice(
              0,
              5
            );
        },
        [
          activeHiring,
        ]
      );

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <div className="se-rec-overview">
        {/* =================================================
            HEADER
        ================================================== */}

        <section className="se-rec-page-head">
          <div>
            <span className="se-rec-eyebrow">
              TALENT ACQUISITION
            </span>

            <h2>
              Recruitment Overview
            </h2>

            <p>
              One live view of
              manpower, hiring
              ownership, candidate
              actions, interviews and
              post-selection progress.
            </p>
          </div>

          <div className="se-rec-head-actions">
            <button
              type="button"
              className="se-rec-secondary-btn"
              onClick={() =>
                loadOverview({
                  silent:
                    true,
                })
              }
              disabled={
                refreshing
              }
            >
              <span>
                ↻
              </span>

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              className="se-rec-primary-btn"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "manpower",
                    {
                      create:
                        "true",
                    }
                  )
                )
              }
            >
              <span>
                +
              </span>

              New Manpower Request
            </button>
          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================== */}

        {error ? (
          <div className="se-rec-error-banner">
            <span>
              !
            </span>

            <div>
              <strong>
                Overview unavailable
              </strong>

              <p>
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadOverview()
              }
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* =================================================
            COMMAND HERO
        ================================================== */}

        <section className="se-rec-command-hero">
          <div className="se-rec-command-copy">
            <span>
              RECRUITMENT COMMAND
              CENTER
            </span>

            <h3>
              Hiring work that tells
              you what needs attention
              next.
            </h3>

            <p>
              Requirements,
              candidates, interviews,
              evaluations and
              post-selection actions
              stay connected to one
              controlled hiring
              workflow.
            </p>
          </div>

          <div className="se-rec-command-flow se-rec-command-flow--extended">
            <div>
              <span>
                01
              </span>

              <strong>
                Requirement
              </strong>
            </div>

            <i>
              →
            </i>

            <div>
              <span>
                02
              </span>

              <strong>
                Candidate
              </strong>
            </div>

            <i>
              →
            </i>

            <div>
              <span>
                03
              </span>

              <strong>
                Interview
              </strong>
            </div>

            <i>
              →
            </i>

            <div className="se-rec-command-stage-selected">
              <span>
                04
              </span>

              <strong>
                Selection
              </strong>
            </div>
          </div>
        </section>

        {/* =================================================
            METRICS
        ================================================== */}

        <section className="se-rec-metric-grid se-rec-metric-grid--recruitment-full">
          {metrics.map(
            (
              metric
            ) => (
              <RecruitmentMetricCard
                key={
                  metric.label
                }
                {...metric}
                loading={
                  loading
                }
                onClick={() =>
                  navigate(
                    metric.path
                  )
                }
              />
            )
          )}
        </section>

        {/* =================================================
            MAIN GRID
        ================================================== */}

        <section className="se-rec-overview-grid">
          {/* ===============================================
              NEEDS ATTENTION
          ================================================ */}

          <article className="se-rec-panel se-rec-attention-panel">
            <div className="se-rec-panel-head">
              <div>
                <span>
                  ACTION CENTER
                </span>

                <h3>
                  Needs your
                  attention
                </h3>

                <p>
                  Highest-priority
                  hiring actions from
                  your current
                  workload.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    buildRecruitmentUrl(
                      "follow-ups"
                    )
                  )
                }
              >
                View tasks

                <span>
                  →
                </span>
              </button>
            </div>

            {loading ? (
              <div className="se-rec-list-skeleton">
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : attentionItems
                .length >
              0 ? (
              <div className="se-rec-attention-list">
                {attentionItems.map(
                  (
                    item
                  ) => (
                    <RecruitmentAttentionItem
                      key={
                        item.key
                      }
                      {...item}
                      onClick={() =>
                        navigate(
                          item.path
                        )
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <RecruitmentEmptyState
                icon="✓"
                title="You're caught up"
                description="No urgent Recruitment actions are currently waiting for you."
              />
            )}
          </article>

          {/* ===============================================
              WORKLOAD
          ================================================ */}

          <article className="se-rec-panel se-rec-workload-panel">
            <div className="se-rec-panel-head compact">
              <div>
                <span>
                  YOUR WORKLOAD
                </span>

                <h3>
                  Action breakdown
                </h3>
              </div>
            </div>

            <div className="se-rec-workload-list">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    buildRecruitmentUrl(
                      "candidates",
                      {
                        action:
                          "CALL_CANDIDATE",
                      }
                    )
                  )
                }
              >
                <span className="se-rec-workload-icon orange">
                  ☎
                </span>

                <div>
                  <strong>
                    Calls
                  </strong>

                  <small>
                    First contact
                  </small>
                </div>

                <b>
                  {
                    callsPending
                      .length
                  }
                </b>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    buildRecruitmentUrl(
                      "follow-ups"
                    )
                  )
                }
              >
                <span className="se-rec-workload-icon amber">
                  ↻
                </span>

                <div>
                  <strong>
                    Follow-ups
                  </strong>

                  <small>
                    Candidate follow-up
                  </small>
                </div>

                <b>
                  {
                    followUps
                      .length
                  }
                </b>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    buildRecruitmentUrl(
                      "candidates",
                      {
                        action:
                          "COMPLETE_SCREENING",
                      }
                    )
                  )
                }
              >
                <span className="se-rec-workload-icon purple">
                  S
                </span>

                <div>
                  <strong>
                    Screening
                  </strong>

                  <small>
                    Pending screening
                  </small>
                </div>

                <b>
                  {
                    screeningPending
                      .length
                  }
                </b>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    buildRecruitmentUrl(
                      "interviews",
                      {
                        filter:
                          "today",
                      }
                    )
                  )
                }
              >
                <span className="se-rec-workload-icon blue">
                  I
                </span>

                <div>
                  <strong>
                    Interviews
                  </strong>

                  <small>
                    Today
                  </small>
                </div>

                <b>
                  {
                    interviewsToday
                      .length
                  }
                </b>
              </button>

              <button
                type="button"
                className="se-rec-workload-selection"
                onClick={() =>
                  navigate(
                    buildRecruitmentUrl(
                      "selections"
                    )
                  )
                }
              >
                <span className="se-rec-workload-icon green">
                  ✓
                </span>

                <div>
                  <strong>
                    Selection
                  </strong>

                  <small>
                    HR action due
                  </small>
                </div>

                <b>
                  {
                    selectionSummary
                      .actionDue
                  }
                </b>
              </button>
            </div>
          </article>
        </section>

        {/* =================================================
            ACTIVE HIRING
        ================================================== */}

        <section className="se-rec-panel se-rec-hiring-panel">
          <div className="se-rec-panel-head">
            <div>
              <span>
                ACTIVE HIRING
              </span>

              <h3>
                Current requirements
              </h3>

              <p>
                Open a requirement to
                drill into its
                candidates, follow-ups
                and interviews.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "hiring"
                  )
                )
              }
            >
              View all hiring

              <span>
                →
              </span>
            </button>
          </div>

          {loading ? (
            <div className="se-rec-hiring-skeleton">
              <span />
              <span />
              <span />
            </div>
          ) : visibleHiring
              .length >
            0 ? (
            <div className="se-rec-hiring-list">
              {visibleHiring.map(
                (
                  requirement
                ) => {
                  const id =
                    getRecordId(
                      requirement
                    );

                  const priority =
                    getPriorityMeta(
                      requirement
                        ?.priority
                    );

                  const assignedHr =
                    requirement
                      ?.assignedHr;

                  return (
                    <button
                      key={
                        id ||
                        requirement
                          ?.requestNumber
                      }
                      type="button"
                      className="se-rec-hiring-row"
                      onClick={() =>
                        navigate(
                          id
                            ? buildHiringWorkspaceUrl(
                                id
                              )
                            : buildRecruitmentUrl(
                                "hiring"
                              )
                        )
                      }
                    >
                      <span className="se-rec-hiring-main">
                        <span className="se-rec-hiring-avatar">
                          {safeText(
                            requirement
                              ?.positionTitle,
                            "R"
                          )
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </span>

                        <span>
                          <strong>
                            {safeText(
                              requirement
                                ?.positionTitle,

                              "Open Position"
                            )}
                          </strong>

                          <small>
                            {safeText(
                              requirement
                                ?.requestNumber,

                              "Requirement"
                            )}

                            {" • "}

                            {safeText(
                              requirement
                                ?.department
                                ?.name,

                              "Department"
                            )}
                          </small>
                        </span>
                      </span>

                      <span className="se-rec-hiring-openings">
                        <small>
                          OPENINGS
                        </small>

                        <strong>
                          {Number(
                            requirement
                              ?.numberOfOpenings ||
                            0
                          )}
                        </strong>
                      </span>

                      <span className="se-rec-hiring-owner">
                        <small>
                          HIRING OWNER
                        </small>

                        <strong>
                          {safeText(
                            assignedHr
                              ?.displayName,

                            "Not assigned"
                          )}
                        </strong>
                      </span>

                      <RecruitmentStatusBadge
                        label={
                          priority.label
                        }
                        tone={
                          priority.tone
                        }
                      />

                      <span className="se-rec-hiring-date">
                        <small>
                          REQUIRED BY
                        </small>

                        <strong>
                          {formatRecruitmentDate(
                            requirement
                              ?.requiredByDate
                          )}
                        </strong>
                      </span>

                      <span className="se-rec-row-arrow">
                        →
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <RecruitmentEmptyState
              icon="H"
              title="No active hiring"
              description="Approved or active manpower requirements will appear here."
            />
          )}
        </section>

        {/* =================================================
            PIPELINE
        ================================================== */}

        <section className="se-rec-pipeline">
          <div className="se-rec-pipeline-head">
            <div>
              <span>
                WORKFLOW
              </span>

              <h3>
                Recruitment pipeline
              </h3>
            </div>

            <span className="se-rec-pipeline-live">
              <i />

              Live workflow
            </span>
          </div>

          <div className="se-rec-pipeline-track se-rec-pipeline-track--full">
            {/* =============================================
                01 REQUIREMENT
            ============================================== */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "manpower"
                  )
                )
              }
            >
              <span>
                01
              </span>

              <div>
                <strong>
                  Requirement
                </strong>

                <small>
                  Demand & approval
                </small>
              </div>
            </button>

            <i>
              →
            </i>

            {/* =============================================
                02 SOURCING
            ============================================== */}

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
              <span>
                02
              </span>

              <div>
                <strong>
                  Sourcing
                </strong>

                <small>
                  Candidate pipeline
                </small>
              </div>
            </button>

            <i>
              →
            </i>

            {/* =============================================
                03 SCREENING
            ============================================== */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "candidates",
                    {
                      action:
                        "COMPLETE_SCREENING",
                    }
                  )
                )
              }
            >
              <span>
                03
              </span>

              <div>
                <strong>
                  Screening
                </strong>

                <small>
                  Qualification
                </small>
              </div>
            </button>

            <i>
              →
            </i>

            {/* =============================================
                04 INTERVIEW
            ============================================== */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "interviews"
                  )
                )
              }
            >
              <span>
                04
              </span>

              <div>
                <strong>
                  Interview
                </strong>

                <small>
                  Interview rounds
                </small>
              </div>
            </button>

            <i>
              →
            </i>

            {/* =============================================
                05 EVALUATION
            ============================================== */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "evaluations"
                  )
                )
              }
            >
              <span>
                05
              </span>

              <div>
                <strong>
                  Evaluation
                </strong>

                <small>
                  Hiring decision
                </small>
              </div>
            </button>

            <i>
              →
            </i>

            {/* =============================================
                06 SELECTION
            ============================================== */}

            <button
              type="button"
              className="se-rec-pipeline-selection"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "selections"
                  )
                )
              }
            >
              <span>
                06
              </span>

              <div>
                <strong>
                  Selection
                </strong>

                <small>
                  LOI & joining
                </small>
              </div>
            </button>
          </div>
        </section>
      </div>
    );
  };

export default RecruitmentOverview;