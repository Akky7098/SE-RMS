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

import selectedCandidatesHeroVideo from "./selected-candidates-hero.mp4";
import selectedCandidatesHeroPoster from "./selected-candidates-hero-poster.webp";



import "./Selection.css";


/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 50;

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

const normalize = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();


const candidateName = (item) =>
  item?.candidate?.fullName ||
  item?.candidateName ||
  "Candidate";


const candidateInitial = (item) =>
  candidateName(item)
    .trim()
    .charAt(0)
    .toUpperCase() || "C";


const niceValue = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );


const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};


const toTime = (value) => {
  if (!value) {
    return 0;
  }

  const time =
    new Date(value).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
};


/* =========================================================
   CANDIDATE IDENTITY

   IMPORTANT:
   Post-selection is candidate-level, not interview-round-level.

   Primary identity:
   candidate._id

   Fallbacks exist only for older/incomplete populated records.
========================================================= */

const getCandidateKey = (item) => {
  const candidateId =
    item?.candidate?._id ||
    item?.candidate?.id ||
    item?.candidateId;

  if (candidateId) {
    return `candidate:${String(
      candidateId
    )}`;
  }

  const candidateNumber =
    item?.candidate?.candidateNumber ||
    item?.candidateNumber;

  if (candidateNumber) {
    return `number:${String(
      candidateNumber
    )
      .trim()
      .toLowerCase()}`;
  }

  const email =
    item?.candidate?.email ||
    item?.candidateEmail;

  if (email) {
    return `email:${String(
      email
    )
      .trim()
      .toLowerCase()}`;
  }

  /*
   * Last-resort legacy fallback.
   *
   * Position is included so two genuinely separate applications
   * by the same name do not automatically collapse.
   */
  return `legacy:${candidateName(item)
    .trim()
    .toLowerCase()}:${String(
      item?.positionTitle || ""
    )
      .trim()
      .toLowerCase()}`;
};


/* =========================================================
   RECORD RECENCY

   If legacy/backend data already contains duplicate
   Selection records for one candidate, show only the
   newest/current workflow record.

   This fixes the UI duplication without deleting DB data.
========================================================= */

const getRecordTime = (item) =>
  Math.max(
    toTime(item?.updatedAt),
    toTime(item?.selectedAt),
    toTime(item?.createdAt)
  );


const chooseCurrentSelection = (
  current,
  candidate
) => {
  if (!current) {
    return candidate;
  }

  if (!candidate) {
    return current;
  }

  const currentTime =
    getRecordTime(current);

  const candidateTime =
    getRecordTime(candidate);

  if (
    candidateTime >
    currentTime
  ) {
    return candidate;
  }

  if (
    candidateTime <
    currentTime
  ) {
    return current;
  }

  /*
   * Deterministic fallback when timestamps are identical.
   */
  return String(
    candidate?._id || ""
  ) > String(
    current?._id || ""
  )
    ? candidate
    : current;
};


/* =========================================================
   DEDUPLICATE SELECTIONS

   ONE CANDIDATE = ONE POST-SELECTION WORKFLOW
========================================================= */

const deduplicateSelections = (
  records
) => {
  const map = new Map();

  (Array.isArray(records)
    ? records
    : []
  ).forEach((item) => {
    const key =
      getCandidateKey(item);

    const existing =
      map.get(key);

    map.set(
      key,
      chooseCurrentSelection(
        existing,
        item
      )
    );
  });

  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      getRecordTime(b) -
      getRecordTime(a)
  );
};


/* =========================================================
   STAGE
========================================================= */

const stageClass = (status) => {
  const value =
    normalize(status);

  if (
    [
      "LOI_PENDING",
      "LOI_DRAFT",
      "LOI_SENT",
      "LOI_ACCEPTED",
      "LOI_DECLINED",
    ].includes(value)
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
    ].includes(value)
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
    ].includes(value)
  ) {
    return "offer";
  }

  if (
    [
      "JOINING_PENDING",
      "JOINING_CONFIRMED",
    ].includes(value)
  ) {
    return "joining";
  }

  return "default";
};


/* =========================================================
   CLIENT-SIDE SUMMARY FROM UNIQUE CANDIDATES

   This keeps the numbers consistent with the visible
   one-candidate-one-row UI even when legacy duplicate
   records still exist in the database.
========================================================= */

const buildUniqueSummary = (
  records
) => {
  const result = {
    total: records.length,
    loi: 0,
    documents: 0,
    offer: 0,
    joining: 0,
    actionDue: 0,
  };

  records.forEach((item) => {
    const status =
      normalize(item?.status);

    if (
      STAGE_FILTERS.LOI.includes(
        status
      )
    ) {
      result.loi += 1;
    }

    if (
      STAGE_FILTERS.DOCUMENTS.includes(
        status
      )
    ) {
      result.documents += 1;
    }

    if (
      STAGE_FILTERS.OFFER.includes(
        status
      )
    ) {
      result.offer += 1;
    }

    if (
      STAGE_FILTERS.JOINING.includes(
        status
      )
    ) {
      result.joining += 1;
    }

    const workflow =
      item?.workflow || {};

    if (
      workflow?.actionDue === true ||
      item?.actionDue === true
    ) {
      result.actionDue += 1;
    }
  });

  return result;
};


/* =========================================================
   PAGE
========================================================= */

function SelectionPage() {
  const [heroVideoEnabled, setHeroVideoEnabled] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    backendSummary,
    setBackendSummary,
  ] = useState({
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
  ] = useState("ALL");

  const [
    search,
    setSearch,
  ] = useState("");

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
    currentPage,
    setCurrentPage,
  ] = useState(1);

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


  /* =======================================================
     LOAD

     We intentionally load enough records here so duplicate
     legacy selection records can be collapsed BEFORE
     frontend pagination.

     The final permanent fix should also enforce one active
     post-selection record per candidate in the backend.
  ======================================================= */

  const load =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

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

                /*
                 * Temporary high retrieval ceiling so
                 * candidate-level deduplication occurs
                 * before the 50-row UI pagination.
                 */
                limit: 1000,
              }),
            ]);

          setBackendSummary({
            total:
              summaryResult
                ?.total || 0,

            loi:
              summaryResult
                ?.loi || 0,

            documents:
              summaryResult
                ?.documents || 0,

            offer:
              summaryResult
                ?.offer || 0,

            joining:
              summaryResult
                ?.joining || 0,

            actionDue:
              summaryResult
                ?.actionDue || 0,
          });

          setRecords(
            Array.isArray(
              listResult?.records
            )
              ? listResult.records
              : []
          );
        } catch (err) {
          setError(
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Selected candidates could not be loaded"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        search,
      ]
    );


  /* =======================================================
     SEARCH DEBOUNCE
  ======================================================= */

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


  /* =======================================================
     RESET PAGE WHEN SEARCH / FILTER CHANGES
  ======================================================= */

  useEffect(
    () => {
      setCurrentPage(1);
    },
    [
      search,
      stageFilter,
    ]
  );


  /* =======================================================
     UNIQUE CANDIDATES

     THIS IS THE IMPORTANT FIX.
  ======================================================= */

  const uniqueRecords =
    useMemo(
      () =>
        deduplicateSelections(
          records
        ),
      [
        records,
      ]
    );


  /* =======================================================
     SUMMARY

     For normal no-search view use unique records so the
     cards cannot say 4 selected while only 3 candidates
     actually exist because of duplicate Selection records.
  ======================================================= */

  const uniqueSummary =
    useMemo(
      () =>
        buildUniqueSummary(
          uniqueRecords
        ),
      [
        uniqueRecords,
      ]
    );


  /*
   * backendSummary remains loaded intentionally.
   * It can be used later when the backend itself is changed
   * to candidate-distinct aggregation.
   */
  void backendSummary;


  /* =======================================================
     FILTER
  ======================================================= */

  const filteredRecords =
    useMemo(
      () => {
        if (
          stageFilter ===
          "ALL"
        ) {
          return uniqueRecords;
        }

        const statuses =
          STAGE_FILTERS[
            stageFilter
          ] || [];

        return uniqueRecords.filter(
          (item) =>
            statuses.includes(
              normalize(
                item?.status
              )
            )
        );
      },
      [
        uniqueRecords,
        stageFilter,
      ]
    );


  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalRecords =
    filteredRecords.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalRecords /
        PAGE_SIZE
      )
    );


  useEffect(
    () => {
      if (
        currentPage >
        totalPages
      ) {
        setCurrentPage(
          totalPages
        );
      }
    },
    [
      currentPage,
      totalPages,
    ]
  );


  const pageRecords =
    useMemo(
      () => {
        const start =
          (currentPage - 1) *
          PAGE_SIZE;

        return filteredRecords.slice(
          start,
          start + PAGE_SIZE
        );
      },
      [
        filteredRecords,
        currentPage,
      ]
    );


  const pageStart =
    totalRecords === 0
      ? 0
      : (
        (currentPage - 1) *
        PAGE_SIZE
      ) + 1;

  const pageEnd =
    Math.min(
      currentPage *
      PAGE_SIZE,
      totalRecords
    );


  /* =======================================================
     FILTER COUNTS
  ======================================================= */

  const filters = [
    {
      key: "ALL",
      label: "All",
      count:
        uniqueSummary.total,
    },

    {
      key: "LOI",
      label: "LOI",
      count:
        uniqueSummary.loi,
    },

    {
      key: "DOCUMENTS",
      label: "Documents",
      count:
        uniqueSummary.documents,
    },

    {
      key: "OFFER",
      label: "Offer",
      count:
        uniqueSummary.offer,
    },

    {
      key: "JOINING",
      label: "Joining",
      count:
        uniqueSummary.joining,
    },
  ];


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const openSelection =
    (selectionId) => {
      if (!selectionId) {
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


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="selection-page">

      {/* ===================================================
          HEADER
      ==================================================== */}

     <section className="selection-heading selection-video-hero">

  <div className="selection-video-media">
    <img
      className="selection-hero-poster"
      src={selectedCandidatesHeroPoster}
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority="high"
    />

    {heroVideoEnabled ? (
      <video
        className={`selection-hero-video ${
          heroVideoReady ? "is-ready" : ""
        }`}
        src={selectedCandidatesHeroVideo}
        poster={selectedCandidatesHeroPoster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onCanPlay={() => setHeroVideoReady(true)}
      />
    ) : null}
  </div>

  <div className="selection-video-shade" />

  <div className="selection-video-content">

    <div className="selection-video-copy">

      <div className="selection-eyebrow">
        Recruitment · Post Selection
      </div>

      <h1>
        Selected Candidates
      </h1>

      <p>
        From selection to joining — manage every candidate's
        final onboarding journey.
      </p>

    </div>

    <button
      type="button"
      className="selection-refresh"
      onClick={() => load(true)}
      disabled={refreshing}
    >
      {refreshing
        ? "Refreshing..."
        : "↻ Refresh"}
    </button>

  </div>

</section>


      {/* ===================================================
          SUMMARY
      ==================================================== */}

      <section className="selection-summary-grid">

        <article className="selection-summary-card selection-summary-card--total">

          <div className="selection-summary-icon">
            S
          </div>

          <div>
            <strong>
              {uniqueSummary.total}
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
              {uniqueSummary.loi}
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
              {uniqueSummary.documents}
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
              {uniqueSummary.offer}
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
              {uniqueSummary.actionDue}
            </strong>

            <span>
              Action Due
            </span>
          </div>

        </article>

      </section>


      {/* ===================================================
          FILTER / SEARCH
      ==================================================== */}

      <section className="selection-toolbar">

        <div className="selection-filter-tabs">

          {filters.map(
            (filter) => (

              <button
                key={filter.key}
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
            value={search}
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


      {/* ===================================================
          ERROR
      ==================================================== */}

      {error ? (
        <div className="selection-error">
          {error}
        </div>
      ) : null}


      {/* ===================================================
          LIST
      ==================================================== */}

      <section className="selection-list-card">

        <div className="selection-list-header">

          <div>
            <span>
              POST-SELECTION
            </span>

            <h2>
              Candidate Progress
            </h2>
          </div>


          <strong>
            {totalRecords}
            {" "}
            {totalRecords === 1
              ? "candidate"
              : "candidates"}
          </strong>

        </div>


        {loading ? (

          <div className="selection-loading">
            Loading selected candidates...
          </div>

        ) : totalRecords === 0 ? (

          <div className="selection-empty">

            <div>
              S
            </div>

            <strong>
              No candidates found
            </strong>

          </div>

        ) : (

          <>

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
                      Selection ID
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
                      Selected On
                    </th>

                    <th>
                      Next Action
                    </th>

                    <th />

                  </tr>

                </thead>


                <tbody>

                  {pageRecords.map(
                    (item) => {

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

                      const safeProgress =
                        Math.min(
                          100,
                          Math.max(
                            0,
                            Number.isFinite(
                              progress
                            )
                              ? progress
                              : 0
                          )
                        );


                      return (

                        <tr
                          key={
                            getCandidateKey(
                              item
                            )
                          }
                          className="selection-table-row"
                          onClick={() =>
                            openSelection(
                              item?._id
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
                                item?.status
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
                                      `${safeProgress}%`,
                                  }}
                                />

                              </div>

                              <span>
                                {safeProgress}%
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
                              item?.selectedAt
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
                              aria-label={
                                `Open ${candidateName(
                                  item
                                )}`
                              }
                              onClick={(
                                event
                              ) => {
                                event
                                  .stopPropagation();

                                openSelection(
                                  item?._id
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


            {/* =============================================
                PAGINATION
            ============================================== */}

            <div className="selection-pagination">

              <div className="selection-pagination-info">

                Showing

                <strong>
                  {pageStart}
                  –
                  {pageEnd}
                </strong>

                of

                <strong>
                  {totalRecords}
                </strong>

                candidates

                <span>
                  · 50 per page
                </span>

              </div>


              <div className="selection-pagination-actions">

                <button
                  type="button"
                  className="selection-page-button"
                  disabled={
                    currentPage <= 1
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.max(
                          1,
                          page - 1
                        )
                    )
                  }
                >
                  ← Previous
                </button>


                <div className="selection-page-number">

                  Page

                  <strong>
                    {currentPage}
                  </strong>

                  of

                  <strong>
                    {totalPages}
                  </strong>

                </div>


                <button
                  type="button"
                  className="selection-page-button"
                  disabled={
                    currentPage >=
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.min(
                          totalPages,
                          page + 1
                        )
                    )
                  }
                >
                  Next →
                </button>

              </div>

            </div>

          </>

        )}

      </section>

    </div>
  );
}


export default SelectionPage;