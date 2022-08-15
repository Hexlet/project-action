#!/usr/bin/env node

// @ts-check

import path from 'path';
import core from '@actions/core';
import cleanStack from 'clean-stack';

import { runTests } from '../src/index.js';

core.exportVariable('COMPOSE_DOCKER_CLI_BUILD', 1);
core.exportVariable('DOCKER_BUILDKIT', 1);

core.debug(process.cwd());

const mountPath = core.getInput('mount-path', { required: true });
const verbose = core.getBooleanInput('verbose', { required: false });
const projectPath = path.resolve(process.cwd(), process.env.ACTION_PROJECT_PATH || '');

core.exportVariable('PWD', path.join(mountPath, 'source'));

try {
  const projectMemberId = core.getInput('hexlet-id', { required: true });

  const params = {
    projectPath, mountPath, verbose, projectMemberId,
  };

  await runTests(params);
} catch (e) {
  core.error('The tests have failed. Examine what they have to say. Inhale deeply. Exhale. Fix the code.');
  // NOTE: бектрейс экшена пользователям не нужен
  if (!verbose) {
    e.stack = cleanStack(e.stack);
  }
  throw e;
}
