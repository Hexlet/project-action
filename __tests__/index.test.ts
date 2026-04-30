import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import nock from 'nock';
import { expect, it } from 'vitest';
import { runTests } from '../src/index.js';
import buildRoutes from '../src/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fsp = fs.promises;
const projectFixture = path.join(__dirname, '../__fixtures__/project_source');

nock.disableNetConnect();

it('runTests', async () => {
  const routes = buildRoutes();
  const projectMemberId = 1;
  const url = new URL(routes.projectMemberPath(projectMemberId));
  const result = {
    tests_on: true,
    project: {
      image_name: 'hexlet-project-source-ci',
      language: 'ruby',
    },
  };
  nock(url.origin).get(url.pathname).query(true).reply(200, result);

  const tmp = os.tmpdir();
  const mountPath = await fsp.mkdtemp(path.join(tmp, 'hexlet-project-mount-'));
  const projectPath = await fsp.mkdtemp(
    path.join(tmp, 'hexlet-project-fixture-'),
  );
  execSync(`cp -r ${projectFixture}/. ${projectPath}`);

  await runTests({
    mountPath,
    projectPath,
    verbose: true,
    projectMemberId,
  });

  expect(true).toBe(true);
}, 50000);
