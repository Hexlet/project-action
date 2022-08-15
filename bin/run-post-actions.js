#!/usr/bin/env node

// @ts-check

import core from '@actions/core';
import cleanStack from 'clean-stack';

import { runPostActions } from '../src/index.js';

const verbose = core.getBooleanInput('verbose', { required: false });
const mountPath = core.getInput('mount-path', { required: true });

try {
  const projectMemberId = core.getInput('hexlet-id', { required: true });

  const params = {
    mountPath, projectMemberId, verbose,
  };

  await runPostActions(params);
} catch (e) {
  // NOTE: бектрейс экшена пользователям не нужен
  if (!verbose) {
    e.stack = cleanStack(e.stack);
  }
  throw e;
}
