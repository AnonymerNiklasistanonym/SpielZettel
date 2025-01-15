import * as fs from "fs";
import type { ImageTypeResult } from "image-type";
import imageType from "image-type";
import * as path from "path";

import { createSpielZettelFile } from "../src/app/helper/createFile";
import type { SpielZettelFileInfo } from "../src/app/helper/readFile";

// Function to find all JSON files in a directory and return their filenames without the extension
const findExampleFiles = (directory: string) => {
  try {
    const files = fs.readdirSync(directory); // Read all files in the directory
    const jsonFiles = files.filter((file) => file.endsWith(".json")); // Filter only JSON files

    // Extract the filename without extension and return as an array
    const fileNamesWithoutExtension = jsonFiles.map((file) =>
      path.basename(file, ".json"),
    );

    return fileNamesWithoutExtension;
  } catch (err) {
    console.error("Error reading directory:", err);
    return [];
  }
};

async function convertImageToBase64(
  imageBuffer: Buffer,
): Promise<[ImageTypeResult, string]> {
  // Detect the MIME type based on the buffer
  const detectedType = await imageType(imageBuffer);
  if (!detectedType) {
    throw new Error("Unsupported image type or unable to detect MIME type");
  }
  // Convert buffer to base64
  const base64String = imageBuffer.toString("base64");
  return [detectedType, `data:${detectedType.mime};base64,${base64String}`];
}

// Function to create a ZIP file
async function createZip(
  jsonPath: string,
  imagePath: string,
  outputZipPath: string,
) {
  try {
    // Read and add JSON file
    const jsonContent = await fs.promises.readFile(jsonPath, "utf-8");
    // Read and add image file
    const imageContent = await fs.promises.readFile(imagePath);
    const [, imageBase64] = await convertImageToBase64(imageContent);

    // Generate ZIP file
    const zipContent = await createSpielZettelFile({
      dataJSON: JSON.parse(jsonContent) as SpielZettelFileInfo,
      imageBase64,
    });
    const zipNodeBuffer = await zipContent.generateAsync({
      type: "nodebuffer",
      mimeType: "application/x-spielzettel",
    });

    // Write ZIP file to disk
    await fs.promises.writeFile(outputZipPath, zipNodeBuffer);
    console.log(`ZIP file created successfully: ${outputZipPath}`);
  } catch (error) {
    console.error("Error creating ZIP file:", error);
  }
}

const exampleDir = path.join(__dirname, "..", "examples");
const exampleFileNames = findExampleFiles(exampleDir);
for (const exampleFileName of exampleFileNames) {
  createZip(
    path.join(exampleDir, `${exampleFileName}.json`),
    path.join(exampleDir, `${exampleFileName}.jpg`),
    path.join(exampleDir, `${exampleFileName}.spielzettel`),
  ).catch(console.error);
}
