import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
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
  tools: {
    rspack: (config) => {
      config.output ??= {};
      config.output.publicPath = `http://localhost:${PORT}/`;
      config.plugins ??= [];
      config.plugins.push(
        new ModuleFederationPlugin({
          name: 'mf_browser_example',
          filename: 'remoteEntry.js',
          library: { type: 'var', name: 'mf_browser_example' },
          remoteType: 'script',
          exposes: {
            './Value': './src/remoteValue.ts',
          },
          remotes: {
            mf_remote: `mf_browser_example@http://localhost:${PORT}/remoteEntry.js`,
          },
        }),
      );
      return config;
    },
  },
});
