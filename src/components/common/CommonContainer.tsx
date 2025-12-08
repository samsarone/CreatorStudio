import React from "react";
import TopNav from "./TopNav.tsx";
import { AlertDialog } from "./AlertDialog.tsx";


export default function CommonContainer(props) {
  const { children, isVideoPreviewPlaying, setIsVideoPreviewPlaying, downloadCurrentFrame, resetSession } = props;

  const resetCurrentSession = () => {
    if (resetSession) {
      resetSession();

    }
  }

  return (
    <div className='h-[100vh] overflow-hidden bg-cyber-black'>
      <TopNav
        resetCurrentSession={resetCurrentSession}
        isVideoPreviewPlaying={isVideoPreviewPlaying}
        setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}
        downloadCurrentFrame={downloadCurrentFrame}

      />
      <div>
        <AlertDialog />
        {children}
      </div>
    </div>
  )
}
