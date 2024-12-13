// @ts-check

import fs from 'fs';
import path from 'path';
import ini from 'ini';
// import yaml from 'js-yaml';
// import _ from 'lodash';

const parsers = {
  json: JSON.parse,
  toml: ini.parse,
  // yml: yaml.load,
};

const getFullPath = (dirpath, filename) => path.resolve(dirpath, filename);
const getFormat = (filepath) => path.extname(filepath).slice(1);
const parse = (content, format) => parsers[format](content);
const getData = (filepath) => parse(fs.readFileSync(filepath, 'utf-8'), getFormat(filepath));

const mapping = {
  python: {
    expectedPackageName: 'hexlet-code',
    getPackageName: (codePath) => {
      const data = getData(getFullPath(codePath, 'pyproject.toml'));

      return data.tool?.poetry?.name || data.project.name;
    },
  },
  php: {
    expectedPackageName: 'hexlet/code',
    getPackageName: (codePath) => (
      getData(getFullPath(codePath, 'composer.json')).name
    ),
  },
  javascript: {
    expectedPackageName: '@hexlet/code',
    getPackageName: (codePath) => (
      getData(getFullPath(codePath, 'package.json')).name
    ),
  },
};

const checkPackageName = (codePath, sourceLang) => {
  const props = mapping[sourceLang];

  // NOTE: If the properties for checking the current project
  // is not found, skip the check.
  if (!props) {
    return;
  }

  const { expectedPackageName, getPackageName } = props;
  const packageName = getPackageName(codePath);

  if (packageName !== expectedPackageName) {
    throw new Error(`Package name should be ${expectedPackageName} instead of ${packageName}`);
  }
};

export default checkPackageName;
