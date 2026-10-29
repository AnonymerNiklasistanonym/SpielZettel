import * as fs from "fs";
import * as path from "path";
import { createGenerator } from "ts-json-schema-generator";

// Configuration for the generator
const config = {
  path: path.join(
    import.meta.dirname,
    "..",
    "src",
    "app",
    "helper",
    "readSpielZettelFile.tsx",
  ),
  tsconfig: path.join(import.meta.dirname, "..", "tsconfig.json"),
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
  } catch (error: unknown) {
    console.error("Error generating JSON schema:", error);
    if (error && typeof error === "object" && "diagnostic" in error) {
      const diagnostic = (
        error as { diagnostic?: { relatedInformation?: unknown[] } }
      ).diagnostic;
      if (diagnostic?.relatedInformation) {
        console.error("Related info:", diagnostic.relatedInformation);
      }
    }
  }
}

// Run the script
generateSchema(
  path.join(import.meta.dirname, "..", "spielzettel-info-schema.json"),
);
