import React from "react";

function LeaveTabs({
  tabs = [],
  activeTab,
  onChange,
}) {
  return (
    <nav
      className="se-leave-tabs"
      aria-label="Leave management sections"
    >
      {tabs.map(
        (tab) => (
          <button
            key={tab.key}
            type="button"
            className={
              activeTab ===
              tab.key
                ? "is-active"
                : ""
            }
            onClick={() =>
              onChange(
                tab.key
              )
            }
          >
            <span>
              {tab.label}
            </span>

            {Number.isFinite(
              Number(
                tab.count
              )
            ) &&
            Number(tab.count) >
              0 ? (
              <strong>
                {tab.count}
              </strong>
            ) : null}
          </button>
        )
      )}
    </nav>
  );
}

export default LeaveTabs;