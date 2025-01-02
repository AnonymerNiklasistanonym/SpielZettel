import JSZip from "jszip";

export interface SpielZettelFileData {
    imageBase64: string;
    dataJSON: unknown
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
                imageBase64,
                dataJSON,
            } satisfies SpielZettelFileData;
        }
        throw Error("Did not find the necessary files");
    } catch (error) {
        throw Error(`Error processing ZIP file: ${(error as Error).message}`);
    }
};
