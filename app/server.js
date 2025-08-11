export const servers = {
  prod: {
    endpoint: 'https://llama.x.jsx.jp/v1/chat/completions',
    model: 'Gemma-3n-E4B-it',
  },
  'in-lms': {
    endpoint: 'http://in.jsx.jp:1234/v1/chat/completions',
    model: 'Gemma-3n-E4B-it',
  },

  'n100-gemma-3n-E4B-Q6': {
    endpoint: 'http://n100.jsx.jp:2880/v1/chat/completions',
    model: 'Gemma-3n-E4B-it',
  },
  'n100-gemma-3n-E4B-Q5': {
    endpoint: 'http://n100.jsx.jp:2881/v1/chat/completions',
    model: 'Gemma-3n-E4B-it',
  },
  'n100-gemma-3n-E2B-Q6': {
    endpoint: 'http://n100.jsx.jp:2882/v1/chat/completions',
    model: 'Gemma-3n-E2B-it',
  },
  'n100-gemma-3n-E2B-Q5': {
    endpoint: 'http://n100.jsx.jp:2883/v1/chat/completions',
    model: 'Gemma-3n-E2B-it',
  },

  'dark-gemma-3n-E4B-Q6': {
    endpoint: 'http://172.16.6.77:2880/v1/chat/completions',
    model: 'Gemma-3n-E4B-it',
  },
  'dark-gemma-3n-E4B-Q5': {
    endpoint: 'http://172.16.6.77:2881/v1/chat/completions',
    model: 'Gemma-3n-E4B-it',
  },
  'dark-gemma-3n-E2B-Q6': {
    endpoint: 'http://172.16.6.77:2882/v1/chat/completions',
    model: 'Gemma-3n-E2B-it',
  },
  'dark-gemma-3n-E2B-Q5': {
    endpoint: 'http://172.16.6.77:2883/v1/chat/completions',
    model: 'Gemma-3n-E2B-it',
  },

  'local-Phi-4': {
    endpoint: 'http://172.16.6.77:2887/v1/chat/completions',
    model: 'Phi-4-mini-reasoning',
  },
  'local-Llama-3': {
    endpoint: 'http://172.16.6.77:2888/v1/chat/completions',
    model: 'Llama-3-ELYZA-JP-8B',
  },
};

export default { servers };
