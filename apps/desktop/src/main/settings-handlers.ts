import { app, dialog, safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppSettings } from "../shared/types";

type StoredSettings = {
  geminiApiKey?: string;
  tavilyApiKey?: string;
  encrypted?: boolean;
  workspaceRoot?: string;
};

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

export function defaultWorkspaceRoot(): string {
  return join(app.getPath("userData"), "projects");
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

function encryptSecret(secret: string): { secret: string; encrypted: boolean } {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      secret: safeStorage.encryptString(secret).toString("base64"),
      encrypted: true
    };
  }

  return { secret, encrypted: false };
}

function decryptSecret(secret: string | undefined, encrypted: boolean | undefined): string | null {
  if (!secret) {
    return null;
  }

  if (encrypted) {
    return safeStorage.decryptString(Buffer.from(secret, "base64"));
  }

  return secret;
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await readStoredSettings();
  return {
    hasGeminiApiKey: Boolean(settings.geminiApiKey),
    hasTavilyApiKey: Boolean(settings.tavilyApiKey),
    workspaceRoot: settings.workspaceRoot ?? defaultWorkspaceRoot()
  };
}

export async function saveGeminiApiKey(apiKey: string): Promise<AppSettings> {
  const trimmed = apiKey.trim();
  const current = await readStoredSettings();

  if (!trimmed) {
    await writeStoredSettings({
      tavilyApiKey: current.tavilyApiKey,
      encrypted: current.encrypted,
      workspaceRoot: current.workspaceRoot
    });
    return getSettings();
  }

  const encrypted = encryptSecret(trimmed);
  await writeStoredSettings({
    ...current,
    geminiApiKey: encrypted.secret,
    encrypted: encrypted.encrypted
  });
  return getSettings();
}

export async function getGeminiApiKey(): Promise<string | null> {
  const settings = await readStoredSettings();
  return decryptSecret(settings.geminiApiKey, settings.encrypted);
}

export async function saveTavilyApiKey(apiKey: string): Promise<AppSettings> {
  const trimmed = apiKey.trim();
  const current = await readStoredSettings();

  if (!trimmed) {
    await writeStoredSettings({
      geminiApiKey: current.geminiApiKey,
      encrypted: current.encrypted,
      workspaceRoot: current.workspaceRoot
    });
    return getSettings();
  }

  const encrypted = encryptSecret(trimmed);
  await writeStoredSettings({
    ...current,
    tavilyApiKey: encrypted.secret,
    encrypted: encrypted.encrypted
  });
  return getSettings();
}

export async function getTavilyApiKey(): Promise<string | null> {
  const settings = await readStoredSettings();
  return decryptSecret(settings.tavilyApiKey, settings.encrypted);
}

export async function getWorkspaceRoot(): Promise<string> {
  return (await getSettings()).workspaceRoot ?? defaultWorkspaceRoot();
}

export async function chooseWorkspaceRoot(): Promise<AppSettings> {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "Choose Idris Slides workspace"
  });

  if (result.canceled || !result.filePaths[0]) {
    return getSettings();
  }

  const current = await readStoredSettings();
  await mkdir(result.filePaths[0], { recursive: true });
  await writeStoredSettings({ ...current, workspaceRoot: result.filePaths[0] });
  return getSettings();
}
