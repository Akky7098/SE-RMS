import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSelections,
  getSelectionSummary,
} from "../../../services/selectionService";

import "./Selection.css";

/* =========================================================
   CONSTANTS
========================================================= */

const STAGE_FILTERS = {
  ALL: [],

  LOI: [
    "LOI_PENDING",
    "LOI_DRAFT",
    "LOI_SENT",
    "LOI_ACCEPTED",
    "LOI_DECLINED",
  ],

  DOCUMENTS: [
    "PRE_JOINING_DOCUMENTS",
    "DOCUMENTS_SUBMITTED",
    "DOCUMENT_VERIFICATION",
    "DOCUMENT_QUERY",
    "DOCUMENTS_VERIFIED",
  ],

  OFFER: [
    "READY_FOR_OFFER",
    "OFFER_DRAFT",
    "OFFER_SENT",
    "OFFER_ACCEPTED",
    "OFFER_DECLINED",
  ],

  JOINING: [
    "JOINING_PENDING",
    "JOINING_CONFIRMED",
  ],
};

/* =========================================================
   HELPERS
========================================================= */

const candidateName = (
  item
) =>
  item?.candidate
    ?.fullName ||
  "Candidate";

const candidateInitial = (
  item
) =>
  candidateName(
    item
  )
    .trim()
    .charAt(0)
    .toUpperCase() ||
  "C";

const niceValue = (
  value
) =>
  String(
    value ||
      ""
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-IN",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
      }
    )
    .format(
      date
    );
};

const stageClass = (
  status
) => {
  if (
    [
      "LOI_PENDING",
      "LOI_DRAFT",
      "LOI_SENT",
      "LOI_ACCEPTED",
      "LOI_DECLINED",
    ].includes(
      status
    )
  ) {
    return "loi";
  }

  if (
    [
      "PRE_JOINING_DOCUMENTS",
      "DOCUMENTS_SUBMITTED",
      "DOCUMENT_VERIFICATION",
      "DOCUMENT_QUERY",
      "DOCUMENTS_VERIFIED",
    ].includes(
      status
    )
  ) {
    return "documents";
  }

  if (
    [
      "READY_FOR_OFFER",
      "OFFER_DRAFT",
      "OFFER_SENT",
      "OFFER_ACCEPTED",
      "OFFER_DECLINED",
    ].includes(
      status
    )
  ) {
    return "offer";
  }

  if (
    [
      "JOINING_PENDING",
      "JOINING_CONFIRMED",
    ].includes(
      status
    )
  ) {
    return "joining";
  }

  return "default";
};

/* =========================================================
   PAGE
========================================================= */

function SelectionPage() {
  const [
    records,
    setRecords,
  ] =
    useState(
      []
    );

  const [
    summary,
    setSummary,
  ] =
    useState({
      total: 0,
      loi: 0,
      documents: 0,
      offer: 0,
      joining: 0,
      actionDue: 0,
    });

  const [
    stageFilter,
    setStageFilter,
  ] =
    useState(
      "ALL"
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

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

  /* =====================================================
     LOAD
  ===================================================== */

  const load =
    useCallback(
      async (
        silent =
          false
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

          const [
            summaryResult,
            listResult,
          ] =
            await Promise.all([
              getSelectionSummary(),

              getSelections({
                search:
                  search.trim(),

                page: 1,

                limit: 100,
              }),
            ]);

          setSummary({
            total:
              summaryResult
                ?.total ||
              0,

            loi:
              summaryResult
                ?.loi ||
              0,

            documents:
              summaryResult
                ?.documents ||
              0,

            offer:
              summaryResult
                ?.offer ||
              0,

            joining:
              summaryResult
                ?.joining ||
              0,

            actionDue:
              summaryResult
                ?.actionDue ||
              0,
          });

          setRecords(
            Array.isArray(
              listResult
                ?.records
            )
              ? listResult.records
              : []
          );
        } catch (
          err
        ) {
          setError(
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Selected candidates could not be loaded"
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
      [
        search,
      ]
    );

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            load();
          },
          search
            ? 250
            : 0
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    [
      load,
      search,
    ]
  );

  /* =====================================================
     FILTER
  ===================================================== */

  const visibleRecords =
    useMemo(
      () => {
        if (
          stageFilter ===
          "ALL"
        ) {
          return records;
        }

        const statuses =
          STAGE_FILTERS[
            stageFilter
          ] ||
          [];

        return records.filter(
          (
            item
          ) =>
            statuses.includes(
              item?.status
            )
        );
      },
      [
        records,
        stageFilter,
      ]
    );

  const filters = [
    {
      key:
        "ALL",

      label:
        "All",

      count:
        summary.total,
    },

    {
      key:
        "LOI",

      label:
        "LOI",

      count:
        summary.loi,
    },

    {
      key:
        "DOCUMENTS",

      label:
        "Documents",

      count:
        summary.documents,
    },

    {
      key:
        "OFFER",

      label:
        "Offer",

      count:
        summary.offer,
    },

    {
      key:
        "JOINING",

      label:
        "Joining",

      count:
        summary.joining,
    },
  ];

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const openSelection =
    (
      selectionId
    ) => {
      if (
        !selectionId
      ) {
        return;
      }

      const url =
        new URL(
          window.location.href
        );

      url.searchParams.set(
        "app",
        "recruitment"
      );

      url.searchParams.set(
        "page",
        "selection"
      );

      url.searchParams.set(
        "id",
        selectionId
      );

      window.history.pushState(
        {},
        "",
        url
      );

      window.dispatchEvent(
        new PopStateEvent(
          "popstate"
        )
      );
    };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="selection-page">

      {/* =================================================
          HEADER
      ================================================== */}

      <section className="selection-heading">

        <div>

          <div className="selection-eyebrow">
            Recruitment · Post Selection
          </div>

          <h1>
            Selected Candidates
          </h1>

          <p>
            Manage LOI, pre-joining documents,
            Offer Letter and joining from one
            controlled recruitment workflow.
          </p>

        </div>

        <button
          type="button"
          className="selection-refresh"
          onClick={() =>
            load(
              true
            )
          }
          disabled={
            refreshing
          }
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>

      </section>

      {/* =================================================
          SUMMARY
      ================================================== */}

      <section className="selection-summary-grid">

        <article className="selection-summary-card selection-summary-card--total">

          <div className="selection-summary-icon">
            S
          </div>

          <div>

            <strong>
              {summary.total}
            </strong>

            <span>
              Selected
            </span>

          </div>

        </article>

        <article className="selection-summary-card selection-summary-card--loi">

          <div className="selection-summary-icon">
            L
          </div>

          <div>

            <strong>
              {summary.loi}
            </strong>

            <span>
              LOI Stage
            </span>

          </div>

        </article>

        <article className="selection-summary-card selection-summary-card--documents">

          <div className="selection-summary-icon">
            D
          </div>

          <div>

            <strong>
              {summary.documents}
            </strong>

            <span>
              Documents
            </span>

          </div>

        </article>

        <article className="selection-summary-card selection-summary-card--offer">

          <div className="selection-summary-icon">
            O
          </div>

          <div>

            <strong>
              {summary.offer}
            </strong>

            <span>
              Offer
            </span>

          </div>

        </article>

        <article className="selection-summary-card selection-summary-card--action">

          <div className="selection-summary-icon">
            !
          </div>

          <div>

            <strong>
              {summary.actionDue}
            </strong>

            <span>
              Action Due
            </span>

          </div>

        </article>

      </section>

      {/* =================================================
          FILTERS
      ================================================== */}

      <section className="selection-toolbar">

        <div className="selection-filter-tabs">

          {filters.map(
            (
              filter
            ) => (
              <button
                key={
                  filter.key
                }
                type="button"
                className={
                  stageFilter ===
                  filter.key
                    ? "selection-filter is-active"
                    : "selection-filter"
                }
                onClick={() =>
                  setStageFilter(
                    filter.key
                  )
                }
              >

                <span>
                  {filter.label}
                </span>

                <strong>
                  {filter.count}
                </strong>

              </button>
            )
          )}

        </div>

        <div className="selection-search">

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
            placeholder="Search candidate, selection number or position..."
          />

        </div>

      </section>

      {/* =================================================
          ERROR
      ================================================== */}

      {error ? (
        <div className="selection-error">
          {error}
        </div>
      ) : null}

      {/* =================================================
          LIST
      ================================================== */}

      <section className="selection-list-card">

        <div className="selection-list-header">

          <div>

            <span>
              POST-SELECTION WORKSPACE
            </span>

            <h2>
              Candidate Progress
            </h2>

          </div>

          <strong>
            {visibleRecords.length}
            {" "}
            visible
          </strong>

        </div>

        {loading ? (
          <div className="selection-loading">
            Loading selected candidates...
          </div>
        ) : visibleRecords.length ===
          0 ? (
          <div className="selection-empty">

            <div>
              S
            </div>

            <strong>
              No candidates found
            </strong>

            <span>
              Selected candidates will appear here
              automatically.
            </span>

          </div>
        ) : (
          <div className="selection-table-wrap">

            <table className="selection-table">

              <thead>

                <tr>

                  <th>
                    Candidate
                  </th>

                  <th>
                    Position
                  </th>

                  <th>
                    Selection
                  </th>

                  <th>
                    Current Stage
                  </th>

                  <th>
                    Progress
                  </th>

                  <th>
                    Hiring HR
                  </th>

                  <th>
                    Selected
                  </th>

                  <th>
                    Next Action
                  </th>

                  <th />

                </tr>

              </thead>

              <tbody>

                {visibleRecords.map(
                  (
                    item
                  ) => {
                    const workflow =
                      item?.workflow ||
                      {};

                    const stage =
                      stageClass(
                        item?.status
                      );

                    const progress =
                      Number(
                        workflow
                          ?.progressPercent ||
                          0
                      );

                    return (
                      <tr
                        key={
                          item._id
                        }
                        className="selection-table-row"
                        onClick={() =>
                          openSelection(
                            item._id
                          )
                        }
                      >

                        {/* CANDIDATE */}

                        <td>

                          <div className="selection-candidate">

                            <div className="selection-avatar">
                              {candidateInitial(
                                item
                              )}
                            </div>

                            <div>

                              <strong>
                                {candidateName(
                                  item
                                )}
                              </strong>

                              <span>
                                {item
                                  ?.candidate
                                  ?.candidateNumber ||
                                  "—"}
                              </span>

                            </div>

                          </div>

                        </td>

                        {/* POSITION */}

                        <td>

                          <strong className="selection-position">
                            {item
                              ?.positionTitle ||
                              "—"}
                          </strong>

                        </td>

                        {/* SELECTION */}

                        <td>

                          <span className="selection-number">
                            {item
                              ?.selectionNumber ||
                              "—"}
                          </span>

                        </td>

                        {/* STAGE */}

                        <td>

                          <span
                            className={
                              `selection-stage selection-stage--${stage}`
                            }
                          >
                            {workflow
                              ?.stageLabel ||
                              niceValue(
                                item
                                  ?.status
                              )}
                          </span>

                        </td>

                        {/* PROGRESS */}

                        <td>

                          <div className="selection-progress-cell">

                            <div className="selection-progress-track">

                              <div
                                className={
                                  `selection-progress-fill selection-progress-fill--${stage}`
                                }
                                style={{
                                  width:
                                    `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        progress
                                      )
                                    )}%`,
                                }}
                              />

                            </div>

                            <span>
                              {progress}%
                            </span>

                          </div>

                        </td>

                        {/* HR */}

                        <td>
                          {item
                            ?.hiringHr
                            ?.displayName ||
                            "—"}
                        </td>

                        {/* SELECTED */}

                        <td>
                          {formatDate(
                            item
                              ?.selectedAt
                          )}
                        </td>

                        {/* NEXT ACTION */}

                        <td>

                          <strong className="selection-next-action">
                            {workflow
                              ?.nextActionLabel ||
                              "Open"}
                          </strong>

                        </td>

                        {/* OPEN */}

                        <td>

                          <button
                            type="button"
                            className="selection-open-row"
                            aria-label={`Open ${candidateName(
                              item
                            )}`}
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              openSelection(
                                item._id
                              );
                            }}
                          >
                            →
                          </button>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}

export default SelectionPage;