/**
 * webllm.js — browser-side LLM inference using @mlc-ai/web-llm
 *
 * Mirrors the Go backend's three endpoints:
 *   browserChat           → POST /api/chat
 *   browserChatWithObject → POST /api/chatwithobject
 *   browserChatWithTools  → POST /api/chatwithtools
 *
 * The Qwen 0.5B model is downloaded once by the browser and cached in
 * the browser's Cache Storage (just like the Go backend caches in ~/.small-llm/).
 */

import * as webllm from '@mlc-ai/web-llm';

export const MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';

// Singleton engine — created once per page session
let engine = null;
let initPromise = null;

/**
 * Initialize (or reuse) the WebLLM engine.
 * @param {(progress: {text:string, progress:number}) => void} onProgress
 */
export async function initEngine(onProgress) {
  if (engine) return engine;
  if (initPromise) return initPromise;

  initPromise = webllm.CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (p) => onProgress?.(p),
  });

  engine = await initPromise;
  return engine;
}

/** True if the engine is already loaded */
export function isEngineReady() {
  return engine !== null;
}

/** Reset (for testing / re-init) */
export function resetEngine() {
  engine = null;
  initPromise = null;
}

// ---------------------------------------------------------------------------
// Internal helper — wraps engine.chat.completions.create
// ---------------------------------------------------------------------------
async function complete(messages, { temperature = 0.7, maxTokens = 1024 } = {}) {
  if (!engine) throw new Error('WebLLM engine not initialised. Call initEngine() first.');
  const res = await engine.chat.completions.create({
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  });
  return {
    content: res.choices[0].message.content,
    tokens_used: res.usage?.total_tokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Browser-side tool registry (mirrors backend/tools/tools.go)
// ---------------------------------------------------------------------------
const TOOL_DESCRIPTIONS = {
  calculator: 'calculator(expr) – evaluates a basic arithmetic expression (e.g. 15*7, 100/4, 2^8)',
  datetime:   "datetime() – returns today's date and current UTC time",
  weather:    'weather(city) – returns a mock weather report for the given city',
};

function evalExpr(expr) {
  expr = expr.replace(/\s+/g, '');
  const n = Number(expr);
  if (!Number.isNaN(n)) return n;

  // +/- (lowest precedence, scan right-to-left)
  for (let i = expr.length - 1; i > 0; i--) {
    const c = expr[i];
    if (c === '+' || c === '-') {
      const L = evalExpr(expr.slice(0, i));
      const R = evalExpr(expr.slice(i + 1));
      return c === '+' ? L + R : L - R;
    }
  }
  // */
  for (let i = expr.length - 1; i > 0; i--) {
    const c = expr[i];
    if (c === '*' || c === '/') {
      const L = evalExpr(expr.slice(0, i));
      const R = evalExpr(expr.slice(i + 1));
      if (c === '/' && R === 0) throw new Error('division by zero');
      return c === '*' ? L * R : L / R;
    }
  }
  // ^
  for (let i = expr.length - 1; i > 0; i--) {
    if (expr[i] === '^') {
      return Math.pow(evalExpr(expr.slice(0, i)), evalExpr(expr.slice(i + 1)));
    }
  }
  throw new Error(`Cannot evaluate: ${expr}`);
}

const TOOLS = {
  calculator(input) {
    const result = evalExpr(input.trim());
    return Number.isInteger(result) ? String(result) : result.toFixed(10).replace(/\.?0+$/, '');
  },
  datetime() {
    const now = new Date();
    return `Date: ${now.toISOString().slice(0, 10)}, Time: ${now.toUTCString().slice(17, 25)} UTC`;
  },
  weather(city) {
    const c = city?.trim() || 'Unknown';
    return `Weather in ${c}: 22°C, partly cloudy, humidity 65%`;
  },
};

function runTool(name, input) {
  if (!TOOLS[name]) throw new Error(`Unknown tool: ${name}`);
  return TOOLS[name](input);
}

// ---------------------------------------------------------------------------
// Public API — mirrors the three Go endpoints
// ---------------------------------------------------------------------------

/**
 * POST /api/chat equivalent — conversational chat.
 */
export async function browserChat(message, history = [], context = '') {
  const messages = [];
  if (context) messages.push({ role: 'system', content: context });
  history.forEach((m) => messages.push({ role: m.role, content: String(m.content) }));
  messages.push({ role: 'user', content: message });

  const result = await complete(messages, { maxTokens: 1024 });
  return { response: result.content, tokens_used: result.tokens_used, model: MODEL_ID };
}

/**
 * POST /api/chatwithobject equivalent — strict JSON extraction with few-shot.
 *
 * For small models (0.5B), we use a two-step approach:
 * 1. Ask the question in plain text to get a real answer
 * 2. Ask the model to fill JSON using that answer, with fallback to programmatic construction
 */
export async function browserChatWithObject(message, schema = {}, fewShotExamples = []) {
  const schemaJSON = JSON.stringify(schema);
  const properties = schema?.properties || {};
  const keys = Object.keys(properties);
  let totalTokens = 0;

  // Step 1: Get a plain-text answer from the model
  const plainMessages = [
    { role: 'system', content: 'Answer concisely in a few words.' },
    { role: 'user', content: message },
  ];
  const plainResult = await complete(plainMessages, { temperature: 0.3, maxTokens: 256 });
  const plainAnswer = plainResult.content.trim();
  totalTokens += plainResult.tokens_used;

  // Step 2: Try to get the model to produce JSON using the answer it just gave
  const jsonSystem =
    'You are a JSON extraction assistant. Respond with ONLY valid JSON, nothing else.\n' +
    `Schema: ${schemaJSON}\n` +
    `Example: ${JSON.stringify(buildExampleFromSchema(schema))}`;

  const jsonMessages = [{ role: 'system', content: jsonSystem }];

  // Add few-shot examples if provided
  for (const ex of fewShotExamples) {
    jsonMessages.push({ role: 'user',      content: ex.input ?? '' });
    jsonMessages.push({ role: 'assistant', content: JSON.stringify(ex.output) });
  }

  // Feed the plain answer as context so the model has the data to fill in
  jsonMessages.push({
    role: 'user',
    content: `Question: ${message}\nAnswer: ${plainAnswer}\n\nRespond with JSON only:`,
  });

  const jsonResult = await complete(jsonMessages, { temperature: 0.0, maxTokens: 256 });
  const raw = jsonResult.content.trim();
  totalTokens += jsonResult.tokens_used;

  let parsed = extractJSON(raw);

  // Step 3: If we got a valid object, check if values are populated
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const isEmpty = keys.length > 0 && keys.every((k) => !parsed[k] || parsed[k] === '...');
    if (isEmpty) {
      // Fallback: construct JSON programmatically from the plain answer
      parsed = buildResultFromAnswer(plainAnswer, schema);
    }
  } else if (typeof parsed === 'string') {
    // JSON extraction failed entirely — build from plain answer
    parsed = buildResultFromAnswer(plainAnswer, schema);
  }

  return { result: parsed, raw_response: raw, tokens_used: totalTokens };
}

/** Build a result object from a plain-text answer and schema. */
function buildResultFromAnswer(answer, schema) {
  const properties = schema?.properties || {};
  const keys = Object.keys(properties);
  if (keys.length === 0) return { answer };

  // Single-key schema: put the answer directly
  if (keys.length === 1) {
    const key = keys[0];
    const type = properties[key]?.type;
    if (type === 'number' || type === 'integer') {
      const num = parseFloat(answer.replace(/[^0-9.\-]/g, ''));
      return { [key]: Number.isNaN(num) ? answer : num };
    }
    return { [key]: answer };
  }

  // Multi-key schema: put the full answer in each string field
  const obj = {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.type === 'number' || prop.type === 'integer') obj[key] = 0;
    else if (prop.type === 'boolean') obj[key] = false;
    else obj[key] = answer;
  }
  return obj;
}

/** Build a placeholder object from a JSON schema so the model sees the expected shape. */
function buildExampleFromSchema(schema) {
  if (!schema || schema.type !== 'object' || !schema.properties) return {};
  const obj = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.type === 'string')       obj[key] = '...';
    else if (prop.type === 'number')  obj[key] = 0;
    else if (prop.type === 'integer') obj[key] = 0;
    else if (prop.type === 'boolean') obj[key] = false;
    else if (prop.type === 'array')   obj[key] = [];
    else                              obj[key] = '...';
  }
  return obj;
}

/** Robustly extract JSON from model output that may include extra text. */
function extractJSON(raw) {
  let clean = raw;

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  clean = clean.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Try parsing as-is first
  try { return JSON.parse(clean.trim()); } catch (_) { /* continue */ }

  // Find the first { ... } or [ ... ] block
  for (const [open, close] of [['{', '}'], ['[', ']']]) {
    const start = clean.indexOf(open);
    if (start < 0) continue;
    // Walk forward to find the matching close bracket
    let depth = 0;
    for (let i = start; i < clean.length; i++) {
      if (clean[i] === open) depth++;
      else if (clean[i] === close) depth--;
      if (depth === 0) {
        const candidate = clean.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch (_) {
          // Try fixing common small-model JSON mistakes
          const fixed = fixMalformedJSON(candidate);
          if (fixed !== null) return fixed;
          break;
        }
      }
    }
  }

  // Try regex key-value extraction as last resort
  const kvResult = extractKeyValues(raw);
  if (kvResult) return kvResult;

  // Last resort: return the raw string
  return raw;
}

/** Fix common JSON errors produced by small models. */
function fixMalformedJSON(str) {
  let s = str;

  // Remove stray characters between { and first "
  s = s.replace(/^\{\s*[^"{\[]*"/, '{"');

  // Fix doubled quotes: ""key" → "key"
  s = s.replace(/""+/g, '"');

  // Fix missing colon: "key" "value" → "key": "value"
  s = s.replace(/"(\s+)"/g, '": "');

  // Fix trailing comma before }
  s = s.replace(/,\s*\}/g, '}');
  s = s.replace(/,\s*\]/g, ']');

  try { return JSON.parse(s); } catch (_) { /* continue */ }

  // Try wrapping bare key:value pairs
  const inner = s.replace(/^\{|\}$/g, '').trim();
  try { return JSON.parse(`{${inner}}`); } catch (_) { /* continue */ }

  return null;
}

/** Extract key-value pairs using regex when JSON parsing fails entirely. */
function extractKeyValues(raw) {
  const pairs = {};
  const re = /"([^"]+)"\s*:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    pairs[m[1]] = m[2];
  }
  // Also match numeric values
  const reNum = /"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)/g;
  while ((m = reNum.exec(raw)) !== null) {
    if (!(m[1] in pairs)) pairs[m[1]] = Number(m[2]);
  }
  return Object.keys(pairs).length > 0 ? pairs : null;
}

// ---------------------------------------------------------------------------
// Deterministic tool-intent detection for small models
// ---------------------------------------------------------------------------

/** Try to find a math expression in the user message. Returns the expression or null. */
function detectMathExpression(message) {
  // Match patterns like "67 + 89", "what is 100 * 3", "calculate 2^8"
  const m = message.match(/(?:[\d]+(?:\.\d+)?)\s*[+\-*/^]\s*(?:[\d]+(?:\.\d+)?)(?:\s*[+\-*/^]\s*(?:[\d]+(?:\.\d+)?))*/);
  return m ? m[0] : null;
}

/** Detect whether the user is asking about the current time/date. */
function detectDatetimeIntent(message) {
  const lower = message.toLowerCase();
  return /\b(what\s+time|what\s+date|current\s+time|current\s+date|today|now|what\s+day)\b/.test(lower);
}

/** Detect whether the user is asking about weather. */
function detectWeatherIntent(message) {
  const lower = message.toLowerCase();
  const m = lower.match(/\bweather\s+(?:in|for|at)\s+([a-z\s]+)/);
  return m ? m[1].trim() : null;
}

/**
 * Detect which tools to call based on user message content.
 * Returns an array of { tool, input } objects.
 */
function detectToolCalls(message, enabledTools) {
  const detected = [];

  if (enabledTools.includes('calculator')) {
    const expr = detectMathExpression(message);
    if (expr) detected.push({ tool: 'calculator', input: expr });
  }

  if (enabledTools.includes('datetime') && detectDatetimeIntent(message)) {
    detected.push({ tool: 'datetime', input: '' });
  }

  if (enabledTools.includes('weather')) {
    const city = detectWeatherIntent(message);
    if (city) detected.push({ tool: 'weather', input: city });
  }

  return detected;
}

/**
 * POST /api/chatwithtools equivalent — tool-augmented chat.
 *
 * For small models (0.5B) that can't reliably follow TOOL_CALL instructions,
 * we detect tool intent from the user message deterministically, run the tools,
 * then ask the model to narrate the results in natural language.
 */
export async function browserChatWithTools(message, tools = [], context = '') {
  let totalTokens = 0;

  // Step 1: Detect which tools to call from the message
  const detected = detectToolCalls(message, tools);

  // Execute detected tools
  const toolCalls = [];
  for (const d of detected) {
    let output;
    try { output = runTool(d.tool, d.input); }
    catch (e) { output = `error: ${e.message}`; }
    toolCalls.push({ tool: d.tool, input: d.input, output });
  }

  // Step 2: Also try the model-based approach as fallback (if no tools detected)
  if (toolCalls.length === 0) {
    const toolDescs = tools.map((t) => TOOL_DESCRIPTIONS[t]).filter(Boolean);
    let system = context || 'You are a helpful assistant.';
    if (toolDescs.length > 0) {
      system += '\n\nYou have these tools. To use one, write: TOOL_CALL: name(input)\n';
      toolDescs.forEach((d) => { system += `- ${d}\n`; });
    }
    const messages = [
      { role: 'system', content: system },
      { role: 'user',   content: message },
    ];
    const result = await complete(messages, { maxTokens: 1024 });
    totalTokens += result.tokens_used;
    const rawReply = result.content;

    // Try parsing TOOL_CALL from model output
    const re = /TOOL_CALL:\s*(\w+)\(([^)]*)\)/g;
    let match;
    while ((match = re.exec(rawReply)) !== null) {
      const name  = match[1];
      const input = match[2].trim();
      if (!tools.includes(name)) continue;
      let output;
      try { output = runTool(name, input); }
      catch (e) { output = `error: ${e.message}`; }
      toolCalls.push({ tool: name, input, output });
    }

    // If still no tool calls, just return the model's raw answer
    if (toolCalls.length === 0) {
      return { response: rawReply, tool_calls: [], tokens_used: totalTokens };
    }
  }

  // Step 3: Generate a natural-language answer using the tool results
  const resultSummary = toolCalls.map((tc) =>
    tc.input ? `${tc.input} = ${tc.output}` : tc.output
  ).join('; ');

  const narrateMessages = [
    { role: 'system', content: 'Answer the user briefly and clearly.' },
    { role: 'user', content: `${message}\n\nAnswer: ${resultSummary}` },
  ];

  let finalReply;
  try {
    const result2 = await complete(narrateMessages, { temperature: 0.1, maxTokens: 128 });
    finalReply = result2.content;
    totalTokens += result2.tokens_used;

    // Safety check: for calculator results, make sure the answer contains the number
    const calcCalls = toolCalls.filter((tc) => tc.tool === 'calculator');
    if (calcCalls.length > 0 && !calcCalls.some((tc) => finalReply.includes(tc.output))) {
      finalReply = resultSummary;
    }
  } catch (_) {
    finalReply = resultSummary;
  }

  return { response: finalReply, tool_calls: toolCalls, tokens_used: totalTokens };
}
