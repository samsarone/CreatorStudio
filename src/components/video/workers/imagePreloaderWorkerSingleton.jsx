// imagePreloaderWorkerSingleton.js
const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
let imagePreloaderWorker;

export const getImagePreloaderWorker = () => {
  if (!imagePreloaderWorker) {
    imagePreloaderWorker = new Worker(new URL('./imagePreloaderWorker.jsx', import.meta.url));
    imagePreloaderWorker.postMessage({
      type: 'CONFIG',
      apiServer: API_SERVER,
    });
  }
  return imagePreloaderWorker;
};
