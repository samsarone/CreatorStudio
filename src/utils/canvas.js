export const aspectRatioOptions = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },

]


export function getCanvasDimensionsForAspectRatio(aspectRatio) {
  let width = 1024;
  let height = 1024;

  if (aspectRatio === '16:9') {
    width = 1792;
    height = 1024;
  } else if (aspectRatio === '9:16') {
    width = 1024;
    height = 1792;
  }

  return { width, height };
}