
export function getTextConfigForCanvas(textConfig, canvasDimensions = { width: 1024, height: 1024 }) {
  const { width, height } = canvasDimensions;


  const textBoxWidth = 600;
  const textBoxHeight = 200;

  const defaultX = width / 2;
  const defaultY = height / 2;

  let defaultTextConfig = {

    x: defaultX,
    y: defaultY,
    width: textBoxWidth,
    height: textBoxHeight,
    fontFamily: 'Arial',
    fontSize: 32,
    fillColor: '#ffffff',
    textDecoration: '',
    fontStyle: 'normal',
    bold: false,
    italic: false,
    underline: false,
    textAlign: 'center',
    strokeColor: '#ffffff',
    strokeWidth: 0,
    shadowColor: 'rgba(15,23,42,0.92)',
    shadowBlur: 8,
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    rotationAngle: 0,
    autoWrap: false,
    capitalizeLetters: false,
    lineHeight: 1.2,

    textBaseline: 'alphabetic', // for backend parity
    verticalAlign: 'middle', // conceptually, if you implement it

    
 
  };

  textConfig = { ...defaultTextConfig, ...textConfig };

  return textConfig;
}

export function normalizeActiveTextItemListForCanvas(
  itemList,
  canvasDimensions = { width: 1024, height: 1024 },
  fallbackItems = [],
  options = {}
) {
  const items = Array.isArray(itemList) ? itemList : [];
  const fallbackMap = new Map(
    (Array.isArray(fallbackItems) ? fallbackItems : []).map((item) => [item?.id, item])
  );
  const preferFallbackTextConfig = options?.preferFallbackTextConfig === true;

  return items.map((item) => {
    if (!item || item.type !== 'text') {
      return item;
    }

    const fallbackConfig = fallbackMap.get(item.id)?.config || {};
    const mergedConfig = preferFallbackTextConfig
      ? { ...(item.config || {}), ...fallbackConfig }
      : { ...fallbackConfig, ...(item.config || {}) };

    return {
      ...item,
      config: getTextConfigForCanvas(mergedConfig, canvasDimensions),
    };
  });
}
