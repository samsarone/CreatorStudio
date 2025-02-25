import React from 'react';
import { useColorMode } from '../../../../contexts/ColorMode';

export default function VideoCanvasGridOverlay(props) {
  const { canvasDimensions } = props;
  const { colorMode } = useColorMode();
  const { width, height } = canvasDimensions;

  // If there’s no valid width/height, don’t render
  if (!width || !height) {
    return null;
  }

  // Subtle color that works for both light & dark modes
  const lineColor =
    colorMode === 'dark'
      ? 'rgba(255, 255, 255, 0.4)'
      : 'rgba(0, 0, 0, 0.4)';

  const lineColorBold =
    colorMode === 'dark'
      ? 'rgba(255, 255, 255, 0.6)'
      : 'rgba(0, 0, 0, 0.6)';

  // Rule of thirds lines
  const vLine1 = width / 3;
  const vLine2 = (2 * width) / 3;
  const hLine1 = height / 3;
  const hLine2 = (2 * height) / 3;

  // Generate a grid at each 10% step
  const verticalGridLines = [];
  const horizontalGridLines = [];
  const labels = [];

  for (let i = 1; i < 10; i++) {
    const x = (width * i) / 10;
    const y = (height * i) / 10;

    // Vertical line
    verticalGridLines.push(
      <line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={lineColor}
        strokeWidth="1"
        strokeDasharray="3,3"
      />
    );
    // Label for the vertical line (top edge)
    labels.push(
      <text
        key={`v-label-${i}`}
        x={x + 2}
        y={12}
        fill={lineColor}
        fontSize={10}
        fontFamily="sans-serif"
      >
        {`${i * 10}%`}
      </text>
    );

    // Horizontal line
    horizontalGridLines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={lineColor}
        strokeWidth="1"
        strokeDasharray="3,3"
      />
    );
    // Label for the horizontal line (left edge)
    labels.push(
      <text
        key={`h-label-${i}`}
        x={4}
        y={y - 2}
        fill={lineColor}
        fontSize={10}
        fontFamily="sans-serif"
      >
        {`${i * 10}%`}
      </text>
    );
  }

  // Draw center crosshair
  const centerX = width / 2;
  const centerY = height / 2;

  // Safe margin box (e.g., 10% in from each border)
  const safeMargin = 0.1;
  const safeMarginRect = {
    x: width * safeMargin,
    y: height * safeMargin,
    w: width * (1 - 2 * safeMargin),
    h: height * (1 - 2 * safeMargin),
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        width,
        height,
        pointerEvents: 'none', // allow clicks to pass through
        zIndex: 20,
      }}
    >
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* 10% Grid lines (thin) */}
        {verticalGridLines}
        {horizontalGridLines}

        {/* Rule of Thirds lines (thicker dashed) */}
        <line
          x1={vLine1}
          y1={0}
          x2={vLine1}
          y2={height}
          stroke={lineColorBold}
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <line
          x1={vLine2}
          y1={0}
          x2={vLine2}
          y2={height}
          stroke={lineColorBold}
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <line
          x1={0}
          y1={hLine1}
          x2={width}
          y2={hLine1}
          stroke={lineColorBold}
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <line
          x1={0}
          y1={hLine2}
          x2={width}
          y2={hLine2}
          stroke={lineColorBold}
          strokeWidth="2"
          strokeDasharray="4,4"
        />

        {/* Center Crosshair */}
        <line
          x1={centerX}
          y1={centerY - 10}
          x2={centerX}
          y2={centerY + 10}
          stroke={lineColorBold}
          strokeWidth="2"
        />
        <line
          x1={centerX - 10}
          y1={centerY}
          x2={centerX + 10}
          y2={centerY}
          stroke={lineColorBold}
          strokeWidth="2"
        />

        {/* Safe Margin Rectangle */}
        <rect
          x={safeMarginRect.x}
          y={safeMarginRect.y}
          width={safeMarginRect.w}
          height={safeMarginRect.h}
          fill="none"
          stroke={lineColorBold}
          strokeWidth="2"
          strokeDasharray="6,6"
        />

        {/* Labels at top/left for each 10% line */}
        {labels}
      </svg>
    </div>
  );
}
