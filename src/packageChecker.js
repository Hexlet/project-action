// @ts-check

import fs from 'node:fs';
import path from 'node:path';

const checkPackageName = (codePath, projectSourcePath) => {
  const manifestPath = path.join(projectSourcePath, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const dependencySections = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.optionalDependencies,
  ];
  const studentPath = path.resolve(projectSourcePath, 'code');
  const expectedNames = new Set(
    dependencySections.flatMap((dependencies) =>
      Object.entries(dependencies ?? {})
        .filter(
          ([, specifier]) =>
            typeof specifier === 'string' &&
            specifier.startsWith('file:') &&
            path.resolve(projectSourcePath, specifier.slice(5)) === studentPath,
        )
        .map(([name]) => name),
    ),
  );

  if (expectedNames.size === 0) {
    return;
  }
  if (expectedNames.size > 1) {
    throw new Error(
      `Conflicting names for student package: ${[...expectedNames].join(', ')}`,
    );
  }

  const [expectedPackageName] = expectedNames;
  const { name: packageName } = JSON.parse(
    fs.readFileSync(path.join(codePath, 'package.json'), 'utf-8'),
  );
  if (packageName !== expectedPackageName) {
    throw new Error(
      `Package name should be ${expectedPackageName} instead of ${packageName}`,
    );
  }
};

export default checkPackageName;
