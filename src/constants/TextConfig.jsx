
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
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
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
