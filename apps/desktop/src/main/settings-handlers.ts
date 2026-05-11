import { app, dialog, safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppSettings } from "../shared/types";

type StoredSettings = {
  geminiApiKey?: string;
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

function encryptSecret(secret: string): Pick<StoredSettings, "geminiApiKey" | "encrypted"> {
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
  return {
    hasGeminiApiKey: Boolean(settings.geminiApiKey),
    workspaceRoot: settings.workspaceRoot ?? defaultWorkspaceRoot()
  };
}

export async function saveGeminiApiKey(apiKey: string): Promise<AppSettings> {
  const trimmed = apiKey.trim();
  const current = await readStoredSettings();

  if (!trimmed) {
    await writeStoredSettings({ workspaceRoot: current.workspaceRoot });
    return getSettings();
  }

  await writeStoredSettings({ ...current, ...encryptSecret(trimmed) });
  return getSettings();
}

export async function getGeminiApiKey(): Promise<string | null> {
  return decryptSecret(await readStoredSettings());
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
