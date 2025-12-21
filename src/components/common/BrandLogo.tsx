import React from 'react';
import { useColorMode } from '../../contexts/ColorMode.jsx';

type BrandLogoProps = {
  onClick?: () => void;
  className?: string;
};

export default function BrandLogo({ onClick, className = '' }: BrandLogoProps) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-[8px] transition-colors duration-200 ${
        isDark
          ? 'bg-gradient-to-r from-[#0b1226] via-[#0f1b33] to-[#091026] border-[#1f2a3d] text-[#e8edf7] shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:border-[#ff6b3b]'
          : 'bg-gradient-to-r from-[#d9e2f0] via-[#cfd9eb] to-[#e6ecf7] border-[#c7d3e5] text-[#0f1a2f] shadow-[0_10px_22px_rgba(15,23,42,0.08)] hover:border-[#ff6b3b]'
      } ${className}`}
      aria-label="Samsar One"
    >
      <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.18em]">
        Samsar
      </span>
      <span
        className={`text-[11px] sm:text-[12px] font-black uppercase tracking-[0.18em] ${
          isDark ? 'text-[#ff9a6b]' : 'text-[#ff6b3b]'
        }`}
      >
        One
      </span>
    </button>
  );
}
