export type AppSettings = {
  hasGeminiApiKey: boolean;
};

export type DeckOutlineSlide = {
  title: string;
  content?: string;
  goal: string;
  layout: string;
  visualDirection: string;
};

export type DeckOutline = {
  title: string;
  summary: string;
  slides: DeckOutlineSlide[];
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
