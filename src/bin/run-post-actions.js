// @ts-check

import core from '@actions/core';
import { runPostActions } from '../index.js';

process.on('unhandledRejection', (up) => { throw up; });

const mountPath = core.getInput('mount-path', { required: true });
const projectMemberId = core.getInput('hexlet-id', { required: true });
const verbose = core.getInput('verbose', { required: true }) === 'true';

const options = {
  mountPath, projectMemberId, verbose,
};

runPostActions(options);
