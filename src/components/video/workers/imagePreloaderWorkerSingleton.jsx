// imagePreloaderWorkerSingleton.js
let imagePreloaderWorker;

export const getImagePreloaderWorker = () => {
  if (!imagePreloaderWorker) {
    imagePreloaderWorker = new Worker(new URL('./imagePreloaderWorker.jsx', import.meta.url));
  }
  return imagePreloaderWorker;
};
