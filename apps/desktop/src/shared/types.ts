export type AppSettings = {
  hasGeminiApiKey: boolean;
  workspaceRoot?: string;
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

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  outline?: DeckOutline;
};

export type PreviewSessionInfo = {
  projectId: string;
  url: string;
  slideModuleUrl: string;
};
