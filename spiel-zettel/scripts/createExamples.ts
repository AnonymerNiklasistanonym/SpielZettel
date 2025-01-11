import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";

// Function to find all JSON files in a directory and return their filenames without the extension
const findExampleFiles = (directory: string) => {
  try {
    const files = fs.readdirSync(directory); // Read all files in the directory
    const jsonFiles = files.filter(file => file.endsWith('.json')); // Filter only JSON files

    // Extract the filename without extension and return as an array
    const fileNamesWithoutExtension = jsonFiles.map(file => path.basename(file, '.json'));

    return fileNamesWithoutExtension;
  } catch (err) {
    console.error('Error reading directory:', err);
    return [];
  }
};

// Function to create a ZIP file
async function createZip(jsonPath: string, imagePath: string, outputZipPath: string) {
  const zip = new JSZip();

  try {
    // Read and add JSON file
    const jsonContent = await fs.promises.readFile(jsonPath, "utf-8");
    zip.file(path.basename(jsonPath), jsonContent);

    // Read and add image file
    const imageContent = await fs.promises.readFile(imagePath);
    zip.file(path.basename(imagePath), imageContent);

    // Generate ZIP file
    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    // Write ZIP file to disk
    await fs.promises.writeFile(outputZipPath, zipContent);
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
