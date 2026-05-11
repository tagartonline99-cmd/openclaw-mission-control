import { invoke, isTauri } from "@tauri-apps/api/core";

export type TavilySecretStatus = {
  configured: boolean;
  maskedApiKey?: string | null;
  source: string;
  message: string;
};

export type TavilySearchInput = {
  query: string;
  searchDepth?: "basic" | "advanced";
  maxResults?: number;
  includeAnswer?: boolean;
  timeoutSeconds?: number;
};

export type TavilySearchResponse = {
  ok: boolean;
  query: string;
  answer?: string | null;
  results: Array<{
    title: string;
    url: string;
    content: string;
    rawContent?: string | null;
    score?: number | null;
    publishedDate?: string | null;
  }>;
  usageCredits?: number | null;
  error?: string | null;
  searchedAt: string;
};

export type TavilyExtractInput = {
  urls: string[];
  timeoutSeconds?: number;
};

export type TavilyExtractResponse = {
  ok: boolean;
  results: Array<{
    url: string;
    title?: string | null;
    rawContent?: string | null;
    content?: string | null;
    excerpt?: string | null;
    error?: string | null;
  }>;
  usageCredits?: number | null;
  error?: string | null;
  extractedAt: string;
};

function isTauriRuntime() {
  return isTauri() || (typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window));
}

function nowIso() {
  return new Date().toISOString();
}

const fallbackSources = [
  {
    title: "Indie Hackers productized services discussion",
    url: "https://www.indiehackers.com/products",
    content:
      "Founders discuss productized service ideas, validation, pricing, and small audience testing before investing in a build.",
    score: 0.82,
  },
  {
    title: "GitHub Pages documentation",
    url: "https://docs.github.com/en/pages",
    content:
      "GitHub Pages supports free static site hosting for public repositories, useful for zero-budget landing page validation.",
    score: 0.78,
  },
  {
    title: "Google Trends explore",
    url: "https://trends.google.com/trends/explore",
    content:
      "Public trend exploration can compare rising interest for topics such as AI workflows, Notion templates, and freelancer tools.",
    score: 0.74,
  },
  {
    title: "Reddit public search for freelancer AI workflows",
    url: "https://www.reddit.com/search/?q=freelancer%20AI%20workflow",
    content:
      "Public community results can reveal pain points and recurring questions, but claims need manual validation and duplicate-source checks.",
    score: 0.7,
  },
  {
    title: "Fiverr public AI services category",
    url: "https://www.fiverr.com/categories/programming-tech/ai-services",
    content:
      "Marketplace category pages can show service positioning, but protected challenge pages are invalid evidence if the page is not readable.",
    score: 0.62,
  },
  {
    title: "Notion templates gallery",
    url: "https://www.notion.so/templates",
    content:
      "Template galleries show common categories and packaging patterns for productivity, creator, and small-business templates.",
    score: 0.69,
  },
];

export const tavilyService = {
  async getSecretStatus(): Promise<TavilySecretStatus> {
    if (!isTauriRuntime()) {
      return {
        configured: false,
        maskedApiKey: null,
        source: "browser-preview",
        message: "Browser preview uses simulated Tavily results. Desktop stores the real API key locally.",
      };
    }
    return invoke<TavilySecretStatus>("tavily_secret_status");
  },

  async saveApiKey(apiKey: string): Promise<TavilySecretStatus> {
    if (!isTauriRuntime()) {
      return {
        configured: true,
        maskedApiKey: "demo...key",
        source: "browser-preview",
        message: "Browser preview accepted the key locally for UI testing only.",
      };
    }
    return invoke<TavilySecretStatus>("tavily_save_api_key", { request: { apiKey } });
  },

  async testConnection(): Promise<TavilySearchResponse> {
    if (!isTauriRuntime()) {
      return this.search({ query: "online business validation research", maxResults: 1 });
    }
    return invoke<TavilySearchResponse>("tavily_test_connection");
  },

  async search(input: TavilySearchInput): Promise<TavilySearchResponse> {
    if (!isTauriRuntime()) {
      const lower = input.query.toLowerCase();
      const ranked = fallbackSources
        .map((source) => ({
          ...source,
          score:
            source.score +
            (lower.includes("fiverr") && source.url.includes("fiverr") ? 0.2 : 0) +
            (lower.includes("template") && source.url.includes("notion") ? 0.08 : 0) +
            (lower.includes("freelancer") && source.title.toLowerCase().includes("freelancer") ? 0.08 : 0),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, input.maxResults ?? 5);
      return {
        ok: true,
        query: input.query,
        answer: "Browser preview generated a Tavily-shaped source packet for UI and Playwright tests.",
        results: ranked,
        usageCredits: input.searchDepth === "advanced" ? 2 : 1,
        error: null,
        searchedAt: nowIso(),
      };
    }
    return invoke<TavilySearchResponse>("tavily_search", { request: input });
  },

  async extract(input: TavilyExtractInput): Promise<TavilyExtractResponse> {
    if (!isTauriRuntime()) {
      return {
        ok: true,
        results: input.urls.map((url) => {
          const source = fallbackSources.find((item) => item.url === url);
          const isFiverr = url.includes("fiverr.com");
          return {
            url,
            title: source?.title ?? "Public source",
            rawContent: isFiverr
              ? "Fiverr marketplace category context. It needs a human touch. Loading challenge. This browser-preview source simulates an anti-bot challenge so FactCheck can exclude it instead of using it as proof."
              : `${source?.content ?? "Readable public source content."} Evidence should be cited and checked for weak claims.`,
            content: source?.content ?? "Readable public source content.",
            excerpt: source?.content ?? "Readable public source content.",
            error: null,
          };
        }),
        usageCredits: Math.max(1, input.urls.length),
        error: null,
        extractedAt: nowIso(),
      };
    }
    return invoke<TavilyExtractResponse>("tavily_extract", { request: input });
  },
};
