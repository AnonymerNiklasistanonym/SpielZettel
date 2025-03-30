export function getCanvasImageBase64(
  canvas: HTMLCanvasElement,
  imageType = "image/png", // Lossless per default
  quality?: number, // Only important when exporting to "image/jpeg"
) {
  // Capture the canvas content as a Base64 string
  return canvas.toDataURL(imageType, quality);
}

async function getDataUrl(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas blob is null"));

        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve({ dataUrl: reader.result, blob });
          } else {
            reject(new Error("FileReader result is not a string"));
          }
        };
        reader.readAsDataURL(blob);
      },
      type,
      quality,
    );
  });
}

export interface CompressOptions {
  forcedImageMimeType?: string;
  forcedImageQuality?: number;
  compressForMaxFileSizeMB?: number;
}

export async function getCanvasImageBase64New(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  renderCall: (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ) => Promise<void>,
  compressOptions?: CompressOptions,
): Promise<{
  imageMimeType: string;
  imageExt: string;
  imageQuality?: number;
  dataUrl: string;
}> {
  await renderCall(canvas, ctx);

  if (!compressOptions?.compressForMaxFileSizeMB) {
    getCanvasImageBase64(canvas);
  }

  const maxSize =
    (compressOptions?.compressForMaxFileSizeMB || 10) * 1024 * 1024;
  let imageMimeType = compressOptions?.forcedImageMimeType || "image/png";
  let imageExt = imageMimeType.split("/")[1];
  let imageQuality =
    compressOptions?.forcedImageQuality || imageMimeType === "image/jpeg"
      ? 0.9
      : undefined;

  let { dataUrl, blob } = await getDataUrl(
    canvas,
    imageMimeType,
    imageQuality ?? 1,
  );

  // If image is within size limits, return it
  if (blob.size <= maxSize)
    return { imageMimeType, imageExt, imageQuality, dataUrl };

  // If PNG is too large, switch to JPEG with reduced quality if not forced to different mime type
  if (
    compressOptions?.forcedImageMimeType === undefined ||
    compressOptions?.forcedImageMimeType === "image/jpeg"
  ) {
    if (imageMimeType === "image/png") {
      imageMimeType = "image/jpeg";
      imageExt = imageMimeType.split("/")[1];
      imageQuality = 0.9;
      ({ dataUrl, blob } = await getDataUrl(
        canvas,
        imageMimeType,
        imageQuality,
      ));
    }

    // Reduce quality iteratively if still too large
    while (blob.size > maxSize && imageQuality && imageQuality > 0.4) {
      imageQuality -= 0.1;
      ({ dataUrl, blob } = await getDataUrl(
        canvas,
        imageMimeType,
        imageQuality,
      ));
    }
  }

  // Resize canvas if needed
  let scaleFactor = 0.9;
  while (blob.size > maxSize && scaleFactor > 0.4) {
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = Math.floor(canvas.width * scaleFactor);
    resizedCanvas.height = Math.floor(canvas.height * scaleFactor);
    const resizedCtx = resizedCanvas.getContext("2d");
    if (resizedCtx === null) {
      throw Error("Canvas Rendering Context null");
    }
    await renderCall(resizedCanvas, resizedCtx);
    ({ dataUrl, blob } = await getDataUrl(
      resizedCanvas,
      imageMimeType,
      imageQuality,
    ));
    scaleFactor -= 0.1;
  }

  return { imageMimeType, imageExt, imageQuality, dataUrl };
}
