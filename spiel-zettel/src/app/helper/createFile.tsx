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
  const byteString = atob(base64);
  // Create an ArrayBuffer to hold the binary data
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uintArray = new Uint8Array(arrayBuffer);
  // Fill the Uint8Array with the decoded byte string
  for (let i = 0; i < byteString.length; i++) {
    uintArray[i] = byteString.charCodeAt(i);
  }
  // Return the Blob with the appropriate MIME type
  return [mimeType, new Blob([uintArray], { type: mimeType })];
};

export async function createSpielZettelFile(
  data: SpielZettelFileData,
): Promise<JSZip> {
  const zip = new JSZip();

  zip.file("data.json", JSON.stringify(data.dataJSON));

  const [imageType, imageBlob] = convertImageBase64ToBlob(data.imageBase64);
  zip.file(`image.${imageType.slice(imageType.indexOf("/") + 1)}`, imageBlob);

  return zip;
}
