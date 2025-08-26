import React from "react";
import "./ScreenLoader.css";

export default function Loader({ label = "Loading…" }) {
  return (
    <div className="loader-wrap">
      <div className="loader-center">
        <div className="loader-ring" role="status" aria-live="polite" aria-busy="true" />
        <div className="loader-shadow" aria-hidden="true" />
        <p className="loader-label">{label}</p>
      </div>
    </div>
  );
}
