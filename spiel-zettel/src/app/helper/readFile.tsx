import JSZip from "jszip";

export interface SpielZettelElement {
    type: "number" | "checkbox" | "string";
    /** Middle position */
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    id: string;
    /** Function that provides dynamic state information if ruleset is enabled */
    rules?: {[ruleSet: string]: string};
}

export interface SpielZettelRuleSet {
    name: string;
    customFunctions: {[customFunction: string]: [string, string]}
}

export interface SpielZettelVersion {
    major: number;
    minor: number;
    patch: number;
}

export interface SpielZettelFileInfo {
    $schema: string
    name: string;
    version: SpielZettelVersion;
    /** File path */
    ruleSets?: SpielZettelRuleSet[];
    /** Elements */
    elements: SpielZettelElement[];
}

export interface SpielZettelFileData {
    imageBase64: string;
    dataJSON: SpielZettelFileInfo
}

export function getVersionString(version: SpielZettelVersion) {
    return `v${version.major}.${version.minor}.${version.patch}`;
}

export async function readSpielZettelFile(file: File): Promise<SpielZettelFileData> {
    const zip = new JSZip();
    try {
        let imageBase64;
        let dataJSON;
        const zipContent = await zip.loadAsync(file);

        // Find and process the image file
        const imageFileName = Object.keys(zipContent.files).find((name) =>
        name.match(/\.(jpg|jpeg|png|gif)$/i)
        );
        if (imageFileName) {
            imageBase64 = await zipContent.files[imageFileName].async("base64");
            //setImageSrc(`data:image/*;base64,${imageData}`);
        }

        // Find and process the JSON file
        const jsonFileName = Object.keys(zipContent.files).find((name) =>
        name.match(/\.json$/i)
        );
        if (jsonFileName) {
            const jsonText = await zipContent.files[jsonFileName].async("text");
            dataJSON = JSON.parse(jsonText);
        }
        if (imageBase64 !== undefined && dataJSON !== undefined) {
            return {
                imageBase64: `data:image/png;base64,${imageBase64}`,
                dataJSON,
            } satisfies SpielZettelFileData;
        }
        throw Error("Did not find the necessary files");
    } catch (error) {
        throw Error(`Error processing ZIP file: ${(error as Error).message}`);
    }
};
