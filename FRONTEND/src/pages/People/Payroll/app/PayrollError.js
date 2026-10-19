import React, { useEffect, useRef } from "react";
export default function PayrollError({
  message
}) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.scrollIntoView?.({
      block: "nearest"
    });
  }, [message]);
  return <p ref={ref} tabIndex={-1} role="alert" className="se-lva-error">
  {message}
</p>;
}
