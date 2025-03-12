import JSZip from "jszip";

import type { SpielZettelFileData } from "./readFile";

const convertImageBase64ToBlob = (imageBase64: string): [string, Blob] => {
  // Extract the MIME type and Base64 data from the string
  const [metaData, base64] = imageBase64.split(",");
  const mimeTypeMatch = metaData.match(/:(.*?);/);
  if (mimeTypeMatch === null) {
    throw Error(
      `Unable to determine mime type from imageBase64 (metaData=${metaData}), blob cannot be created`,
    );
  }
  const mimeType = mimeTypeMatch[1];

  // Decode the Base64 data into binary string
  const binaryString = atob(base64);
  // Create an ArrayBuffer to hold the binary data
  const arrayBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    arrayBuffer[i] = binaryString.charCodeAt(i);
  }
  // Return the Blob with the appropriate MIME type
  return [mimeType, new Blob([arrayBuffer], { type: mimeType })];
};

export function createSpielZettelFile(data: SpielZettelFileData): JSZip {
  const zip = new JSZip();

  zip.file("data.json", JSON.stringify(data.dataJSON));

  const [imageType, imageBlob] = convertImageBase64ToBlob(data.imageBase64);
  zip.file(`image.${imageType.slice(imageType.indexOf("/") + 1)}`, imageBlob);

  return zip;
}

export async function createImageFileFromBase64(
  base64: string,
  fileName: string,
  imageType = "image/png",
) {
  const response = await fetch(base64);
  const blob = await response.blob();
  return new File([blob], fileName, { type: imageType });
}
