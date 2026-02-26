import React from 'react';
import { useAlertDialog } from '../../contexts/AlertDialogContext';
import { useColorMode } from '../../contexts/ColorMode';

export function AlertDialog() {
  const { isAlertDialogOpen, alertDialogContent, closeAlertDialog, useXL, dialogOptions } = useAlertDialog();
  const { colorMode } = useColorMode();

  if (!isAlertDialogOpen) return null;

  const isAuthSurface = dialogOptions?.surface === 'auth';
  let bgColor = colorMode === 'dark' ? 'bg-gray-900 text-neutral-100' : 'bg-neutral-100 text-neutral-900';
  if (isAuthSurface) {
    bgColor = colorMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900';
  }
  const dialogWidthClass = useXL
    ? 'w-auto'
    : isAuthSurface
      ? 'w-full max-w-md'
      : 'md:w-[512px]';
  const dialogBorderClass = dialogOptions?.hideBorder ? 'border border-transparent' : 'border';
  const dialogPaddingClass = dialogOptions?.fullBleed ? 'p-0' : 'pt-1 pb-5 p-5';
  const dialogPositionClass = dialogOptions?.centerContent ? '' : 'top-20';
  const dialogRadiusClass = dialogOptions?.fullBleed ? 'rounded-2xl' : 'rounded-md';
  const overlayClass = dialogOptions?.centerContent
    ? 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center'
    : 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full m-auto';
  const contentClass = dialogOptions?.centerContent
    ? 'w-full h-full flex items-center justify-center text-left'
    : 'mt-1 text-center max-h-[75vh] overflow-y-auto pr-1';


  return (
    <div
      className={overlayClass}
      style={{ zIndex: 10000 }}
      onClick={closeAlertDialog}
    >
      <div
        className={`relative mx-auto shadow-lg ${dialogPositionClass} ${dialogPaddingClass} ${dialogRadiusClass} ${bgColor} ${dialogWidthClass} ${dialogBorderClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        {!dialogOptions?.hideCloseButton && (
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-500 focus:outline-none"
            onClick={closeAlertDialog}
          >
            {/* Close button SVG */}
          </button>
        )}
        <div className={contentClass}>
          {alertDialogContent}
        </div>
      </div>
    </div>
  );
}
