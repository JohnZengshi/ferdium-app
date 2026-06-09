import { defineConfig } from 'orval';

export default defineConfig({
  'agent-flow-cs': {
    input: {
      target: './openapi.json',
    },
    output: {
      target: './api/generated',
      client: 'fetch',
      httpClient: 'fetch',
      mode: 'tags-split',
      mock: false,
      baseUrl: 'http://10.0.0.205:8000',
      override: {
        mutator: {
          path: './api/customInstance.ts',
          name: 'useCustomInstance',
        },
      },
    },
  },
});
