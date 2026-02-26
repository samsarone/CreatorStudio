import React, { useMemo, useState } from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import SecondaryButton from '../../common/SecondaryButton.tsx';
import { FaChevronLeft } from 'react-icons/fa';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

const resolveAssetSource = (asset) => {
  if (typeof asset === 'string') {
    return asset.trim();
  }
  if (!asset || typeof asset !== 'object') {
    return '';
  }
  const candidates = [asset.src, asset.image, asset.imageUrl, asset.image_url, asset.url];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
};

const resolvePreviewUrl = (assetSource) => {
  if (!assetSource || typeof assetSource !== 'string') {
    return null;
  }
  const trimmed = assetSource.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withLeadingSlash.startsWith('/video/') || withLeadingSlash.startsWith('/generations/')) {
    return `${API_SERVER}${withLeadingSlash}`;
  }
  if (withLeadingSlash.includes('generation') || withLeadingSlash.includes('outpaint')) {
    const imageName = withLeadingSlash.replace(/^\/?generations\//, '').replace(/^\//, '');
    return `${API_SERVER}/generations/${imageName}`;
  }
  return `${API_SERVER}${withLeadingSlash}`;
};

const normalizeSelectionSource = (previewUrl) => {
  if (typeof previewUrl !== 'string') {
    return previewUrl;
  }
  if (previewUrl.startsWith(API_SERVER)) {
    const stripped = previewUrl.slice(API_SERVER.length);
    if (stripped.startsWith('/')) {
      return stripped;
    }
    return stripped ? `/${stripped}` : '/';
  }
  return previewUrl;
};

export default function ImageLibraryHome(props) {
  const {
    generationImages = [],
    globalGenerationImages = [],
    globalPagination = {},
    onGlobalPageChange,
    isGlobalLoading = false,
    globalError = null,
    selectImageFromLibrary,
    showStudioBackButton = false,
    onBackToStudio,
  } = props;
  const [selectedImage, setSelectedImage] = useState(null);
  const { colorMode } = useColorMode();

  const currentSessionAssets = useMemo(
    () => (Array.isArray(generationImages) ? generationImages : []),
    [generationImages]
  );
  const globalAssets = useMemo(
    () => (Array.isArray(globalGenerationImages) ? globalGenerationImages : []),
    [globalGenerationImages]
  );

  const handleImageClick = (imageLink) => {
    setSelectedImage(imageLink);
  };

  const handleSelect = (imageLink) => {
    const imagePath = normalizeSelectionSource(imageLink);
    if (typeof selectImageFromLibrary === 'function') {
      selectImageFromLibrary(imagePath);
    }
    setSelectedImage(null);
  };

  const panelSurface =
    colorMode === 'dark'
      ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d]'
      : 'bg-white text-slate-900 border border-slate-200';
  const sectionSurface =
    colorMode === 'dark'
      ? 'bg-[#0b1226] border border-[#1f2a3d]'
      : 'bg-slate-50 border border-slate-200';
  const tileSurface =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border border-[#1f2a3d] hover:border-rose-300/40'
      : 'bg-white border border-slate-200 hover:border-rose-300';
  const paginationButton =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border border-[#1f2a3d] text-slate-200 hover:bg-[#16213a] disabled:opacity-50'
      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50';
  const helperText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const backButtonStyle =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border border-[#1f2a3d] text-slate-100 hover:bg-[#16213a]'
      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100';

  const renderAssetsGrid = (assets, sectionKey, emptyMessage) => {
    const cards = assets
      .map((asset, index) => {
        const imageSource = resolveAssetSource(asset);
        const previewLink = resolvePreviewUrl(imageSource);
        if (!previewLink) {
          return null;
        }
        return (
          <div
            key={`${sectionKey}-${previewLink}-${index}`}
            className={`rounded-lg overflow-hidden transition-all ${tileSurface}`}
          >
            <img
              src={previewLink}
              alt="library-asset"
              onClick={() => handleImageClick(previewLink)}
              className="w-full aspect-[4/3] object-contain cursor-pointer"
            />
            {selectedImage === previewLink && (
              <div className="p-2">
                <SecondaryButton
                  onClick={() => handleSelect(previewLink)}
                  className="w-full justify-center text-xs"
                >
                  Select
                </SecondaryButton>
              </div>
            )}
          </div>
        );
      })
      .filter(Boolean);

    if (!cards.length) {
      return <div className={`text-xs ${helperText}`}>{emptyMessage}</div>;
    }

    return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{cards}</div>;
  };

  const page = Number.isFinite(globalPagination.page) ? globalPagination.page : 1;
  const totalPages = Number.isFinite(globalPagination.totalPages) ? globalPagination.totalPages : 1;
  const hasPreviousPage = Boolean(globalPagination.hasPreviousPage);
  const hasNextPage = Boolean(globalPagination.hasNextPage);

  return (
    <div className={`w-full h-full overflow-y-auto px-3 py-3 ${panelSurface}`}>
      {showStudioBackButton && (
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onBackToStudio}
            className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md transition ${backButtonStyle}`}
          >
            <FaChevronLeft className="text-xs" />
            <span>Back to Studio</span>
          </button>
          <div className="text-sm font-semibold">Image Library</div>
          <div className="w-[120px]" />
        </div>
      )}

      <div className={`rounded-xl p-3 ${sectionSurface}`}>
        <div className="text-sm font-semibold mb-2">Current Session</div>
        {renderAssetsGrid(
          currentSessionAssets,
          'current-session',
          'No generated or edited assets yet in this session.'
        )}
      </div>

      <div className={`rounded-xl p-3 mt-3 ${sectionSurface}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Global Sessions</div>
          <div className={`text-[11px] ${helperText}`}>
            Page {page} of {Math.max(1, totalPages)}
          </div>
        </div>

        {isGlobalLoading ? (
          <div className={`text-xs ${helperText}`}>Loading assets...</div>
        ) : globalError ? (
          <div className="text-xs text-rose-500">{globalError}</div>
        ) : (
          renderAssetsGrid(
            globalAssets,
            'global-session',
            'No assets found in other sessions.'
          )
        )}

        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            type="button"
            className={`text-xs px-2 py-1 rounded-md transition ${paginationButton}`}
            disabled={isGlobalLoading || !hasPreviousPage}
            onClick={() => onGlobalPageChange?.(Math.max(1, page - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className={`text-xs px-2 py-1 rounded-md transition ${paginationButton}`}
            disabled={isGlobalLoading || !hasNextPage}
            onClick={() => onGlobalPageChange?.(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
