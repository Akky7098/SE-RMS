import React from "react";

import {
  formatDays,
  getAvailableBalance,
  getBalanceEntitlement,
  getBalanceType,
} from "../utils/leaveHelpers";

function LeaveBalanceCards({
  balances = [],
}) {
  const totalAvailable =
    balances.reduce(
      (sum, balance) =>
        sum +
        getAvailableBalance(
          balance
        ),
      0
    );

  const totalUsed =
    balances.reduce(
      (sum, balance) =>
        sum +
        Number(
          balance?.used ||
            0
        ),
      0
    );

  const totalPending =
    balances.reduce(
      (sum, balance) =>
        sum +
        Number(
          balance?.pending ||
            0
        ),
      0
    );

  return (
    <>
      <section className="se-leave-kpis">
        <article className="se-leave-kpi">
          <span>
            AVAILABLE
          </span>

          <strong>
            {formatDays(
              totalAvailable
            )}
          </strong>

          <small>
            Leave days
          </small>
        </article>

        <article className="se-leave-kpi">
          <span>
            USED
          </span>

          <strong>
            {formatDays(
              totalUsed
            )}
          </strong>

          <small>
            Approved / availed
          </small>
        </article>

        <article className="se-leave-kpi">
          <span>
            PENDING
          </span>

          <strong>
            {formatDays(
              totalPending
            )}
          </strong>

          <small>
            Awaiting approval
          </small>
        </article>

        <article className="se-leave-kpi">
          <span>
            LEAVE TYPES
          </span>

          <strong>
            {balances.length}
          </strong>

          <small>
            Active balances
          </small>
        </article>
      </section>

      {balances.length ? (
        <section className="se-leave-balance-grid">
          {balances.map(
            (balance) => {
              const type =
                getBalanceType(
                  balance
                );

              const available =
                getAvailableBalance(
                  balance
                );

              const entitlement =
                getBalanceEntitlement(
                  balance
                );

              const used =
                Number(
                  balance?.used ||
                    0
                );

              const percentage =
                entitlement > 0
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        (available /
                          entitlement) *
                          100
                      )
                    )
                  : 0;

              return (
                <article
                  key={
                    balance?._id ||
                    type?._id ||
                    type?.code
                  }
                  className="se-leave-balance-card"
                >
                  <div className="se-leave-balance-top">
                    <div>
                      <span className="se-leave-balance-code">
                        {type?.code ||
                          "LV"}
                      </span>

                      <h3>
                        {type?.name ||
                          "Leave"}
                      </h3>
                    </div>

                    <strong>
                      {formatDays(
                        available
                      )}
                    </strong>
                  </div>

                  <div className="se-leave-progress">
                    <span
                      style={{
                        width:
                          `${percentage}%`,
                      }}
                    />
                  </div>

                  <div className="se-leave-balance-meta">
                    <span>
                      <strong>
                        {formatDays(
                          available
                        )}
                      </strong>{" "}
                      available
                    </span>

                    <span>
                      {formatDays(
                        used
                      )}{" "}
                      used
                    </span>
                  </div>
                </article>
              );
            }
          )}
        </section>
      ) : null}
    </>
  );
}

export default LeaveBalanceCards;