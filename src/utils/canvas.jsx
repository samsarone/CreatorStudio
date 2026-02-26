export const aspectRatioOptions = [

  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
]

const DEFAULT_SHORT_SIDE = 1024;
const DIMENSION_MULTIPLE = 64;

const roundToMultiple = (value, multiple = DIMENSION_MULTIPLE) => {
  if (!Number.isFinite(value)) return DEFAULT_SHORT_SIDE;
  return Math.round(value / multiple) * multiple;
};

const parseAspectRatio = (aspectRatio) => {
  if (!aspectRatio || typeof aspectRatio !== 'string') return null;
  const match = aspectRatio.trim().match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const width = parseFloat(match[1]);
  const height = parseFloat(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
};

export function getCanvasDimensionsForAspectRatio(aspectRatio) {
  const ratio = parseAspectRatio(aspectRatio);
  if (!ratio) {
    return { width: DEFAULT_SHORT_SIDE, height: DEFAULT_SHORT_SIDE };
  }
  if (Math.abs(ratio.width - ratio.height) < 0.0001) {
    return { width: DEFAULT_SHORT_SIDE, height: DEFAULT_SHORT_SIDE };
  }

  const value = ratio.width / ratio.height;
  if (value > 1) {
    const width = roundToMultiple(DEFAULT_SHORT_SIDE * value);
    return { width, height: DEFAULT_SHORT_SIDE };
  }
  const height = roundToMultiple(DEFAULT_SHORT_SIDE / value);
  return { width: DEFAULT_SHORT_SIDE, height };
}
