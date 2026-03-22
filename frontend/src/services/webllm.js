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
 */
export async function browserChatWithObject(message, schema = {}, fewShotExamples = []) {
  const schemaJSON = JSON.stringify(schema);
  const system =
    'You are a JSON extraction assistant. ' +
    'You MUST respond with valid JSON only, no other text, no markdown, no code fences. ' +
    `Extract data matching this schema: ${schemaJSON}`;

  const messages = [{ role: 'system', content: system }];

  // Few-shot examples
  for (const ex of fewShotExamples) {
    const inputText = ex.input ?? '';
    messages.push({ role: 'user',      content: `Extract from "${inputText}": ${schemaJSON}` });
    messages.push({ role: 'assistant', content: JSON.stringify(ex.output) });
  }
  messages.push({ role: 'user', content: `Extract from "${message}": ${schemaJSON}` });

  const result = await complete(messages, { temperature: 0.1, maxTokens: 512 });
  const raw = result.content.trim();

  // Strip markdown code fences if present
  let clean = raw;
  if (clean.startsWith('```')) {
    const lines = clean.split('\n');
    if (lines.length >= 3) clean = lines.slice(1, -1).join('\n');
  }
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start >= 0 && end > start) clean = clean.slice(start, end + 1);

  let parsed = raw;
  try { parsed = JSON.parse(clean); } catch (_) { /* return raw string */ }

  return { result: parsed, raw_response: raw, tokens_used: result.tokens_used };
}

/**
 * POST /api/chatwithtools equivalent — tool-augmented chat.
 */
export async function browserChatWithTools(message, tools = [], context = '') {
  const toolDescs = tools.map((t) => TOOL_DESCRIPTIONS[t]).filter(Boolean);

  let system = context || 'You are a helpful assistant.';
  if (toolDescs.length > 0) {
    system += '\n\nAvailable tools:\n';
    toolDescs.forEach((d) => { system += `- ${d}\n`; });
    system +=
      '\nWhen you need to call a tool, respond with a line like: TOOL_CALL: <tool_name>(<input>)\n' +
      'Then continue your response after the tool result.';
  }

  const messages = [
    { role: 'system', content: system },
    { role: 'user',   content: message },
  ];

  const result   = await complete(messages, { maxTokens: 1024 });
  let rawReply   = result.content;
  let totalTokens = result.tokens_used;

  // Parse & execute TOOL_CALL directives
  const toolCalls = [];
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

  let finalReply = rawReply.replace(/TOOL_CALL:\s*\w+\([^)]*\)/g, '').trim();

  // Follow-up completion with tool results injected
  if (toolCalls.length > 0) {
    let toolResultMsg = 'Tool results:\n';
    toolCalls.forEach((tc) => { toolResultMsg += `- ${tc.tool}(${tc.input}) = ${tc.output}\n`; });
    toolResultMsg += '\nPlease provide your final answer using these results.';

    const messages2 = [
      ...messages,
      { role: 'assistant', content: rawReply },
      { role: 'user',      content: toolResultMsg },
    ];
    const result2 = await complete(messages2, { maxTokens: 512 });
    finalReply    = result2.content;
    totalTokens  += result2.tokens_used;
  }

  return { response: finalReply, tool_calls: toolCalls, tokens_used: totalTokens };
}
