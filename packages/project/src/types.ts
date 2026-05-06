export type ProjectId = string;

export type ProjectMetadata = {
  id: ProjectId;
  name: string;
  createdAt: string;
  updatedAt: string;
  deckPath: string;
  exports: ProjectExport[];
};

export type ProjectExport = {
  id: string;
  kind: "pdf" | "html";
  path: string;
  createdAt: string;
};

export type CreateProjectInput = {
  name: string;
  workspaceRoot: string;
};

export type CommandRunner = {
  run(command: string, args: string[], options: { cwd: string }): Promise<void>;
};

export type PreviewSession = {
  projectId: ProjectId;
  url: string;
  stop(): Promise<void>;
};
