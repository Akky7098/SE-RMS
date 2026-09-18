import React, {
  useEffect,
  useState,
} from "react";

import DashboardWeb from "./DashboardWeb";
import DashboardPwa from "./DashboardPwa";

import {
  shouldUsePwaUi,
} from "../../utils/deviceMode";

const DashboardPage = () => {
  const [
    usePwaUi,
    setUsePwaUi,
  ] = useState(
    shouldUsePwaUi()
  );

  useEffect(() => {
    const handleResize = () => {
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
    return <DashboardPwa />;
  }

  return <DashboardWeb />;
};

export default DashboardPage;