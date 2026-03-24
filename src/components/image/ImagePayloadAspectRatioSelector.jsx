import React, { useMemo } from 'react';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import {
  findAspectRatioOptionForCanvasDimensions,
  normalizeCanvasDimensions,
} from '../../utils/canvas.jsx';

export default function ImagePayloadAspectRatioSelector(props) {
  const {
    label = 'Generation ratio',
    name,
    value,
    onChange,
    options = [],
    canvasDimensions,
  } = props;

  const { colorMode } = useColorMode();

  const normalizedCanvasDimensions = useMemo(
    () => normalizeCanvasDimensions(canvasDimensions, value || options?.[0]?.value || '1:1'),
    [canvasDimensions, options, value]
  );

  const matchingCanvasAspectRatioOption = useMemo(
    () => findAspectRatioOptionForCanvasDimensions(normalizedCanvasDimensions, options),
    [normalizedCanvasDimensions, options]
  );

  const cardSurface =
    colorMode === 'dark'
      ? 'bg-[#10192e] border border-[#25324a] text-slate-100'
      : 'bg-rose-50 border border-rose-200 text-slate-900';
  const subtleText = colorMode === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const eyebrowText = colorMode === 'dark' ? 'text-slate-400' : 'text-rose-600';
  const selectShell =
    colorMode === 'dark'
      ? 'bg-slate-950/80 text-slate-100 border border-white/10'
      : 'bg-white text-slate-900 border border-rose-200 shadow-sm';

  const canvasResolutionLabel = `${normalizedCanvasDimensions.width} x ${normalizedCanvasDimensions.height} px`;
  const helperText = matchingCanvasAspectRatioOption
    ? matchingCanvasAspectRatioOption.value === value
      ? `Canvas ${canvasResolutionLabel}`
      : `Canvas ${canvasResolutionLabel}, preset ${matchingCanvasAspectRatioOption.label}`
    : `Custom canvas ${canvasResolutionLabel}`;

  return (
    <div className={`rounded-lg px-3 py-2 ${cardSurface}`}>
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${eyebrowText}`}>
          {label}
        </div>
        <div className={`min-w-0 truncate text-[11px] ${subtleText}`}>
          {helperText}
        </div>
        <select
          name={name}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className={`${selectShell} min-w-[150px] rounded-lg px-3 py-2 text-sm font-medium`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
