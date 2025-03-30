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

/**
 * Attention: Most browsers only support image files in the PNG format!
 *
 * @param file File to be written to the clipboard
 * @returns True if successful
 */
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
