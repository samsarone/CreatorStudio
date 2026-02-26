import React from "react";
import TopNav from "./TopNav.tsx";
import { AlertDialog } from "./AlertDialog.tsx";
import { useColorMode } from "../../contexts/ColorMode.jsx";


export default function CommonContainer(props) {
  const { children, isVideoPreviewPlaying, setIsVideoPreviewPlaying, downloadCurrentFrame, resetSession, isRenderPending } = props;
  const { colorMode } = useColorMode();

  const resetCurrentSession = () => {
    if (resetSession) {
      resetSession();

    }
  }

  const shellBg =
    colorMode === 'dark'
      ? 'bg-gradient-to-b from-[#060a16] via-[#0b1226] to-[#070b16]'
      : 'bg-gradient-to-b from-[#e9edf7] via-[#dfe7f5] to-[#eef3fb]';

  return (
    <div className={`h-[100vh] overflow-hidden ${shellBg}`}>
      <TopNav
        resetCurrentSession={resetCurrentSession}
        isVideoPreviewPlaying={isVideoPreviewPlaying}
        setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}
        downloadCurrentFrame={downloadCurrentFrame}
        isRenderPending={isRenderPending}

      />
      <div>
        <AlertDialog />
        {children}
      </div>
    </div>
  )
}
