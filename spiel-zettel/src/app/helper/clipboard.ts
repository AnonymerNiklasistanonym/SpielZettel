export async function addTextToClipboard(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    console.warn(
      "Adding text to clipboard (navigator.clipboard) is not supported",
    );
  }
}

export async function copyFileToClipboard(file: File) {
  if (navigator.clipboard) {
    await navigator.clipboard.write([
      new ClipboardItem({
        [file.type]: file,
      }),
    ]);
  } else {
    console.warn(
      "Adding file to clipboard (navigator.clipboard) is not supported",
    );
  }
}
