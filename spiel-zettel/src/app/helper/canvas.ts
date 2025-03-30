export function getCanvasImageBase64(
  canvas: HTMLCanvasElement,
  imageType = "image/png",
) {
  // Capture the canvas content as a Base64 string
  return canvas.toDataURL(imageType);
}
