import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,...nextTs,
  {
    // Browser-only repository/draft hydration and configuration fetching intentionally
    // publish an external snapshot after mount; these are not derived render state.
    rules:{'react-hooks/set-state-in-effect':'off'},
  },
  globalIgnores(['.next/**','node_modules/**','.npm-cache/**','artifacts/**','next-env.d.ts']),
]);
