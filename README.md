# project-action

*Action for testing projects*

![test](https://github.com/Hexlet/project-action/workflows/test/badge.svg)

## Install

```bash
make setup
```

## Build

```bash
make build
```

## Test Artifacts Convention

Tests inside the Docker container should write artifacts (screenshots, traces, HTML reports) to `/project/tmp/artifacts/`.

The project's `docker-compose.yml` must mount the source directory to `/project`:

```yaml
services:
  app:
    volumes:
      - .:/project
    working_dir: /project
```

After tests finish, the action automatically uploads everything under `/project/tmp/artifacts/` as a `test-results` GitHub Actions artifact. Students download it and open `playwright-report/index.html` locally.

Example `playwright.config.js`:

```js
export default defineConfig({
  outputDir: '/project/tmp/artifacts/traces',
  reporter: [['html', { outputFolder: '/project/tmp/artifacts/playwright-report', open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
```

[![Hexlet Ltd. logo](https://raw.githubusercontent.com/Hexlet/assets/master/images/hexlet_logo128.png)](https://hexlet.io?utm_source=github&utm_medium=link&utm_campaign=project-action)

This repository is created and maintained by the team and the community of Hexlet, an educational project. [Read more about Hexlet](https://hexlet.io?utm_source=github&utm_medium=link&utm_campaign=project-action).

See most active contributors on [hexlet-friends](https://friends.hexlet.io/).
