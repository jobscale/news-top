export const servers = {
  prod: {
    endpoint: 'https://llama.x.jsx.jp/v1/chat/completions',
    model: 'gemma-3-4b-it',
  },
  'in-lms': {
    endpoint: 'http://in.jsx.jp:1234/v1/chat/completions',
    model: 'gemma-3-4b-it',
  },
  'n100-llama': {
    endpoint: 'http://n100.jsx.jp:2880/v1/chat/completions',
    model: 'gemma-3-4b-it',
  },
  'local-gemma-3': {
    endpoint: 'http://127.0.0.1:2880/v1/chat/completions',
    model: 'gemma-3-4b-it',
  },
  'local-Phi-4': {
    endpoint: 'http://127.0.0.1:2881/v1/chat/completions',
    model: 'Phi-4-mini-reasoning',
  },
  'local-calm2': {
    endpoint: 'http://127.0.0.1:2882/v1/chat/completions',
    model: 'calm2-7B-chat',
  },
  'local-ELYZA': {
    endpoint: 'http://127.0.0.1:2883/v1/chat/completions',
    model: 'Llama-3-ELYZA-JP-8B',
  },
};

export default { servers };
