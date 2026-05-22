import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getTestService } from '../src/index.js';

const makeCompose = (services) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'compose-test-'));
  const lines = services.map((s) => `  ${s}:\n    command: echo 1`).join('\n');
  writeFileSync(path.join(dir, 'docker-compose.yml'), `services:\n${lines}`);
  return dir;
};

test('returns "test" when test service exists', () => {
  expect(getTestService(makeCompose(['app', 'test']))).toBe('test');
});

test('returns "app" when no test service', () => {
  expect(getTestService(makeCompose(['app']))).toBe('app');
});
