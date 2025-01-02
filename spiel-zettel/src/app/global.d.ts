interface LaunchParams {
    files: FileSystemHandle[];
}

interface LaunchQueue {
    setConsumer: (callback: (params: LaunchParams) => void) => void;
}

interface Window {
    launchQueue: LaunchQueue;
}
