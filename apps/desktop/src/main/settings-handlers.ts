import { app, safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppSettings } from "../shared/types";

type StoredSettings = {
  geminiApiKey?: string;
  encrypted?: boolean;
};

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

async function readStoredSettings(): Promise<StoredSettings> {
  try {
    const raw = await readFile(settingsPath(), "utf8");
    return JSON.parse(raw) as StoredSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeStoredSettings(settings: StoredSettings): Promise<void> {
  const path = settingsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

function encryptSecret(secret: string): StoredSettings {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      geminiApiKey: safeStorage.encryptString(secret).toString("base64"),
      encrypted: true
    };
  }

  return { geminiApiKey: secret, encrypted: false };
}

function decryptSecret(settings: StoredSettings): string | null {
  if (!settings.geminiApiKey) {
    return null;
  }

  if (settings.encrypted) {
    return safeStorage.decryptString(Buffer.from(settings.geminiApiKey, "base64"));
  }

  return settings.geminiApiKey;
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await readStoredSettings();
  return { hasGeminiApiKey: Boolean(settings.geminiApiKey) };
}

export async function saveGeminiApiKey(apiKey: string): Promise<AppSettings> {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    await writeStoredSettings({});
    return { hasGeminiApiKey: false };
  }

  await writeStoredSettings(encryptSecret(trimmed));
  return { hasGeminiApiKey: true };
}

export async function getGeminiApiKey(): Promise<string | null> {
  return decryptSecret(await readStoredSettings());
}
