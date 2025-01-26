import * as fs from "fs";
import imageType from "image-type";
import JSZip from "jszip";
import * as path from "path";

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
    const imageBuffer = await fs.promises.readFile(imagePath);
    const detectedType = await imageType(imageBuffer);
    if (!detectedType) {
      throw new Error("Unsupported image type or unable to detect MIME type");
    }
    const zip = new JSZip();
    zip.file("data.json", jsonContent);
    zip.file(`image.${detectedType.ext}`, imageBuffer);
    const zipNodeBuffer = await zip.generateAsync({
      type: "nodebuffer",
      mimeType: "application/x-spielzettel",
    });

    // Write ZIP file to disk
    await fs.promises.mkdir(path.dirname(outputZipPath), { recursive: true });
    await fs.promises.writeFile(outputZipPath, zipNodeBuffer);
    console.log(`ZIP file created successfully: ${outputZipPath}`);
  } catch (error) {
    console.error("Error creating ZIP file:", error);
  }
}

const exampleDir = path.join(__dirname, "..", "examples");
const exampleFileNames = findExampleFiles(exampleDir);
const outDir = path.join(exampleDir, "SpielZettel");
for (const exampleFileName of exampleFileNames) {
  createZip(
    path.join(exampleDir, `${exampleFileName}.json`),
    path.join(exampleDir, `${exampleFileName}.jpg`),
    path.join(outDir, `${exampleFileName}.spielzettel`),
  ).catch(console.error);
}
