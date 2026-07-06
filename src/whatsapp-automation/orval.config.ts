import { defineConfig } from 'orval';

export default defineConfig({
  whatsapp: {
    input: {
      target: 'http://10.0.0.228:3333/api/docs',
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
