import React from 'react';

import { FaChevronCircleDown, FaChevronCircleUp } from 'react-icons/fa';
import ImageToolbar from '../toolbars/ImageToolbar.js';
import ShapeToolbar from '../toolbars/ShapeToolbar.js';
import TextToolbar from '../toolbars/text_toolbar/TextToolbar.js';
import EraserToolbar from "../toolbars/EraserToolbar.js";
import PaintToolbar from "../toolbars/PaintToolbar.js";
import ShapeSelectToolbar from '../toolbars/toolbar_shapes/ShapeSelectToolbar.js';


export default function CanvasToolbar(props) {

  const {
    buttonPositions,
    selectedId,
    selectedLayerType,
    moveItem,
    applyFilter,
    applyFinalFilter,
    colorMode,
    removeItem,
    removeSelectedItem,
    flipImageHorizontal,
    flipImageVertical,
    updateTargetActiveLayerConfig,
    updateTargetShapeActiveLayerConfig,
    activeItemList,
    eraserToolbarVisible,
    eraserToolbarPosition,
    replaceEraserImage,
    duplicateEraserImage,
    resetEraserImage,
    shapeSelectToolbarVisible,
    shapeSelectToolbarPosition,
    handleResetShapeLayer,
    onCopyShapeLayer,
    onReplaceShapeLayer,
    paintToolbarVisible,
    paintToolbarPosition,
    addPaintImage,
    resetPaintImage,

    updateTargetImageActiveLayerConfig,
  } = props;

  return (
    <div>
      {buttonPositions.map((pos, index) => {        
        if (!selectedId || (selectedId && pos.id && ((selectedId !== pos.id)))) return null;        
        if (selectedLayerType === 'image') {
          return (
            <ImageToolbar
              key={pos.id}
              pos={pos}
              index={index}
              moveItem={moveItem}
              applyFilter={applyFilter}
              applyFinalFilter={applyFinalFilter}
              colorMode={colorMode}
              removeItem={removeSelectedItem}
              itemId={selectedId}
              flipImageHorizontal={flipImageHorizontal}
              flipImageVertical={flipImageVertical}
              updateTargetActiveLayerConfig={updateTargetImageActiveLayerConfig} 
              activeItemList={activeItemList} 
            />
          );
        } else if (selectedLayerType === 'shape') {

          return (
            <ShapeToolbar 
            key={pos.id}
            pos={pos}
            index={index}
            moveItem={moveItem}
            applyFilter={applyFilter}
            applyFinalFilter={applyFinalFilter}
            colorMode={colorMode}
            removeItem={removeSelectedItem}
            itemId={selectedId}
            updateTargetActiveLayerConfig={updateTargetShapeActiveLayerConfig}
            />
          )

        } else if (selectedLayerType === 'text') {
          return (
            <TextToolbar 
            key={pos.id}
            pos={pos}
            index={index}
            moveItem={moveItem}
            applyFilter={applyFilter}
            applyFinalFilter={applyFinalFilter}
            colorMode={colorMode}
            removeItem={removeSelectedItem}
            itemId={selectedId}
            updateTargetActiveLayerConfig={updateTargetShapeActiveLayerConfig}
            activeItemList={activeItemList}
            />
          )
        } else {
          return (
            <div key={pos.id} style={{
              position: 'absolute', left: pos.x, top: pos.y, background: "#030712",
              width: "100px", borderRadius: "5px", padding: "5px", display: "flex", justifyContent: "center",
              zIndex: 1000
            }}>
              <button onClick={() => moveItem(index, -1)}>
                <FaChevronCircleDown className="text-white" />
              </button>
              <button onClick={() => moveItem(index, 1)} style={{ marginLeft: '10px' }}>
                <FaChevronCircleUp className="text-white" />
              </button>
            </div>
          );
        }
      })}
      {eraserToolbarVisible && (
        <EraserToolbar
          pos={eraserToolbarPosition}
          replaceEraserImage={replaceEraserImage}
          duplicateEraserImage={duplicateEraserImage}
          resetEraserImage={resetEraserImage}
        />
      )}
      {shapeSelectToolbarVisible && (
        <ShapeSelectToolbar
          pos={shapeSelectToolbarPosition}
          onResetShape={handleResetShapeLayer}
          onCopyShape={onCopyShapeLayer}
          onReplaceShape={onReplaceShapeLayer}
        />
      )}
      {paintToolbarVisible && (
        <PaintToolbar
          pos={paintToolbarPosition}
          addPaintImage={addPaintImage}
          resetPaintImage={resetPaintImage}
        />
      )}
    </div>
  )
}