import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

export const sendChat = (message, history = [], context = '') =>
  api.post('/api/chat', { message, history, context });

export const sendChatWithObject = (message, schema = {}, few_shot_examples = []) =>
  api.post('/api/chatwithobject', { message, schema, few_shot_examples });

export const sendChatWithTools = (message, tools = [], context = '') =>
  api.post('/api/chatwithtools', { message, tools, context });

export const getStatus = () =>
  api.get('/api/status');

export const getHealth = () =>
  api.get('/api/health');

export default api;
