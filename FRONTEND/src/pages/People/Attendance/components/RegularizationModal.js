import React, {
  useEffect,
  useState,
} from "react";

import {
  requestAttendanceRegularization,
} from "../../../../services/attendanceService";

function RegularizationModal({
  attendance,

  onClose,

  onSuccess,
}) {
  const [
    type,
    setType,
  ] =
    useState(
      "MISSING_CHECK_OUT"
    );

  const [
    reason,
    setReason,
  ] =
    useState(
      ""
    );

  const [
    firstInAt,
    setFirstInAt,
  ] =
    useState(
      ""
    );

  const [
    lastOutAt,
    setLastOutAt,
  ] =
    useState(
      ""
    );

  const [
    submitting,
    setSubmitting,
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

  useEffect(
    () => {
      setType(
        attendance
          ?.missingCheckOut
          ? "MISSING_CHECK_OUT"
          : "INCORRECT_PUNCH"
      );

      setReason(
        ""
      );

      setFirstInAt(
        ""
      );

      setLastOutAt(
        ""
      );

      setError(
        ""
      );
    },
    [
      attendance?._id,
    ]
  );

  if (
    !attendance
  ) {
    return null;
  }

  const submit =
    async (
      event
    ) => {
      event.preventDefault();

      try {
        setSubmitting(
          true
        );

        setError(
          ""
        );

        const requested =
          {};

        if (
          firstInAt
        ) {
          requested.firstInAt =
            new Date(
              firstInAt
            ).toISOString();
        }

        if (
          lastOutAt
        ) {
          requested.lastOutAt =
            new Date(
              lastOutAt
            ).toISOString();
        }

        await requestAttendanceRegularization({
          attendanceId:
            attendance._id,

          type,

          reason,

          requested,
        });

        onSuccess?.();

        onClose();
      } catch (
        requestError
      ) {
        setError(
          requestError?.response
            ?.data
            ?.message ||
          requestError?.message ||
          "Regularization request could not be submitted."
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  return (
    <div
      className="se-people-att-modal-backdrop"
      onMouseDown={
        onClose
      }
    >
      <form
        className="se-people-att-modal"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
        onSubmit={
          submit
        }
      >

        <header>
          <div>
            <span>
              REGULARIZATION
            </span>

            <h2>
              Correct attendance
            </h2>

            <p>
              Submit a correction for review and approval.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
          >
            ×
          </button>
        </header>

        <div className="se-people-att-modal-body">

          {error ? (
            <div className="se-people-att-form-error">
              {
                error
              }
            </div>
          ) : null}

          <label className="se-people-att-field">
            <span>
              REQUEST TYPE
            </span>

            <select
              value={
                type
              }
              onChange={(
                event
              ) =>
                setType(
                  event
                    .target
                    .value
                )
              }
            >
              <option value="MISSING_CHECK_IN">
                Missing Check In
              </option>

              <option value="MISSING_CHECK_OUT">
                Missing Check Out
              </option>

              <option value="DEVICE_FAILURE">
                Device Failure
              </option>

              <option value="INCORRECT_PUNCH">
                Incorrect Punch
              </option>

              <option value="OFFICIAL_WORK">
                Official Work
              </option>

              <option value="WFH">
                WFH
              </option>

              <option value="FIELD_VISIT">
                Field Visit
              </option>

              <option value="SHIFT_CORRECTION">
                Shift Correction
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>
          </label>

          <div className="se-people-att-two-fields">

            <label className="se-people-att-field">
              <span>
                CORRECT CHECK IN
              </span>

              <input
                type="datetime-local"
                value={
                  firstInAt
                }
                onChange={(
                  event
                ) =>
                  setFirstInAt(
                    event
                      .target
                      .value
                  )
                }
              />
            </label>

            <label className="se-people-att-field">
              <span>
                CORRECT CHECK OUT
              </span>

              <input
                type="datetime-local"
                value={
                  lastOutAt
                }
                onChange={(
                  event
                ) =>
                  setLastOutAt(
                    event
                      .target
                      .value
                  )
                }
              />
            </label>

          </div>

          <label className="se-people-att-field">
            <span>
              REASON
            </span>

            <textarea
              rows="4"
              value={
                reason
              }
              onChange={(
                event
              ) =>
                setReason(
                  event
                    .target
                    .value
                )
              }
              placeholder="Explain why this correction is required."
              required
            />
          </label>

        </div>

        <footer>
          <button
            type="button"
            className="se-people-att-secondary-btn"
            onClick={
              onClose
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="se-people-att-primary-btn"
            disabled={
              submitting
            }
          >
            {submitting
              ? "Submitting…"
              : "Submit Request"}
          </button>
        </footer>

      </form>
    </div>
  );
}

export default RegularizationModal;