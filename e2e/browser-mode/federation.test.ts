import { describe, expect, it } from '@rstest/core';
import { runBrowserCli } from './utils';

describe('browser mode - module federation', () => {
  it('should load remote modules over http', async () => {
    const { expectExecSuccess, cli } = await runBrowserCli('federation');

    await expectExecSuccess();
    expect(cli.stdout).toContain('federation.test.ts');
    expect(cli.stdout).toMatch(/Tests.*passed/);
  });
});
