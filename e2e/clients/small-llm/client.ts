import { HttpTransport, expectOk, type TransportResponse } from "../http/transport";

// --- Request/Response Types ---

export type HealthResponse = {
  status: string;
};

export type StatusResponse = {
  model_downloaded: boolean;
  server_running: boolean;
  model_name: string;
  model_path: string;
  server_url: string;
};

export type ChatRequest = {
  message: string;
  history?: { role: string; content: string }[];
  context?: string;
};

export type ChatResponse = {
  response: string;
  tokens_used: number;
  model: string;
};

export type ChatWithObjectRequest = {
  message: string;
  schema: Record<string, unknown>;
  few_shot_examples?: Record<string, unknown>[];
};

export type ChatWithObjectResponse = {
  result: unknown;
  raw_response: string;
  tokens_used: number;
};

export type ChatWithToolsRequest = {
  message: string;
  tools?: string[];
  context?: string;
};

export type ToolCall = {
  tool: string;
  input: string;
  output: string;
};

export type ChatWithToolsResponse = {
  response: string;
  tool_calls: ToolCall[];
  tokens_used: number;
};

// --- Client ---

export type SmallLLMClientOptions = {
  baseUrl: string;
  inferenceTimeout?: number;
};

export const createSmallLLMClient = (opts: SmallLLMClientOptions) => {
  const transport = new HttpTransport(opts.baseUrl, opts.inferenceTimeout ?? 120_000);
  const healthTransport = new HttpTransport(opts.baseUrl, 5_000);

  return {
    transport,

    health: {
      check: async (): Promise<TransportResponse<HealthResponse>> =>
        healthTransport.get<HealthResponse>("/api/health"),
    },

    status: {
      get: async (): Promise<StatusResponse> =>
        expectOk(await transport.get<StatusResponse>("/api/status"), "GET /api/status"),
    },

    chat: {
      send: async (req: ChatRequest): Promise<ChatResponse> =>
        expectOk(
          await transport.post<ChatResponse>("/api/chat", req),
          "POST /api/chat"
        ),
    },

    chatWithObject: {
      extract: async (req: ChatWithObjectRequest): Promise<ChatWithObjectResponse> =>
        expectOk(
          await transport.post<ChatWithObjectResponse>("/api/chatwithobject", req),
          "POST /api/chatwithobject"
        ),
    },

    chatWithTools: {
      send: async (req: ChatWithToolsRequest): Promise<ChatWithToolsResponse> =>
        expectOk(
          await transport.post<ChatWithToolsResponse>("/api/chatwithtools", req),
          "POST /api/chatwithtools"
        ),
    },
  };
};
