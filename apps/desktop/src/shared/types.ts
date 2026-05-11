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

export type DiagramType =
  | "architecture"
  | "er"
  | "flowchart"
  | "layers"
  | "nested"
  | "pyramid"
  | "quadrant"
  | "sequence"
  | "state"
  | "swimlane"
  | "timeline"
  | "tree"
  | "venn";

export type DiagramNodeRole = "backend" | "external" | "focal" | "input" | "optional" | "store";

export type DiagramNode = {
  id: string;
  label: string;
  role?: DiagramNodeRole;
  sublabel?: string;
  items?: string[];
  lane?: string;
  level?: number;
  radius?: number;
  x?: number;
  y?: number;
};

export type DiagramConnection = {
  from: string;
  to: string;
  cardinalityFrom?: string;
  cardinalityTo?: string;
  kind?: "call" | "handoff" | "relationship" | "return" | "self" | "transition";
  label?: string;
  tone?: "accent" | "default" | "link";
};

export type DiagramSpec = {
  type: DiagramType;
  variant?: "consultant";
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
