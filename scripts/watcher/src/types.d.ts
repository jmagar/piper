// Type declarations for modules without type definitions

declare module 'glob' {
  export function glob(pattern: string, options?: any): Promise<string[]>;
}

declare module 'file-type' {
  export function fileTypeFromFile(filePath: string): Promise<{mime: string} | undefined>;
}

declare module '@xenova/transformers' {
  // The main exported pipeline function
  export function pipeline(task: string, model: string, options?: any): Promise<any>;
  
  // Other exports that might be in the transformers namespace
  export const transformers: {
    importModule(moduleName: string): Promise<any>;
  };
}

declare module 'axios' {
  interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: any;
  }
  
  const axios: {
    post: <T = any>(url: string, data?: any, config?: any) => Promise<AxiosResponse<T>>;
    isAxiosError: (error: any) => boolean;
  };
  
  export default axios;
}

declare module 'dotenv' {
  export function config(options?: { path?: string }): void;
}

declare module 'chokidar' {
  export interface WatchOptions {
    ignored?: string | RegExp | Array<string | RegExp>;
    persistent?: boolean;
    ignoreInitial?: boolean;
    followSymlinks?: boolean;
    cwd?: string;
    disableGlobbing?: boolean;
    usePolling?: boolean;
    interval?: number;
    binaryInterval?: number;
    awaitWriteFinish?: boolean | { stabilityThreshold?: number; pollInterval?: number };
    ignorePermissionErrors?: boolean;
    atomic?: boolean | number;
  }

  export interface FSWatcher {
    on(event: 'add' | 'addDir' | 'change', listener: (path: string) => void): this;
    on(event: 'all', listener: (eventName: string, path: string) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'ready', listener: () => void): this;
    on(event: 'unlink' | 'unlinkDir', listener: (path: string) => void): this;
    
    add(paths: string | string[]): this;
    close(): Promise<void>;
    getWatched(): Record<string, string[]>;
    unwatch(paths: string | string[]): this;
  }

  export function watch(paths: string | string[], options?: WatchOptions): FSWatcher;
}

declare module 'deep-equal' {
  export default function deepEqual(a: any, b: any, opts?: any): boolean;
}

declare module 'diff' {
  export function diffLines(oldStr: string, newStr: string, options?: any): Array<{
    value: string;
    added?: boolean;
    removed?: boolean;
  }>;
}

declare module 'ascii-tree' {
  export default {
    generate: (tree: string) => string
  };
}
