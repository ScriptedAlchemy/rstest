import { expect, test } from '@rstest/core';

test('loads module federation remote over http in browser mode', async () => {
  const mod = await import('mf_remote/Value');
  expect(mod.default).toBe('browser mode federation over http');
});
