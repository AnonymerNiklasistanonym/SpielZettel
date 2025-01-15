/** PWA helper definitions */

interface LaunchParams {
  /** Files that were opened using the PWA when installed */
  files: FileSystemHandle[];
}

interface LaunchQueue {
  setConsumer: (callback: (params: LaunchParams) => void) => void;
}

interface Window {
  launchQueue: LaunchQueue;
}
