export const servers = {
  prod: {
    endpoint: 'http://n100.jsx.jp:2880/v1/chat/completions',
    model: 'Gemma-3n-E2B-it',
  },
  'in-lms': {
    endpoint: 'http://in.jsx.jp:1234/v1/chat/completions',
    model: 'Gemma-3n-E2B-it',
  },

  'n100-gemma-it': {
    endpoint: 'http://n100.jsx.jp:2880/v1/chat/completions',
    model: 'Gemma-it',
  },

  'dark-gemma-it': {
    endpoint: 'http://172.16.6.77:2880/v1/chat/completions',
    model: 'Gemma-it',
  },

  'dark-Phi-4': {
    endpoint: 'http://172.16.6.77:2887/v1/chat/completions',
    model: 'Phi-4-mini-reasoning',
  },
  'dark-Llama-3': {
    endpoint: 'http://172.16.6.77:2888/v1/chat/completions',
    model: 'Llama-3-ELYZA-JP-8B',
  },
};

export default { servers };
