import React from "react";

const LoadingScreen = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent:
          "center",
        background:
          "#f7f8fa",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <img
          src="/se-logo.png"
          alt="Sandeep Edgetech"
          style={{
            width: "180px",
            marginBottom:
              "18px",
          }}
        />

        <div>
          Loading SE-RMS...
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;