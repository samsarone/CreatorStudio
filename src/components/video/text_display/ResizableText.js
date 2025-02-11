import React, { useRef, useEffect, useState } from 'react';
import { Text, Transformer, Group } from 'react-konva';
import { INIT_DIMENSIONS } from '../../editor/utils/ShapeUtils.js';

const ResizableText = ({
  text,
  isSelected,
  onSelect,
  updateToolbarButtonPosition,
  updateTargetActiveLayerConfig,
  stageZoomScale,
  ...props
}) => {
  const [shapeState, setShapeState] = useState({
    x: props.config.x || INIT_DIMENSIONS.x,
    y: props.config.y || INIT_DIMENSIONS.y,
    width: props.config.width || 100,
    height: props.config.height || 50,
    fontFamily: props.config.fontFamily || 'Arial',
    fontSize: props.config.fontSize || 16,
    fillColor: props.config.fillColor || 'black',
    textDecoration: props.config.underline ? 'underline' : '',
    fontStyle: 'normal',
    textAlign: props.config.textAlign || 'center',
    strokeColor: props.config.strokeColor || 'transparent',
    strokeWidth: props.config.strokeWidth || 0,
    shadowColor: props.config.shadowColor || 'transparent',
    shadowBlur: props.config.shadowBlur || 0,
    shadowOffsetX: props.config.shadowOffsetX || 0,
    shadowOffsetY: props.config.shadowOffsetY || 0,
    rotationAngle: props.config.rotationAngle || 0,
    autoWrap: props.config.autoWrap || false,
    capitalizeLetters: props.config.capitalizeLetters || false,
  });

  const [isConfigSet, setIsConfigSet] = useState(false);
  const [isPositionAdjusted, setIsPositionAdjusted] = useState(false);

  const textRef = useRef();
  const trRef = useRef();
  const { config, id } = props;

  // Initialize configuration once
  useEffect(() => {
    if (!isConfigSet) {
      setIsConfigSet(true);
      setShapeState((prevState) => ({
        ...prevState,
        x: props.config.x || INIT_DIMENSIONS.x,
        y: props.config.y || INIT_DIMENSIONS.y,
        fontFamily: props.config.fontFamily || 'Arial',
        fontSize: props.config.fontSize || 16,
        fillColor: props.config.fillColor || 'black',
        textDecoration: props.config.underline ? 'underline' : '',
        textAlign: props.config.textAlign || 'center',
        strokeColor: props.config.strokeColor || 'transparent',
        strokeWidth: props.config.strokeWidth || 0,
        shadowColor: props.config.shadowColor || 'transparent',
        shadowBlur: props.config.shadowBlur || 0,
        shadowOffsetX: props.config.shadowOffsetX || 0,
        shadowOffsetY: props.config.shadowOffsetY || 0,
        rotationAngle: props.config.rotationAngle || 0,
        autoWrap: props.config.autoWrap || false,
        capitalizeLetters: props.config.capitalizeLetters || false,
      }));
    }
  }, [props.config, isConfigSet]);

  useEffect(() => {
    if (trRef.current) {
      if (isSelected && textRef.current) {
        trRef.current.nodes([textRef.current]);
        trRef.current.getLayer().batchDraw();
      } else {
        // Detach when not selected
        trRef.current.nodes([]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [isSelected]);

  useEffect(() => {
    let fontStyle = '';
    if (config.bold) fontStyle += 'bold ';
    if (config.italic) fontStyle += 'italic ';
    if (config.fontEmphasis === 'bold') fontStyle += 'bold ';
    if (fontStyle.trim() === '') fontStyle = 'normal';

    setShapeState((prevState) => ({
      ...prevState,
      fontStyle: fontStyle.trim(),
    }));
  }, [config.bold, config.italic, config.fontEmphasis]);

  const prevDimensionsRef = useRef({ width: shapeState.width, height: shapeState.height });

  useEffect(() => {
    if (!textRef.current) return;
    const node = textRef.current;
    const textWidth = node.width();
    const textHeight = node.height();

    if (textWidth !== prevDimensionsRef.current.width || textHeight !== prevDimensionsRef.current.height) {
      setShapeState((prevState) => ({
        ...prevState,
        width: textWidth,
        height: textHeight,
      }));

      prevDimensionsRef.current = { width: textWidth, height: textHeight };
    }
  }, [
    text,
    shapeState.x,
    shapeState.y,
    shapeState.fontSize,
    shapeState.fontFamily,
    shapeState.fontStyle,
    shapeState.textDecoration,
    shapeState.align,
    shapeState.fillColor,
    shapeState.strokeColor,
    shapeState.strokeWidth,
    shapeState.shadowColor,
    shapeState.shadowBlur,
    shapeState.shadowOffsetX,
    shapeState.shadowOffsetY,
    shapeState.rotationAngle,
    shapeState.autoWrap,
    shapeState.capitalizeLetters,
    updateTargetActiveLayerConfig,
    id
  ]);

  // Adjust position once after dimensions are known
  useEffect(() => {
    if (
      isConfigSet &&
      !isPositionAdjusted &&
      prevDimensionsRef.current.width &&
      prevDimensionsRef.current.height
    ) {
      // Adjust x and y so that initially provided x and y are considered the center
      setShapeState((prevState) => ({
        ...prevState,
        x: prevState.x - prevDimensionsRef.current.width / 2,
        y: prevState.y - prevDimensionsRef.current.height / 2,
      }));
      setIsPositionAdjusted(true);
    }
  }, [isConfigSet, isPositionAdjusted]);

  const handleDragMove = (e) => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();
    const originalWidth = node.width();
    const originalHeight = node.height();

    updateToolbarButtonPosition(id, newX, newY);

    setShapeState((prevState) => ({
      ...prevState,
      x: newX,
      y: newY,
      width: originalWidth,
      height: originalHeight,
    }));
  };

  const handleDragEnd = (e) => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();
    const originalWidth = node.width();
    const originalHeight = node.height();

    updateToolbarButtonPosition(id, newX, newY);

    const payload = {
      x: newX,
      y: newY,
      width: originalWidth,
      height: originalHeight,
      ...shapeState
    };


    updateTargetActiveLayerConfig(id, payload);

    setShapeState((prevState) => ({
      ...prevState,
      x: newX,
      y: newY,
    }));
  };

  // Disable transform resizing by removing anchors
  const handleTransformEnd = () => {
    // Since no resizing is allowed, this may never be triggered,
    // but let's keep it for completeness.
    const node = textRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // New dimensions after transform
    const newWidth = node.width() * scaleX;
    const newHeight = node.height() * scaleY;

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    setShapeState((prevState) => ({
      ...prevState,
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
    }));

    const payload = {
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      ...shapeState
    };
    updateTargetActiveLayerConfig(id, payload);
  };

  let displayText = shapeState.capitalizeLetters ? text.toUpperCase() : text;

  return (
    <Group id={`group_${id}`}>
      {/* Stroke Text (if strokeWidth > 0) */}
      {shapeState.strokeWidth > 0 && (
        <Text
          {...props}
          x={shapeState.x}
          y={shapeState.y}
          fontFamily={shapeState.fontFamily}
          fontSize={shapeState.fontSize}
          textDecoration={shapeState.textDecoration}
          fontStyle={shapeState.fontStyle}
          align={shapeState.textAlign}
          text={displayText}
          stroke={shapeState.strokeColor}
          strokeWidth={shapeState.strokeWidth}
          shadowColor={shapeState.shadowColor}
          shadowBlur={shapeState.shadowBlur}
          shadowOffsetX={shapeState.shadowOffsetX}
          shadowOffsetY={shapeState.shadowOffsetY}
          rotation={shapeState.rotationAngle}
          wrap={shapeState.autoWrap ? 'word' : 'none'}
          width={shapeState.autoWrap ? shapeState.width : undefined}
          ref={textRef}
          listening={false} // not interactive
        />
      )}
      {/* Fill Text */}
      <Text
        {...props}
        x={shapeState.x}
        y={shapeState.y}
        fontFamily={shapeState.fontFamily}
        fontSize={shapeState.fontSize}
        fill={shapeState.fillColor}
        textDecoration={shapeState.textDecoration}
        fontStyle={shapeState.fontStyle}
        align={shapeState.textAlign}
        text={displayText}
        shadowColor={shapeState.shadowColor}
        shadowBlur={shapeState.shadowBlur}
        shadowOffsetX={shapeState.shadowOffsetX}
        shadowOffsetY={shapeState.shadowOffsetY}
        rotation={shapeState.rotationAngle}
        wrap={shapeState.autoWrap ? 'word' : 'none'}
        width={shapeState.autoWrap ? shapeState.width : undefined}
        ref={textRef}
        onClick={onSelect}
        onTap={onSelect}
        draggable
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={[]}     // No resizing anchors
          rotateEnabled={false}   // Disable rotation if desired
          boundBoxFunc={(oldBox, newBox) => {
            // Prevent resizing by always returning oldBox
            return oldBox;
          }}
        />
      )}
    </Group>
  );
};

export default ResizableText;
