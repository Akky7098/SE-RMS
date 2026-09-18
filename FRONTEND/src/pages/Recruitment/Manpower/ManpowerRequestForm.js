import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "../../../services/api";

import {
  createManpowerRequirement,
} from "../../../services/manpowerService";

import {
  getApiErrorMessage,
} from "../utils/recruitmentHelpers";

/* =========================================================
   FORM DEFAULTS
========================================================= */

const EMPTY_FORM = {
  department: "",

  positionTitle: "",

  numberOfOpenings: "1",

  requiredSkills: "",

  minimumExperienceYears: "",

  maximumExperienceYears: "",

  budgetMin: "",

  budgetMax: "",

  currency: "INR",

  employmentType: "FULL_TIME",

  location: "",

  requiredByDate: "",

  reason: "",

  priority: "NORMAL",
};

/* =========================================================
   VALIDATION CONFIG

   Keep frontend constraints centralized here.

   Backend remains the final authority.
========================================================= */

const FORM_RULES = {
  positionTitleMinLength: 2,

  reasonMinLength: 5,

  minimumOpenings: 1,

  minimumExperience: 0,

  minimumPackage: 0,
};

/* =========================================================
   REQUIRED FIELDS

   Centralized instead of repeating required logic.
========================================================= */

const REQUIRED_FIELDS = [
  "department",

  "positionTitle",

  "numberOfOpenings",

  "requiredByDate",

  "location",

  "reason",
];

/* =========================================================
   DATE HELPERS
========================================================= */

const getTodayKey = () => {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};

/* =========================================================
   INPUT SANITIZERS
========================================================= */

const sanitizeInteger = (
  value
) => {
  return String(
    value ?? ""
  ).replace(
    /[^\d]/g,
    ""
  );
};

const sanitizeDecimal = (
  value
) => {
  let output =
    String(
      value ?? ""
    ).replace(
      /[^\d.]/g,
      ""
    );

  const firstDot =
    output.indexOf(
      "."
    );

  if (
    firstDot !== -1
  ) {
    output =
      output.slice(
        0,
        firstDot + 1
      ) +
      output
        .slice(
          firstDot + 1
        )
        .replace(
          /\./g,
          ""
        );
  }

  return output;
};

/* =========================================================
   NUMBER HELPERS
========================================================= */

const toNullableNumber = (
  value
) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;
};

/* =========================================================
   CURRENCY FORMATTER

   Uses Intl instead of manually hardcoding separators.
========================================================= */

const formatAmount = (
  value,
  currency = "INR"
) => {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "";
  }

  try {
    return new Intl.NumberFormat(
      currency === "INR"
        ? "en-IN"
        : "en-US",
      {
        style:
          "currency",

        currency,

        maximumFractionDigits:
          0,
      }
    ).format(
      number
    );
  } catch (
    error
  ) {
    return String(
      number
    );
  }
};

/* =========================================================
   STORED USER
========================================================= */

const getStoredUser =
  () => {
    const keys = [
      "se_rms_user",
      "user",
    ];

    for (
      const key of keys
    ) {
      try {
        const raw =
          localStorage.getItem(
            key
          );

        if (
          raw
        ) {
          const parsed =
            JSON.parse(
              raw
            );

          if (
            parsed
          ) {
            return parsed;
          }
        }
      } catch (
        error
      ) {
        /*
         * Ignore malformed local storage.
         */
      }
    }

    return {};
  };

/* =========================================================
   DEPARTMENT RESPONSE NORMALIZER
========================================================= */

const normalizeDepartmentList =
  (
    response
  ) => {
    const payload =
      response?.data?.data ||
      response?.data ||
      {};

    const records =
      Array.isArray(
        payload
      )
        ? payload
        : payload?.departments ||
          payload?.records ||
          payload?.items ||
          [];

    return (
      Array.isArray(
        records
      )
        ? records
        : []
    )
      .filter(
        (
          item
        ) =>
          item &&
          String(
            item.status ||
              "ACTIVE"
          ).toUpperCase() ===
            "ACTIVE"
      )
      .sort(
        (
          a,
          b
        ) =>
          String(
            a?.name ||
              ""
          ).localeCompare(
            String(
              b?.name ||
                ""
            )
          )
      );
  };

/* =========================================================
   VALIDATION ENGINE

   Pure function.
   No React state mutation here.

   This allows:
   - live validation
   - submit validation
   - summary validation
   - unit testing later
========================================================= */

const getFormErrors = (
  form,
  todayKey
) => {
  const errors =
    {};

  /* =====================================================
     DEPARTMENT
  ===================================================== */

  if (
    !String(
      form.department ||
        ""
    ).trim()
  ) {
    errors.department =
      "Select the department requesting this manpower.";
  }

  /* =====================================================
     POSITION
  ===================================================== */

  const positionTitle =
    String(
      form.positionTitle ||
        ""
    ).trim();

  if (
    !positionTitle
  ) {
    errors.positionTitle =
      "Position title is required.";
  } else if (
    positionTitle.length <
    FORM_RULES.positionTitleMinLength
  ) {
    errors.positionTitle =
      "Enter a valid position title.";
  }

  /* =====================================================
     OPENINGS
  ===================================================== */

  const openings =
    Number(
      form.numberOfOpenings
    );

  if (
    !Number.isInteger(
      openings
    ) ||
    openings <
      FORM_RULES.minimumOpenings
  ) {
    errors.numberOfOpenings =
      "Openings must be a whole number of at least 1.";
  }

  /* =====================================================
     EXPERIENCE

     Cross-field validation runs immediately once both
     fields contain values.
  ===================================================== */

  const minimumExperience =
    toNullableNumber(
      form.minimumExperienceYears
    );

  const maximumExperience =
    toNullableNumber(
      form.maximumExperienceYears
    );

  if (
    minimumExperience !==
      null &&
    minimumExperience <
      FORM_RULES.minimumExperience
  ) {
    errors.minimumExperienceYears =
      "Minimum experience cannot be negative.";
  }

  if (
    maximumExperience !==
      null &&
    maximumExperience <
      FORM_RULES.minimumExperience
  ) {
    errors.maximumExperienceYears =
      "Maximum experience cannot be negative.";
  }

  if (
    minimumExperience !==
      null &&
    maximumExperience !==
      null &&
    maximumExperience <
      minimumExperience
  ) {
    errors.minimumExperienceYears =
      "Minimum experience cannot exceed maximum experience.";

    errors.maximumExperienceYears =
      `Maximum experience must be at least ${minimumExperience} years.`;
  }

  /* =====================================================
     REQUIRED BY
  ===================================================== */

  if (
    !form.requiredByDate
  ) {
    errors.requiredByDate =
      "Required-by date is required.";
  } else if (
    form.requiredByDate <
    todayKey
  ) {
    errors.requiredByDate =
      "Required-by date cannot be in the past.";
  }

  /* =====================================================
     LOCATION
  ===================================================== */

  if (
    !String(
      form.location ||
        ""
    ).trim()
  ) {
    errors.location =
      "Work location is required.";
  }

  /* =====================================================
     PACKAGE

     No arbitrary package ceiling.
     We only protect data consistency.
  ===================================================== */

  const budgetMin =
    toNullableNumber(
      form.budgetMin
    );

  const budgetMax =
    toNullableNumber(
      form.budgetMax
    );

  if (
    budgetMin !==
      null &&
    budgetMin <
      FORM_RULES.minimumPackage
  ) {
    errors.budgetMin =
      "Minimum annual package cannot be negative.";
  }

  if (
    budgetMax !==
      null &&
    budgetMax <
      FORM_RULES.minimumPackage
  ) {
    errors.budgetMax =
      "Maximum annual package cannot be negative.";
  }

  if (
    budgetMin !==
      null &&
    budgetMax !==
      null &&
    budgetMax <
      budgetMin
  ) {
    errors.budgetMin =
      "Minimum package cannot exceed maximum package.";

    errors.budgetMax =
      `Maximum package must be at least ${formatAmount(
        budgetMin,
        form.currency
      )}.`;
  }

  /* =====================================================
     BUSINESS REASON
  ===================================================== */

  const reason =
    String(
      form.reason ||
        ""
    ).trim();

  if (
    !reason
  ) {
    errors.reason =
      "Business reason is required.";
  } else if (
    reason.length <
    FORM_RULES.reasonMinLength
  ) {
    errors.reason =
      "Add a little more detail about why this manpower is required.";
  }

  return errors;
};

/* =========================================================
   COMPONENT
========================================================= */

const ManpowerRequestForm = ({
  open,

  onClose,

  onCreated,
}) => {
  const formRef =
    useRef(
      null
    );

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  const [
    touched,
    setTouched,
  ] = useState(
    {}
  );

  const [
    attemptedSubmit,
    setAttemptedSubmit,
  ] = useState(
    false
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(
    false
  );

  const [
    departments,
    setDepartments,
  ] = useState(
    []
  );

  const [
    loadingDepartments,
    setLoadingDepartments,
  ] = useState(
    false
  );

  const [
    departmentError,
    setDepartmentError,
  ] = useState(
    ""
  );

  const [
    notification,
    setNotification,
  ] = useState(
    null
  );

  /* =========================================================
     STATIC VALUES
  ========================================================= */

  const todayKey =
    useMemo(
      () =>
        getTodayKey(),
      []
    );

  const storedUser =
    useMemo(
      () =>
        getStoredUser(),
      [
        open,
      ]
    );

  const isSuperAdmin =
    String(
      storedUser?.role ||
        ""
    ).toUpperCase() ===
    "SUPER_ADMIN";

  /* =========================================================
     RESET
  ========================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return;
    }

    setForm(
      EMPTY_FORM
    );

    setTouched(
      {}
    );

    setAttemptedSubmit(
      false
    );

    setNotification(
      null
    );

    setDepartmentError(
      ""
    );
  }, [
    open,
  ]);

  /* =========================================================
     ESC CLOSE
  ========================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return undefined;
    }

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
            "Escape" &&
          !submitting
        ) {
          onClose?.();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    submitting,
    onClose,
  ]);

  /* =========================================================
     LOAD DEPARTMENTS
  ========================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return;
    }

    let active =
      true;

    const loadDepartments =
      async () => {
        try {
          setLoadingDepartments(
            true
          );

          setDepartmentError(
            ""
          );

          const response =
            await api.get(
              "/departments",
              {
                params: {
                  status:
                    "ACTIVE",
                },
              }
            );

          if (
            !active
          ) {
            return;
          }

          const records =
            normalizeDepartmentList(
              response
            );

          setDepartments(
            records
          );

          setForm(
            (
              current
            ) => {
              if (
                current.department
              ) {
                return current;
              }

              const preferredId =
                storedUser
                  ?.primaryDepartment
                  ?._id ||
                storedUser
                  ?.primaryDepartment ||
                storedUser
                  ?.department
                  ?._id ||
                storedUser
                  ?.department ||
                "";

              const preferred =
                records.find(
                  (
                    item
                  ) =>
                    String(
                      item?._id
                    ) ===
                    String(
                      preferredId
                    )
                );

              if (
                preferred
              ) {
                return {
                  ...current,

                  department:
                    preferred._id,
                };
              }

              if (
                records.length ===
                1
              ) {
                return {
                  ...current,

                  department:
                    records[0]
                      ?._id ||
                    "",
                };
              }

              return current;
            }
          );
        } catch (
          error
        ) {
          if (
            !active
          ) {
            return;
          }

          setDepartments(
            []
          );

          setDepartmentError(
            getApiErrorMessage(
              error,
              "Departments could not be loaded."
            )
          );
        } finally {
          if (
            active
          ) {
            setLoadingDepartments(
              false
            );
          }
        }
      };

    loadDepartments();

    return () => {
      active =
        false;
    };
  }, [
    open,
    storedUser,
  ]);

  /* =========================================================
     DERIVED SKILLS
  ========================================================= */

  const skills =
    useMemo(
      () =>
        String(
          form.requiredSkills ||
            ""
        )
          .split(
            ","
          )
          .map(
            (
              item
            ) =>
              item.trim()
          )
          .filter(
            Boolean
          ),
      [
        form.requiredSkills,
      ]
    );

  /* =========================================================
     DEPARTMENT
  ========================================================= */

  const selectedDepartment =
    useMemo(
      () =>
        departments.find(
          (
            item
          ) =>
            String(
              item?._id
            ) ===
            String(
              form.department
            )
        ) ||
        null,
      [
        departments,
        form.department,
      ]
    );

  /* =========================================================
     PACKAGE PREVIEW
  ========================================================= */

  const minimumPackagePreview =
    form.budgetMin
      ? formatAmount(
          form.budgetMin,
          form.currency
        )
      : "";

  const maximumPackagePreview =
    form.budgetMax
      ? formatAmount(
          form.budgetMax,
          form.currency
        )
      : "";

  /* =========================================================
     LIVE VALIDATION

     Recalculates automatically whenever form changes.
  ========================================================= */

  const allErrors =
    useMemo(
      () =>
        getFormErrors(
          form,
          todayKey
        ),
      [
        form,
        todayKey,
      ]
    );

  /* =========================================================
     FIELDS THAT SHOULD SHOW ERRORS

     Required fields:
     only after touch / submit.

     Cross-field errors:
     show immediately once both values exist.
  ========================================================= */

  const visibleErrors =
    useMemo(
      () => {
        const output =
          {};

        Object.entries(
          allErrors
        ).forEach(
          ([
            key,
            message,
          ]) => {
            const crossFieldImmediate =
              (
                (
                  key ===
                    "budgetMin" ||
                  key ===
                    "budgetMax"
                ) &&
                form.budgetMin !==
                  "" &&
                form.budgetMax !==
                  ""
              ) ||
              (
                (
                  key ===
                    "minimumExperienceYears" ||
                  key ===
                    "maximumExperienceYears"
                ) &&
                form.minimumExperienceYears !==
                  "" &&
                form.maximumExperienceYears !==
                  ""
              );

            if (
              attemptedSubmit ||
              touched[
                key
              ] ||
              crossFieldImmediate
            ) {
              output[
                key
              ] =
                message;
            }
          }
        );

        return output;
      },
      [
        allErrors,
        attemptedSubmit,
        touched,
        form.budgetMin,
        form.budgetMax,
        form.minimumExperienceYears,
        form.maximumExperienceYears,
      ]
    );

  /* =========================================================
     FORM COMPLETENESS
  ========================================================= */

  const missingRequiredCount =
    useMemo(
      () => {
        return REQUIRED_FIELDS.filter(
          (
            field
          ) => {
            const value =
              form[
                field
              ];

            return !String(
              value ??
                ""
            ).trim();
          }
        ).length;
      },
      [
        form,
      ]
    );

  const issueCount =
    Object.keys(
      allErrors
    ).length;

  const isFormValid =
    issueCount ===
      0 &&
    !departmentError;

  /* =========================================================
     LIVE STATUS ITEMS
  ========================================================= */

  const statusItems =
    useMemo(
      () => {
        const items =
          [];

        if (
          selectedDepartment
        ) {
          items.push({
            tone:
              "success",

            text:
              selectedDepartment.name,
          });
        }

        const openings =
          Number(
            form.numberOfOpenings
          );

        if (
          Number.isInteger(
            openings
          ) &&
          openings >
            0
        ) {
          items.push({
            tone:
              "success",

            text:
              `${openings} ${
                openings ===
                1
                  ? "opening"
                  : "openings"
              }`,
          });
        }

        if (
          form.minimumExperienceYears !==
            "" &&
          form.maximumExperienceYears !==
            ""
        ) {
          if (
            allErrors.minimumExperienceYears ||
            allErrors.maximumExperienceYears
          ) {
            items.push({
              tone:
                "error",

              text:
                "Experience range invalid",
            });
          } else {
            items.push({
              tone:
                "success",

              text:
                `${form.minimumExperienceYears}–${form.maximumExperienceYears} yrs`,
            });
          }
        }

        if (
          form.requiredByDate
        ) {
          if (
            allErrors.requiredByDate
          ) {
            items.push({
              tone:
                "error",

              text:
                "Required date invalid",
            });
          } else {
            items.push({
              tone:
                "success",

              text:
                "Required date valid",
            });
          }
        }

        if (
          form.budgetMin &&
          form.budgetMax
        ) {
          if (
            allErrors.budgetMin ||
            allErrors.budgetMax
          ) {
            items.push({
              tone:
                "error",

              text:
                "Package range invalid",
            });
          } else {
            items.push({
              tone:
                "success",

              text:
                `${minimumPackagePreview} – ${maximumPackagePreview}`,
            });
          }
        }

        return items;
      },
      [
        selectedDepartment,
        form.numberOfOpenings,
        form.minimumExperienceYears,
        form.maximumExperienceYears,
        form.requiredByDate,
        form.budgetMin,
        form.budgetMax,
        allErrors,
        minimumPackagePreview,
        maximumPackagePreview,
      ]
    );

  /* =========================================================
     UPDATE FIELD
  ========================================================= */

  const updateField =
    (
      name,
      value
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,

          [name]:
            value,
        })
      );

      if (
        notification
          ?.type ===
        "error"
      ) {
        setNotification(
          null
        );
      }
    };

  /* =========================================================
     TOUCH FIELD
  ========================================================= */

  const markTouched =
    (
      name
    ) => {
      setTouched(
        (
          current
        ) => ({
          ...current,

          [name]:
            true,
        })
      );
    };

  /* =========================================================
     FIELD ERROR
  ========================================================= */

  const fieldError =
    (
      name
    ) => {
      return (
        visibleErrors[
          name
        ] ||
        ""
      );
    };

  /* =========================================================
     FOCUS FIRST ERROR
  ========================================================= */

  const focusFirstError =
    (
      errors
    ) => {
      const firstKey =
        Object.keys(
          errors
        )[0];

      if (
        !firstKey ||
        !formRef.current
      ) {
        return;
      }

      const element =
        formRef.current.querySelector(
          `[name="${firstKey}"]`
        );

      if (
        !element
      ) {
        return;
      }

      element.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center",
      });

      window.setTimeout(
        () => {
          element.focus?.();
        },
        250
      );
    };

  /* =========================================================
     REVIEW ISSUES
  ========================================================= */

  const reviewIssues =
    () => {
      setAttemptedSubmit(
        true
      );

      setTouched(
        Object.keys(
          allErrors
        ).reduce(
          (
            result,
            key
          ) => ({
            ...result,

            [key]:
              true,
          }),
          {}
        )
      );

      focusFirstError(
        allErrors
      );
    };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        submitting
      ) {
        return;
      }

      setAttemptedSubmit(
        true
      );

      if (
        !isFormValid
      ) {
        reviewIssues();

        setNotification({
          type:
            "error",

          title:
            "Review the highlighted fields",

          message:
            `${issueCount} ${
              issueCount ===
              1
                ? "issue needs"
                : "issues need"
            } attention before this manpower request can be submitted.`,
        });

        return;
      }

      const payload = {
        department:
          form.department,

        positionTitle:
          String(
            form.positionTitle
          ).trim(),

        numberOfOpenings:
          Number(
            form.numberOfOpenings
          ),

        requiredSkills:
          skills,

        minimumExperienceYears:
          toNullableNumber(
            form.minimumExperienceYears
          ) ?? 0,

        maximumExperienceYears:
          toNullableNumber(
            form.maximumExperienceYears
          ) ?? 0,

        budgetMin:
          toNullableNumber(
            form.budgetMin
          ),

        budgetMax:
          toNullableNumber(
            form.budgetMax
          ),

        currency:
          form.currency,

        employmentType:
          form.employmentType,

        location:
          String(
            form.location
          ).trim(),

        requiredByDate:
          form.requiredByDate,

        reason:
          String(
            form.reason
          ).trim(),

        priority:
          form.priority,
      };

      try {
        setSubmitting(
          true
        );

        setNotification({
          type:
            "progress",

          title:
            "Creating manpower request",

          message:
            "SE-RMS is creating the request and resolving the approval workflow.",
        });

        const created =
          await createManpowerRequirement(
            payload
          );

        setNotification({
          type:
            "success",

          title:
            "Manpower request created",

          message:
            `${
              created?.requestNumber ||
              "The manpower request"
            } has been submitted successfully.`,
        });

        if (
          typeof onCreated ===
          "function"
        ) {
          await onCreated(
            created
          );
        }
      } catch (
        submitError
      ) {
        setNotification({
          type:
            "error",

          title:
            "Request could not be submitted",

          message:
            getApiErrorMessage(
              submitError,
              "Manpower request could not be created."
            ),
        });
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =========================================================
     SAFE CLOSE
  ========================================================= */

  const handleClose =
    () => {
      if (
        submitting
      ) {
        return;
      }

      onClose?.();
    };

  if (
    !open
  ) {
    return null;
  }

  return (
    <>
      {/* =====================================================
          TOAST
      ====================================================== */}

      {notification ? (
        <div
          className={`se-mpr-toast ${notification.type}`}
          role={
            notification.type ===
            "error"
              ? "alert"
              : "status"
          }
        >
          <span className="se-mpr-toast-icon">
            {notification.type ===
            "success"
              ? "✓"
              : notification.type ===
                  "progress"
                ? "↻"
                : "!"}
          </span>

          <div>
            <strong>
              {
                notification.title
              }
            </strong>

            <p>
              {
                notification.message
              }
            </p>
          </div>

          {notification.type !==
          "progress" ? (
            <button
              type="button"
              aria-label="Close notification"
              onClick={() =>
                setNotification(
                  null
                )
              }
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      {/* =====================================================
          MODAL OVERLAY
      ====================================================== */}

      <div
        className="se-mpr-overlay se-mpr-create-overlay"
        onMouseDown={
          handleClose
        }
      >
        <section
          className="se-mpr-create-modal"
          onMouseDown={(
            event
          ) =>
            event.stopPropagation()
          }
          aria-busy={
            submitting
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="se-mpr-create-title"
        >
          {/* =================================================
              HEADER
          ================================================== */}

          <header className="se-mpr-create-modal-head">
            <div className="se-mpr-create-heading">
              <div className="se-mpr-create-eyebrow">
                <span>
                  NEW REQUIREMENT
                </span>

                {selectedDepartment ? (
                  <b>
                    {
                      selectedDepartment.name
                    }

                    {selectedDepartment.code
                      ? ` · ${selectedDepartment.code}`
                      : ""}
                  </b>
                ) : null}
              </div>

              <h2 id="se-mpr-create-title">
                Raise Manpower Request
              </h2>

              <p>
                Capture the hiring need once.
                Department, approval and recruitment
                workflows remain connected through
                SE-RMS.
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleClose
              }
              className="se-mpr-close"
              disabled={
                submitting
              }
              aria-label="Close manpower request form"
            >
              ×
            </button>
          </header>

          {/* =================================================
              BODY
          ================================================== */}

          <form
            ref={
              formRef
            }
            className="se-mpr-modal-form"
            onSubmit={
              handleSubmit
            }
            noValidate
          >
            <div className="se-mpr-modal-body">
              {/* =================================================
                  LEFT COLUMN
              ================================================== */}

              <div className="se-mpr-modal-column">
                {/* ===============================================
                    DEPARTMENT
                ================================================ */}

                <section className="se-mpr-form-section se-mpr-department-section">
                  <div className="se-mpr-form-section-head">
                    <span>
                      01
                    </span>

                    <div>
                      <strong>
                        Requesting Department
                      </strong>

                      <p>
                        Controls request ownership and
                        approval routing.
                      </p>
                    </div>
                  </div>

                  <label className="se-mpr-full-field">
                    <span>
                      Department *
                    </span>

                    <select
                      name="department"
                      value={
                        form.department
                      }
                      disabled={
                        loadingDepartments ||
                        submitting
                      }
                      className={
                        fieldError(
                          "department"
                        )
                          ? "invalid"
                          : ""
                      }
                      onBlur={() =>
                        markTouched(
                          "department"
                        )
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "department",
                          event
                            .target
                            .value
                        )
                      }
                    >
                      <option value="">
                        {loadingDepartments
                          ? "Loading departments..."
                          : "Select requesting department"}
                      </option>

                      {departments.map(
                        (
                          department
                        ) => (
                          <option
                            key={
                              department._id
                            }
                            value={
                              department._id
                            }
                          >
                            {
                              department.name
                            }

                            {department.code
                              ? ` (${department.code})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {fieldError(
                      "department"
                    ) ? (
                      <small className="se-mpr-field-error">
                        {fieldError(
                          "department"
                        )}
                      </small>
                    ) : departmentError ? (
                      <small className="se-mpr-field-error">
                        {
                          departmentError
                        }
                      </small>
                    ) : selectedDepartment ? (
                      <small className="se-mpr-field-success">
                        ✓ Request linked to{" "}
                        <strong>
                          {
                            selectedDepartment.name
                          }
                        </strong>
                      </small>
                    ) : (
                      <small>
                        {isSuperAdmin
                          ? "You can raise this requirement for any active department."
                          : "Choose the department this requirement belongs to."}
                      </small>
                    )}
                  </label>
                </section>

                {/* ===============================================
                    SKILLS & EXPERIENCE
                ================================================ */}

                <section className="se-mpr-form-section">
                  <div className="se-mpr-form-section-head">
                    <span>
                      03
                    </span>

                    <div>
                      <strong>
                        Skills & Experience
                      </strong>

                      <p>
                        Reused later for CV matching
                        and screening.
                      </p>
                    </div>
                  </div>

                  <div className="se-mpr-form-grid">
                    <label className="wide">
                      <span>
                        Required Skills
                      </span>

                      <textarea
                        name="requiredSkills"
                        value={
                          form.requiredSkills
                        }
                        disabled={
                          submitting
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "requiredSkills",
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Example: B2B sales, CRM, Excel, steel industry"
                      />

                      <small>
                        Separate individual skills
                        with commas.
                      </small>
                    </label>

                    <label>
                      <span>
                        Minimum Experience
                      </span>

                      <div
                        className={`se-mpr-input-unit ${
                          fieldError(
                            "minimumExperienceYears"
                          )
                            ? "invalid"
                            : ""
                        }`}
                      >
                        <input
                          name="minimumExperienceYears"
                          type="text"
                          inputMode="decimal"
                          value={
                            form.minimumExperienceYears
                          }
                          disabled={
                            submitting
                          }
                          onBlur={() =>
                            markTouched(
                              "minimumExperienceYears"
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            updateField(
                              "minimumExperienceYears",
                              sanitizeDecimal(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                          placeholder="2"
                        />

                        <span>
                          Years
                        </span>
                      </div>

                      {fieldError(
                        "minimumExperienceYears"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "minimumExperienceYears"
                          )}
                        </small>
                      ) : null}
                    </label>

                    <label>
                      <span>
                        Maximum Experience
                      </span>

                      <div
                        className={`se-mpr-input-unit ${
                          fieldError(
                            "maximumExperienceYears"
                          )
                            ? "invalid"
                            : ""
                        }`}
                      >
                        <input
                          name="maximumExperienceYears"
                          type="text"
                          inputMode="decimal"
                          value={
                            form.maximumExperienceYears
                          }
                          disabled={
                            submitting
                          }
                          onBlur={() =>
                            markTouched(
                              "maximumExperienceYears"
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            updateField(
                              "maximumExperienceYears",
                              sanitizeDecimal(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                          placeholder="5"
                        />

                        <span>
                          Years
                        </span>
                      </div>

                      {fieldError(
                        "maximumExperienceYears"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "maximumExperienceYears"
                          )}
                        </small>
                      ) : null}
                    </label>
                  </div>

                  {skills.length >
                  0 ? (
                    <div className="se-mpr-skill-preview">
                      {skills.map(
                        (
                          skill,
                          index
                        ) => (
                          <span
                            key={`${skill}-${index}`}
                          >
                            {
                              skill
                            }
                          </span>
                        )
                      )}
                    </div>
                  ) : null}
                </section>

                {/* ===============================================
                    PACKAGE
                ================================================ */}

                <section
                  className={`se-mpr-form-section se-mpr-package-section ${
                    allErrors.budgetMin ||
                    allErrors.budgetMax
                      ? "has-error"
                      : form.budgetMin &&
                          form.budgetMax
                        ? "is-valid"
                        : ""
                  }`}
                >
                  <div className="se-mpr-form-section-head">
                    <span>
                      05
                    </span>

                    <div>
                      <strong>
                        Annual Package Range
                      </strong>

                      <p>
                        Enter yearly CTC/package,
                        not monthly salary.
                      </p>
                    </div>
                  </div>

                  <div className="se-mpr-package-heading">
                    <div>
                      <span>
                        YEARLY PACKAGE
                      </span>

                      {(allErrors.budgetMin ||
                        allErrors.budgetMax) &&
                      form.budgetMin &&
                      form.budgetMax ? (
                        <small className="invalid">
                          Invalid range
                        </small>
                      ) : null}
                    </div>

                    <strong>
                      {minimumPackagePreview ||
                        "—"}

                      <i>
                        →
                      </i>

                      {maximumPackagePreview ||
                        "—"}

                      <small>
                        / year
                      </small>
                    </strong>
                  </div>

                  <div className="se-mpr-form-grid three">
                    <label>
                      <span>
                        Currency
                      </span>

                      <select
                        name="currency"
                        value={
                          form.currency
                        }
                        disabled={
                          submitting
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "currency",
                            event
                              .target
                              .value
                          )
                        }
                      >
                        <option value="INR">
                          INR ₹
                        </option>

                        <option value="USD">
                          USD $
                        </option>

                        <option value="EUR">
                          EUR €
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>
                        Minimum Annual Package
                      </span>

                      <input
                        name="budgetMin"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={
                          form.budgetMin
                        }
                        className={
                          fieldError(
                            "budgetMin"
                          )
                            ? "invalid"
                            : ""
                        }
                        disabled={
                          submitting
                        }
                        onBlur={() =>
                          markTouched(
                            "budgetMin"
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "budgetMin",
                            sanitizeInteger(
                              event
                                .target
                                .value
                            )
                          )
                        }
                        placeholder="300000"
                      />

                      {fieldError(
                        "budgetMin"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "budgetMin"
                          )}
                        </small>
                      ) : (
                        <small>
                          {minimumPackagePreview
                            ? `${minimumPackagePreview} / year`
                            : "Example: ₹3,00,000 / year"}
                        </small>
                      )}
                    </label>

                    <label>
                      <span>
                        Maximum Annual Package
                      </span>

                      <input
                        name="budgetMax"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={
                          form.budgetMax
                        }
                        className={
                          fieldError(
                            "budgetMax"
                          )
                            ? "invalid"
                            : ""
                        }
                        disabled={
                          submitting
                        }
                        onBlur={() =>
                          markTouched(
                            "budgetMax"
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "budgetMax",
                            sanitizeInteger(
                              event
                                .target
                                .value
                            )
                          )
                        }
                        placeholder="500000"
                      />

                      {fieldError(
                        "budgetMax"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "budgetMax"
                          )}
                        </small>
                      ) : (
                        <small>
                          {maximumPackagePreview
                            ? `${maximumPackagePreview} / year`
                            : "Example: ₹5,00,000 / year"}
                        </small>
                      )}
                    </label>
                  </div>
                </section>
              </div>

              {/* =================================================
                  RIGHT COLUMN
              ================================================== */}

              <div className="se-mpr-modal-column">
                {/* ===============================================
                    POSITION
                ================================================ */}

                <section className="se-mpr-form-section">
                  <div className="se-mpr-form-section-head">
                    <span>
                      02
                    </span>

                    <div>
                      <strong>
                        Position Requirement
                      </strong>

                      <p>
                        Define the role, openings
                        and urgency.
                      </p>
                    </div>
                  </div>

                  <div className="se-mpr-form-grid">
                    <label className="wide">
                      <span>
                        Position Title *
                      </span>

                      <input
                        name="positionTitle"
                        type="text"
                        autoComplete="off"
                        value={
                          form.positionTitle
                        }
                        className={
                          fieldError(
                            "positionTitle"
                          )
                            ? "invalid"
                            : ""
                        }
                        disabled={
                          submitting
                        }
                        onBlur={() =>
                          markTouched(
                            "positionTitle"
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "positionTitle",
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Example: Sales Executive"
                      />

                      {fieldError(
                        "positionTitle"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "positionTitle"
                          )}
                        </small>
                      ) : null}
                    </label>

                    <label>
                      <span>
                        Openings *
                      </span>

                      <input
                        name="numberOfOpenings"
                        type="text"
                        inputMode="numeric"
                        value={
                          form.numberOfOpenings
                        }
                        className={
                          fieldError(
                            "numberOfOpenings"
                          )
                            ? "invalid"
                            : ""
                        }
                        disabled={
                          submitting
                        }
                        onBlur={() =>
                          markTouched(
                            "numberOfOpenings"
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "numberOfOpenings",
                            sanitizeInteger(
                              event
                                .target
                                .value
                            )
                          )
                        }
                      />

                      {fieldError(
                        "numberOfOpenings"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "numberOfOpenings"
                          )}
                        </small>
                      ) : null}
                    </label>

                    <label>
                      <span>
                        Priority
                      </span>

                      <select
                        name="priority"
                        value={
                          form.priority
                        }
                        disabled={
                          submitting
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "priority",
                            event
                              .target
                              .value
                          )
                        }
                      >
                        <option value="LOW">
                          Low
                        </option>

                        <option value="NORMAL">
                          Normal
                        </option>

                        <option value="HIGH">
                          High
                        </option>

                        <option value="URGENT">
                          Urgent
                        </option>
                      </select>
                    </label>
                  </div>
                </section>

                {/* ===============================================
                    EMPLOYMENT
                ================================================ */}

                <section className="se-mpr-form-section">
                  <div className="se-mpr-form-section-head">
                    <span>
                      04
                    </span>

                    <div>
                      <strong>
                        Employment Details
                      </strong>

                      <p>
                        Employment type, target date
                        and work location.
                      </p>
                    </div>
                  </div>

                  <div className="se-mpr-form-grid">
                    <label>
                      <span>
                        Employment Type
                      </span>

                      <select
                        name="employmentType"
                        value={
                          form.employmentType
                        }
                        disabled={
                          submitting
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "employmentType",
                            event
                              .target
                              .value
                          )
                        }
                      >
                        <option value="FULL_TIME">
                          Full Time
                        </option>

                        <option value="PART_TIME">
                          Part Time
                        </option>

                        <option value="CONTRACT">
                          Contract
                        </option>

                        <option value="TEMPORARY">
                          Temporary
                        </option>

                        <option value="INTERN">
                          Intern
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>
                        Required By *
                      </span>

                      <input
                        name="requiredByDate"
                        type="date"
                        min={
                          todayKey
                        }
                        value={
                          form.requiredByDate
                        }
                        className={
                          fieldError(
                            "requiredByDate"
                          )
                            ? "invalid"
                            : ""
                        }
                        disabled={
                          submitting
                        }
                        onBlur={() =>
                          markTouched(
                            "requiredByDate"
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "requiredByDate",
                            event
                              .target
                              .value
                          )
                        }
                      />

                      {fieldError(
                        "requiredByDate"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "requiredByDate"
                          )}
                        </small>
                      ) : (
                        <small>
                          Past dates are blocked.
                        </small>
                      )}
                    </label>

                    <label className="wide">
                      <span>
                        Work Location *
                      </span>

                      <input
                        name="location"
                        type="text"
                        value={
                          form.location
                        }
                        className={
                          fieldError(
                            "location"
                          )
                            ? "invalid"
                            : ""
                        }
                        disabled={
                          submitting
                        }
                        onBlur={() =>
                          markTouched(
                            "location"
                          )
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            "location",
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Example: Sonipat"
                      />

                      {fieldError(
                        "location"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "location"
                          )}
                        </small>
                      ) : null}
                    </label>
                  </div>
                </section>

                {/* ===============================================
                    BUSINESS REASON
                ================================================ */}

                <section className="se-mpr-form-section se-mpr-reason-section">
                  <div className="se-mpr-form-section-head">
                    <span>
                      06
                    </span>

                    <div>
                      <strong>
                        Business Reason
                      </strong>

                      <p>
                        Give the approver enough context
                        to make a decision quickly.
                      </p>
                    </div>
                  </div>

                  <label className="se-mpr-full-field">
                    <span>
                      Reason *
                    </span>

                    <textarea
                      name="reason"
                      value={
                        form.reason
                      }
                      className={
                        fieldError(
                          "reason"
                        )
                          ? "invalid"
                          : ""
                      }
                      disabled={
                        submitting
                      }
                      onBlur={() =>
                        markTouched(
                          "reason"
                        )
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "reason",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Example: Additional manpower required for North India sales expansion..."
                    />

                    <div className="se-mpr-field-footer">
                      {fieldError(
                        "reason"
                      ) ? (
                        <small className="se-mpr-field-error">
                          {fieldError(
                            "reason"
                          )}
                        </small>
                      ) : (
                        <small>
                          Explain the business need,
                          replacement or expansion.
                        </small>
                      )}

                      <span>
                        {
                          form.reason.length
                        }{" "}
                        chars
                      </span>
                    </div>
                  </label>
                </section>

                {/* ===============================================
                    AUTOMATION
                ================================================ */}

                <div className="se-mpr-automation-note">
                  <span className="se-mpr-automation-icon">
                    ↯
                  </span>

                  <div>
                    <strong>
                      Automatic SE-RMS workflow
                    </strong>

                    <p>
                      Submission creates the MPR number,
                      links the selected department and
                      resolves the eligible approver.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                FOOTER / READINESS
            ================================================== */}

            <footer className="se-mpr-modal-footer">
              <div className="se-mpr-readiness">
                <div className="se-mpr-readiness-title">
                  <span
                    className={
                      isFormValid
                        ? "ready"
                        : "attention"
                    }
                  >
                    {isFormValid
                      ? "✓"
                      : "!"}
                  </span>

                  <div>
                    <strong>
                      {isFormValid
                        ? "Ready to submit"
                        : missingRequiredCount >
                            0
                          ? `${missingRequiredCount} required ${
                              missingRequiredCount ===
                              1
                                ? "field"
                                : "fields"
                            } remaining`
                          : `${issueCount} ${
                              issueCount ===
                              1
                                ? "issue"
                                : "issues"
                            } need attention`}
                    </strong>

                    <small>
                      {isFormValid
                        ? "All current validation checks have passed."
                        : "SE-RMS will highlight anything that needs correction."}
                    </small>
                  </div>
                </div>

                {statusItems.length >
                0 ? (
                  <div className="se-mpr-readiness-chips">
                    {statusItems.map(
                      (
                        item,
                        index
                      ) => (
                        <span
                          key={`${item.text}-${index}`}
                          className={
                            item.tone
                          }
                        >
                          {item.tone ===
                          "success"
                            ? "✓"
                            : "!"}

                          {
                            item.text
                          }
                        </span>
                      )
                    )}
                  </div>
                ) : null}
              </div>

              <div className="se-mpr-modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={
                    handleClose
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                {!isFormValid &&
                attemptedSubmit ? (
                  <button
                    type="button"
                    className="review"
                    onClick={
                      reviewIssues
                    }
                    disabled={
                      submitting
                    }
                  >
                    Review{" "}
                    {
                      issueCount
                    }{" "}
                    {issueCount ===
                    1
                      ? "Issue"
                      : "Issues"}

                    <span>
                      ↑
                    </span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="primary"
                    disabled={
                      submitting ||
                      loadingDepartments ||
                      Boolean(
                        departmentError
                      )
                    }
                  >
                    {submitting ? (
                      <>
                        <span className="se-mpr-button-spinner" />

                        Creating Request...
                      </>
                    ) : (
                      <>
                        Submit Manpower Request

                        <span>
                          →
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </footer>
          </form>
        </section>
      </div>
    </>
  );
};

export default ManpowerRequestForm;