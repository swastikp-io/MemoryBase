export type PlayYouTubeIntent = {
  action: "play_youtube";
  query: string;
};

export type SearchLinkedInIntent = {
  action: "search_linkedin";
  query: string;
};

export type BrowserIntent = PlayYouTubeIntent | SearchLinkedInIntent;

export type BrowserExecutionResult = {
  success: boolean;
  code?: string;
  message?: string;
  url?: string;
};
