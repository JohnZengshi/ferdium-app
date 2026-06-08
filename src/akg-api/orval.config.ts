import { defineConfig } from 'orval';

export default defineConfig({
  'akg-api': {
    input: {
      target: './openapi.json',
    },
    output: {
      target: './api/generated',
      client: 'fetch',
      httpClient: 'fetch',
      mode: 'tags-split',
      mock: false,
      baseUrl: 'http://localhost:3000/api',
      override: {
        mutator: {
          path: './api/customInstance.ts',
          name: 'useCustomInstance',
        },
      },
    },
  },
});
