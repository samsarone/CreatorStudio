import ResizableImage from "../../editor/ResizableImage.tsx";
import ResizableText from "../text_display/ResizableText.jsx";
import ResizableRectangle from "../../editor/shapes/ResizableRectangle.tsx";
import ResizablePolygon from "../../editor/shapes/ResizablePolygon.tsx";
import ResizableCircle from "../../editor/shapes/ResizableCircle.tsx";
import ResizableDialogBubble from "../../editor/shapes/ResizableDialogBubble.tsx";

const FPS = 30;

export function ActiveRenderItem(props) {
  const {
    item,
    index,
    selectedId,
    setSelectedLayer,
    setSelectedId,
    selectedFrameId,
    showMask,
    updateToolbarButtonPosition,
    isDraggable,
    updateTargetActiveLayerConfig,
    isLayerSeeking,
    selectLayer,
    updateTargetShapeActiveLayerConfig,
    updateTargetTextActiveLayerConfig,
    onChange,
    sessionId,
    currentLayerSeek,
    durationOffset,
    createTextLayer,
    stageZoomScale = 1,
    aspectRatio

  } = props;

  const currentRelativeFrame = currentLayerSeek - (durationOffset * FPS);


  if (item.type === 'image') {
    if (item.config && item.config.frameDuration) {
      const frameDuration = item.config.frameDuration;
      const frameOffset = item.config.frameOffset;

      if (currentRelativeFrame < frameOffset || currentRelativeFrame > frameOffset + frameDuration) {
        return null;
      }
    }

    const newItem = {
      ...item,
      width: item.width * stageZoomScale,
      height: item.height * stageZoomScale,
      x: item.x * stageZoomScale,
      y: item.y * stageZoomScale,

    }
    return (
      <ResizableImage
        {...newItem}
        image={item}
        src={item.src}
        isSelected={selectedId === item.id}
        onSelect={() => setSelectedLayer(item)}
        onUnselect={() => setSelectedId(null)}
        showMask={showMask}
        updateToolbarButtonPosition={updateToolbarButtonPosition}
        isDraggable={isDraggable}
        key={`item_${sessionId}_${selectedFrameId}_${item.src}_${index}`}
        updateTargetActiveLayerConfig={updateTargetActiveLayerConfig}
        isLayerSeeking={isLayerSeeking}
        stageZoomScale={stageZoomScale}
        aspectRatio={aspectRatio}
      />
    );
  } else if (item.type === 'text') {

    const frameDuration = item.config.frameDuration;
    const frameOffset = item.config.frameOffset;

    const newItem = {
      ...item,
      config: {
        ...item.config,
        x: item.config.x * stageZoomScale,
        y: item.config.y * stageZoomScale,
        width: item.config.width * stageZoomScale,
        height: item.config.height * stageZoomScale,
        fontSize: item.config.fontSize * stageZoomScale,
        strokeWidth: item.config.strokeWidth * stageZoomScale,
        
      }

    }
    if (item.config && !item.config.frameDuration) {

      return (
        <ResizableText
          {...newItem}
          isSelected={selectedId === item.id}
          onSelect={() => setSelectedLayer(item)}
          onUnselect={() => setSelectedId(null)}
          updateToolbarButtonPosition={updateToolbarButtonPosition}
          isDraggable={isDraggable}
          updateTargetActiveLayerConfig={updateTargetTextActiveLayerConfig}
          stageZoomScale={stageZoomScale}
          aspectRatio={aspectRatio}
          createTextLayer={createTextLayer}
        />
      );
    } else {
      
      if (currentRelativeFrame >= frameOffset && currentRelativeFrame <= frameOffset + frameDuration) {
        return (
          <ResizableText
            {...newItem}
            isSelected={selectedId === item.id}
            onSelect={() => setSelectedLayer(item)}
            onUnselect={() => setSelectedId(null)}
            updateToolbarButtonPosition={updateToolbarButtonPosition}
            isDraggable={isDraggable}
            updateTargetActiveLayerConfig={updateTargetTextActiveLayerConfig}
            stageZoomScale={stageZoomScale}
            aspectRatio={aspectRatio}
          />
        );
      }
    }
  } else if (item.type === 'shape') {
    const newItem = {
      ...item,
      config: {
        ...item.config,
        x: item.config.x * stageZoomScale,
        y: item.config.y * stageZoomScale,
        width: item.config.width * stageZoomScale,
        height: item.config.height * stageZoomScale
      }
    }
    if (item.config && item.config.frameDuration) {
      const frameDuration = item.config.frameDuration;
      const frameOffset = item.config.frameOffset;

      if (currentRelativeFrame < frameOffset || currentRelativeFrame > frameOffset + frameDuration) {
        return null;  
      }
    }
    if (item.shape === 'circle') {
      return (
        <ResizableCircle
          {...newItem}
          isSelected={selectedId === item.id}
          onSelect={() => selectLayer(item)}
          onUnselect={() => setSelectedId(null)}
          updateToolbarButtonPosition={updateToolbarButtonPosition}
          isDraggable={isDraggable}
          updateTargetActiveLayerConfig={updateTargetShapeActiveLayerConfig}
          stageZoomScale={stageZoomScale}
          aspectRatio={aspectRatio}
        />
      );
    } else if (item.shape === 'rectangle') {
      return (
        <ResizableRectangle
          config={newItem.config}
          {...newItem}
          isSelected={selectedId === item.id}
          onSelect={() => selectLayer(item)}
          onUnselect={() => setSelectedId(null)}
          updateToolbarButtonPosition={updateToolbarButtonPosition}
          isDraggable={isDraggable}
          updateTargetActiveLayerConfig={updateTargetShapeActiveLayerConfig}
          stageZoomScale={stageZoomScale}
          aspectRatio={aspectRatio}
        />
      );
    } else if (item.shape === 'polygon') {
      return (
        <ResizablePolygon
          {...newItem}
          isSelected={selectedId === item.id}
          onSelect={() => selectLayer(item)}
          onUnselect={() => setSelectedId(null)}
          updateToolbarButtonPosition={updateToolbarButtonPosition}
          isDraggable={isDraggable}
          updateTargetActiveLayerConfig={updateTargetShapeActiveLayerConfig}
          stageZoomScale={stageZoomScale}
          aspectRatio={aspectRatio}
        />
      );
    } else if (item.shape === 'dialog') {
      return (
        <ResizableDialogBubble
          {...newItem}
          isSelected={selectedId === item.id}
          onSelect={() => selectLayer(item)}
          onUnselect={() => setSelectedId(null)}
          updateToolbarButtonPosition={updateToolbarButtonPosition}
          onChange={(newAttrs) => onChange({ ...newAttrs, id: item.id })}
          updateTargetActiveLayerConfig={updateTargetShapeActiveLayerConfig}
          stageZoomScale={stageZoomScale}
          aspectRatio={aspectRatio}
        />
      );

    }
  }

}