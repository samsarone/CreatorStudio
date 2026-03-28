import React from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import { FaCheck } from 'react-icons/fa6';

import { MdOutlineRefresh } from "react-icons/md";


export default function EraserToolbar(props) {
  const {
    pos,
    replaceEraserImage,
    resetEraserImage,
    editorVariant = 'videoStudio',
  } = props;

  const { colorMode } = useColorMode();
  const isImageStudio = editorVariant === 'imageStudio';



  const iconColor = colorMode === 'dark' ? 'text-neutral-200' : 'text-grey-800';

  return (
    <div key={pos.id} style={{
      position: 'absolute', left: pos.x, top: pos.y, background: "#030712",
      width: isImageStudio ? "420px" : "350px", borderRadius: isImageStudio ? "16px" : "5px", padding: isImageStudio ? "12px" : "5px", display: "flex", flexDirection: "column", alignItems: "center",
      zIndex: 1000
    }}>
      <div className={`grid grid-cols-2 w-full text-center ${isImageStudio ? 'text-sm font-medium gap-2' : ''}`}>
        <div className={isImageStudio ? 'rounded-xl px-3 py-2 bg-white/5 cursor-pointer' : 'cursor-pointer'} onClick={() => resetEraserImage()}>
          <MdOutlineRefresh className={`inline-flex ${isImageStudio ? 'text-lg' : ''} ${iconColor}`} />
          Reset
        </div>
        <div className={isImageStudio ? 'rounded-xl px-3 py-2 bg-white/5 cursor-pointer' : 'cursor-pointer'} onClick={() => replaceEraserImage()}>
        <FaCheck className={`inline-flex ${isImageStudio ? 'text-lg' : ''} ${iconColor}`} />
        Replace
        </div>
      </div>
    </div>
  );
}
