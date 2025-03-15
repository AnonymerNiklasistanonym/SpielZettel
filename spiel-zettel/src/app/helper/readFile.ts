import JSZip from "jszip";

export interface SpielZettelElement {
  id: string;
  options?: (string | number)[];
  type: "number" | "checkbox" | "string" | "options";
  /** Middle position */
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  /** Function that provides dynamic state information if ruleset is enabled */
  rules?: { [ruleSet: string]: string };
}

export type CustomFunctionArgument = string;
export type CustomFunctionBody = string;

/** Custom function definition: [argument, body] */
export interface SpielZettelRuleSetCustomFunctions {
  [customFunction: string]: [CustomFunctionArgument, CustomFunctionBody];
}

export interface SpielZettelRuleSet {
  name: string;
  customFunctions?: SpielZettelRuleSetCustomFunctions;
  winCondition?: [string, string];
  loseCondition?: [string, string];
}

export interface SpielZettelVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface SpielZettelResourceFile {
  name: string;
  fileName: string;
  /** Base64 */
  fileData: string;
  fileMimeType: string;
}

export interface SpielZettelFileInfo {
  $schema: string;
  name: string;
  version: SpielZettelVersion;
  /** File path */
  ruleSets?: SpielZettelRuleSet[];
  /** Elements */
  elements: SpielZettelElement[];
  /** Resource files */
  res?: SpielZettelResourceFile[];
}

export interface SpielZettelFileData {
  imageBase64: string;
  dataJSON: SpielZettelFileInfo;
  // TODO add further resource files in an entry like dice throw configuration files
  // These could e.g. be contained in a zip directory called res
  // On the overlay menu they could be displayed in a column list
}

export function getVersionString(version: SpielZettelVersion) {
  return `v${version.major}.${version.minor}.${version.patch}`;
}

export function getMimeTypeFromMagicBytes(base64String: string) {
  const buffer = Buffer.from(base64String, "base64");

  // Check the first few bytes (magic numbers)
  if (buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))) {
    return "image/jpeg";
  } else if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  } else if (
    buffer
      .subarray(0, 6)
      .equals(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])) ||
    buffer
      .subarray(0, 6)
      .equals(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))
  ) {
    return "image/gif";
  } else if (
    buffer.subarray(0, 4).equals(Buffer.from([0x3c, 0x73, 0x76, 0x67]))
  ) {
    return "image/svg+xml";
  }
  throw new Error("Unknown image MIME type");
}

export async function readSpielZettelFile(
  file: File,
): Promise<SpielZettelFileData> {
  const zip = new JSZip();
  try {
    let imageBase64;
    let imageMimeType;
    let dataJSON;
    const zipContent = await zip.loadAsync(file);

    // Find and process the image file
    const imageFileName = Object.keys(zipContent.files).find((name) =>
      name.match(/\.(jpg|jpeg|png|gif)$/i),
    );
    const svgFileName = Object.keys(zipContent.files).find((name) =>
      name.match(/\.(svg)$/i),
    );
    if (imageFileName) {
      imageBase64 = await zipContent.files[imageFileName].async("base64");
      imageMimeType = getMimeTypeFromMagicBytes(imageBase64);
    } else if (svgFileName) {
      const svgText = await zipContent.files[svgFileName].async("text");
      imageBase64 = Buffer.from(svgText).toString("base64");
      imageMimeType = "image/svg+xml";
    }

    // Find and process the JSON file
    const jsonFileName = Object.keys(zipContent.files).find((name) =>
      name.match(/\.json$/i),
    );
    if (jsonFileName) {
      const jsonText = await zipContent.files[jsonFileName].async("text");
      dataJSON = JSON.parse(jsonText) as SpielZettelFileInfo;
    }
    if (imageBase64 && dataJSON && imageMimeType) {
      return {
        imageBase64: `data:${imageMimeType};base64,${imageBase64}`,
        dataJSON,
      } satisfies SpielZettelFileData;
    }
    throw Error("Did not find the necessary files");
  } catch (error) {
    throw Error(`Error processing ZIP file: ${(error as Error).message}`);
  }
}
