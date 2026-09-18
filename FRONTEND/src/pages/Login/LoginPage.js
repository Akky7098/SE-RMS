import React, {
  useEffect,
  useState,
} from "react";

import LoginWeb from "./LoginWeb";
import LoginPwa from "./LoginPwa";

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
    return <LoginPwa />;
  }

  return <LoginWeb />;
};

export default LoginPage;