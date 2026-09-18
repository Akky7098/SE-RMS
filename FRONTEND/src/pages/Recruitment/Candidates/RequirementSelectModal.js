import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getHrHiringQueue,
  getMyHiring,
} from "../../../services/manpowerService";

import {
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   HELPERS
========================================================= */

const normalizeRequirementMap = (
  records = []
) => {
  const map =
    new Map();

  records.forEach(
    (
      item
    ) => {
      const id =
        getRecordId(
          item
        );

      if (
        id
      ) {
        map.set(
          String(
            id
          ),
          item
        );
      }
    }
  );

  return Array.from(
    map.values()
  );
};

const hasAssignedOwner = (
  requirement
) => {
  return Boolean(
    requirement
      ?.assignedHr
      ?._id ||
    requirement
      ?.assignedHr
  );
};

const isCandidateReadyRequirement = (
  requirement
) => {
  const status =
    String(
      requirement?.status ||
        ""
    ).toUpperCase();

  return (
    [
      "APPROVED",
      "HIRING_IN_PROGRESS",
    ].includes(
      status
    ) &&
    hasAssignedOwner(
      requirement
    )
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const RequirementSelectModal = ({
  open,

  onClose,

  onSelect,
}) => {
  const [
    requirements,
    setRequirements,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /* =========================================================
     LOAD ACCESSIBLE REQUIREMENTS

     Try both:
     - HR management queue
     - Current HR employee's My Hiring

     One can return 403 depending on the user's role.
  ========================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return;
    }

    let active =
      true;

    const load =
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const results =
            await Promise.allSettled([
              getHrHiringQueue(),

              getMyHiring(),
            ]);

          const combined =
            [];

          results.forEach(
            (
              result
            ) => {
              if (
                result.status ===
                  "fulfilled" &&
                Array.isArray(
                  result.value
                )
              ) {
                combined.push(
                  ...result.value
                );
              }
            }
          );

          if (
            !active
          ) {
            return;
          }

          const unique =
            normalizeRequirementMap(
              combined
            )
              .filter(
                isCandidateReadyRequirement
              )
              .sort(
                (
                  a,
                  b
                ) => {
                  const aUrgent =
                    String(
                      a?.priority ||
                        ""
                    ).toUpperCase() ===
                    "URGENT"
                      ? 1
                      : 0;

                  const bUrgent =
                    String(
                      b?.priority ||
                        ""
                    ).toUpperCase() ===
                    "URGENT"
                      ? 1
                      : 0;

                  if (
                    bUrgent !==
                    aUrgent
                  ) {
                    return (
                      bUrgent -
                      aUrgent
                    );
                  }

                  return (
                    new Date(
                      b?.createdAt ||
                        0
                    ).getTime() -
                    new Date(
                      a?.createdAt ||
                        0
                    ).getTime()
                  );
                }
              );

          setRequirements(
            unique
          );

          if (
            unique.length ===
            0 &&
            results.every(
              (
                result
              ) =>
                result.status ===
                "rejected"
            )
          ) {
            setError(
              "No accessible hiring requirements could be loaded."
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      };

    load();

    return () => {
      active =
        false;
    };
  }, [
    open,
  ]);

  /* =========================================================
     FILTER
  ========================================================= */

  const visible =
    useMemo(() => {
      const keyword =
        String(
          search ||
            ""
        )
          .trim()
          .toLowerCase();

      if (
        !keyword
      ) {
        return requirements;
      }

      return requirements.filter(
        (
          item
        ) => {
          const owner =
            item
              ?.assignedHr
              ?.displayName ||
            "";

          return [
            item?.requestNumber,
            item?.positionTitle,
            item?.department?.name,
            item?.location,
            owner,
          ]
            .filter(
              Boolean
            )
            .join(
              " "
            )
            .toLowerCase()
            .includes(
              keyword
            );
        }
      );
    }, [
      requirements,
      search,
    ]);

  if (
    !open
  ) {
    return null;
  }

  return (
    <div
      className="se-candidate-requirement-overlay"
      onMouseDown={
        onClose
      }
    >
      <section
        className="se-candidate-requirement-modal"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <header>
          <div>
            <span>
              ADD CANDIDATE
            </span>

            <h2>
              Select Hiring Requirement
            </h2>

            <p>
              Every candidate must belong
              to an approved hiring
              requirement with an assigned
              HR owner.
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

        {/* =================================================
            SEARCH
        ================================================== */}

        <div className="se-candidate-requirement-search">
          <span>
            ⌕
          </span>

          <input
            type="text"
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
            placeholder="Search MPR, position, department or owner..."
          />

          {search ? (
            <button
              type="button"
              onClick={() =>
                setSearch(
                  ""
                )
              }
            >
              ×
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="se-candidate-global-error">
            <span>
              !
            </span>

            <p>
              {
                error
              }
            </p>
          </div>
        ) : null}

        {/* =================================================
            REQUIREMENTS
        ================================================== */}

        <div className="se-candidate-requirement-list">
          {loading ? (
            <>
              <span className="skeleton" />
              <span className="skeleton" />
              <span className="skeleton" />
            </>
          ) : null}

          {!loading &&
          visible.map(
            (
              requirement
            ) => {
              const id =
                getRecordId(
                  requirement
                );

              const owner =
                safeText(
                  requirement
                    ?.assignedHr
                    ?.displayName,
                  "HR Owner"
                );

              const hiring =
                String(
                  requirement
                    ?.status ||
                    ""
                ).toUpperCase() ===
                "HIRING_IN_PROGRESS";

              return (
                <button
                  type="button"
                  key={
                    id
                  }
                  onClick={() =>
                    onSelect?.(
                      requirement
                    )
                  }
                >
                  <span className="se-candidate-req-icon">
                    {safeText(
                      requirement
                        ?.positionTitle,
                      "R"
                    )
                      .charAt(
                        0
                      )
                      .toUpperCase()}
                  </span>

                  <span className="se-candidate-req-main">
                    <strong>
                      {safeText(
                        requirement
                          ?.positionTitle,
                        "Open Position"
                      )}
                    </strong>

                    <small>
                      {safeText(
                        requirement
                          ?.requestNumber,
                        "MPR"
                      )}

                      {" · "}

                      {safeText(
                        requirement
                          ?.department
                          ?.name,
                        "Department"
                      )}
                    </small>
                  </span>

                  <span className="se-candidate-req-owner">
                    <small>
                      HIRING OWNER
                    </small>

                    <strong>
                      {
                        owner
                      }
                    </strong>
                  </span>

                  <span
                    className={
                      hiring
                        ? "se-candidate-req-status active"
                        : "se-candidate-req-status approved"
                    }
                  >
                    {hiring
                      ? "Hiring Active"
                      : "Approved"}
                  </span>

                  <span className="se-candidate-req-arrow">
                    →
                  </span>
                </button>
              );
            }
          )}

          {!loading &&
          visible.length ===
            0 ? (
            <div className="se-candidate-no-requirements">
              <span>
                M
              </span>

              <strong>
                No eligible hiring requirement
              </strong>

              <p>
                Approve a manpower request,
                assign an HR owner and then
                add candidates to it.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default RequirementSelectModal;