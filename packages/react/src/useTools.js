import { useState, useCallback, useRef } from 'react';

/**
 * useTools — custom tool registration hook.
 *
 * Manages a registry of named tools that can be invoked by name from
 * application code or by the LLM via the TOOL_CALL protocol.
 *
 * Built-in tools (calculator, datetime, weather) are registered by default
 * and match the ones available on the Go backend.
 *
 * @param {object} [customTools={}]  - Map of { name: { description, handler } }
 *
 * @returns {{
 *   call:           (name: string, input: string) => Promise<string>,
 *   result:         string|null,
 *   availableTools: string[],
 *   register:       (name: string, description: string, handler: Function) => void,
 * }}
 *
 * @example
 *   const { call, availableTools } = useTools({
 *     search: {
 *       description: 'search(query) – searches product catalog',
 *       handler: async (input) => fetchProducts(input),
 *     },
 *   });
 */
export function useTools(customTools = {}) {
  const toolsRef = useRef({ ...builtinTools(), ...normalise(customTools) });
  const [result, setResult] = useState(null);

  /** Register (or replace) a tool at runtime. */
  const register = useCallback((name, description, handler) => {
    toolsRef.current[name] = { description, handler };
  }, []);

  /**
   * call — invoke a registered tool by name.
   * Returns the tool's output string and also stores it in `result`.
   */
  const call = useCallback(async (name, input = '') => {
    const tool = toolsRef.current[name];
    if (!tool) {
      const msg = `Unknown tool: "${name}". Available: ${Object.keys(toolsRef.current).join(', ')}`;
      console.warn('[useTools]', msg);
      throw new Error(msg);
    }
    const output = await tool.handler(input);
    setResult(output);
    return output;
  }, []);

  const availableTools = Object.keys(toolsRef.current);

  return { call, result, availableTools, register };
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Normalise the customTools shape: allow both `handler` and `execute` keys. */
function normalise(tools) {
  return Object.fromEntries(
    Object.entries(tools).map(([name, t]) => [
      name,
      { description: t.description ?? name, handler: t.handler ?? t.execute },
    ]),
  );
}

function builtinTools() {
  return {
    calculator: {
      description: 'calculator(expr) – evaluates a basic arithmetic expression (e.g. 15*7, 100/4, 2^8)',
      handler: (input) => {
        try {
          const result = evalExpr(input.trim());
          return String(Number.isInteger(result) ? result : parseFloat(result.toPrecision(10)));
        } catch (e) {
          return `error: ${e.message}`;
        }
      },
    },
    datetime: {
      description: "datetime() – returns today's date and current UTC time",
      handler: () => {
        const now = new Date();
        return `Date: ${now.toISOString().slice(0, 10)}, Time: ${now.toUTCString().slice(17, 25)} UTC`;
      },
    },
    weather: {
      description: 'weather(city) – returns a mock weather report for the given city',
      handler: (city) => {
        const c = city?.trim() || 'Unknown';
        return `Weather in ${c}: 22°C, partly cloudy, humidity 65%`;
      },
    },
  };
}

function evalExpr(expr) {
  expr = expr.replace(/\s+/g, '');
  const n = Number(expr);
  if (!Number.isNaN(n)) return n;
  for (let i = expr.length - 1; i > 0; i--) {
    const c = expr[i];
    if (c === '+' || c === '-') {
      return c === '+' ? evalExpr(expr.slice(0, i)) + evalExpr(expr.slice(i + 1))
        : evalExpr(expr.slice(0, i)) - evalExpr(expr.slice(i + 1));
    }
  }
  for (let i = expr.length - 1; i > 0; i--) {
    const c = expr[i];
    if (c === '*' || c === '/') {
      const R = evalExpr(expr.slice(i + 1));
      if (c === '/' && R === 0) throw new Error('division by zero');
      return c === '*' ? evalExpr(expr.slice(0, i)) * R : evalExpr(expr.slice(0, i)) / R;
    }
  }
  for (let i = expr.length - 1; i > 0; i--) {
    if (expr[i] === '^') {
      return Math.pow(evalExpr(expr.slice(0, i)), evalExpr(expr.slice(i + 1)));
    }
  }
  throw new Error(`Cannot evaluate: ${expr}`);
}
