import React, {
  useMemo,
  useState,
} from "react";

function AttendanceFilters({
  rangeType,
  setRangeType,
  from,
  setFrom,
  to,
  setTo,
  search,
  setSearch,
  status,
  setStatus,
  department,
  setDepartment,
  office,
  setOffice,
  workMode,
  setWorkMode,
  source,
  setSource,
  departments = [],
  offices = [],
  canUseManagementFilters = false,
  onReset,
}) {
  const [
    showMoreFilters,
    setShowMoreFilters,
  ] = useState(false);

  const activeFilterCount =
    useMemo(() => {
      let count = 0;

      if (search) count += 1;
      if (status) count += 1;
      if (workMode) count += 1;
      if (source) count += 1;

      if (
        canUseManagementFilters &&
        department
      ) {
        count += 1;
      }

      if (
        canUseManagementFilters &&
        office
      ) {
        count += 1;
      }

      return count;
    }, [
      search,
      status,
      workMode,
      source,
      department,
      office,
      canUseManagementFilters,
    ]);

  const formatRangeDate = (value) => {
    if (!value) return "—";

    const parts =
      String(value).split("-");

    if (parts.length !== 3) {
      return value;
    }

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  };

  const handleReset = () => {
    if (
      typeof onReset ===
      "function"
    ) {
      onReset();
    }

    setShowMoreFilters(false);
  };

  const hasAdvancedFilters =
    Boolean(source) ||
    Boolean(
      canUseManagementFilters &&
      department
    ) ||
    Boolean(
      canUseManagementFilters &&
      office
    );

  return (
    <section className="se-people-att-filter-card se-att-filter-v3">

      <div className="se-att-filter-v3-head">

        <div className="se-att-filter-v3-title">
          <span>
            FILTERS
          </span>

          <h2>
            {canUseManagementFilters
              ? "Attendance filters"
              : "My attendance"}
          </h2>
        </div>

        <div className="se-att-filter-v3-head-actions">

          {activeFilterCount > 0 ? (
            <span className="se-att-filter-v3-active">
              {activeFilterCount} active
            </span>
          ) : null}

          <button
            type="button"
            className="se-att-filter-v3-reset"
            onClick={handleReset}
            disabled={
              activeFilterCount === 0 &&
              rangeType === "WEEK"
            }
          >
            Reset
          </button>

        </div>

      </div>

      <div className="se-att-filter-v3-range">

        <div className="se-att-filter-v3-tabs">

          {[
            [
              "WEEK",
              "This Week",
            ],
            [
              "MONTH",
              "This Month",
            ],
            [
              "CUSTOM",
              "Custom",
            ],
          ].map(
            ([
              code,
              label,
            ]) => (
              <button
                key={code}
                type="button"
                className={
                  rangeType === code
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setRangeType(
                    code
                  )
                }
              >
                {label}
              </button>
            )
          )}

        </div>

        {rangeType !==
        "CUSTOM" ? (
          <div className="se-att-filter-v3-period">

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3.5"
                y="5.5"
                width="17"
                height="15"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.6"
              />

              <path
                d="M8 3.5v4M16 3.5v4M3.5 10h17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>

            <span>
              {formatRangeDate(
                from
              )}
            </span>

            <i>
              →
            </i>

            <span>
              {formatRangeDate(
                to
              )}
            </span>

          </div>
        ) : null}

      </div>

      {rangeType ===
      "CUSTOM" ? (
        <div className="se-att-filter-v3-custom">

          <label className="se-att-filter-v3-field">

            <span>
              FROM
            </span>

            <input
              type="date"
              value={from}
              onChange={(
                event
              ) =>
                setFrom(
                  event.target
                    .value
                )
              }
            />

          </label>

          <span className="se-att-filter-v3-custom-arrow">
            →
          </span>

          <label className="se-att-filter-v3-field">

            <span>
              TO
            </span>

            <input
              type="date"
              value={to}
              onChange={(
                event
              ) =>
                setTo(
                  event.target
                    .value
                )
              }
            />

          </label>

        </div>
      ) : null}

      <div className="se-att-filter-v3-grid">

        <label className="se-att-filter-v3-field se-att-filter-v3-search">

          <span>
            SEARCH
          </span>

          <div className="se-att-filter-v3-input-wrap">

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <path
                d="m16 16 4 4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>

            <input
              type="text"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder={
                canUseManagementFilters
                  ? "Search employee"
                  : "Search records"
              }
            />

            {search ? (
              <button
                type="button"
                className="se-att-filter-v3-clear"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}

          </div>

        </label>

        <label className="se-att-filter-v3-field">

          <span>
            STATUS
          </span>

          <select
            value={status}
            onChange={(
              event
            ) =>
              setStatus(
                event.target
                  .value
              )
            }
          >
            <option value="">
              All statuses
            </option>

            <option value="PRESENT">
              Present
            </option>

            <option value="ABSENT">
              Absent
            </option>

            <option value="HALF_DAY">
              Half Day
            </option>

            <option value="ON_LEAVE">
              On Leave
            </option>

            <option value="WEEK_OFF">
              Week Off
            </option>

            <option value="HOLIDAY">
              Holiday
            </option>

            <option value="NOT_MARKED">
              Not Marked
            </option>

            <option value="NOT_APPLICABLE">
              Not Applicable
            </option>
          </select>

        </label>

        <label className="se-att-filter-v3-field">

          <span>
            WORK MODE
          </span>

          <select
            value={workMode}
            onChange={(
              event
            ) =>
              setWorkMode(
                event.target
                  .value
              )
            }
          >
            <option value="">
              All work modes
            </option>

            <option value="OFFICE">
              Office
            </option>

            <option value="WFH">
              Work From Home
            </option>

            <option value="FIELD_VISIT">
              Field Visit
            </option>

            <option value="ON_DUTY">
              On Duty
            </option>
          </select>

        </label>

        <div className="se-att-filter-v3-more">

          <span>
            &nbsp;
          </span>

          <button
            type="button"
            className={`se-att-filter-v3-more-btn${
              showMoreFilters
                ? " active"
                : ""
            }${
              hasAdvancedFilters
                ? " has-value"
                : ""
            }`}
            onClick={() =>
              setShowMoreFilters(
                (current) =>
                  !current
              )
            }
            aria-expanded={
              showMoreFilters
            }
          >

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 7h16M7 12h10M10 17h4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>

            <span>
              More filters
            </span>

            {hasAdvancedFilters ? (
              <strong>
                {
                  [
                    source,
                    canUseManagementFilters
                      ? department
                      : "",
                    canUseManagementFilters
                      ? office
                      : "",
                  ].filter(Boolean)
                    .length
                }
              </strong>
            ) : null}

            <svg
              className="se-att-filter-v3-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m7 9 5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

          </button>

        </div>

      </div>

      {showMoreFilters ? (
        <div className="se-att-filter-v3-advanced">

          <div className="se-att-filter-v3-advanced-grid">

            {canUseManagementFilters ? (
              <label className="se-att-filter-v3-field">

                <span>
                  DEPARTMENT
                </span>

                <select
                  value={department}
                  onChange={(
                    event
                  ) =>
                    setDepartment(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    All departments
                  </option>

                  {departments.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}
                </select>

              </label>
            ) : null}

            {canUseManagementFilters ? (
              <label className="se-att-filter-v3-field">

                <span>
                  LOCATION
                </span>

                <select
                  value={office}
                  onChange={(
                    event
                  ) =>
                    setOffice(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    All locations
                  </option>

                  {offices.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}
                </select>

              </label>
            ) : null}

            <label className="se-att-filter-v3-field">

              <span>
                SOURCE
              </span>

              <select
                value={source}
                onChange={(
                  event
                ) =>
                  setSource(
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  All sources
                </option>

                <option value="BIOMETRIC">
                  Biometric
                </option>

                <option value="WEB">
                  Web / PWA
                </option>

                <option value="MOBILE">
                  Mobile
                </option>

                <option value="REGULARIZATION">
                  Regularization
                </option>

                <option value="ADMIN">
                  Admin
                </option>
              </select>

            </label>

          </div>

        </div>
      ) : null}

    </section>
  );
}

export default AttendanceFilters;