export async function addTextToClipboard(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  } else {
    console.warn(
      "Adding text to clipboard (navigator.clipboard) is not supported",
    );
    return false;
  }
}

export async function addFileToClipboard(file: File) {
  if (navigator.clipboard) {
    await navigator.clipboard.write([
      new ClipboardItem({
        [file.type]: file,
      }),
    ]);
    return true;
  } else {
    console.warn(
      "Adding file to clipboard (navigator.clipboard) is not supported",
    );
    return false;
  }
}
