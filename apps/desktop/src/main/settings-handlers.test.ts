import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let userDataPath = "";
let selectedWorkspace = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => userDataPath)
  },
  dialog: {
    showOpenDialog: vi.fn(async () => ({
      canceled: false,
      filePaths: [selectedWorkspace]
    }))
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    decryptString: vi.fn((buffer: Buffer) => buffer.toString("utf8")),
    encryptString: vi.fn((secret: string) => Buffer.from(secret, "utf8"))
  }
}));

describe("settings handlers", () => {
  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), "idris-settings-"));
    selectedWorkspace = await mkdtemp(join(tmpdir(), "idris-workspace-"));
  });

  it("preserves the selected workspace when saving a Gemini key", async () => {
    const { chooseWorkspaceRoot, getSettings, saveGeminiApiKey } = await import("./settings-handlers");

    await chooseWorkspaceRoot();
    await saveGeminiApiKey("test-key");

    expect(await getSettings()).toEqual({
      hasGeminiApiKey: true,
      workspaceRoot: selectedWorkspace
    });
  });
});
