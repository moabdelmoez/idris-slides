export type ProjectId = string;

export type ProjectMetadata = {
  id: ProjectId;
  name: string;
  createdAt: string;
  updatedAt: string;
  deckPath: string;
  exports: ProjectExport[];
  sourcePrompt?: string;
  lastEditPrompt?: string;
  outline?: DeckOutline;
  slideCount?: number;
  slideDirName?: string;
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

export type DeckOutlineSlide = {
  title: string;
  content?: string;
  goal: string;
  layout: string;
  visualDirection: string;
  diagram?: DiagramSpec;
};

export type DeckOutline = {
  title: string;
  summary: string;
  slides: DeckOutlineSlide[];
};

export type DiagramType = "architecture" | "flowchart" | "timeline" | "quadrant" | "pyramid";

export type DiagramNodeRole = "backend" | "external" | "focal" | "input" | "optional" | "store";

export type DiagramNode = {
  id: string;
  label: string;
  role?: DiagramNodeRole;
  sublabel?: string;
};

export type DiagramConnection = {
  from: string;
  to: string;
  label?: string;
  tone?: "accent" | "default" | "link";
};

export type DiagramSpec = {
  type: DiagramType;
  nodes: DiagramNode[];
  connections?: DiagramConnection[];
};

export type CreateProjectFromOutlineInput = {
  workspaceRoot: string;
  prompt: string;
  outline: DeckOutline;
};

export type ApplyDeckOutlineInput = {
  project: ProjectMetadata;
  outline: DeckOutline;
  editPrompt: string;
};

export type CommandRunner = {
  run(command: string, args: string[], options: { cwd: string }): Promise<void>;
};

export type PreviewSession = {
  projectId: ProjectId;
  url: string;
  stop(): Promise<void>;
};
