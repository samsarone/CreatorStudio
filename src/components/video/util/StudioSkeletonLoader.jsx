import React from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';

export default function StudioSkeletonLoader() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const shellBg = isDark
    ? 'bg-gradient-to-b from-[#060a16] via-[#0b1226] to-[#070b16]'
    : 'bg-gradient-to-b from-[#e9edf7] via-[#eef3fb] to-white';

  const surface = isDark
    ? 'bg-[#0f1629] border border-[#1f2a3d] shadow-[0_18px_48px_rgba(0,0,0,0.45)]'
    : 'bg-white border border-slate-200 shadow-[0_16px_40px_rgba(15,23,42,0.08)]';

  const mutedSurface = isDark ? 'bg-[#121b33]' : 'bg-slate-100';
  const subtleSurface = isDark ? 'bg-[#1b2942]' : 'bg-slate-200';

  const textMuted = isDark ? 'text-slate-500' : 'text-slate-500';

  return (
    <div className={`${shellBg} min-h-screen ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 animate-pulse space-y-5">
        <div className={`${surface} rounded-2xl px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`${subtleSurface} h-10 w-10 rounded-xl`} />
            <div className="space-y-2">
              <div className={`${mutedSurface} h-3 w-32 rounded-full`} />
              <div className={`${mutedSurface} h-3 w-20 rounded-full`} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`${mutedSurface} h-10 w-32 rounded-full`} />
            <div className={`${mutedSurface} h-10 w-10 rounded-full`} />
            <div className={`${mutedSurface} h-10 w-10 rounded-full`} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-4 items-start">
          <div className={`${surface} hidden lg:flex flex-col items-center gap-3 rounded-2xl px-2 py-4 w-12 shrink-0`}>
            <div className={`${subtleSurface} h-9 w-9 rounded-xl`} />
            {[...Array(5)].map((_, idx) => (
              <div key={`nav-${idx}`} className={`${mutedSurface} h-8 w-8 rounded-lg`} />
            ))}
            <div className={`${mutedSurface} h-9 w-9 rounded-full`} />
          </div>

          <div className="space-y-4">
            <div className={`${surface} rounded-2xl p-4 space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`${mutedSurface} h-10 w-40 rounded-full`} />
                <div className="flex items-center gap-2">
                  <div className={`${mutedSurface} h-9 w-9 rounded-lg`} />
                  <div className={`${mutedSurface} h-9 w-9 rounded-lg`} />
                  <div className={`${mutedSurface} h-9 w-9 rounded-lg`} />
                </div>
              </div>

              <div className={`${mutedSurface} rounded-xl relative overflow-hidden`}>
                <div className="absolute inset-4 border-2 border-dashed border-white/10 rounded-2xl" />
                <div className="absolute top-4 left-4 h-8 w-24 rounded-full bg-white/10" />
                <div className="absolute bottom-4 left-4 h-3 w-48 rounded-full bg-white/10" />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white/10" />
                  <div className="h-8 w-16 rounded-full bg-white/10" />
                </div>
                <div className="aspect-video" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className={`${mutedSurface} h-4 w-32 rounded-full`} />
                <div className="flex items-center gap-2">
                  <div className={`${mutedSurface} h-8 w-8 rounded-full`} />
                  <div className={`${mutedSurface} h-8 w-20 rounded-full`} />
                </div>
              </div>
            </div>

            <div className={`${surface} rounded-2xl p-4 space-y-3`}>
              <div className={`${textMuted} text-xs uppercase tracking-wide`}>Timeline</div>
              <div className="h-14 rounded-xl overflow-hidden relative">
                <div className={`${mutedSurface} absolute inset-0`} />
                <div className="absolute inset-x-3 top-3 h-2 rounded-full bg-white/10" />
                <div className="absolute inset-x-4 bottom-3 h-6 rounded-lg bg-white/10 flex items-center gap-2 px-3">
                  <div className="h-4 w-10 rounded-full bg-white/20" />
                  <div className="flex-1 h-3 rounded-full bg-white/20" />
                  <div className="h-4 w-4 rounded-full bg-white/20" />
                  <div className="h-4 w-4 rounded-full bg-white/20" />
                </div>
              </div>
            </div>
          </div>

          <div className={`${surface} hidden lg:flex flex-col items-center gap-3 rounded-2xl px-2 py-4 w-12 shrink-0`}>
            <div className={`${mutedSurface} h-9 w-9 rounded-lg`} />
            {[...Array(4)].map((_, idx) => (
              <div key={`tool-${idx}`} className={`${mutedSurface} h-8 w-8 rounded-lg`} />
            ))}
            <div className={`${mutedSurface} h-9 w-9 rounded-full`} />
          </div>
        </div>

        <div className={`${surface} rounded-2xl px-5 py-4 flex items-center justify-between`}>
          <div className={`${mutedSurface} h-4 w-32 rounded-full`} />
          <div className="flex items-center gap-2">
            <div className={`${mutedSurface} h-9 w-28 rounded-full`} />
            <div className={`${mutedSurface} h-9 w-9 rounded-full`} />
          </div>
        </div>
      </div>
    </div>
  );
}
