export function changeThemeColor(color: string) {
  const themeMetaTag = document.querySelector('meta[name="theme-color"]');
  if (themeMetaTag) {
    themeMetaTag.setAttribute("content", color);
  } else {
    // Create the meta tag if it doesn't exist
    const newMetaTag = document.createElement("meta");
    newMetaTag.setAttribute("name", "theme-color");
    newMetaTag.setAttribute("content", color);
    document.head.appendChild(newMetaTag);
  }
}

export function getThemeColor(): string | null {
  const themeMetaTag = document.querySelector('meta[name="theme-color"]');
  return themeMetaTag ? themeMetaTag.getAttribute("content") : null;
}

export function resetThemeColor() {
  const themeMetaTag = document.querySelector('meta[name="theme-color"]');
  if (themeMetaTag) {
    themeMetaTag.remove();
  }
}
