import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import checkPackageName from '../src/packageChecker.js';

const fixtures = [];
const makeProject = (harness, student = { name: '@hexlet/code' }) => {
  const projectSourcePath = fs.mkdtempSync(
    path.join(os.tmpdir(), 'package-check-'),
  );
  fixtures.push(projectSourcePath);
  const codePath = path.join(projectSourcePath, 'code');
  fs.mkdirSync(codePath);
  if (harness !== undefined) {
    fs.writeFileSync(
      path.join(projectSourcePath, 'package.json'),
      JSON.stringify(harness),
    );
  }
  if (student !== undefined) {
    fs.writeFileSync(
      path.join(codePath, 'package.json'),
      JSON.stringify(student),
    );
  }
  return { codePath, projectSourcePath };
};
const check = ({ codePath, projectSourcePath }) =>
  checkPackageName(codePath, projectSourcePath);

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('accepts the name required by the project harness', () => {
  expect(() =>
    check(makeProject({ dependencies: { '@hexlet/code': 'file:code' } })),
  ).not.toThrow();
});

test('rejects a mismatched name without relying on the project language', () => {
  const project = makeProject(
    { dependencies: { '@hexlet/code': 'file:code' } },
    { name: 'wrong-name' },
  );
  expect(() => check(project)).toThrow(
    'Package name should be @hexlet/code instead of wrong-name',
  );
});

test('derives custom package names from the harness', () => {
  const harness = { dependencies: { '@course/solution': 'file:code' } };
  expect(() =>
    check(makeProject(harness, { name: '@course/solution' })),
  ).not.toThrow();
  expect(() => check(makeProject(harness))).toThrow(
    'Package name should be @course/solution instead of @hexlet/code',
  );
});

test.each([
  'file:./code',
  'file:./nested/../code',
])('recognizes equivalent paths (%s)', (specifier) => {
  expect(() =>
    check(
      makeProject(
        { dependencies: { '@hexlet/code': specifier } },
        { name: 'wrong-name' },
      ),
    ),
  ).toThrow('Package name should be @hexlet/code');
});

test.each([
  'dependencies',
  'devDependencies',
  'optionalDependencies',
])('checks local code declared in %s', (section) => {
  expect(() =>
    check(
      makeProject(
        { [section]: { '@hexlet/code': 'file:code' } },
        { name: 'wrong-name' },
      ),
    ),
  ).toThrow('Package name should be @hexlet/code');
});

test.each([
  {},
  { dependencies: { library: '^1.0.0' } },
  { dependencies: { library: 'file:other-package' } },
  { dependencies: { library: 'file:../code' } },
])('does not constrain an application without a local code dependency (%j)', (harness) => {
  const project = makeProject(harness);
  fs.rmSync(path.join(project.codePath, 'package.json'));
  expect(() => check(project)).not.toThrow();
});

test('skips a harness without package.json, including non-npm projects', () => {
  const project = makeProject(undefined);
  fs.rmSync(path.join(project.codePath, 'package.json'));
  fs.writeFileSync(
    path.join(project.codePath, 'pyproject.toml'),
    '[project]\nname="other-name"\n',
  );
  expect(() => check(project)).not.toThrow();
});

test('requires a student manifest when the harness imports its package', () => {
  const project = makeProject({
    dependencies: { '@hexlet/code': 'file:code' },
  });
  fs.rmSync(path.join(project.codePath, 'package.json'));
  expect(() => check(project)).toThrow();
});

test('rejects a missing student package name', () => {
  expect(() =>
    check(makeProject({ dependencies: { '@hexlet/code': 'file:code' } }, {})),
  ).toThrow('Package name should be @hexlet/code instead of undefined');
});

test.each(['harness', 'student'])('rejects malformed JSON in %s', (target) => {
  const project = makeProject({
    dependencies: { '@hexlet/code': 'file:code' },
  });
  const dir =
    target === 'harness' ? project.projectSourcePath : project.codePath;
  fs.writeFileSync(path.join(dir, 'package.json'), '{');
  expect(() => check(project)).toThrow(SyntaxError);
});

test('rejects conflicting harness names for the same student package', () => {
  const project = makeProject({
    dependencies: {
      '@hexlet/code': 'file:code',
      '@course/code': 'file:./code',
    },
  });
  expect(() => check(project)).toThrow('Conflicting names for student package');
});
