import type {
  PackageDiagnostic,
  UIRManifest,
  UIRPackageData,
  UIRShard,
} from "./runtime";

export type FileWithPath = {
  file: File;
  path: string;
};

type WebkitFileSystemEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
};

type WebkitFileSystemFileEntry = WebkitFileSystemEntry & {
  file: (callback: (file: File) => void, error?: (error: DOMException) => void) => void;
};

type WebkitFileSystemDirectoryReader = {
  readEntries: (
    callback: (entries: WebkitFileSystemEntry[]) => void,
    error?: (error: DOMException) => void,
  ) => void;
};

type WebkitFileSystemDirectoryEntry = WebkitFileSystemEntry & {
  createReader: () => WebkitFileSystemDirectoryReader;
};

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => WebkitFileSystemEntry | null;
};

function normalizePath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

function isManifest(value: unknown): value is UIRManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<UIRManifest>;
  return (
    typeof candidate.formatVersion === "string" &&
    typeof candidate.packageId === "string" &&
    typeof candidate.packageVersion === "string" &&
    Array.isArray(candidate.model)
  );
}

async function sha256(file: File) {
  if (!globalThis.crypto?.subtle) return undefined;
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readFileEntry(entry: WebkitFileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => entry.file(resolve, reject));
}

function readDirectoryBatch(reader: WebkitFileSystemDirectoryReader) {
  return new Promise<WebkitFileSystemEntry[]>((resolve, reject) =>
    reader.readEntries(resolve, reject),
  );
}

async function readDirectoryEntries(entry: WebkitFileSystemDirectoryEntry) {
  const reader = entry.createReader();
  const entries: WebkitFileSystemEntry[] = [];
  for (;;) {
    const batch = await readDirectoryBatch(reader);
    if (!batch.length) break;
    entries.push(...batch);
  }
  return entries;
}

async function collectEntry(entry: WebkitFileSystemEntry): Promise<FileWithPath[]> {
  if (entry.isFile) {
    const file = await readFileEntry(entry as WebkitFileSystemFileEntry);
    return [{ file, path: normalizePath(entry.fullPath || file.name) }];
  }
  if (entry.isDirectory) {
    const children = await readDirectoryEntries(entry as WebkitFileSystemDirectoryEntry);
    const nested = await Promise.all(children.map(collectEntry));
    return nested.flat();
  }
  return [];
}

export function filesFromInput(files: FileList) {
  return [...files].map((file) => ({
    file,
    path: normalizePath(file.webkitRelativePath || file.name),
  }));
}

export async function filesFromDrop(dataTransfer: DataTransfer) {
  const items = [...dataTransfer.items] as DataTransferItemWithEntry[];
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is WebkitFileSystemEntry => Boolean(entry));
  if (entries.length) {
    const collected = await Promise.all(entries.map(collectEntry));
    return collected.flat();
  }
  return [...dataTransfer.files].map((file) => ({ file, path: file.name }));
}

export async function loadPackageFromFiles(files: FileWithPath[]): Promise<UIRPackageData> {
  const diagnostics: PackageDiagnostic[] = [];
  const jsonFiles = files.filter((item) => item.path.toLowerCase().endsWith(".json"));
  const parsed = new Map<string, unknown>();

  for (const item of jsonFiles) {
    try {
      parsed.set(item.path, JSON.parse(await item.file.text()));
    } catch {
      diagnostics.push({
        severity: "error",
        code: "json.invalid",
        message: "Invalid JSON",
        path: item.path,
      });
    }
  }

  const manifestCandidate = [...parsed.entries()]
    .filter(([path, value]) => path.endsWith("package.json") && isManifest(value))
    .sort(([a], [b]) => a.split("/").length - b.split("/").length)[0];

  if (!manifestCandidate) {
    throw new Error("No UIR package manifest found. Choose or drop the package directory that contains package.json.");
  }

  const [manifestPath, manifestValue] = manifestCandidate;
  const manifest = manifestValue as UIRManifest;
  const root = manifestPath.slice(0, -"package.json".length);
  const shards: Record<string, UIRShard> = {};

  diagnostics.push({
    severity: "success",
    code: "manifest.found",
    message: `Manifest ${manifest.packageId} · ${manifest.packageVersion}`,
    path: manifestPath,
  });

  if (manifest.formatVersion !== "1.0") {
    diagnostics.push({
      severity: "warning",
      code: "format.version",
      message: `Format ${manifest.formatVersion} is not the playground's reference 1.0 format. It will be read on a best-effort basis.`,
      path: manifestPath,
    });
  }

  for (const entry of manifest.model) {
    const expectedPath = normalizePath(`${root}${entry.path}`);
    const fileItem = files.find((item) => normalizePath(item.path) === expectedPath)
      ?? files.find((item) => normalizePath(item.path).endsWith(`/${normalizePath(entry.path)}`));
    const parsedShard = parsed.get(expectedPath)
      ?? [...parsed.entries()].find(([path]) => path.endsWith(`/${normalizePath(entry.path)}`))?.[1];

    if (!fileItem || !parsedShard || typeof parsedShard !== "object") {
      diagnostics.push({
        severity: "error",
        code: "model.missing",
        message: `Missing model collection ${entry.collection}`,
        path: entry.path,
      });
      continue;
    }

    shards[entry.collection] = parsedShard as UIRShard;
    if (entry.sha256) {
      const actual = await sha256(fileItem.file);
      if (!actual) {
        diagnostics.push({
          severity: "warning",
          code: "hash.unavailable",
          message: `SHA-256 could not be verified for ${entry.collection} in this browser context.`,
          path: entry.path,
        });
      } else if (actual !== entry.sha256.toLowerCase()) {
        diagnostics.push({
          severity: "error",
          code: "hash.mismatch",
          message: `SHA-256 mismatch for ${entry.collection}`,
          path: entry.path,
        });
      } else {
        diagnostics.push({
          severity: "success",
          code: "hash.verified",
          message: `Verified ${entry.collection}`,
          path: entry.path,
        });
      }
    }
  }

  const sourceName = root.replace(/\/$/, "").split("/").at(-1) || manifest.packageId;
  return { manifest, shards, sourceName, diagnostics };
}
