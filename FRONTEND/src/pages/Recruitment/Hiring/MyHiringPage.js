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
  getMyHiring,
} from "../../../services/manpowerService";

import HiringCard from "./HiringCard";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

import {
  buildRecruitmentUrl,
  getApiErrorMessage,
  getRecordId,
} from "../utils/recruitmentHelpers";

import "./Hiring.css";

const MyHiringPage = () => {
  const navigate =
    useNavigate();

  const [
    requirements,
    setRequirements,
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
    filter,
    setFilter,
  ] = useState(
    "ALL"
  );

  const loadMyHiring =
    useCallback(
      async (
        silent = false
      ) => {
        try {
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

          const result =
            await getMyHiring();

          setRequirements(
            Array.isArray(
              result
            )
              ? result
              : []
          );
        } catch (
          loadError
        ) {
          setError(
            getApiErrorMessage(
              loadError,
              "Your assigned hiring requirements could not be loaded."
            )
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadMyHiring();
  }, [
    loadMyHiring,
  ]);

  const metrics =
    useMemo(() => {
      let ready =
        0;

      let active =
        0;

      let urgent =
        0;

      requirements.forEach(
        (
          item
        ) => {
          const status =
            String(
              item?.status ||
                ""
            ).toUpperCase();

          if (
            status ===
            "APPROVED"
          ) {
            ready +=
              1;
          }

          if (
            status ===
            "HIRING_IN_PROGRESS"
          ) {
            active +=
              1;
          }

          if (
            String(
              item?.priority ||
                ""
            ).toUpperCase() ===
            "URGENT"
          ) {
            urgent +=
              1;
          }
        }
      );

      return {
        total:
          requirements.length,

        ready,

        active,

        urgent,
      };
    }, [
      requirements,
    ]);

  const visibleRequirements =
    useMemo(() => {
      const keyword =
        String(
          search || ""
        )
          .trim()
          .toLowerCase();

      return requirements.filter(
        (
          item
        ) => {
          const status =
            String(
              item?.status ||
                ""
            ).toUpperCase();

          if (
            filter ===
              "READY" &&
            status !==
              "APPROVED"
          ) {
            return false;
          }

          if (
            filter ===
              "ACTIVE" &&
            status !==
              "HIRING_IN_PROGRESS"
          ) {
            return false;
          }

          if (
            filter ===
              "URGENT" &&
            String(
              item?.priority ||
                ""
            ).toUpperCase() !==
              "URGENT"
          ) {
            return false;
          }

          if (
            !keyword
          ) {
            return true;
          }

          return [
            item
              ?.requestNumber,

            item
              ?.positionTitle,

            item
              ?.department
              ?.name,

            ...(Array.isArray(
              item
                ?.requiredSkills
            )
              ? item
                  .requiredSkills
              : []),
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
      );
    }, [
      requirements,
      search,
      filter,
    ]);

  return (
    <section className="se-hiring-page se-my-hiring-page">
      <header className="se-hiring-page-head">
        <div>
          <span className="se-hiring-eyebrow">
            MY RECRUITMENT WORKSPACE
          </span>

          <h1>
            My Hiring
          </h1>

          <p>
            These are the hiring
            requirements assigned directly
            to you. Open an active role to
            manage candidates, calls,
            screening, follow-ups and
            interviews.
          </p>
        </div>

        <button
          type="button"
          className="se-hiring-refresh"
          disabled={
            refreshing
          }
          onClick={() =>
            loadMyHiring(
              true
            )
          }
        >
          <span>
            ↻
          </span>

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </header>

      <div className="se-my-hiring-summary">
        {[
          {
            key:
              "ALL",

            icon:
              "M",

            label:
              "Assigned Roles",

            value:
              metrics.total,

            tone:
              "total",
          },

          {
            key:
              "READY",

            icon:
              "✓",

            label:
              "Ready to Start",

            value:
              metrics.ready,

            tone:
              "ready",
          },

          {
            key:
              "ACTIVE",

            icon:
              "↗",

            label:
              "Hiring Active",

            value:
              metrics.active,

            tone:
              "active",
          },

          {
            key:
              "URGENT",

            icon:
              "!",

            label:
              "Urgent",

            value:
              metrics.urgent,

            tone:
              "urgent",
          },
        ].map(
          (
            metric
          ) => (
            <button
              type="button"
              key={
                metric.key
              }
              className={
                filter ===
                metric.key
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  metric.key
                )
              }
            >
              <span
                className={`summary-icon ${metric.tone}`}
              >
                {
                  metric.icon
                }
              </span>

              <div>
                <strong>
                  {
                    metric.value
                  }
                </strong>

                <span>
                  {
                    metric.label
                  }
                </span>
              </div>
            </button>
          )
        )}
      </div>

      <div className="se-my-hiring-action-strip">
        <div>
          <span className="pulse" />

          <div>
            <strong>
              Recruitment execution
            </strong>

            <p>
              Open a hiring workspace to
              upload CVs, call candidates,
              screen profiles and continue
              the recruitment workflow.
            </p>
          </div>
        </div>

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
          View All Candidates

          <span>
            →
          </span>
        </button>
      </div>

      <div className="se-hiring-toolbar">
        <div className="se-hiring-search">
          <span>
            ⌕
          </span>

          <input
            type="text"
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
            placeholder="Search my role, MPR, department or skill..."
          />

          {search ? (
            <button
              type="button"
              onClick={() =>
                setSearch(
                  ""
                )
              }
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="se-hiring-result-count">
          <strong>
            {
              visibleRequirements.length
            }
          </strong>

          <span>
            assigned role
            {visibleRequirements.length ===
            1
              ? ""
              : "s"}
          </span>
        </div>
      </div>

      {error ? (
        <div className="se-hiring-page-error">
          <span>
            !
          </span>

          <div>
            <strong>
              My Hiring unavailable
            </strong>

            <p>
              {
                error
              }
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="se-hiring-loading-grid">
          {[
            1,
            2,
            3,
          ].map(
            (
              item
            ) => (
              <div
                key={
                  item
                }
                className="se-hiring-card-skeleton"
              />
            )
          )}
        </div>
      ) : null}

      {!loading &&
      visibleRequirements.length >
        0 ? (
        <div className="se-hiring-grid">
          {visibleRequirements.map(
            (
              requirement
            ) => (
              <HiringCard
                key={
                  getRecordId(
                    requirement
                  )
                }
                requirement={
                  requirement
                }
                sourcePage="my-hiring"
                allowManage={
                  false
                }
              />
            )
          )}
        </div>
      ) : null}

      {!loading &&
      visibleRequirements.length ===
        0 ? (
        <div className="se-hiring-empty-wrap">
          <RecruitmentEmptyState
            icon="M"
            title={
              requirements.length ===
              0
                ? "Nothing assigned yet"
                : "No roles match this filter"
            }
            description={
              requirements.length ===
              0
                ? "When HR management assigns a manpower requirement to you, it will appear here automatically."
                : "Change the search or filter to see your other hiring requirements."
            }
          />
        </div>
      ) : null}
    </section>
  );
};

export default MyHiringPage;