// @ts-check

import path from 'path';
import core from '@actions/core';
import { runTests } from '../index.js';

process.on('unhandledRejection', (up) => { throw up; });

core.exportVariable('COMPOSE_DOCKER_CLI_BUILD', 1);
core.exportVariable('DOCKER_BUILDKIT', 1);

core.debug(process.cwd());

const mountPath = core.getInput('mount-path', { required: true });
const verbose = core.getInput('verbose', { required: true }) === 'true';
const projectMemberId = core.getInput('hexlet-id', { required: true });
const projectPath = path.resolve(process.cwd(), process.env.ACTION_PROJECT_PATH || '');

core.exportVariable('PWD', path.join(mountPath, 'source'));

const options = {
  projectPath, mountPath, verbose, projectMemberId,
};

// core.debug(JSON.stringify(options));

runTests(options);
