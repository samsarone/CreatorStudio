const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

const BASE_HEIGHT = 1024;
const BASE_WIDTH = 1024;

export function getScalingFactor(imageDimensions) {
  let {width, height} = imageDimensions;
  let largerDimension = Math.max(width, height);
  let scalingFactor = 1;
  if (largerDimension > BASE_HEIGHT) {
    scalingFactor = BASE_HEIGHT / largerDimension;
  }
  return scalingFactor;
}

export function firstImageUrlValue(values = []) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function getRenderableImageUrl(asset, apiServer = API_SERVER) {
  const imagePath = typeof asset === 'string'
    ? asset
    : firstImageUrlValue([
      asset?.previewUrl,
      asset?.preview_url,
      asset?.signedUrl,
      asset?.signed_url,
      asset?.displayUrl,
      asset?.display_url,
      asset?.url,
      asset?.imageUrl,
      asset?.image_url,
      asset?.src,
      asset?.image,
    ]);

  if (!imagePath) {
    return '';
  }

  if (/^(https?:|data:|blob:)/i.test(imagePath)) {
    return imagePath;
  }

  const normalizedApiServer = typeof apiServer === 'string'
    ? apiServer.trim().replace(/\/+$/, '')
    : '';
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  if (normalizedPath.startsWith('/assets_v2/') || normalizedPath.startsWith('/assets/')) {
    return normalizedApiServer ? `${normalizedApiServer}${normalizedPath}` : normalizedPath;
  }

  if (normalizedPath.includes('generation') || normalizedPath.includes('outpaint')) {
    // Remove "/generations/" from imagePath if it exists
    const cleanedImagePath = normalizedPath.replace(/^\/?generations\//, '').replace(/^\//, '');
    return normalizedApiServer
      ? `${normalizedApiServer}/generations/${cleanedImagePath}`
      : `/generations/${cleanedImagePath}`;
  }

  return normalizedApiServer ? `${normalizedApiServer}${normalizedPath}` : normalizedPath;
}

export function getRemoteImageLink(imagePath) {
  return getRenderableImageUrl(imagePath);
}
