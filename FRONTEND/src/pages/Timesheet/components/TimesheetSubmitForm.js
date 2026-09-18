import React, {
  useState,
} from "react";

const TimesheetSubmitForm = ({
  loading,
  onSubmit,
}) => {
  const [
    workSummary,
    setWorkSummary,
  ] =
    useState("");

  const [
    challenges,
    setChallenges,
  ] =
    useState("");

  const [
    nextDayPlan,
    setNextDayPlan,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const work =
        workSummary.trim();

      const next =
        nextDayPlan.trim();

      if (
        work.length < 10
      ) {
        setError(
          "Work summary should contain at least 10 characters."
        );

        return;
      }

      if (
        next.length < 5
      ) {
        setError(
          "Next day plan should contain at least 5 characters."
        );

        return;
      }

      setError("");

      await onSubmit({
        workSummary:
          work,

        challenges:
          challenges.trim(),

        nextDayPlan:
          next,
      });
    };

  return (
    <form
      className="se-ts-submit-form"
      onSubmit={
        handleSubmit
      }
    >
      <div className="se-ts-submit-form-heading">
        <span>
          DAILY REPORT
        </span>

        <h2>
          What did you work
          on today?
        </h2>

        <p>
          Keep it concise.
          Managers should
          understand your work
          without needing a
          separate update.
        </p>
      </div>

      {/* =================================================
          WORK SUMMARY
      ================================================= */}

      <label className="se-ts-form-field primary">
        <div>
          <span>
            WORK SUMMARY *
          </span>

          <small>
            {
              workSummary.length
            }
            /2000
          </small>
        </div>

        <textarea
          value={
            workSummary
          }
          maxLength={
            2000
          }
          placeholder="Example: Completed customer quotation review, followed up pending material status and coordinated dispatch planning..."
          onChange={(
            event
          ) =>
            setWorkSummary(
              event.target
                .value
            )
          }
        />
      </label>

      {/* =================================================
          CHALLENGES
      ================================================= */}

      <label className="se-ts-form-field">
        <div>
          <span>
            CHALLENGES
          </span>

          <small>
            Optional
          </small>
        </div>

        <textarea
          value={
            challenges
          }
          maxLength={
            1500
          }
          placeholder="Any blocker, delay or support required?"
          onChange={(
            event
          ) =>
            setChallenges(
              event.target
                .value
            )
          }
        />
      </label>

      {/* =================================================
          NEXT PLAN
      ================================================= */}

      <label className="se-ts-form-field">
        <div>
          <span>
            NEXT DAY PLAN *
          </span>

          <small>
            {
              nextDayPlan.length
            }
            /1500
          </small>
        </div>

        <textarea
          value={
            nextDayPlan
          }
          maxLength={
            1500
          }
          placeholder="What will you focus on next?"
          onChange={(
            event
          ) =>
            setNextDayPlan(
              event.target
                .value
            )
          }
        />
      </label>

      {error ? (
        <div className="se-ts-form-error">
          !
          <span>
            {error}
          </span>
        </div>
      ) : null}

      <button
        type="submit"
        className="se-ts-submit-button"
        disabled={
          loading
        }
      >
        {loading
          ? "Submitting report..."
          : "Submit Daily Report"}

        {!loading ? (
          <span>
            →
          </span>
        ) : null}
      </button>
    </form>
  );
};

export default TimesheetSubmitForm;