import { getTextConfigForCanvas } from '../constants/TextConfig.jsx';

function buildCanvasFont(config) {
  const fontTokens = [];

  if (config.italic) {
    fontTokens.push('italic');
  }

  if (config.bold) {
    fontTokens.push('bold');
  }

  fontTokens.push(`${config.fontSize}px`);
  fontTokens.push(config.fontFamily || 'Arial');

  return fontTokens.join(' ');
}

function wrapTextToWidth(ctx, text, maxWidth) {
  if (!text) {
    return [''];
  }

  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    return `${text}`.split('\n');
  }

  const paragraphs = `${text}`.split('\n');
  const wrappedLines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      wrappedLines.push('');
      continue;
    }

    let currentLine = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const nextLine = `${currentLine} ${words[index]}`;
      if (ctx.measureText(nextLine).width <= maxWidth) {
        currentLine = nextLine;
      } else {
        wrappedLines.push(currentLine);
        currentLine = words[index];
      }
    }

    wrappedLines.push(currentLine);
  }

  return wrappedLines;
}

function getTextAnchorX(width, textAlign) {
  if (textAlign === 'center') {
    return width / 2;
  }

  if (textAlign === 'right') {
    return width;
  }

  return 0;
}

function drawUnderline(ctx, line, x, y, textAlign, fontSize) {
  const measuredWidth = ctx.measureText(line).width;
  let startX = x;

  if (textAlign === 'center') {
    startX = x - measuredWidth / 2;
  } else if (textAlign === 'right') {
    startX = x - measuredWidth;
  }

  const underlineY = y + fontSize + 2;
  ctx.beginPath();
  ctx.moveTo(startX, underlineY);
  ctx.lineTo(startX + measuredWidth, underlineY);
  ctx.lineWidth = Math.max(1, fontSize * 0.05);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.stroke();
}

export function drawCanvasTextItem(ctx, item, canvasDimensions) {
  if (!ctx || !item || item.type !== 'text') {
    return;
  }

  const config = getTextConfigForCanvas(item.config || {}, canvasDimensions);
  const displayText = config.capitalizeLetters
    ? `${item.text || ''}`.toUpperCase()
    : `${item.text || ''}`;

  if (!displayText.trim()) {
    return;
  }

  const width = Math.max(1, Number(config.width) || 1);
  const height = Math.max(1, Number(config.height) || 1);
  const originX = config.x - width / 2;
  const originY = config.y - height / 2;
  const rotationAngle = Number(config.rotationAngle) || 0;
  const textAlign = config.textAlign || 'left';
  const lineHeight = Math.max(0.1, Number(config.lineHeight) || 1.2);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(originX, originY);

  if (rotationAngle) {
    ctx.rotate((rotationAngle * Math.PI) / 180);
  }

  ctx.font = buildCanvasFont(config);
  ctx.fillStyle = config.fillColor || '#ffffff';
  ctx.textBaseline = 'top';
  ctx.textAlign = textAlign;
  ctx.shadowColor = config.shadowColor || 'transparent';
  ctx.shadowBlur = Number(config.shadowBlur) || 0;
  ctx.shadowOffsetX = Number(config.shadowOffsetX) || 0;
  ctx.shadowOffsetY = Number(config.shadowOffsetY) || 0;

  const lines = config.autoWrap
    ? wrapTextToWidth(ctx, displayText, width)
    : displayText.split('\n');
  const textAnchorX = getTextAnchorX(width, textAlign);
  const lineHeightPx = config.fontSize * lineHeight;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineY = index * lineHeightPx;

    if ((config.strokeWidth || 0) > 0) {
      ctx.strokeStyle = config.strokeColor || '#ffffff';
      ctx.lineWidth = config.strokeWidth || 0;
      ctx.strokeText(line, textAnchorX, lineY);
    }

    ctx.fillText(line, textAnchorX, lineY);

    if (config.underline) {
      drawUnderline(ctx, line, textAnchorX, lineY, textAlign, config.fontSize);
    }
  }

  ctx.restore();
}
