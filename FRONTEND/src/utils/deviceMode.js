export const isPwaMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const standalone =
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

  const iosStandalone =
    window.navigator.standalone === true;

  return standalone || iosStandalone;
};

export const isMobileMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth <= 768;
};

export const shouldUsePwaUi = () => {
  return (
    isPwaMode() ||
    isMobileMode()
  );
};