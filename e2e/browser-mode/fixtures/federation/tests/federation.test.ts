import { describe, expect, it } from '@rstest/core';

describe('module federation in browser mode', () => {
  it('loads remote module over http', async () => {
    const mod = await import('mf_remote/Value');
    expect(mod.default).toBe('remote value from module federation over http');
  });
});
