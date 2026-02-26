import React, { useState, useCallback } from 'react';
import { getCanvasDimensionsForAspectRatio } from '../../utils/canvas.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';

export default function ImageUploadDialog({ setUploadURL, aspectRatio }) {
  const [images, setImages] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { colorMode } = useColorMode();

  const handleFileChange = (event) => {
    processFiles(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFiles(event.dataTransfer.files);
      event.dataTransfer.clearData();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const resolveCanvasPlacement = (dataUrl) =>
    new Promise((resolve, reject) => {
      if (!dataUrl) {
        reject(new Error('Missing data URL'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvasDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
        const stageWidth = canvasDimensions.width;
        const stageHeight = canvasDimensions.height;

        const scale = Math.min(stageWidth / img.width, stageHeight / img.height, 1);
        const imageWidth = Math.round(img.width * scale);
        const imageHeight = Math.round(img.height * scale);

        const x = (stageWidth - imageWidth) / 2;
        const y = (stageHeight - imageHeight) / 2;

        resolve({
          url: dataUrl,
          width: imageWidth,
          height: imageHeight,
          x,
          y,
        });
      };
      img.onerror = () => {
        reject(new Error('Unable to read image'));
      };
      img.src = dataUrl;
    });

  const processFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) {
      setUploadStatus('Please upload an image file.');
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file) return false;
      const fileName = file.name ? file.name.toLowerCase() : '';
      const isHeicFile = fileName.endsWith('.heic') || fileName.endsWith('.heif');
      const isWebpFile = fileName.endsWith('.webp');
      return Boolean(file.type && file.type.startsWith('image/')) || isHeicFile || isWebpFile;
    });

    if (!validFiles.length) {
      setUploadStatus('Please upload an image file.');
      return;
    }

    setIsProcessing(true);
    setUploadStatus(`Processing ${validFiles.length} image${validFiles.length > 1 ? 's' : ''}...`);
    setImages([]);

    try {
      const dataUrls = await Promise.all(
        validFiles.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = () => reject(new Error('Upload failed.'));
              reader.readAsDataURL(file);
            })
        )
      );

      setImages(dataUrls);

      const placements = await Promise.all(dataUrls.map((dataUrl) => resolveCanvasPlacement(dataUrl)));
      setUploadStatus(`Upload successful! Added ${placements.length} image${placements.length > 1 ? 's' : ''} to canvas.`);
      setIsProcessing(false);
      if (setUploadURL) {
        setUploadURL(placements.length === 1 ? placements[0] : placements);
      }
    } catch (error) {
      setUploadStatus('Upload failed. Please try another image.');
      setIsProcessing(false);
    }
  };

  const handlePaste = useCallback((event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    const files = [];
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
    if (files.length) {
      processFiles(files);
    }
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
      className={`upload-container relative h-[512px] rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        colorMode === 'dark'
          ? isDragging
            ? 'border-rose-400 bg-rose-500/10'
            : 'border-[#2a3550] bg-[#0f1629] text-slate-200'
          : isDragging
            ? 'border-rose-500 bg-rose-50/60'
            : 'border-slate-300 bg-white text-slate-700'
      }`}
    >
      <input
        id="image-upload-input"
        type="file"
        multiple
        accept="image/*,image/heic,image/heif,image/webp,.heic,.heif,.webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="image-upload-input"
        className={`flex h-full cursor-pointer flex-col items-center justify-center gap-3 ${
          colorMode === 'dark' ? 'text-slate-300' : 'text-slate-600'
        }`}
      >
        <div
          className={`text-lg font-semibold ${
            colorMode === 'dark' ? 'text-slate-100' : 'text-slate-800'
          }`}
        >
          Drop your image(s) here
        </div>
        <div className="text-sm">or click to browse</div>
        <div className={`text-xs ${colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          Supports PNG, JPG, WEBP, HEIC, HEIF (paste from clipboard works too)
        </div>
      </label>
      {uploadStatus && (
        <div
          className={`absolute bottom-4 left-1/2 w-[90%] -translate-x-1/2 rounded-md px-3 py-2 text-xs ${
            colorMode === 'dark'
              ? 'bg-[#111a2f] text-slate-200 border border-[#1f2a3d]'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {uploadStatus}
        </div>
      )}
      {images.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center gap-2">
          {images.slice(0, 4).map((previewUrl, index) => (
            <img
              key={`${previewUrl}-${index}`}
              src={previewUrl}
              alt="Preview"
              className={`max-h-32 rounded-lg shadow-sm ${
                colorMode === 'dark' ? 'border border-[#1f2a3d]' : 'border border-slate-200'
              }`}
            />
          ))}
          {images.length > 4 && (
            <div className={`flex h-32 w-20 items-center justify-center rounded-lg text-xs ${
              colorMode === 'dark' ? 'bg-[#111a2f] text-slate-200' : 'bg-slate-100 text-slate-600'
            }`}>
              +{images.length - 4} more
            </div>
          )}
        </div>
      )}
      {isProcessing && (
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-xl text-sm ${
            colorMode === 'dark' ? 'bg-[#0f1629]/70 text-slate-200' : 'bg-white/60 text-slate-700'
          }`}
        >
          Processing image...
        </div>
      )}
    </div>
  );
}
