import { VIDEO_GENERATION_MODEL_TYPES } from "../../../constants/Types.ts";
import { VIDEO_MODEL_PRICES } from "../../../constants/ModelPrices.jsx";

const getPricingMap = () =>
  new Map(VIDEO_MODEL_PRICES.map((entry) => [entry.key, entry]));

const VIDEO_MODEL_PRIORITY = {
  "VEO3.1I2V": 0,
  "VEO3.1I2VFAST": 1,
};

const getVideoModelPriority = (key = "") =>
  Object.prototype.hasOwnProperty.call(VIDEO_MODEL_PRIORITY, key)
    ? VIDEO_MODEL_PRIORITY[key]
    : Number.MAX_SAFE_INTEGER;

const sortVideoModelsByPriority = (models = []) =>
  [...models].sort((a, b) => {
    const priorityDelta = getVideoModelPriority(a?.key) - getVideoModelPriority(b?.key);
    if (priorityDelta !== 0) return priorityDelta;
    return 0;
  });

const normalizeVideoCapabilityFlags = (entry = {}) => ({
  // Support both legacy (*ToVid) and current (*ToVideo) fields.
  isImageToVideoModel:
    typeof entry.isImageToVideoModel === "boolean"
      ? entry.isImageToVideoModel
      : Boolean(entry.isImgToVidModel),
  isTextToVideoModel:
    typeof entry.isTextToVideoModel === "boolean"
      ? entry.isTextToVideoModel
      : Boolean(entry.isTextToVidModel),
});

const supportsImageToVideoFlag = (entry) =>
  normalizeVideoCapabilityFlags(entry).isImageToVideoModel;

const supportsTextToVideoFlag = (entry) =>
  normalizeVideoCapabilityFlags(entry).isTextToVideoModel;

export const hasImageInCanvas = (activeItemList) =>
  Array.isArray(activeItemList) &&
  activeItemList.some((item) => item?.type === "image");

const getModelCapabilities = (model, pricingEntry) => ({
  supportsImageToVideo:
    supportsImageToVideoFlag(model) || supportsImageToVideoFlag(pricingEntry),
  supportsTextToVideo:
    supportsTextToVideoFlag(model) || supportsTextToVideoFlag(pricingEntry),
});

const resolveDropdownMode = ({ mode, hasImageItem }) => {
  if (mode === "image" || mode === "text") {
    return mode;
  }
  return hasImageItem ? "image" : "text";
};

export const getVideoGenerationModelDropdownData = ({ activeItemList, mode }) => {
  const hasImageItem = hasImageInCanvas(activeItemList);
  const dropdownMode = resolveDropdownMode({ mode, hasImageItem });
  const pricingMap = getPricingMap();

  const availableModels = VIDEO_GENERATION_MODEL_TYPES.filter((model) => {
    const pricingEntry = pricingMap.get(model.key);
    if (!pricingEntry?.prices?.length) return false;

    const capabilities = getModelCapabilities(model, pricingEntry);
    return dropdownMode === "image"
      ? capabilities.supportsImageToVideo
      : capabilities.supportsTextToVideo;
  });
  const prioritizedModels = sortVideoModelsByPriority(availableModels);

  return {
    hasImageItem,
    dropdownMode,
    availableModels: prioritizedModels,
    availableModelKeys: prioritizedModels.map((model) => model.key),
    availableModelKeysSignature: prioritizedModels.map((model) => model.key).join("|"),
  };
};

export const getVideoGenerationModelMeta = (modelKey) => {
  const modelDef = VIDEO_GENERATION_MODEL_TYPES.find((model) => model.key === modelKey);
  const pricing = VIDEO_MODEL_PRICES.find((entry) => entry.key === modelKey);
  const capabilities = getModelCapabilities(modelDef, pricing);

  return {
    modelDef,
    pricing,
    ...capabilities,
  };
};

export const getModelPriceForAspect = (pricingEntry, aspectRatio) => {
  if (!pricingEntry?.prices?.length) return null;
  return (
    pricingEntry.prices.find((price) => price.aspectRatio === aspectRatio) ||
    pricingEntry.prices[0]
  );
};
