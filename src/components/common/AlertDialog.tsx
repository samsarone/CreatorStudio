import React from 'react';
import { useAlertDialog } from '../../contexts/AlertDialogContext';
import { useColorMode } from '../../contexts/ColorMode';

export function AlertDialog() {
  const { isAlertDialogOpen, alertDialogContent, closeAlertDialog, useXL } = useAlertDialog();
  const { colorMode } = useColorMode();

  if (!isAlertDialogOpen) return null;

  let bgColor = colorMode === 'dark' ? 'bg-gray-900 text-neutral-100' : 'bg-neutral-100 text-neutral-900';
  const dialogWidthClass = useXL ? 'w-auto' : 'md:w-[512px]';


  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full  m-auto" style={{ zIndex: 10000 }}>
      <div className={`relative top-20 mx-auto pt-1 pb-5 p-5 border shadow-lg rounded-md ${bgColor} ${dialogWidthClass}`}>
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-500 focus:outline-none"
          onClick={closeAlertDialog}
        >
          {/* Close button SVG */}
        </button>
        <div className="mt-1 text-center max-h-[75vh] overflow-y-auto pr-1">
          {alertDialogContent}
        </div>
      </div>
    </div>
  );
}
