export async function addTextToClipboard(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    console.warn(
      "Adding text to clipboard (navigator.clipboard) is not supported",
    );
  }
}
