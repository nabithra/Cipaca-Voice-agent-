import type { StorageAdapter } from "@/lib/storage-adapter/types";
import { jsonStorageAdapter } from "@/lib/storage-adapter/json-adapter";
import {
  isPostgresConfigured,
  postgresStorageAdapter,
} from "@/lib/storage-adapter/postgres-adapter";

let adapter: StorageAdapter = resolveAdapter();

function resolveAdapter(): StorageAdapter {
  if (isPostgresConfigured()) {
    return postgresStorageAdapter;
  }
  return jsonStorageAdapter;
}

export function getStorageAdapter(): StorageAdapter {
  return adapter;
}

export function setStorageAdapter(next: StorageAdapter): void {
  adapter = next;
}

export async function isStorageWritable(): Promise<boolean> {
  return getStorageAdapter().isWritable();
}

export { isPostgresConfigured };
