import path from 'path';
import { fileURLToPath } from 'url';

import checkPackageName from '../src/packageChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const verifiableProjects = [
  'javascript',
  'php',
  'python',
];

// NOTE: Some projects are not packages.
// Also, in some languages, verification is not needed,
// since the package name is verified when installing the dependencies.
const notVerifiableProjects = [
  'html',
  'ruby',
  'java',
  'undefined-language',
  null,
  undefined,
];

const getFixturePath = (dirname) => (
  path.join(__dirname, '..', '__fixtures__', 'package_files', dirname)
);

describe('test projects with correct package name', () => {
  const codePath = getFixturePath('correct');

  test.each(verifiableProjects)('%s', (sourceLang) => {
    expect(() => checkPackageName(codePath, sourceLang))
      .not.toThrowError();
  });
});

describe('test projects with wrong package name', () => {
  const codePath = getFixturePath('wrong');

  test.each(verifiableProjects)('%s', (sourceLang) => {
    expect(() => checkPackageName(codePath, sourceLang))
      .toThrowError(/^Package name should be .+ instead of wrong-package-name$/);
  });
});

describe('test not verifiable projects', () => {
  const codePath = getFixturePath('correct');

  test.each(notVerifiableProjects)('%s', (sourceLang) => {
    expect(() => checkPackageName(codePath, sourceLang))
      .not.toThrowError();
  });
});
