// @ts-check

// https://github.com/actions/javascript-action
// https://github.com/actions/toolkit/blob/master/docs/action-debugging.md

import fs from 'node:fs';
import path from 'node:path';
import { DefaultArtifactClient } from '@actions/artifact';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as glob from '@actions/glob';
import { HttpClient } from '@actions/http-client';
import * as io from '@actions/io';
import colors from 'ansi-colors';
import yaml from 'js-yaml';
import buildRoutes from './routes.js';

const uploadArtifacts = async (diffpath) => {
  if (!fs.existsSync(diffpath)) {
    core.info(
      `uploadArtifacts: no artifacts directory at ${diffpath}, skipping`,
    );
    return;
  }

  const diffstats = fs.statSync(diffpath);
  if (!diffstats.isDirectory()) {
    return;
  }

  // NOTE: matchDirectories: false is essential. `**` matches zero segments, so with the
  // default (true) the directories themselves end up in the list. @actions/artifact then
  // writes each one as a zero-byte entry WITHOUT a trailing slash, so the zip ends up with
  // both a file `X` and a directory `X/…`. unzip then fails with "X exists but is not
  // directory" and silently drops every file inside it.
  const globber = await glob.create(`${diffpath}/*/**`, {
    matchDirectories: false,
  });
  const filepaths = await globber.glob();

  if (filepaths.length === 0) {
    core.info('uploadArtifacts: artifacts directory is empty, skipping');
    return;
  }

  const artifactClient = new DefaultArtifactClient();
  const artifactName = 'test-results';
  await artifactClient.uploadArtifact(artifactName, filepaths, diffpath);
  // NOTE: Users need notification that screenshots have been generated. Not error.
  core.info(colors.bgYellow.black('Download snapshots from Artifacts.'));
};

const uploadTestData = async (options) => {
  core.debug('start uploadTestData');
  const { projectSourcePath, verbose } = options;

  const specPath = path.join(projectSourcePath, '__data__', 'spec.yml');

  // NOTE: The project image is not downloaded until the last step is reached.
  if (!fs.existsSync(specPath)) {
    core.info(`uploadTestData: spec.yml not found at ${specPath}, skipping`);
    return;
  }

  const specContent = fs.readFileSync(specPath).toString();
  const specData = yaml.load(specContent);
  const { artifacts } = specData.project;

  if (!artifacts) {
    core.info(
      'uploadTestData: no artifacts key in spec.yml project section, skipping',
    );
    return;
  }

  const existPaths = artifacts.filter((artifactPath) =>
    fs.existsSync(path.join(projectSourcePath, artifactPath)),
  );

  if (existPaths.length === 0) {
    const missingPaths = artifacts.map((p) => path.join(projectSourcePath, p));
    core.warning(
      `uploadTestData: artifact paths specified in spec.yml but none exist on disk:\n${missingPaths.join('\n')}`,
    );
    return;
  }

  const filesToUpload = existPaths.flatMap((relPath) => {
    const absPath = path.join(projectSourcePath, relPath);
    if (fs.statSync(absPath).isDirectory()) {
      return fs
        .readdirSync(absPath, { recursive: true })
        .map((f) => path.join(absPath, f))
        .filter((f) => fs.statSync(f).isFile());
    }
    return [absPath];
  });

  const artifactName = 'test-data';
  const artifactClient = new DefaultArtifactClient();
  await artifactClient.uploadArtifact(
    artifactName,
    filesToUpload,
    projectSourcePath,
  );
  core.info(colors.bgYellow.black('Download snapshots from Artifacts.'));
};

const prepareProject = async (options) => {
  const {
    codePath,
    projectPath,
    projectMember,
    projectSourcePath,
    mountPath,
    verbose,
  } = options;
  const cmdOptions = { silent: !verbose };

  const projectImageName = `hexletprojects/${projectMember.project.image_name}:latest`;
  await io.mkdirP(projectSourcePath);
  const pullCmd = `docker pull ${projectImageName}`;
  await exec.exec(pullCmd, null, cmdOptions);
  // NOTE: the code directory remove from the container,
  // since it was created under the rights of root.
  // await io.rmRF(codePath); - deletes a directory with the rights of the current user
  const copyCmd = `docker run -v ${mountPath}:/mnt ${projectImageName} bash -c "cp -r /project/. /mnt/source && rm -rf /mnt/source/code"`;
  await exec.exec(copyCmd, null, cmdOptions);
  await io.mkdirP(codePath);
  await io.cp(`${projectPath}/.`, codePath, { recursive: true });
  await exec.exec('docker', ['build', '--cache-from', projectImageName, '.'], {
    ...cmdOptions,
    cwd: projectSourcePath,
  });
};

const check = async ({ projectSourcePath }) => {
  const options = { cwd: projectSourcePath };
  // NOTE: -f docker-compose.yml is required: the project image also carries
  // docker-compose.override.yml, which switches app to its dev command.
  const composeFile = ['-f', 'docker-compose.yml'];
  // NOTE: Installing dependencies is part of testing the project.
  await exec.exec(
    'docker compose',
    [...composeFile, 'run', '--rm', 'app', 'make', 'setup'],
    options,
  );
  // NOTE: The verdict is the exit code of the test service. up would report the
  // exit code of whichever container stopped first, so app and db shut down
  // after successful tests turned a green run red.
  //
  // The service is not in every project image yet, so the step falls back to up.
  // Without the fallback the merge would be a flag day: run --rm test on a
  // project without the service exits 1, and "no such service" is
  // indistinguishable from failing tests. The up branch goes away once every
  // published image carries test. Mirrors hexlet-project-source-ci's template.
  const { stdout: serviceList } = await exec.getExecOutput(
    'docker compose',
    [...composeFile, 'config', '--services'],
    options,
  );
  const hasTestService = serviceList
    .split('\n')
    .map((name) => name.trim())
    .includes('test');
  const verdictArgs = hasTestService
    ? [...composeFile, 'run', '--rm', 'test']
    : [...composeFile, 'up', '--abort-on-container-exit'];
  try {
    await exec.exec('docker compose', verdictArgs, options);
  } catch (err) {
    // NOTE: run attaches to the test container only, so logs of the services it
    // waited for are the only clue left for a failing server project.
    await exec.exec(
      'docker compose',
      [...composeFile, 'logs', '--no-color', '--tail', '200'],
      { ...options, ignoreReturnCode: true },
    );
    throw err;
  }

  const checkState = {
    state: 'success',
  };
  core.exportVariable('checkState', JSON.stringify(checkState));
};

export const runTests = async (params) => {
  const { mountPath, projectMemberId } = params;
  const routes = buildRoutes(process.env.ACTION_API_HOST);
  const projectSourcePath = path.join(mountPath, 'source');
  const codePath = path.join(projectSourcePath, 'code');
  const initialCheckState = {
    state: 'fail',
  };
  core.exportVariable('checkState', JSON.stringify(initialCheckState));

  const link = routes.projectMemberPath(projectMemberId);
  const http = new HttpClient();
  const response = await http.get(link);
  const data = await response.readBody();
  core.debug(data);
  const projectMember = JSON.parse(data);

  if (!projectMember.tests_on) {
    core.warning('Tests will run during review step');
    return;
  }

  const options = {
    ...params,
    codePath,
    projectMember,
    projectSourcePath,
  };

  await core.group('Preparing', () => prepareProject(options));
  await check(options);
};

const finishCheck = async (projectMemberId) => {
  const { checkState } = process.env;

  const routes = buildRoutes(process.env.ACTION_API_HOST);
  const http = new HttpClient();

  const link = routes.projectMemberCheckPath(projectMemberId);
  await http.postJson(link, { check: checkState });
};

// NOTE: Post actions should be performed regardless of the test completion result.
export const runPostActions = async (params) => {
  core.debug('start runPostActions');
  const { mountPath, projectMemberId, verbose } = params;
  const projectSourcePath = path.join(mountPath, 'source');
  core.debug(JSON.stringify({ projectSourcePath }));

  const diffpath = path.join(mountPath, 'source', 'tmp', 'artifacts');

  const options = {
    projectSourcePath,
    verbose,
  };

  await core.group('Finish check', () => finishCheck(projectMemberId));
  await core.group('Upload artifacts', () => uploadArtifacts(diffpath));
  await core.group('Upload test data', () => uploadTestData(options));
  core.debug('finish runPostActions');
};
