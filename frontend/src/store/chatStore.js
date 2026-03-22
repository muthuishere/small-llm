import { create } from 'zustand';

let nextId = 1;

const useChatStore = create((set) => ({
  messages: [],
  mode: 'chat',
  selectedTools: ['calculator', 'datetime'],
  schema: { type: 'object', properties: { answer: { type: 'string' } } },
  fewShotExamples: [],
  context: '',
  isLoading: false,
  serverStatus: null,

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: nextId++, timestamp: Date.now(), ...msg },
      ],
    })),

  clearMessages: () => set({ messages: [] }),

  setMode: (mode) => set({ mode }),

  setLoading: (isLoading) => set({ isLoading }),

  setServerStatus: (serverStatus) => set({ serverStatus }),

  setSelectedTools: (selectedTools) => set({ selectedTools }),

  setSchema: (schema) => set({ schema }),

  setFewShotExamples: (fewShotExamples) => set({ fewShotExamples }),

  setContext: (context) => set({ context }),
}));

export default useChatStore;
