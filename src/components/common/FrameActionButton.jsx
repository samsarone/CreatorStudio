import React from "react";

export default function FrameActionButton(props) {
  const { children, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-slate-200 boder-2 border-slate-900 text-slate-800 rounded-md p-2"
    >
      {children}
    </button>
  );
}
