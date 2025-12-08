import React from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import { FaCheck } from 'react-icons/fa6';

import { MdOutlineRefresh } from "react-icons/md";


export default function PaintToolbar(props) {
  const {
    pos,
    addPaintImage,
    resetPaintImage
  } = props;

  const { colorMode } = useColorMode();

  const iconColor = colorMode === 'dark' ? 'text-neutral-200' : 'text-slate-600';
  const panelStyles = {
    position: 'absolute',
    left: pos.x,
    top: pos.y,
    background: colorMode === 'dark' ? 'rgba(3, 7, 18, 0.95)' : 'rgba(248, 250, 252, 0.98)',
    border: colorMode === 'dark'
      ? '1px solid rgba(148, 163, 184, 0.25)'
      : '1px solid rgba(148, 163, 184, 0.4)',
    boxShadow: colorMode === 'dark'
      ? '0 18px 45px rgba(15, 23, 42, 0.6)'
      : '0 18px 45px rgba(15, 23, 42, 0.12)',
    color: colorMode === 'dark' ? '#e2e8f0' : '#0f172a',
    width: '350px',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(6px)'
  };

  return (
    <div key={pos.id} style={panelStyles}>

      <div className='grid grid-cols-2 w-full text-center'>
        <div onClick={() => resetPaintImage()}>
          <MdOutlineRefresh className={`inline-flex ${iconColor}`} />
          Reset
        </div>
        <div onClick={() => addPaintImage()}>
          <FaCheck className={`inline-flex ${iconColor}`}  />
          Apply
        </div>
      </div>
    </div>
  );
}
