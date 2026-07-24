// Direct fetch wrappers for the You.com API.
//
// The official @youdotcom-oss/sdk was verified against the live API and its request-building
// and auth logic are correct, but its generated Zod response schemas reject real, valid 200
// responses (over-strict on optional fields like `contents`). Calling the endpoints directly
// avoids that bug. Endpoints, headers, and auth (`X-API-Key`, not `Authorization: Bearer`) were
// confirmed by reading the SDK's own source and live-testing both calls with the real key.

function requireApiKey(): string {
  // Read per call, not at module load — serverless environments can execute the module
  // body before env vars are injected, which would otherwise bake in `undefined` forever.
  const key = process.env.YDC_API_KEY;
  if (!key) {
    throw new Error("YDC_API_KEY environment variable is not set");
  }
  return key;
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

export type SearchOptions = {
  query: string;
  count?: number;
  freshness?: string;
  country?: string;
  language?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
};

export async function youSearch(options: SearchOptions): Promise<SearchResponse> {
  const { query, count = 5, freshness, country, language, includeDomains, excludeDomains } = options;

  const url = new URL("https://ydc-index.io/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("count", String(count));
  if (freshness) url.searchParams.set("freshness", freshness);
  if (country) url.searchParams.set("country", country);
  if (language) url.searchParams.set("language", language);
  if (includeDomains?.length) url.searchParams.set("include_domains", includeDomains.join(","));
  if (excludeDomains?.length) url.searchParams.set("exclude_domains", excludeDomains.join(","));

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

export type ContentsResult = {
  url?: string;
  title?: string;
  markdown?: string | null;
};

export async function youContents(
  urls: string[],
  crawlTimeout = 10,
): Promise<ContentsResult[]> {
  const res = await fetch("https://ydc-index.io/v1/contents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": requireApiKey(),
    },
    body: JSON.stringify({
      urls,
      formats: ["markdown"],
      crawl_timeout: crawlTimeout,
    }),
  });

  if (!res.ok) {
    throw new Error(`You.com contents failed: ${res.status} ${await res.text()}`);
  }

  const raw = await res.json();
  return (raw as Array<Record<string, unknown>>).map((r) => ({
    url: r.url as string | undefined,
    title: r.title as string | undefined,
    markdown: r.markdown as string | null | undefined,
  }));
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

export type ResearchSourceControl = {
  includeDomains?: string[];
  excludeDomains?: string[];
  boostDomains?: string[];
  freshness?: string;
  country?: string;
};

export type ResearchOptions = {
  input: string;
  researchEffort?: ResearchEffort;
  sourceControl?: ResearchSourceControl;
  outputSchema?: Record<string, unknown>;
};

const MAX_DOMAINS = 500;

function buildSourceControlBody(sourceControl: ResearchSourceControl | undefined) {
  if (!sourceControl) return undefined;
  const { includeDomains, excludeDomains, boostDomains, freshness, country } = sourceControl;

  if (boostDomains?.length && includeDomains?.length) {
    throw new Error("source_control: boostDomains and includeDomains are mutually exclusive");
  }
  for (const [name, domains] of [
    ["includeDomains", includeDomains],
    ["excludeDomains", excludeDomains],
    ["boostDomains", boostDomains],
  ] as const) {
    if (domains && domains.length > MAX_DOMAINS) {
      throw new Error(`source_control: ${name} exceeds the maximum of ${MAX_DOMAINS} domains`);
    }
  }

  const body: Record<string, unknown> = {};
  // Arrays stay as arrays here (POST body), unlike youSearch's comma-joined query params.
  if (includeDomains?.length) body.include_domains = includeDomains;
  if (excludeDomains?.length) body.exclude_domains = excludeDomains;
  if (boostDomains?.length) body.boost_domains = boostDomains;
  if (freshness) body.freshness = freshness;
  if (country) body.country = country;
  return Object.keys(body).length ? body : undefined;
}

export async function youResearch(options: ResearchOptions): Promise<ResearchResponse> {
  const { input, researchEffort = "standard", sourceControl, outputSchema } = options;

  if (outputSchema && researchEffort === "lite") {
    throw new Error("youResearch: outputSchema is not supported with researchEffort \"lite\"");
  }

  const body: Record<string, unknown> = { input, research_effort: researchEffort };
  const sourceControlBody = buildSourceControlBody(sourceControl);
  if (sourceControlBody) body.source_control = sourceControlBody;
  if (outputSchema) body.output_schema = outputSchema;

  const res = await fetch("https://api.you.com/v1/research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": requireApiKey(),
    },
    body: JSON.stringify(body),
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

// Structured variant: when outputSchema is supplied, the API returns content_type: "object"
// and `content` as a real object — but we defensively handle the case where it comes back
// as a JSON string anyway, since that's the shape of the non-schema response.
export async function youResearchStructured<T>(
  options: ResearchOptions & { outputSchema: Record<string, unknown> },
): Promise<{ data: T; sources: ResearchSource[] }> {
  const result = await youResearch(options);

  if (typeof result.content === "string") {
    try {
      return { data: JSON.parse(result.content) as T, sources: result.sources };
    } catch {
      throw new Error(
        "youResearchStructured: expected structured object content but got a non-JSON string",
      );
    }
  }

  return { data: result.content as unknown as T, sources: result.sources };
}

// Builds a strict JSON Schema object suitable for `outputSchema` — the You.com research API
// requires additionalProperties: false on every object and every property listed as required.
// If a property value is itself an object schema, build it with this same helper (or by hand
// following the same rule) so nested objects are strict too.
export function strictObjectSchema(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}
