import { rspack } from '@rsbuild/core';
import { defineConfig } from '@rstest/core';
import { BROWSER_PORTS } from '../ports';

const { ModuleFederationPlugin } = rspack.container;

export default defineConfig({
  browser: {
    enabled: true,
    provider: 'playwright',
    headless: true,
    port: BROWSER_PORTS.federation,
  },
  include: ['tests/**/*.test.ts'],
  testTimeout: 30_000,
  tools: {
    rspack: (config) => {
      config.plugins ??= [];
      config.plugins.push(
        new ModuleFederationPlugin({
          name: 'mf_host',
          filename: 'remoteEntry.js',
          exposes: {
            './Value': './src/remoteValue.ts',
          },
          remotes: {
            mf_remote: `mf_host@http://localhost:${BROWSER_PORTS.federation}/remoteEntry.js`,
          },
        }),
      );
      return config;
    },
  },
});
