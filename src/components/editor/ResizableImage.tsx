import React, { useRef, useEffect, useState } from "react";
import { Image, Transformer, Group, Text } from 'react-konva';
import { useImage } from 'react-konva-utils';
import { getScalingFactor } from '../../utils/image.jsx';
import { getStageDimensions} from '../../constants/Image.jsx';

const IMAGE_BASE = `${import.meta.env.VITE_PROCESSOR_API}`;

export default function ResizableImage({
  image,
  isSelected,
  onSelect,
  updateToolbarButtonPosition,
  updateTargetActiveLayerConfig,
  animations,
  isLayerSeeking,
  stageZoomScale,
  aspectRatio,
  ...props
}) {
  const { isDraggable, x, y } = props;
  let imageSrc;
  const [stageDimensions, setStageDimensions ] = useState({ width: 0, height: 0 });


  
  useEffect(() => {
    setStageDimensions(getStageDimensions(aspectRatio));
  }, [aspectRatio]);

  if (image.src) {
    if (image.src.startsWith('data:image')) {
      imageSrc = image.src;
    } else {
      imageSrc = `${IMAGE_BASE}/${image.src}`;
    }
  }

  const [img, status] = useImage(imageSrc, 'anonymous');
  const [transformEndCalled, setTransformEndCalled] = useState(false);
  const shapeRef = useRef();
  const trRef = useRef();
  const { showMask, id } = props;

  useEffect(() => {
    if (status !== 'loaded' || !shapeRef.current) {
      return;
    }

    const imageDimensions = {
      width: img.width,
      height: img.height,
    };
    const scalingFactor = 1;

    try {
      // Set the initial position of the image based on props
      shapeRef.current.setAttrs({
        x: x !== undefined ? x : (stageDimensions.width - imageDimensions.width * scalingFactor) / 2,
        y: y !== undefined ? y : (stageDimensions.height - imageDimensions.height * scalingFactor) / 2,
        scaleX: scalingFactor,
        scaleY: scalingFactor,
      });

      if (trRef.current && isSelected && shapeRef.current) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer().batchDraw();
      }
    } catch (e) {
      console.log(e);
    }
  }, [img, status]);

  useEffect(() => {
    if (!animations || animations.length === 0 || !isLayerSeeking || status !== 'loaded') {
      return;
    }
    const translateAnimationFound = animations.find((animation) => animation.type === 'rotate');
    if (translateAnimationFound) {
      const node = shapeRef.current;
      const clientRect = node.getClientRect();
      node.offsetX(clientRect.width / 2);
      node.offsetY(clientRect.height / 2);
      node.x(node.x() + clientRect.width / 2);
      node.y(node.y() + clientRect.height / 2);
    }
  }, [animations, img, status, isLayerSeeking]);

  useEffect(() => {
    if (trRef.current &&  shapeRef.current) {
      const layer = trRef.current.getLayer();
      if (isSelected && layer) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer().batchDraw();
      } else if (layer) {
        // Ensure transformer is detached when not selected
        trRef.current.nodes([]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [isSelected]);

  const handleTransformEnd = () => {
    if (transformEndCalled) {
      return; // Prevent duplicate calls
    }
    setTransformEndCalled(true);

    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const x = node.x();
    const y = node.y();
    const width = node.width() * scaleX;
    const height = node.height() * scaleY;

    node.scaleX(1);
    node.scaleY(1);

    const newConfig = {
      x: x,
      y: y,
      width: width,
      height: height,
    };
    updateTargetActiveLayerConfig(id, newConfig);

    setTimeout(() => setTransformEndCalled(false), 0);
  };

  const handleDragEnd = (e) => {
    const node = e.target;

    const newConfig = {
      x: node.x(),
      y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
    };
    updateTargetActiveLayerConfig(id, newConfig);
  };

  return (
    <Group id={`group_${id}`}>
      {status === 'loading' && (
        <Text text="Loading..." /> // Or display a spinner or placeholder
      )}
      {status === 'failed' && (
        <Text text="Failed to load image" fill="red" />
      )}
      {status === 'loaded' && img && (
        <Image
          {...props}
          image={img}
          ref={shapeRef}
          onClick={(e) => {
            e.cancelBubble = true; // Prevent event from bubbling to the stage
            onSelect();
          }}
          onTap={(e) => {
            e.cancelBubble = true; // Same as above for touch devices
            onSelect();
          }}
          draggable={showMask || !isDraggable ? false : true}
          onDragMove={(e) => updateToolbarButtonPosition(id, e.target.x(), e.target.y())}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          anchorSize={15}
          anchorStyleFunc={(config) => {
            config.attrs.cornerRadius = 20;
            config.attrs.anchorCornerRadius = 20;
          }}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </Group>
  );
}