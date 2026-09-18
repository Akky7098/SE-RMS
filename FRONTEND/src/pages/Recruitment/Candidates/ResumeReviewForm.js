import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   HELPERS
========================================================= */

const blankExperience =
  () => ({
    company: "",
    designation: "",
    from: "",
    to: "",
    current: false,
    description: "",
  });

const blankEducation =
  () => ({
    qualification: "",
    specialization: "",
    institute: "",
    university: "",
    year: "",
  });

const dateValue = (
  value
) => {
  if (!value) {
    return "";
  }

  return String(
    value
  ).slice(
    0,
    10
  );
};

const stringNumber = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
};

const INITIAL_FORM = {
  fullName: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  city: "",
  state: "",

  currentCompany: "",
  currentDesignation: "",

  totalExperienceYears: "",
  relevantExperienceYears: "",

  currentSalary: "",
  expectedSalary: "",

  noticePeriodDays: "",
  earliestJoiningDate: "",

  skills: "",

  source: "OTHER",
  sourceDetail: "",
};

/* =========================================================
   COMPONENT
========================================================= */

const ResumeReviewForm = ({
  parsed = {},

  matching = {},

  duplicate = null,

  parserMeta = {},

  reviewFields = [],

  requirement = null,

  fileName = "",

  cvParsed = false,

  parsing = false,

  creating = false,

  onCreate,

  onCancel,
}) => {
  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM
  );

  const [
    experienceHistory,
    setExperienceHistory,
  ] = useState([]);

  const [
    education,
    setEducation,
  ] = useState([]);

  const [
    error,
    setError,
  ] = useState("");

  /* =====================================================
     PARSER → FORM
  ===================================================== */

  useEffect(() => {
    if (!cvParsed) {
      return;
    }

    setForm({
      fullName:
        parsed?.fullName ||
        "",

      mobile:
        parsed?.mobile ||
        "",

      alternateMobile:
        parsed
          ?.alternateMobile ||
        "",

      email:
        parsed?.email ||
        "",

      city:
        parsed?.city ||
        "",

      state:
        parsed?.state ||
        "",

      currentCompany:
        parsed
          ?.currentCompany ||
        "",

      currentDesignation:
        parsed
          ?.currentDesignation ||
        "",

      totalExperienceYears:
        stringNumber(
          parsed
            ?.totalExperienceYears
        ),

      relevantExperienceYears:
        stringNumber(
          parsed
            ?.relevantExperienceYears
        ),

      currentSalary:
        stringNumber(
          parsed
            ?.currentSalary
        ),

      expectedSalary:
        stringNumber(
          parsed
            ?.expectedSalary
        ),

      noticePeriodDays:
        stringNumber(
          parsed
            ?.noticePeriodDays
        ),

      earliestJoiningDate:
        dateValue(
          parsed
            ?.earliestJoiningDate
        ),

      skills:
        Array.isArray(
          parsed?.skills
        )
          ? parsed.skills
              .join(", ")
          : "",

      source:
        "OTHER",

      sourceDetail:
        "",
    });

    setExperienceHistory(
      Array.isArray(
        parsed
          ?.experienceHistory
      )
        ? parsed
            .experienceHistory
            .filter(
              (
                item
              ) =>
                item?.company ||
                item?.designation ||
                item?.from
            )
            .map(
              (
                item
              ) => ({
                company:
                  item?.company ||
                  "",

                designation:
                  item
                    ?.designation ||
                  "",

                from:
                  dateValue(
                    item?.from
                  ),

                to:
                  dateValue(
                    item?.to
                  ),

                current:
                  Boolean(
                    item?.current
                  ),

                description:
                  item
                    ?.description ||
                  "",
              })
            )
        : []
    );

    setEducation(
      Array.isArray(
        parsed?.education
      )
        ? parsed.education
            .filter(
              (
                item
              ) =>
                item?.qualification ||
                item?.institute ||
                item?.university
            )
            .map(
              (
                item
              ) => ({
                qualification:
                  item
                    ?.qualification ||
                  "",

                specialization:
                  item
                    ?.specialization ||
                  "",

                institute:
                  item
                    ?.institute ||
                  "",

                university:
                  item
                    ?.university ||
                  "",

                year:
                  stringNumber(
                    item?.year
                  ),
              })
            )
        : []
    );

    setError("");
  }, [
    parsed,
    cvParsed,
  ]);

  /* =====================================================
     UPDATE
  ===================================================== */

  const update = (
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
  };

  /* =====================================================
     SKILLS
  ===================================================== */

  const skills =
    useMemo(
      () =>
        String(
          form.skills ||
            ""
        )
          .split(",")
          .map(
            (
              skill
            ) =>
              skill.trim()
          )
          .filter(Boolean),
      [
        form.skills,
      ]
    );

  /* =====================================================
     MATCH
  ===================================================== */

  const matchScore =
    Number(
      matching
        ?.overallScore ??
      matching
        ?.matchScore ??
      0
    );

  const matchedSkills =
    Array.isArray(
      matching
        ?.matchedSkills
    )
      ? matching
          .matchedSkills
      : [];

  const missingSkills =
    Array.isArray(
      matching
        ?.missingSkills
    )
      ? matching
          .missingSkills
      : [];

  /* =====================================================
     DUPLICATE
  ===================================================== */

  const duplicateFound =
    Boolean(
      duplicate?.found ||
      duplicate?.duplicate ||
      duplicate
        ?.candidate
        ?._id
    );

  /* =====================================================
     EXPERIENCE
  ===================================================== */

  const addExperience =
    () => {
      setExperienceHistory(
        (
          current
        ) => [
          ...current,

          blankExperience(),
        ]
      );
    };

  const updateExperience =
    (
      index,
      field,
      value
    ) => {
      setExperienceHistory(
        (
          current
        ) =>
          current.map(
            (
              item,
              itemIndex
            ) =>
              itemIndex ===
              index
                ? {
                    ...item,

                    [field]:
                      value,
                  }
                : item
          )
      );
    };

  const removeExperience =
    (
      index
    ) => {
      setExperienceHistory(
        (
          current
        ) =>
          current.filter(
            (
              item,
              itemIndex
            ) =>
              itemIndex !==
              index
          )
      );
    };

  /* =====================================================
     EDUCATION
  ===================================================== */

  const addEducation =
    () => {
      setEducation(
        (
          current
        ) => [
          ...current,

          blankEducation(),
        ]
      );
    };

  const updateEducation =
    (
      index,
      field,
      value
    ) => {
      setEducation(
        (
          current
        ) =>
          current.map(
            (
              item,
              itemIndex
            ) =>
              itemIndex ===
              index
                ? {
                    ...item,

                    [field]:
                      value,
                  }
                : item
          )
      );
    };

  const removeEducation =
    (
      index
    ) => {
      setEducation(
        (
          current
        ) =>
          current.filter(
            (
              item,
              itemIndex
            ) =>
              itemIndex !==
              index
          )
      );
    };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const submit =
    () => {
      setError("");

      if (!cvParsed) {
        setError(
          "Please upload and parse the candidate CV first."
        );

        return;
      }

      if (
        !String(
          form.fullName
        ).trim()
      ) {
        setError(
          "Candidate name is required."
        );

        return;
      }

      if (
        !String(
          form.mobile
        ).trim() &&
        !String(
          form.email
        ).trim()
      ) {
        setError(
          "Mobile number or email is required."
        );

        return;
      }

      const total =
        form.totalExperienceYears ===
        ""
          ? null
          : Number(
              form
                .totalExperienceYears
            );

      const relevant =
        form.relevantExperienceYears ===
        ""
          ? null
          : Number(
              form
                .relevantExperienceYears
            );

      if (
        total !== null &&
        relevant !== null &&
        relevant > total
      ) {
        setError(
          "Relevant experience cannot exceed total experience."
        );

        return;
      }

      onCreate?.({
        fullName:
          form.fullName.trim(),

        mobile:
          String(
            form.mobile ||
              ""
          )
            .replace(
              /\D/g,
              ""
            )
            .slice(-10),

        alternateMobile:
          String(
            form
              .alternateMobile ||
              ""
          )
            .replace(
              /\D/g,
              ""
            )
            .slice(-10),

        email:
          form.email
            .trim()
            .toLowerCase(),

        city:
          form.city.trim(),

        state:
          form.state.trim(),

        currentCompany:
          form
            .currentCompany
            .trim(),

        currentDesignation:
          form
            .currentDesignation
            .trim(),

        totalExperienceYears:
          total,

        relevantExperienceYears:
          relevant,

        currentSalary:
          form.currentSalary ===
          ""
            ? null
            : Number(
                form
                  .currentSalary
              ),

        expectedSalary:
          form.expectedSalary ===
          ""
            ? null
            : Number(
                form
                  .expectedSalary
              ),

        noticePeriodDays:
          form.noticePeriodDays ===
          ""
            ? null
            : Number(
                form
                  .noticePeriodDays
              ),

        earliestJoiningDate:
          form
            .earliestJoiningDate ||
          null,

        skills,

        source:
          form.source,

        sourceDetail:
          form
            .sourceDetail
            .trim(),

        experienceHistory:
          experienceHistory
            .filter(
              (
                item
              ) =>
                item.company ||
                item.designation ||
                item.from
            )
            .map(
              (
                item
              ) => ({
                ...item,

                from:
                  item.from ||
                  null,

                to:
                  item.current
                    ? null
                    : item.to ||
                      null,
              })
            ),

        education:
          education
            .filter(
              (
                item
              ) =>
                item.qualification ||
                item.institute ||
                item.university
            )
            .map(
              (
                item
              ) => ({
                ...item,

                year:
                  item.year
                    ? Number(
                        item.year
                      )
                    : null,
              })
            ),
      });
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="se-single-candidate-form">
      {/* =================================================
          PARSE SUMMARY
      ================================================== */}

      {cvParsed ? (
        <>
          <div className="se-single-parse-card">
            <div>
              <span className="pdf">
                PDF
              </span>

              <div>
                <span>
                  CV PARSED
                </span>

                <strong>
                  {safeText(
                    fileName,
                    "Candidate Resume"
                  )}
                </strong>
              </div>
            </div>

            <span className="parse-success">
              ✓ Parsed successfully
            </span>
          </div>

          <div className="se-single-match-row">
            <div className="se-single-match-score">
              <span>
                MATCH
              </span>

              <strong>
                {Math.round(
                  Number.isFinite(
                    matchScore
                  )
                    ? matchScore
                    : 0
                )}
                %
              </strong>

              <small>
                Requirement profile
              </small>
            </div>

            <div className="se-single-match-detail">
              <span>
                REQUIREMENT MATCH
              </span>

              <strong>
                {safeText(
                  requirement
                    ?.positionTitle,
                  "Open Position"
                )}
              </strong>

              {matchedSkills.length >
              0 ? (
                <p>
                  <b>
                    Matched:
                  </b>{" "}
                  {matchedSkills.join(
                    ", "
                  )}
                </p>
              ) : null}

              {missingSkills.length >
              0 ? (
                <p className="missing">
                  <b>
                    Missing:
                  </b>{" "}
                  {missingSkills.join(
                    ", "
                  )}
                </p>
              ) : null}
            </div>
          </div>

          {duplicateFound ? (
            <div className="se-single-duplicate warning">
              <span>
                !
              </span>

              Possible duplicate candidate detected from
              mobile number or email.
            </div>
          ) : (
            <div className="se-single-duplicate success">
              <span>
                ✓
              </span>

              Duplicate check clear.
            </div>
          )}
        </>
      ) : (
        <div className="se-single-form-placeholder">
          <span>
            ✦
          </span>

          <div>
            <strong>
              Candidate fields are ready
            </strong>

            <p>
              Upload a CV above and SE-RMS will fill
              as many fields as possible. HR can then
              verify and correct the information.
            </p>
          </div>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================== */}

      {error ? (
        <div className="se-single-form-error">
          <span>
            !
          </span>

          {
            error
          }
        </div>
      ) : null}

      {/* =================================================
          CONTACT
      ================================================== */}

      <section className="se-single-form-section">
        <header>
          <span>
            01
          </span>

          <div>
            <strong>
              Contact Information
            </strong>

            <p>
              Candidate identity and contact details.
            </p>
          </div>
        </header>

        <div className="se-single-form-grid">
          <label className="wide">
            <span>
              Full Name *
            </span>

            <input
              value={
                form.fullName
              }
              onChange={(
                event
              ) =>
                update(
                  "fullName",
                  event.target.value
                )
              }
              placeholder="Candidate full name"
            />
          </label>

          <label>
            <span>
              Mobile
            </span>

            <input
              value={
                form.mobile
              }
              inputMode="numeric"
              onChange={(
                event
              ) =>
                update(
                  "mobile",
                  event.target.value
                )
              }
              placeholder="Mobile number"
            />
          </label>

          <label>
            <span>
              Alternate Mobile
            </span>

            <input
              value={
                form.alternateMobile
              }
              inputMode="numeric"
              onChange={(
                event
              ) =>
                update(
                  "alternateMobile",
                  event.target.value
                )
              }
            />
          </label>

          <label className="wide">
            <span>
              Email
            </span>

            <input
              type="email"
              value={
                form.email
              }
              onChange={(
                event
              ) =>
                update(
                  "email",
                  event.target.value
                )
              }
              placeholder="candidate@email.com"
            />
          </label>

          <label>
            <span>
              City
            </span>

            <input
              value={
                form.city
              }
              onChange={(
                event
              ) =>
                update(
                  "city",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>
              State
            </span>

            <input
              value={
                form.state
              }
              onChange={(
                event
              ) =>
                update(
                  "state",
                  event.target.value
                )
              }
            />
          </label>
        </div>
      </section>

      {/* =================================================
          PROFESSIONAL
      ================================================== */}

      <section className="se-single-form-section">
        <header>
          <span>
            02
          </span>

          <div>
            <strong>
              Professional Profile
            </strong>

            <p>
              Current employment, compensation and availability.
            </p>
          </div>
        </header>

        <div className="se-single-form-grid">
          <label>
            <span>
              Current Company
            </span>

            <input
              value={
                form.currentCompany
              }
              onChange={(
                event
              ) =>
                update(
                  "currentCompany",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>
              Current Designation
            </span>

            <input
              value={
                form.currentDesignation
              }
              onChange={(
                event
              ) =>
                update(
                  "currentDesignation",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>
              Total Experience
            </span>

            <div className="input-unit">
              <input
                type="number"
                min="0"
                step="0.1"
                value={
                  form
                    .totalExperienceYears
                }
                onChange={(
                  event
                ) =>
                  update(
                    "totalExperienceYears",
                    event.target.value
                  )
                }
              />

              <b>
                Years
              </b>
            </div>
          </label>

          <label>
            <span>
              Relevant Experience
            </span>

            <div className="input-unit">
              <input
                type="number"
                min="0"
                step="0.1"
                value={
                  form
                    .relevantExperienceYears
                }
                onChange={(
                  event
                ) =>
                  update(
                    "relevantExperienceYears",
                    event.target.value
                  )
                }
              />

              <b>
                Years
              </b>
            </div>
          </label>

          <label>
            <span>
              Current CTC
            </span>

            <input
              type="number"
              value={
                form.currentSalary
              }
              onChange={(
                event
              ) =>
                update(
                  "currentSalary",
                  event.target.value
                )
              }
              placeholder="Annual INR"
            />
          </label>

          <label>
            <span>
              Expected CTC
            </span>

            <input
              type="number"
              value={
                form.expectedSalary
              }
              onChange={(
                event
              ) =>
                update(
                  "expectedSalary",
                  event.target.value
                )
              }
              placeholder="Annual INR"
            />
          </label>

          <label>
            <span>
              Notice Period
            </span>

            <div className="input-unit">
              <input
                type="number"
                min="0"
                value={
                  form.noticePeriodDays
                }
                onChange={(
                  event
                ) =>
                  update(
                    "noticePeriodDays",
                    event.target.value
                  )
                }
              />

              <b>
                Days
              </b>
            </div>
          </label>

          <label>
            <span>
              Earliest Joining Date
            </span>

            <input
              type="date"
              value={
                form.earliestJoiningDate
              }
              onChange={(
                event
              ) =>
                update(
                  "earliestJoiningDate",
                  event.target.value
                )
              }
            />
          </label>
        </div>
      </section>

      {/* =================================================
          SKILLS
      ================================================== */}

      <section className="se-single-form-section">
        <header>
          <span>
            03
          </span>

          <div>
            <strong>
              Skills
            </strong>

            <p>
              Extracted skills can be corrected by HR.
            </p>
          </div>
        </header>

        <label className="se-single-skills-input">
          <span>
            Candidate Skills
          </span>

          <textarea
            value={
              form.skills
            }
            onChange={(
              event
            ) =>
              update(
                "skills",
                event.target.value
              )
            }
            placeholder="Skills separated by commas"
          />
        </label>

        {skills.length >
        0 ? (
          <div className="se-single-skill-tags">
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

      {/* =================================================
          EXPERIENCE
      ================================================== */}

      <section className="se-single-form-section">
        <header>
          <span>
            04
          </span>

          <div>
            <strong>
              Experience
            </strong>

            <p>
              Employment history extracted from the CV.
            </p>
          </div>

          <button
            type="button"
            className="section-add"
            onClick={
              addExperience
            }
          >
            + Add Experience
          </button>
        </header>

        {experienceHistory.length >
        0 ? (
          <div className="se-single-record-list">
            {experienceHistory.map(
              (
                item,
                index
              ) => (
                <article
                  key={
                    `experience-${index}`
                  }
                  className="se-single-record"
                >
                  <div className="record-head">
                    <div>
                      <strong>
                        {item.company ||
                          "Company"}
                      </strong>

                      <span>
                        {item.designation ||
                          "Designation"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeExperience(
                          index
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <div className="se-single-form-grid">
                    <label>
                      <span>
                        Company
                      </span>

                      <input
                        value={
                          item.company
                        }
                        onChange={(
                          event
                        ) =>
                          updateExperience(
                            index,
                            "company",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Designation
                      </span>

                      <input
                        value={
                          item.designation
                        }
                        onChange={(
                          event
                        ) =>
                          updateExperience(
                            index,
                            "designation",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        From
                      </span>

                      <input
                        type="date"
                        value={
                          item.from
                        }
                        onChange={(
                          event
                        ) =>
                          updateExperience(
                            index,
                            "from",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        To
                      </span>

                      <input
                        type="date"
                        disabled={
                          item.current
                        }
                        value={
                          item.to
                        }
                        onChange={(
                          event
                        ) =>
                          updateExperience(
                            index,
                            "to",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="checkbox-row wide">
                      <input
                        type="checkbox"
                        checked={
                          item.current
                        }
                        onChange={(
                          event
                        ) => {
                          updateExperience(
                            index,
                            "current",
                            event.target.checked
                          );

                          if (
                            event.target.checked
                          ) {
                            updateExperience(
                              index,
                              "to",
                              ""
                            );
                          }
                        }}
                      />

                      <span>
                        Current employment
                      </span>
                    </label>

                    <label className="wide">
                      <span>
                        Role Summary
                      </span>

                      <textarea
                        value={
                          item.description
                        }
                        onChange={(
                          event
                        ) =>
                          updateExperience(
                            index,
                            "description",
                            event.target.value
                          )
                        }
                      />
                    </label>
                  </div>
                </article>
              )
            )}
          </div>
        ) : (
          <button
            type="button"
            className="se-single-empty-record"
            onClick={
              addExperience
            }
          >
            <span>
              +
            </span>

            Add employment experience
          </button>
        )}
      </section>

      {/* =================================================
          EDUCATION
      ================================================== */}

      <section className="se-single-form-section">
        <header>
          <span>
            05
          </span>

          <div>
            <strong>
              Education
            </strong>

            <p>
              Academic history extracted from the CV.
            </p>
          </div>

          <button
            type="button"
            className="section-add"
            onClick={
              addEducation
            }
          >
            + Add Education
          </button>
        </header>

        {education.length >
        0 ? (
          <div className="se-single-record-list">
            {education.map(
              (
                item,
                index
              ) => (
                <article
                  key={
                    `education-${index}`
                  }
                  className="se-single-record"
                >
                  <div className="record-head">
                    <div>
                      <strong>
                        {item.qualification ||
                          "Qualification"}
                      </strong>

                      <span>
                        {item.institute ||
                          item.university ||
                          "Institute"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeEducation(
                          index
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <div className="se-single-form-grid">
                    <label>
                      <span>
                        Qualification
                      </span>

                      <input
                        value={
                          item.qualification
                        }
                        onChange={(
                          event
                        ) =>
                          updateEducation(
                            index,
                            "qualification",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Specialization
                      </span>

                      <input
                        value={
                          item.specialization
                        }
                        onChange={(
                          event
                        ) =>
                          updateEducation(
                            index,
                            "specialization",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Institute
                      </span>

                      <input
                        value={
                          item.institute
                        }
                        onChange={(
                          event
                        ) =>
                          updateEducation(
                            index,
                            "institute",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        University
                      </span>

                      <input
                        value={
                          item.university
                        }
                        onChange={(
                          event
                        ) =>
                          updateEducation(
                            index,
                            "university",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Passing Year
                      </span>

                      <input
                        type="number"
                        min="1950"
                        max="2100"
                        value={
                          item.year
                        }
                        onChange={(
                          event
                        ) =>
                          updateEducation(
                            index,
                            "year",
                            event.target.value
                          )
                        }
                      />
                    </label>
                  </div>
                </article>
              )
            )}
          </div>
        ) : (
          <button
            type="button"
            className="se-single-empty-record"
            onClick={
              addEducation
            }
          >
            <span>
              +
            </span>

            Add education
          </button>
        )}
      </section>

      {/* =================================================
          SOURCE
      ================================================== */}

      <section className="se-single-form-section">
        <header>
          <span>
            06
          </span>

          <div>
            <strong>
              Candidate Source
            </strong>

            <p>
              Record where this candidate was sourced.
            </p>
          </div>
        </header>

        <div className="se-single-form-grid">
          <label>
            <span>
              Source
            </span>

            <select
              value={
                form.source
              }
              onChange={(
                event
              ) =>
                update(
                  "source",
                  event.target.value
                )
              }
            >
              <option value="NAUKRI">
                Naukri
              </option>

              <option value="INDEED">
                Indeed
              </option>

              <option value="LINKEDIN">
                LinkedIn
              </option>

              <option value="REFERENCE">
                Reference
              </option>

              <option value="CONSULTANT">
                Consultant
              </option>

              <option value="WALK_IN">
                Walk In
              </option>

              <option value="DATABASE">
                Database
              </option>

              <option value="WEBSITE">
                Website
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>
          </label>

          <label>
            <span>
              Source Detail
            </span>

            <input
              value={
                form.sourceDetail
              }
              onChange={(
                event
              ) =>
                update(
                  "sourceDetail",
                  event.target.value
                )
              }
              placeholder="Example: Naukri search"
            />
          </label>
        </div>
      </section>

      {/* =================================================
          ACTIONS
      ================================================== */}

      <footer className="se-single-form-actions">
        <div>
          <span>
            {cvParsed
              ? "✓"
              : "i"}
          </span>

          <div>
            <strong>
              {cvParsed
                ? "Profile ready for HR verification"
                : "Upload CV to auto-fill candidate profile"}
            </strong>

            <p>
              Nothing is created until HR clicks
              Create Candidate.
            </p>
          </div>
        </div>

        <div className="action-buttons">
          <button
            type="button"
            className="cancel"
            onClick={
              onCancel
            }
            disabled={
              creating ||
              parsing
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="create"
            onClick={
              submit
            }
            disabled={
              creating ||
              parsing ||
              !cvParsed ||
              duplicateFound
            }
          >
            {creating
              ? "Creating..."
              : duplicateFound
                ? "Duplicate Candidate"
                : "Create Candidate"}

            {!creating &&
            !duplicateFound ? (
              <span>
                →
              </span>
            ) : null}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ResumeReviewForm;