import React from "react";

function ShiftRosterToolbar({
  search,

  setSearch,

  department,

  setDepartment,

  departments,

  office,

  setOffice,

  offices,

  roster,

  canEdit,

  canSubmit,

  canPublish,

  onCopyPrevious,

  onBulkAssign,

  onSubmit,

  onPublish,

  onReopen,

  loadingAction,
}) {
  const status =
    String(
      roster?.status ||
      "DRAFT"
    ).toUpperCase();

  const editable =
    canEdit &&
    [
      "DRAFT",
      "REOPENED",
    ].includes(
      status
    );

  return (
    <section className="se-shift-toolbar">

      <div className="se-shift-toolbar-filters">

        <label>
          <span>
            SEARCH
          </span>

          <input
            value={
              search
            }
            placeholder="Employee name or code"
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
          />
        </label>

        <label>
          <span>
            DEPARTMENT
          </span>

          <select
            value={
              department
            }
            onChange={(
              event
            ) =>
              setDepartment(
                event
                  .target
                  .value
              )
            }
          >
            <option value="">
              All Departments
            </option>

            {departments.map(
              (
                item
              ) => (
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

        <label>
          <span>
            OFFICE
          </span>

          <select
            value={
              office
            }
            onChange={(
              event
            ) =>
              setOffice(
                event
                  .target
                  .value
              )
            }
          >
            <option value="">
              All Offices
            </option>

            {offices.map(
              (
                item
              ) => (
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

      </div>

      <div className="se-shift-toolbar-actions">

        {editable ? (
          <>
            <button
              type="button"
              className="secondary"
              disabled={
                Boolean(
                  loadingAction
                )
              }
              onClick={
                onCopyPrevious
              }
            >
              ↶ Copy Previous Week
            </button>

            <button
              type="button"
              className="secondary"
              disabled={
                Boolean(
                  loadingAction
                )
              }
              onClick={
                onBulkAssign
              }
            >
              ▦ Bulk Assign
            </button>
          </>
        ) : null}

        {editable &&
        canSubmit ? (
          <button
            type="button"
            className="submit"
            disabled={
              Boolean(
                loadingAction
              )
            }
            onClick={
              onSubmit
            }
          >
            {loadingAction ===
            "SUBMIT"
              ? "Submitting…"
              : "Submit to HR"}
          </button>
        ) : null}

        {status ===
          "SUBMITTED" &&
        canPublish ? (
          <>
            <button
              type="button"
              className="secondary"
              disabled={
                Boolean(
                  loadingAction
                )
              }
              onClick={
                onReopen
              }
            >
              Return for Correction
            </button>

            <button
              type="button"
              className="publish"
              disabled={
                Boolean(
                  loadingAction
                )
              }
              onClick={
                onPublish
              }
            >
              {loadingAction ===
              "PUBLISH"
                ? "Publishing…"
                : "Publish Roster"}
            </button>
          </>
        ) : null}

      </div>

    </section>
  );
}

export default ShiftRosterToolbar;