import React, {
  useEffect,
  useState,
} from "react";

function ShiftMasterDrawer({
  open,

  shift,

  onClose,

  onSave,

  saving,
}) {
  const [
    form,
    setForm,
  ] =
    useState({
      name:
        "",

      code:
        "",

      type:
        "GENERAL",

      startTime:
        "09:00",

      endTime:
        "18:00",

      requiredMinutes:
        "",

      timezone:
        "Asia/Kolkata",

      applicableGenders:
        [],

      isDefault:
        false,

      active:
        true,

      description:
        "",
    });

  useEffect(
    () => {
      if (
        shift
      ) {
        setForm({
          name:
            shift.name ||
            "",

          code:
            shift.code ||
            "",

          type:
            shift.type ||
            "GENERAL",

          startTime:
            shift.startTime ||
            "09:00",

          endTime:
            shift.endTime ||
            "18:00",

          requiredMinutes:
            shift.requiredMinutes ??
            "",

          timezone:
            shift.timezone ||
            "Asia/Kolkata",

          applicableGenders:
            shift.applicableGenders ||
            [],

          isDefault:
            Boolean(
              shift.isDefault
            ),

          active:
            shift.active !==
            false,

          description:
            shift.description ||
            "",
        });

        return;
      }

      setForm({
        name:
          "",

        code:
          "",

        type:
          "GENERAL",

        startTime:
          "09:00",

        endTime:
          "18:00",

        requiredMinutes:
          "",

        timezone:
          "Asia/Kolkata",

        applicableGenders:
          [],

        isDefault:
          false,

        active:
          true,

        description:
          "",
      });
    },
    [
      shift,
      open,
    ]
  );

  if (
    !open
  ) {
    return null;
  }

  const update =
    (
      key,
      value
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,

          [key]:
            value,
        })
      );
    };

  const submit =
    (
      event
    ) => {
      event.preventDefault();

      onSave({
        ...form,

        code:
          form.code
            .trim()
            .toUpperCase(),

        name:
          form.name
            .trim(),

        requiredMinutes:
          form.requiredMinutes ===
          ""
            ? undefined
            : Number(
                form.requiredMinutes
              ),
      });
    };

  return (
    <div
      className="se-shift-drawer-backdrop"
      onMouseDown={
        onClose
      }
    >

      <aside
        className="se-shift-master-drawer"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >

        <header>

          <div>
            <span>
              SHIFT MASTER
            </span>

            <h2>
              {shift
                ? "Edit Shift"
                : "Create Shift"}
            </h2>

            <p>
              Configure working hours used by attendance processing.
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

        <form
          onSubmit={
            submit
          }
        >

          <div className="se-shift-master-body">

            <div className="se-shift-two-fields">

              <label className="se-shift-field">
                <span>
                  SHIFT CODE
                </span>

                <input
                  value={
                    form.code
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "code",
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="GENERAL_M"
                  required
                />
              </label>

              <label className="se-shift-field">
                <span>
                  SHIFT TYPE
                </span>

                <select
                  value={
                    form.type
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "type",
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="GENERAL">
                    General
                  </option>

                  <option value="NIGHT">
                    Night
                  </option>

                  <option value="FLEXIBLE">
                    Flexible
                  </option>

                  <option value="ROTATIONAL">
                    Rotational
                  </option>

                  <option value="CUSTOM">
                    Custom
                  </option>
                </select>
              </label>

            </div>

            <label className="se-shift-field">
              <span>
                SHIFT NAME
              </span>

              <input
                value={
                  form.name
                }
                onChange={(
                  event
                ) =>
                  update(
                    "name",
                    event
                      .target
                      .value
                  )
                }
                placeholder="Male General Shift"
                required
              />
            </label>

            <div className="se-shift-two-fields">

              <label className="se-shift-field">
                <span>
                  START TIME
                </span>

                <input
                  type="time"
                  value={
                    form.startTime
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "startTime",
                      event
                        .target
                        .value
                    )
                  }
                  required
                />
              </label>

              <label className="se-shift-field">
                <span>
                  END TIME
                </span>

                <input
                  type="time"
                  value={
                    form.endTime
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "endTime",
                      event
                        .target
                        .value
                    )
                  }
                  required
                />
              </label>

            </div>

            <label className="se-shift-field">
              <span>
                REQUIRED WORKING MINUTES
              </span>

              <input
                type="number"
                min="0"
                max="1440"
                value={
                  form.requiredMinutes
                }
                onChange={(
                  event
                ) =>
                  update(
                    "requiredMinutes",
                    event
                      .target
                      .value
                  )
                }
                placeholder="Leave blank to calculate automatically"
              />
            </label>

            <label className="se-shift-field">
              <span>
                DESCRIPTION
              </span>

              <textarea
                rows="3"
                value={
                  form.description
                }
                onChange={(
                  event
                ) =>
                  update(
                    "description",
                    event
                      .target
                      .value
                  )
                }
                placeholder="Optional shift description"
              />
            </label>

            <label className="se-shift-toggle">
              <input
                type="checkbox"
                checked={
                  form.isDefault
                }
                onChange={(
                  event
                ) =>
                  update(
                    "isDefault",
                    event
                      .target
                      .checked
                  )
                }
              />

              <span>
                Default shift
              </span>
            </label>

            <label className="se-shift-toggle">
              <input
                type="checkbox"
                checked={
                  form.active
                }
                onChange={(
                  event
                ) =>
                  update(
                    "active",
                    event
                      .target
                      .checked
                  )
                }
              />

              <span>
                Active
              </span>
            </label>

          </div>

          <footer>

            <button
              type="button"
              className="secondary"
              onClick={
                onClose
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary"
              disabled={
                saving
              }
            >
              {saving
                ? "Saving…"
                : shift
                  ? "Update Shift"
                  : "Create Shift"}
            </button>

          </footer>

        </form>

      </aside>

    </div>
  );
}

export default ShiftMasterDrawer;