// Direct fetch wrappers for the You.com API.
//
// The official @youdotcom-oss/sdk was verified against the live API and its request-building
// and auth logic are correct, but its generated Zod response schemas reject real, valid 200
// responses (over-strict on optional fields like `contents`). Calling the endpoints directly
// avoids that bug. Endpoints, headers, and auth (`X-API-Key`, not `Authorization: Bearer`) were
// confirmed by reading the SDK's own source and live-testing both calls with the real key.

const YDC_API_KEY = process.env.YDC_API_KEY;

function requireApiKey(): string {
  if (!YDC_API_KEY) {
    throw new Error("YDC_API_KEY environment variable is not set");
  }
  return YDC_API_KEY;
}

export type SearchWebResult = {
  url?: string;
  title?: string;
  description?: string;
  snippets?: string[];
};

export type SearchNewsResult = {
  url?: string;
  title?: string;
  description?: string;
  pageAge?: string;
};

export type SearchResponse = {
  results?: {
    web?: SearchWebResult[];
    news?: SearchNewsResult[];
  };
};

export async function youSearch(query: string, count = 5): Promise<SearchResponse> {
  const url = new URL("https://ydc-index.io/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("count", String(count));

  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-API-Key": requireApiKey() },
  });

  if (!res.ok) {
    throw new Error(`You.com search failed: ${res.status} ${await res.text()}`);
  }

  const raw = await res.json();
  return {
    results: {
      web: raw.results?.web?.map((w: Record<string, unknown>) => ({
        url: w.url,
        title: w.title,
        description: w.description,
        snippets: w.snippets,
      })),
      news: raw.results?.news?.map((n: Record<string, unknown>) => ({
        url: n.url,
        title: n.title,
        description: n.description,
        pageAge: n.page_age,
      })),
    },
  };
}

export type ResearchEffort = "lite" | "standard" | "deep" | "exhaustive";

export type ResearchSource = {
  url: string;
  title?: string;
  snippets?: string[];
};

export type ResearchResponse = {
  content: string;
  sources: ResearchSource[];
};

export async function youResearch(
  input: string,
  researchEffort: ResearchEffort = "standard",
): Promise<ResearchResponse> {
  const res = await fetch("https://api.you.com/v1/research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": requireApiKey(),
    },
    body: JSON.stringify({ input, research_effort: researchEffort }),
  });

  if (!res.ok) {
    throw new Error(`You.com research failed: ${res.status} ${await res.text()}`);
  }

  const raw = await res.json();
  return {
    content: raw.output.content,
    sources: raw.output.sources,
  };
}
