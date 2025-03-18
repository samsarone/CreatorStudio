// utils/NebulaUtils.js

export function applyNebulaEffect(ctx, params, t) {
  const { opacity, color, speed } = params;

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // Create an off-screen canvas
  const nebulaCanvas = document.createElement('canvas');
  nebulaCanvas.width = width;
  nebulaCanvas.height = height;
  const nebulaCtx = nebulaCanvas.getContext('2d');

  // Generate moving mist effect
  const offset = speed * t * 1000;
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width + offset;
    const y = Math.random() * height;
    const radius = (Math.random() * 4.5 + 0.5) / 2;

    nebulaCtx.fillStyle = color;
    nebulaCtx.globalAlpha = opacity / 2;
    nebulaCtx.beginPath();
    nebulaCtx.arc(x % width, y, radius, 0, Math.PI * 2);
    nebulaCtx.fill();
  }

  // Overlay the nebula onto the main canvas
  ctx.drawImage(nebulaCanvas, 0, 0);
}
