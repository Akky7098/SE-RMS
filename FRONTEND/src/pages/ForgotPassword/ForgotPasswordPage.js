import React from "react";

import {
  isPwaMode,
} from "../../utils/deviceMode";

import ForgotPasswordWeb from "./ForgotPasswordWeb";
import ForgotPasswordPwa from "./ForgotPasswordPwa";

const ForgotPasswordPage =
  () => {
    return isPwaMode() ? (
      <ForgotPasswordPwa />
    ) : (
      <ForgotPasswordWeb />
    );
  };

export default ForgotPasswordPage;