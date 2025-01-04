import * as fs from "fs";
import * as path from "path";
import { createGenerator } from "ts-json-schema-generator";

// Configuration for the generator
const config = {
  path: path.join(__dirname, "..", "src", "app", "helper", "readSpielZettelFile.tsx"),
  tsconfig: path.join(__dirname,"..", "tsconfig.json"),
  type: "SpielZettelFileInfo",
};

function generateSchema(outputPath: string) {
  try {
    // Create the JSON Schema generator
    const generator = createGenerator(config);

    // Generate the JSON schema
    const schema = generator.createSchema(config.type);

    // Write the JSON schema to a file
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

    console.log(`JSON Schema successfully generated at: ${outputPath}`);
  } catch (error) {
    console.error("Error generating JSON schema:", error);
  }
}

// Run the script
generateSchema(path.join(__dirname, "..", "spielzettel-info-schema.json"));
