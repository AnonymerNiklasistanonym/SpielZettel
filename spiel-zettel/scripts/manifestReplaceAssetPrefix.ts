import fs from 'fs';
import path from 'path';

// Configuration
const BUILD_DIR = './build'; // Path to the build directory
const MANIFEST_FILE = path.join(BUILD_DIR, 'manifest.json');
const ASSET_PREFIX = process.env.CUSTOM_ASSET_PREFIX || '';

// Function to replace CUSTOM_ASSET_PREFIX in the manifest.json
function updateManifestFile() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error(`File not found: ${MANIFEST_FILE}`);
    return;
  }

  try {
    // Read the manifest.json file
    const content = fs.readFileSync(MANIFEST_FILE, 'utf-8');

    // Replace CUSTOM_ASSET_PREFIX with the environment variable or empty string
    const updatedContent = content.replace(/CUSTOM_ASSET_PREFIX/g, ASSET_PREFIX);

    // Write the updated content back to manifest.json
    fs.writeFileSync(MANIFEST_FILE, updatedContent, 'utf-8');
    console.log(`Updated ${MANIFEST_FILE} successfully.`);
  } catch (error) {
    console.error(`Error updating ${MANIFEST_FILE}:`, error);
  }
}

// Run the function
updateManifestFile();
