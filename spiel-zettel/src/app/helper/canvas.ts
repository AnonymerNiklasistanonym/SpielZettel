export function getCanvasImageBase64(
  canvas: HTMLCanvasElement,
  imageType = "image/png", // lossless
  quality: undefined | number = undefined, // Only important when exporting to "image/jpeg"
) {
  // Capture the canvas content as a Base64 string
  return canvas.toDataURL(imageType, quality);
}
