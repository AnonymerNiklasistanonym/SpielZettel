const getMaterialIconUrl = (name: string) =>
  `./icons/material/${name}_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg`;

export const iconMaterialAdd = getMaterialIconUrl("add");
export const iconMaterialBack = getMaterialIconUrl("arrow_back");
export const iconMaterialClipboard = getMaterialIconUrl("content_paste");
export const iconMaterialClose = getMaterialIconUrl("close");
export const iconMaterialDelete = getMaterialIconUrl("delete");
export const iconMaterialDeleteSweep = getMaterialIconUrl("delete_sweep");
export const iconMaterialDownload = getMaterialIconUrl("download");
export const iconMaterialFullscreen = getMaterialIconUrl("fullscreen");
export const iconMaterialFullscreenExit = getMaterialIconUrl("fullscreen_exit");
export const iconMaterialHome = getMaterialIconUrl("home");
export const iconMaterialLink = getMaterialIconUrl("link");
export const iconMaterialMenu = getMaterialIconUrl("menu");
export const iconMaterialRedo = getMaterialIconUrl("redo");
export const iconMaterialSearch = getMaterialIconUrl("search");
export const iconMaterialShare = getMaterialIconUrl("share");
export const iconMaterialSwapHorizontal = getMaterialIconUrl("swap_horiz");
export const iconMaterialUndo = getMaterialIconUrl("undo");

export const getFlagIconUrl = (locale: string) => `./icons/flags/${locale}.svg`;
