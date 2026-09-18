import React, {
  useEffect,
  useState,
} from "react";

import AttendanceWeb from "./AttendanceWeb";
import AttendancePwa from "./AttendancePwa";

import {
  shouldUsePwaUi,
} from "../../utils/deviceMode";

const AttendancePage = () => {
  const [
    usePwaUi,
    setUsePwaUi,
  ] = useState(
    shouldUsePwaUi()
  );

  useEffect(() => {
    const handleResize =
      () => {
        setUsePwaUi(
          shouldUsePwaUi()
        );
      };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  if (usePwaUi) {
    return (
      <AttendancePwa />
    );
  }

  return (
    <AttendanceWeb />
  );
};

export default AttendancePage;
