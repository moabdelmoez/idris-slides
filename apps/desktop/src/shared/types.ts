export type AppSettings = {
  hasGeminiApiKey: boolean;
  hasTavilyApiKey?: boolean;
  workspaceRoot?: string;
};

export type GenerationModeName =
  | "simple_direct"
  | "brief_needed"
  | "file_grounded"
  | "research_confirm"
  | "deck_outline"
  | "slide_codegen";

export type GenerationMode = {
  mode: GenerationModeName;
  confidence: "low" | "medium" | "high";
  requiredQuestion?: string;
  researchRecommendation?: string;
  estimatedCostTier?: "none" | "low" | "medium" | "high";
};

export type ResearchSource = {
  title: string;
  url: string;
  score?: number;
  content?: string;
};

export type ResearchBrief = {
  query: string;
  answer?: string;
  facts: string[];
  implications: string[];
  sources: ResearchSource[];
  usageCredits?: number;
  generatedAt: string;
};

export type GenerateOutlineOptions = {
  useWebResearch?: boolean;
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
  researchPrompt?: string;
};

export type PreviewSessionInfo = {
  projectId: string;
  url: string;
  slideModuleUrl: string;
};
