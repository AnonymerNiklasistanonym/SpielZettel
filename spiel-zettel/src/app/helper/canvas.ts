async function getDataUrl(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<{ dataUrl: string; blob: Blob }> {
  console.debug("Get blob from", mimeType, quality);
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
      mimeType,
      quality,
    );
  });
}

export interface CompressOptions {
  /** Maximum output file size */
  maxFileSizeMB?: number;
  /** Lowest quality of the compressed image (ignored for lossless formats like png) before resizing */
  beforeResizingLowestQuality?: number;
  /** Try JPEG export as alternative to the default image type before resizing */
  beforeResizingTryJPEG?: boolean;
}

export interface ImageOptions {
  mimeType?: string;
  quality?: number;
}

export interface ImageInfo {
  mimeType: string;
  ext: string;
  quality?: number;
  scale?: number;
  dataUrl: string;
}

/**
 * Returns a screenshot of the current canvas, optional using a specific image type and quality.
 * If compress options are given it tries to reduce image quality and resolution until the image fits the requested maximum size.
 *
 * @param canvas The original canvas
 * @param renderCall A render call in case the canvas is resized when meeting file size demands
 * @param imageOptions Specific options regarding the image output
 * @param compressOptions Specific options regarding the image compression
 * @returns The compressed image as base64 string and it's mime type and extension as well as information about the used quality.
 */
export async function getCanvasImageBase64(
  canvas: HTMLCanvasElement,
  renderCall: (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ) => Promise<void>,
  imageOptions?: ImageOptions,
  compressOptions?: CompressOptions,
): Promise<ImageInfo> {
  const ogMimeType = imageOptions?.mimeType || "image/png";

  if (ogMimeType.split("/").length !== 2) {
    throw Error(`Could not find image extension from '${ogMimeType}'`);
  }

  const ogExt = ogMimeType.split("/")[1];
  const ogQuality = imageOptions?.quality;

  // If no compress options are set use default return function
  if (!compressOptions?.maxFileSizeMB) {
    const dataUrl = canvas.toDataURL(ogMimeType, ogQuality);
    return { dataUrl, ext: ogExt, mimeType: ogMimeType, quality: ogQuality };
  }

  // Resize canvas/Reduce quality if needed
  const maxSize = compressOptions.maxFileSizeMB * 1024 * 1024;
  const lowestQuality = compressOptions?.beforeResizingLowestQuality || 0.6;
  let scale = 1;
  do {
    let mimeType = ogMimeType;
    let ext = ogExt;
    let quality = ogQuality;
    let { dataUrl, blob } = await getDataUrl(canvas, ogMimeType, ogQuality);
    console.debug("Canvas image", {
      mimeType,
      quality,
      scale,
      size: blob.size / 1024 / 1024,
    });

    // Reduce quality in the original format until lowest quality is reached (ignore lossless format PNG)
    if (blob.size > maxSize && mimeType !== "image/png") {
      quality = ogQuality ?? 1;
      while (blob.size > maxSize && quality > lowestQuality) {
        quality -= 0.1;
        const previousSize = blob.size;
        ({ dataUrl, blob } = await getDataUrl(canvas, ogMimeType, quality));
        console.debug("Canvas image", {
          mimeType,
          quality,
          scale,
          size: blob.size / 1024 / 1024,
        });
        // Some browsers do not change the output if quality is reduced so exit early instead
        if (previousSize === blob.size) {
          break;
        }
      }
    }

    // Reduce quality in the JPEG format until lowest quality is reached
    if (
      blob.size > maxSize &&
      compressOptions.beforeResizingTryJPEG &&
      mimeType !== "image/jpeg"
    ) {
      mimeType = "image/jpeg";
      ext = ".jpg";
      quality = ogQuality ?? 1;
      while (blob.size > maxSize && quality > lowestQuality) {
        quality -= 0.1;
        const previousSize = blob.size;
        ({ dataUrl, blob } = await getDataUrl(canvas, ogMimeType, quality));
        console.debug("Canvas image", {
          mimeType,
          quality,
          scale,
          size: blob.size / 1024 / 1024,
        });
        // Some browsers do not change the output if quality is reduced so exit early instead
        if (previousSize === blob.size) {
          break;
        }
      }
    }

    if (blob.size <= maxSize) {
      return { dataUrl, ext, mimeType, quality, scale };
    }

    // Reduce image size
    scale -= 0.1;
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = Math.floor(canvas.width * scale);
    resizedCanvas.height = Math.floor(canvas.height * scale);
    const resizedCtx = resizedCanvas.getContext("2d");
    if (resizedCtx === null) {
      throw Error("Canvas Rendering Context null");
    }
    await renderCall(resizedCanvas, resizedCtx);
    console.debug("Rerender canvas...", scale);

    // Update original canvas with resized canvas
    canvas = resizedCanvas;
  } while (scale > 0.1);

  throw Error("Could not compress image enough to meet compression demands");
}
