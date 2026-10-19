import React, {
  useEffect,
  useState,
} from "react";

import LoginWeb from "./LoginWeb";
import LoginApp from "./LoginApp";

import {
  shouldUsePwaUi,
} from "../../utils/deviceMode";

const LoginPage = () => {
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
    return <LoginApp />;
  }

  return <LoginWeb />;
};

export default LoginPage;