# AGENTS.md

## What this repo is

A GitHub Action that runs the automated check of a Hexlet educational project inside the student's own repository: it pulls the project image, lays the student's code into it, runs the check through Docker Compose and reports the verdict back to the Hexlet API.

The same check has a second runner for GitLab — `hexlethq/hexlet-project-source-ci`, which also publishes the project images this action pulls.

## A push to `master` ships to every student

Student workflows are pinned to `hexlet/project-action@release`, and the Hexlet monolith validates that exact string with the schema `^hexlet/project-action@release$`, so no project can stay on another ref.

The `release` branch is built automatically: `test.yml` runs on every push to `master`, and a green run triggers `release.yml`, which runs `make build` and force-pushes `dist/` onto `release`. **Anything landing on `master` reaches every student of every project within minutes**, and the rollback is just as global: revert on `master` and wait for the next `release` build.

- Changes land through a pull request, and the merge is a human's call.
- `release.yml` installs with `npm install`, so even a docs-only commit on `master` rebuilds the bundle against freshly resolved dependencies. A push to `master` that ships nothing does not exist.
- Without a green `test.yml` the `release` build never starts, so the merge ships nothing while looking successful. After a merge, check that `release` received a fresh `build: update dist` commit.

## Commands

Dependencies come from `make install`, and CI uses the same target. The rest of the targets live in the `Makefile`.

**`make setup` installs nothing.** The target reads `setup: pull setup`, so make drops the circular dependency, runs `pull`, stops there and still exits 0.

`make test` needs the fixture image that `make pull` fetches. A single file goes through jest directly: `npx jest __tests__/index.test.js`.

The fixture image name `hexlet-project-source-ci_en` is pinned in three places that have to agree: `Makefile` (target `pull`), `server.js` (the API stub for `e2e`) and `__tests__/index.test.js` (the nock response).

## Architecture

- `dist/` is gitignored and stays out of git: `release.yml` builds it with `@vercel/ncc` and force-adds it onto the `release` branch. `action.yml` points at `dist/run-tests/index.js` and `dist/run-post-actions/index.js`.
- Two entry points in `bin/` are the two phases of the Action: `bin/run-tests.js` (main) and `bin/run-post-actions.js` (post — finishes the check and uploads artifacts).
- `src/index.js` holds the orchestration: `prepareProject()` pulls the image and extracts the project source, `check()` runs Compose, `runTests()` and `runPostActions()` talk to the Hexlet API.
- `src/routes.js` builds the API urls.
- **The action does not check the name of the student's package.** It used to, per language, and the check was dropped: the name is load-bearing only where the project's own harness resolves the package by it. That is the php library projects, whose root `composer.json` requires `hexlet/code` from a path repository — a wrong name fails `composer install` on its own. For javascript the harness `package.json` names the dependency `"@hexlet/code": "file:code"`, and npm installs a path dependency under that key whatever the package calls itself, so the import resolves either way. For python nothing reads the distribution name: the console scripts have names of their own.
- `check()` calls two fixed compose service names of the project — `app` for `make setup`, then `test` — and the exit code of `test` is the verdict. Both the fixed names and the flags carry `NOTE` comments in the code; read them before changing the commands.
- Tests stub the Hexlet API with a local Fastify server (`server.js`), fixtures live in `__fixtures__/`.
- Artifacts of the student's tests are collected from `<project>/tmp/artifacts/*/**` and uploaded as the `test-results` artifact. The glob starts one level down, so a file lying directly in `tmp/artifacts/` never reaches the student.

## Conventions

- ES modules (`"type": "module"`): `import` and `export`.
- Biome holds the style — single quotes, no unused imports or variables. `make lint-fix` applies it.
