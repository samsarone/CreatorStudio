// LayerItem.js
import React from 'react';
import ReactDOM from 'react-dom';
import './toolbar.css';

const LayerItem = ({
  layer,
  index,
  originalIndex,
  layerRefs,
  provided,
  snapshot,
  portalNode,
  pendingDuration,
  durationChanged,
  layerDurationCellUpdated,
  onUpdateDuration,
  onClosePopup,
  removeLayer,
  openPopupLayerIndex,
  setSelectedLayerIndex,
  setSelectedLayer,
  setOpenPopupLayerIndex,
  bg3Color,
  bgSelectedColor,
  textColor,
  bg2Color,
  frameToolbarView,
  FRAME_TOOLBAR_VIEW,
  layers,
  popupRef,
  borderColor,
}) => {
  const layerDuration = layer.duration; // in seconds

  const layerItem = (
    <div
      ref={(el) => {
        layerRefs.current[originalIndex] = el;
        provided.innerRef(el);
      }}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className='relative'
      style={{
        height: `${layerHeightInPixels(layerDuration)}px`,
        minHeight: `20px`,
        maxHeight: `${layerHeightInPixels(layerDuration)}px`,
        ...provided.draggableProps.style,
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedLayerIndex(originalIndex);
        setSelectedLayer(layer);
        setOpenPopupLayerIndex(originalIndex);
      }}
    >
      <div
        className={`${bg3Color} ${bgSelectedColor} ml-1 mr-1 cursor-pointer border-t ${borderColor} border-b ${borderColor}`}
        style={{ height: '100%' }}
      >
        <div className='absolute top-1 left-1 text-xs'>
          <div className='text-xs font-bold mb-4'>{originalIndex + 1}</div>
          <div>{layerDuration.toFixed(1)}s</div>
        </div>
        {frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED &&
          openPopupLayerIndex !== null &&
          openPopupLayerIndex === originalIndex && (
            <div
              className='absolute right-1 top-1 z-50 h-full'
              onClick={(e) => e.stopPropagation()}
              ref={popupRef}
            >
              <div className='relative text-center h-full'>
                <div className='block w-[120px] text-left mt-1 pl-1'>
                  <input
                    type='number'
                    value={
                      pendingDuration != null
                        ? pendingDuration
                        : layers[openPopupLayerIndex].duration
                    }
                    onChange={(e) =>
                      layerDurationCellUpdated(e.target.value, openPopupLayerIndex)
                    }
                  className={`w-[120px] inline-block border border-neutral-100 pl-1 rounded-lg ${textColor} ${bg2Color} pr-[1px] ${
                      durationChanged ? 'highlight' : ''
                    }`}
                  />
                  <label className='inline-block text-xs text-slate-200 ml-[-30px]'>s</label>
                </div>
                {durationChanged && (
                  <div className='mt-1 mb-2'>
                    <button
                      onClick={onUpdateDuration}
                      className={`px-4 py-2 text-xs text-slate-100 rounded bg-[#111a2f] border border-[#1f2a3d] m-auto ${
                        durationChanged ? 'highlight' : ''
                      }`}
                    >
                      Update
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );

  if (snapshot.isDragging && portalNode) {
    return ReactDOM.createPortal(layerItem, portalNode);
  }

  return layerItem;
};

// Helper function to calculate layer height in pixels
const layerHeightInPixels = (duration) => {
  const parentHeight = 500; // Default height if not provided
  const totalVisibleDuration = 1; // Placeholder, should be replaced with actual total visible duration
  if (totalVisibleDuration > 0) {
    return (duration / totalVisibleDuration) * parentHeight;
  }
  return 20;
};

export default LayerItem;
