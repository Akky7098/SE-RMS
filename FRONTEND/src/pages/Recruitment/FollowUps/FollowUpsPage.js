import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  getMyRecruitmentTasks,
} from "../../../services/recruitmentService";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import {
  buildCandidateDetailUrl,
  formatRecruitmentDateTime,
  getCandidateStatusMeta,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./FollowUps.css";

/* =========================================================
   COMPONENT
========================================================= */

const FollowUpsPage =
  () => {
    const navigate =
      useNavigate();

    const [
      tasks,
      setTasks,
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
      search,
      setSearch,
    ] = useState("");

    const [
      filter,
      setFilter,
    ] = useState(
      "ALL"
    );

    /* =====================================================
       LOAD
    ===================================================== */

    const load =
      useCallback(
        async () => {
          try {
            setLoading(
              true
            );

            setError(
              ""
            );

            const data =
              await getMyRecruitmentTasks();

            setTasks(
              Array.isArray(
                data
              )
                ? data
                : []
            );
          } catch (
            loadError
          ) {
            setError(
              loadError?.response
                ?.data
                ?.message ||
                loadError?.message ||
                "Recruitment tasks could not be loaded."
            );
          } finally {
            setLoading(
              false
            );
          }
        },
        []
      );

    useEffect(() => {
      load();
    }, [
      load,
    ]);

    /* =====================================================
       METRICS
    ===================================================== */

    const metrics =
      useMemo(() => {
        const now =
          Date.now();

        let followUps =
          0;

        let calls =
          0;

        let screening =
          0;

        let overdue =
          0;

        tasks.forEach(
          (
            item
          ) => {
            if (
              item
                ?.nextAction ===
              "FOLLOW_UP_CALL"
            ) {
              followUps +=
                1;
            }

            if (
              item
                ?.nextAction ===
              "CALL_CANDIDATE"
            ) {
              calls +=
                1;
            }

            if (
              item
                ?.nextAction ===
              "COMPLETE_SCREENING"
            ) {
              screening +=
                1;
            }

            if (
              item?.nextActionAt &&
              new Date(
                item.nextActionAt
              ).getTime() <
                now
            ) {
              overdue +=
                1;
            }
          }
        );

        return {
          total:
            tasks.length,

          followUps,

          calls,

          screening,

          overdue,
        };
      }, [
        tasks,
      ]);

    /* =====================================================
       FILTER
    ===================================================== */

    const visible =
      useMemo(() => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        const now =
          Date.now();

        return tasks
          .filter(
            (
              item
            ) => {
              if (
                filter ===
                  "FOLLOW_UP" &&
                item
                  ?.nextAction !==
                  "FOLLOW_UP_CALL"
              ) {
                return false;
              }

              if (
                filter ===
                  "CALL" &&
                item
                  ?.nextAction !==
                  "CALL_CANDIDATE"
              ) {
                return false;
              }

              if (
                filter ===
                  "SCREENING" &&
                item
                  ?.nextAction !==
                  "COMPLETE_SCREENING"
              ) {
                return false;
              }

              if (
                filter ===
                "OVERDUE"
              ) {
                if (
                  !item
                    ?.nextActionAt ||
                  new Date(
                    item
                      .nextActionAt
                  ).getTime() >=
                    now
                ) {
                  return false;
                }
              }

              if (
                !keyword
              ) {
                return true;
              }

              return [
                item
                  ?.fullName,

                item
                  ?.candidateNumber,

                item
                  ?.mobile,

                item
                  ?.positionTitle,

                item
                  ?.currentCompany,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLowerCase()
                .includes(
                  keyword
                );
            }
          )
          .sort(
            (
              a,
              b
            ) => {
              const aTime =
                a
                  ?.nextActionAt
                  ? new Date(
                      a
                        .nextActionAt
                    ).getTime()
                  : Number.MAX_SAFE_INTEGER;

              const bTime =
                b
                  ?.nextActionAt
                  ? new Date(
                      b
                        .nextActionAt
                    ).getTime()
                  : Number.MAX_SAFE_INTEGER;

              return (
                aTime -
                bTime
              );
            }
          );
      }, [
        tasks,
        filter,
        search,
      ]);

    return (
      <section className="se-followup-page">
        <header className="se-followup-head">
          <div>
            <span>
              RECRUITMENT · ACTION CENTER
            </span>

            <h1>
              Follow-ups
            </h1>

            <p>
              Calls, follow-ups and
              screening work currently
              assigned to you.
            </p>
          </div>

          <button
            type="button"
            onClick={
              load
            }
          >
            ↻ Refresh
          </button>
        </header>

        <div className="se-followup-metrics">
          {[
            [
              "ALL",
              "T",
              metrics.total,
              "All Tasks",
            ],

            [
              "FOLLOW_UP",
              "↻",
              metrics.followUps,
              "Follow-ups",
            ],

            [
              "CALL",
              "☎",
              metrics.calls,
              "Calls",
            ],

            [
              "SCREENING",
              "S",
              metrics.screening,
              "Screening",
            ],

            [
              "OVERDUE",
              "!",
              metrics.overdue,
              "Overdue",
            ],
          ].map(
            (
              [
                key,
                icon,
                value,
                label,
              ]
            ) => (
              <button
                key={
                  key
                }
                type="button"
                className={
                  filter ===
                  key
                    ? `active ${key.toLowerCase()}`
                    : key.toLowerCase()
                }
                onClick={() =>
                  setFilter(
                    key
                  )
                }
              >
                <span>
                  {
                    icon
                  }
                </span>

                <div>
                  <strong>
                    {
                      value
                    }
                  </strong>

                  <small>
                    {
                      label
                    }
                  </small>
                </div>
              </button>
            )
          )}
        </div>

        <div className="se-followup-toolbar">
          <span>
            ⌕
          </span>

          <input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
            placeholder="Search candidate or position..."
          />

          <strong>
            {
              visible.length
            }
          </strong>

          <small>
            actions
          </small>
        </div>

        {error ? (
          <div className="se-candidate-global-error">
            <span>
              !
            </span>

            <p>
              {
                error
              }
            </p>
          </div>
        ) : null}

        <article className="se-followup-list">
          {loading ? (
            <div className="se-followup-loading">
              <span />
              <span />
              <span />
            </div>
          ) : visible.length >
            0 ? (
            visible.map(
              (
                candidate
              ) => {
                const id =
                  getRecordId(
                    candidate
                  );

                const status =
                  getCandidateStatusMeta(
                    candidate
                      ?.status
                  );

                const overdue =
                  candidate
                    ?.nextActionAt &&
                  new Date(
                    candidate
                      .nextActionAt
                  ).getTime() <
                    Date.now();

                return (
                  <button
                    type="button"
                    key={
                      id
                    }
                    className={
                      overdue
                        ? "overdue"
                        : ""
                    }
                    onClick={() =>
                      navigate(
                        buildCandidateDetailUrl(
                          id
                        )
                      )
                    }
                  >
                    <span className="se-followup-avatar">
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

                    <span className="se-followup-person">
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
                            ?.positionTitle,
                          "Position"
                        )}

                        {" · "}

                        {safeText(
                          candidate
                            ?.candidateNumber,
                          "Candidate"
                        )}
                      </small>
                    </span>

                    <RecruitmentStatusBadge
                      label={
                        status.label
                      }
                      tone={
                        status.tone
                      }
                    />

                    <span className="se-followup-action">
                      <small>
                        NEXT ACTION
                      </small>

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
                    </span>

                    <span
                      className={
                        overdue
                          ? "se-followup-due overdue"
                          : "se-followup-due"
                      }
                    >
                      <small>
                        {overdue
                          ? "OVERDUE"
                          : "DUE"}
                      </small>

                      <strong>
                        {candidate
                          ?.nextActionAt
                          ? formatRecruitmentDateTime(
                              candidate
                                .nextActionAt
                            )
                          : "Now"}
                      </strong>
                    </span>

                    <span className="arrow">
                      →
                    </span>
                  </button>
                );
              }
            )
          ) : (
            <RecruitmentEmptyState
              icon="✓"
              title="No actions waiting"
              description="No recruitment tasks currently match the selected filter."
            />
          )}
        </article>
      </section>
    );
  };

export default FollowUpsPage;