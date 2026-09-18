import React from "react";

function LeavePolicyView({
  types = [],
}) {
  return (
    <section className="se-leave-panel">
      <div className="se-leave-panel-head">
        <div>
          <span className="se-leave-section-label">
            LEAVE POLICY
          </span>

          <h2>
            Available leave types
          </h2>
        </div>
      </div>

      <div className="se-leave-policy-grid">
        {types.map(
          (type) => (
            <article
              key={
                type._id
              }
              className="se-leave-policy-card"
            >
              <span className="se-leave-type-badge">
                {type.code ||
                  "LV"}
              </span>

              <div>
                <h3>
                  {type.name}
                </h3>

                <p>
                  {type.description ||
                    "Leave rules are validated by the configured company policy when a request is submitted."}
                </p>
              </div>

              <div className="se-leave-policy-tags">
                <span>
                  {type.isPaid
                    ? "Paid"
                    : "Unpaid"}
                </span>

                {type.allowHalfDay ? (
                  <span>
                    Half day
                  </span>
                ) : null}

                {type.requiresBalance ? (
                  <span>
                    Balance based
                  </span>
                ) : null}
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}

export default LeavePolicyView;