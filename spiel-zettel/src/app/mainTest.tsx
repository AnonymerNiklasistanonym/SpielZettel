'use client'

import { useEffect, useState } from "react";
import JSZip from "jszip";

export function MainTest() {

  useEffect(() => {
    if ("launchQueue" in window) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) return;

        for (const fileHandle of launchParams.files) {
          const file = await fileHandle.getFile();
          console.log("File received:", file);

          if (file.name.endsWith(".myapp")) {
            alert(`File "${file.name}" opened successfully!`);
          } else {
            alert("Unsupported file type.");
          }
        }
      });
    }
  }, []);

  const [imageSrc, setImageSrc] = useState<string|null>(null);
  const [jsonData, setJsonData] = useState<string|null>(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const zip = new JSZip();
    try {
      const zipContent = await zip.loadAsync(file);

      // Find and process the image file
      const imageFileName = Object.keys(zipContent.files).find((name) =>
        name.match(/\.(jpg|jpeg|png|gif)$/i)
      );
      if (imageFileName) {
        const imageData = await zipContent.files[imageFileName].async("base64");
        setImageSrc(`data:image/*;base64,${imageData}`);
      }

      // Find and process the JSON file
      const jsonFileName = Object.keys(zipContent.files).find((name) =>
        name.match(/\.json$/i)
      );
      if (jsonFileName) {
        const jsonText = await zipContent.files[jsonFileName].async("text");
        setJsonData(JSON.parse(jsonText));
      }
    } catch (error) {
      console.error("Error processing ZIP file:", error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Upload ZIP File</h1>
        <input type="file" accept=".spielzettel" onChange={handleFileUpload} />
        {imageSrc && <img src={imageSrc} alt="Extracted" style={{ maxWidth: "100%" }} />}
        {jsonData && (
          <div>
            <h3>Extracted JSON Data:</h3>
            <pre>{JSON.stringify(jsonData, null, 2)}</pre>
          </div>
        )}
      </header>
    </div>
  );
}
