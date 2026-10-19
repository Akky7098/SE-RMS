import React from "react";
const NavigationIcon = ({
  code = ""
}) => {
  const key = String(code).toUpperCase();
  let paths = ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"];
  if (/HOME|OVERVIEW/.test(key)) paths = ["M3 10l9-7 9 7", "M5 9v12h14V9", "M9 21v-7h6v7"];else if (/SHIFT/.test(key)) paths = ["M4 7h16l-4-4", "M20 17H4l4 4", "M20 7l-4 4", "M4 17l4-4"];else if (/ATTENDANCE|TIMESHEET/.test(key)) paths = ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18", "M12 7v5l3 2"];else if (/LEAVE/.test(key)) paths = ["M5 5h14v16H5z", "M8 3v4", "M16 3v4", "M5 10h14", "M9 15l2 2 4-4"];else if (/PAYROLL|FINANCE/.test(key)) paths = ["M3 6h18v14H3z", "M3 10h18", "M15 15h3", "M6 15h3"];else if (/ONBOARD|SELECTED/.test(key)) paths = ["M8 4h8v3H8z", "M8 5H5v16h14V5h-3", "M8 14l3 3 5-6"];else if (/RECRUIT|HIRING|MANPOWER/.test(key)) paths = ["M3 7h18v14H3z", "M8 7V3h8v4", "M3 12h18", "M10 12v3h4v-3"];else if (/PEOPLE|EMPLOYEE|CANDIDATE|PROFILE/.test(key)) paths = ["M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8", "M2 21v-3a7 7 0 0 1 14 0v3", "M17 4a4 4 0 0 1 0 8", "M19 15a5 5 0 0 1 3 5"];else if (/SALES/.test(key)) paths = ["M4 20V4", "M4 20h17", "M7 15l5-5 4 2 5-7", "M17 5h4v4"];else if (/INTERVIEW/.test(key)) paths = ["M3 4h18v13H9l-6 4z", "M7 9h10", "M7 13h6"];else if (/EVALUATION/.test(key)) paths = ["M5 3h14v18H5z", "M8 8l1 1 2-2", "M13 8h3", "M8 15l1 1 2-2", "M13 15h3"];else if (/OPS|OPERATIONS/.test(key)) paths = ["M12 3l9 5v9l-9 5-9-5V8z", "M3 8l9 5 9-5", "M12 13v9"];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
};
export default NavigationIcon;
