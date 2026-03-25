import { describe, test, expect, beforeAll, setDefaultTimeout } from "bun:test";

setDefaultTimeout(120_000);
import { getConfig } from "../../config";
import { createSmallLLMClient } from "../../clients/small-llm/client";
import { loadTestData, type CollectedTestData } from "../../utils/test-data";

const config = getConfig();
const client = createSmallLLMClient({
  baseUrl: config.api.baseUrl,
  inferenceTimeout: config.timeouts.inference,
});
let testData: CollectedTestData;

beforeAll(async () => {
  testData = await loadTestData(config.generatedDataFile);
  expect(testData.serverReady).toBe(true);
});

describe("chat smoke", () => {
  test("POST /api/chat — simple question gets a response", async () => {
    const result = await client.chat.send({
      message: "What is 2 + 2? Reply with just the number.",
    });

    expect(result.response).toBeTruthy();
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.tokens_used).toBeGreaterThan(0);
    expect(result.model).toBeTruthy();
  });

  test("POST /api/chat — with context uses provided context", async () => {
    const result = await client.chat.send({
      message: "What is the company name?",
      context: "The company is called SmallLLM Corp. It was founded in 2025.",
    });

    expect(result.response).toBeTruthy();
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.tokens_used).toBeGreaterThan(0);
  });

  test("POST /api/chat — with history maintains conversation", async () => {
    const result = await client.chat.send({
      message: "What did I just say?",
      history: [
        { role: "user", content: "My favorite color is blue." },
        { role: "assistant", content: "That's nice! Blue is a great color." },
      ],
    });

    expect(result.response).toBeTruthy();
    expect(result.tokens_used).toBeGreaterThan(0);
  });

  test("POST /api/chat — empty message returns 400", async () => {
    const res = await client.transport.post("/api/chat", { message: "" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /api/chat — missing message field returns 400", async () => {
    const res = await client.transport.post("/api/chat", {});
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
