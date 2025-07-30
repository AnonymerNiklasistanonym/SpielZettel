import { existsSync } from "fs";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import imageType from "image-type";
import JSZip from "jszip";
import { basename, dirname, join, resolve } from "path";

import { fileExtension, mimeType, name } from "../src/app/helper/info";
import type { SpielZettelFileInfo } from "../src/app/helper/readFile";

export type ExampleCreateData = Array<[string, SpielZettelFileInfo]>;

async function createExamplesDataJSON(examplesDir: string) {
  const files = await readdir(examplesDir);
  const scripts = files.filter(
    (file) => file.includes("create") && file.endsWith(".ts"),
  );

  await Promise.all(
    scripts.map(async (script) => {
      console.log(`Importing ${script}...`);
      const modulePath = resolve(examplesDir, script);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const scriptModule = await import(modulePath);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (scriptModule.create && typeof scriptModule.create === "function") {
        console.log(`Executing create() from ${script}...`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const createdFiles = (await scriptModule.create()) as ExampleCreateData;
        await Promise.all(
          createdFiles.map(async ([filePath, fileData]) => {
            await writeFile(filePath, JSON.stringify(fileData));
            console.log(`[${script}] Create ${filePath}`);
          }),
        );
      } else {
        console.warn(`Skipping ${script}: No create() function found.`);
      }
    }),
  );
}

// Function to find all JSON files in a directory and return their filenames without the extension
async function findExampleFiles(examplesDir: string) {
  try {
    const files = await readdir(examplesDir); // Read all files in the directory
    const jsonFiles = files.filter(
      (file) => file.endsWith(".json") && !file.startsWith("res-"),
    ); // Filter only JSON files

    // Extract the filename without extension and return as an array
    const fileNamesWithoutExtension = jsonFiles.map((file) =>
      basename(file, ".json"),
    );

    return fileNamesWithoutExtension;
  } catch (err) {
    console.error("Error reading directory:", err);
    return [];
  }
}

// Function to create a ZIP file
async function createZip(
  jsonPath: string,
  imagePath: string,
  outputZipPath: string,
) {
  try {
    // Read and add JSON file
    const jsonContent = await readFile(jsonPath, "utf-8");

    const zip = new JSZip();
    zip.file("data.json", jsonContent);

    // Read and add image file
    if (imagePath.endsWith(".svg")) {
      const svgText = await readFile(imagePath, "utf-8");
      zip.file("image.svg", svgText);
    } else {
      const imageBuffer = await readFile(imagePath);
      const detectedType = await imageType(imageBuffer);
      if (!detectedType) {
        throw new Error(
          `Unsupported image type or unable to detect MIME type from "${imagePath}"`,
        );
      }
      zip.file(`image.${detectedType.ext}`, imageBuffer);
    }

    const zipNodeBuffer = await zip.generateAsync({
      type: "nodebuffer",
      mimeType,
    });

    // Write ZIP file to disk
    await mkdir(dirname(outputZipPath), { recursive: true });
    await writeFile(outputZipPath, zipNodeBuffer);
    console.log(
      `ZIP file created successfully: ${outputZipPath} (json=${jsonPath}, image=${imagePath})`,
    );
  } catch (error) {
    console.error("Error creating ZIP file:", error);
  }
}

/** Sort them so that the last hit is the preferred match */
const imageExtensions = [".gif", ".png", ".jpeg", ".jpg", ".svg"];

async function createExamples(exampleDir: string) {
  await createExamplesDataJSON(exampleDir);

  const exportFiles: Promise<void>[] = [];
  const exampleFileNames = await findExampleFiles(exampleDir);
  const outDir = join(exampleDir, name);
  for (const exampleFileName of exampleFileNames) {
    let imageFilePath;
    let count = 0;
    const imageFilePaths = [];

    // Check for an existing image file with any of the known extensions
    for (const ext of imageExtensions) {
      const possiblePath = join(exampleDir, `${exampleFileName}${ext}`);
      if (existsSync(possiblePath)) {
        imageFilePath = possiblePath;
        imageFilePaths.push(possiblePath);
        count++;
      }
    }
    if (count > 1) {
      console.warn(
        `Multiple possible image files found for ${exampleFileName}, last one is chosen (${imageFilePaths.join(",")})`,
      );
    }
    if (!imageFilePath) {
      throw Error(`Image file not found for ${exampleFileName}`);
    }

    exportFiles.push(
      createZip(
        join(exampleDir, `${exampleFileName}.json`),
        imageFilePath,
        join(outDir, `${exampleFileName}${fileExtension}`),
      ),
    );
  }
  await Promise.all(exportFiles);

  const exportedFiles = await readdir(outDir);
  const zip = new JSZip();

  for (const file of exportedFiles) {
    if (file.endsWith(fileExtension)) {
      const filePath = join(outDir, file);
      const fileContent = await readFile(filePath);
      zip.file(file, fileContent);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const outZipCollection = join(outDir, `${name}_collection.zip`);
  await writeFile(outZipCollection, zipBuffer);
  console.log(`ZIP Collection file created successfully: ${outZipCollection}`);
}

const exampleDir = join(__dirname, "..", "examples");

createExamples(exampleDir).catch(console.error);
