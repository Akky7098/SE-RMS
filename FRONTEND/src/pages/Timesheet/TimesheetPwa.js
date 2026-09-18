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
  useAuth,
} from "../../auth/AuthContext";

import {
  createTimesheet,
  getMyTimesheetToday,
  getTimesheets,
} from "../../services/timesheetService";

import TimesheetSubmitForm from "./components/TimesheetSubmitForm";

import {
  formatDateLong,
  formatTime,
  textPreview,
  toDateKey,
} from "./utils/timesheetHelpers";

import "./TimesheetPwa.css";

const TimesheetPwa =
  () => {
    const navigate =
      useNavigate();

    const {
      user,
    } =
      useAuth();

    const now =
      useMemo(
        () =>
          new Date(),
        []
      );

    const today =
      useMemo(
        () =>
          toDateKey(
            now
          ),
        [
          now,
        ]
      );

    const [
      todayReport,
      setTodayReport,
    ] =
      useState(null);

    const [
      history,
      setHistory,
    ] =
      useState([]);

    const [
      loading,
      setLoading,
    ] =
      useState(true);

    const [
      submitting,
      setSubmitting,
    ] =
      useState(false);

    const [
      error,
      setError,
    ] =
      useState("");

    const [
      success,
      setSuccess,
    ] =
      useState("");

    /* =====================================================
       LOAD
    ===================================================== */

    const loadData =
      useCallback(
        async () => {
          try {
            setLoading(
              true
            );

            setError("");

            const [
              todayResponse,
              historyResponse,
            ] =
              await Promise.all([
                getMyTimesheetToday()
                  .catch(
                    () => null
                  ),

                getTimesheets({
                  month:
                    now.getMonth(),

                  year:
                    now.getFullYear(),
                }),
              ]);

            setTodayReport(
              todayResponse
                ?.timesheet ||
                todayResponse ||
                null
            );

            setHistory(
              historyResponse
                ?.records ||
                []
            );
          } catch (
            error
          ) {
            setError(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Unable to load your work reports."
            );
          } finally {
            setLoading(
              false
            );
          }
        },
        [
          now,
        ]
      );

    useEffect(() => {
      loadData();
    }, [
      loadData,
    ]);

    /* =====================================================
       SUBMIT
    ===================================================== */

    const handleSubmit =
      async (
        payload
      ) => {
        try {
          setSubmitting(
            true
          );

          setError("");

          setSuccess("");

          await createTimesheet(
            payload
          );

          setSuccess(
            "Today's work report has been submitted."
          );

          await loadData();
        } catch (
          error
        ) {
          setError(
            error?.response
              ?.data
              ?.message ||
              error?.message ||
              "Unable to submit the report."
          );
        } finally {
          setSubmitting(
            false
          );
        }
      };

    const submittedDays =
      history.length;

    return (
      <main className="se-ts-pwa-page">
        {/* TOP */}

        <header className="se-ts-pwa-top">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/dashboard?app=people"
              )
            }
          >
            ←
          </button>

          <div>
            <span>
              PEOPLE
            </span>

            <strong>
              Timesheet
            </strong>
          </div>

          <span className="se-ts-pwa-top-icon">
            ≡
          </span>
        </header>

        <section className="se-ts-pwa-content">
          {/* HERO */}

          <section className="se-ts-pwa-hero">
            <div>
              <span>
                DAILY WORK REPORT
              </span>

              <h1>
                {todayReport
                  ? "Report submitted."
                  : `Good day, ${
                      user
                        ?.displayName ||
                      "User"
                    }`}
              </h1>

              <p>
                {todayReport
                  ? "Your manager can now review today's work update."
                  : "Share today's work, blockers and tomorrow's priorities in a few minutes."}
              </p>

              <div className="se-ts-pwa-hero-state">
                <i>
                  {todayReport
                    ? "✓"
                    : "◷"}
                </i>

                <div>
                  <strong>
                    {todayReport
                      ? "Today's report complete"
                      : "Report pending"}
                  </strong>

                  <small>
                    {formatDateLong(
                      today
                    )}
                  </small>
                </div>
              </div>
            </div>

            <div className="se-ts-pwa-hero-art">
              <span>
                ≡
              </span>

              <i>
                ✓
              </i>
            </div>
          </section>

          {error ? (
            <div className="se-ts-pwa-error">
              !
              <span>
                {error}
              </span>
            </div>
          ) : null}

          {success ? (
            <div className="se-ts-pwa-success">
              ✓
              <span>
                {success}
              </span>
            </div>
          ) : null}

          {/* TODAY */}

          {!todayReport ? (
            <TimesheetSubmitForm
              loading={
                submitting
              }
              onSubmit={
                handleSubmit
              }
            />
          ) : (
            <section className="se-ts-pwa-complete-card">
              <div className="se-ts-pwa-complete-head">
                <span>
                  TODAY
                </span>

                <strong>
                  Submitted at{" "}
                  {formatTime(
                    todayReport
                      ?.createdAt
                  )}
                </strong>
              </div>

              <article>
                <span>
                  WORK SUMMARY
                </span>

                <p>
                  {
                    todayReport
                      ?.workSummary
                  }
                </p>
              </article>

              <article>
                <span>
                  CHALLENGES
                </span>

                <p>
                  {todayReport
                    ?.challenges ||
                    "No challenges reported."}
                </p>
              </article>

              <article>
                <span>
                  NEXT DAY PLAN
                </span>

                <p>
                  {
                    todayReport
                      ?.nextDayPlan
                  }
                </p>
              </article>
            </section>
          )}

          {/* MONTH */}

          <section className="se-ts-pwa-month">
            <header>
              <div>
                <span>
                  THIS MONTH
                </span>

                <h2>
                  Work Report History
                </h2>
              </div>

              <strong>
                {submittedDays}
              </strong>
            </header>

            <div className="se-ts-pwa-history">
              {history
                .slice(
                  0,
                  10
                )
                .map(
                  (
                    item
                  ) => (
                    <article
                      key={
                        item._id
                      }
                    >
                      <span className="date">
                        {new Date(
                          item.reportDate
                        ).getDate()}
                      </span>

                      <div>
                        <strong>
                          {formatDateLong(
                            item.reportDate
                          )}
                        </strong>

                        <p>
                          {textPreview(
                            item.workSummary,
                            95
                          )}
                        </p>
                      </div>

                      <i>
                        ✓
                      </i>
                    </article>
                  )
                )}

              {!history.length &&
              !loading ? (
                <div className="se-ts-pwa-empty">
                  No work reports
                  submitted this month.
                </div>
              ) : null}
            </div>
          </section>
        </section>

        {loading ? (
          <div className="se-ts-pwa-loading">
            <span />

            Loading reports
          </div>
        ) : null}
      </main>
    );
  };

export default TimesheetPwa;