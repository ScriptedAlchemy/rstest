import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rstest/core';

const PORT = 4010;

export default defineConfig({
  browser: {
    enabled: true,
    provider: 'playwright',
    headless: true,
    port: PORT,
    strictPort: true,
  },
  include: ['tests/**/*.test.ts'],
  testTimeout: 30_000,
  plugins: [
    pluginModuleFederation({
      name: 'mf_browser_example',
      exposes: {
        './Value': './src/remoteValue.ts',
      },
      remotes: {
        mf_remote: `mf_browser_example@http://localhost:${PORT}/mf-manifest.json`,
      },
    }),
  ],
});
