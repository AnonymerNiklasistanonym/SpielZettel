export const shareOrDownloadFile = async (file: File, fileObjectUrl: string, fileName: string, title: string, text?: string) => {
  if (navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
    } catch (error) {
      console.error("Error sharing file", error);
      downloadFile(fileObjectUrl, fileName);
    }
  } else {
    console.warn("Web Share API not supported on this device. Falling back to download.");
    downloadFile(fileObjectUrl, fileName);
  }
}

export const downloadFile = (fileObjectUrl: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = fileObjectUrl;
  link.download = fileName;
  link.click();
}
