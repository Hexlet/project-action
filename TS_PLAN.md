# TypeScript + Vitest Migration Plan

## Context

Migrate `project-action` from plain JavaScript to TypeScript, and replace Jest with Vitest. The project is a small GitHub Action (8 source files). All files move to `.ts` in a single pass (big-bang approach is fine at this scale). ncc handles TypeScript natively, so the build pipeline changes minimally — just entry point filenames.

---

## Step 1: Install / Remove Dependencies

```bash
npm install --save-dev typescript "@types/node@^24" @types/lodash @types/js-yaml @types/ini vitest
npm uninstall jest
```

**Why these `@types`:**
- `js-yaml`, `ini`, `lodash` — confirmed no bundled types
- `clean-stack` — ships its own types via `exports.types`; no `@types/` needed
- `@actions/*`, `chalk`, `ansi-colors`, `fastify`, `nock` — all ship bundled types

---

## Step 2: New Config Files

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "bin/**/*", "__tests__/**/*", "server.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`NodeNext` + `noEmit: true` — ncc bundles, tsc only type-checks. Import paths stay `.js` (NodeNext resolves `.js` → `.ts` automatically).

### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
});
```

No ESM flags needed — Vitest runs ESM natively in Node 24.

---

## Step 3: Update `.npmrc`

Remove the Jest ESM flag (not needed with Vitest):
```
# node-options=--no-warnings --experimental-vm-modules
```

---

## Step 4: Rename All Source Files

```
src/index.js                      → src/index.ts
src/packageChecker.js             → src/packageChecker.ts
src/routes.js                     → src/routes.ts
bin/run-tests.js                  → bin/run-tests.ts
bin/run-post-actions.js           → bin/run-post-actions.ts
server.js                         → server.ts
__tests__/index.test.js           → __tests__/index.test.ts
__tests__/packageChecker.test.js  → __tests__/packageChecker.test.ts
```

All `.js` import extensions **stay unchanged** — NodeNext resolves them to `.ts`.

---

## Step 5: Add Types to Source Files

### `src/routes.ts`
- Add `Routes` interface (return type of `buildRoutes`)
- Remove `// @ts-check`

### `src/packageChecker.ts`
Key types to add:
```typescript
type SupportedFormat = 'json' | 'toml';
interface LanguageHandler {
  expectedPackageName: string;
  getPackageName: (codePath: string) => string;
}
```
`ini.parse` and `JSON.parse` return `any` — cast `getFormat(filepath) as SupportedFormat` when indexing into `parsers`.

### `src/index.ts`
Add interfaces:
```typescript
interface ProjectMember {
  tests_on: boolean;
  project: { image_name: string; language: string; };
}
interface RunTestsParams { mountPath: string; projectPath: string; projectMemberId: number | string; verbose: boolean; }
interface RunPostActionsParams { mountPath: string; projectMemberId: number | string; verbose: boolean; }
interface PrepareProjectOptions extends RunTestsParams { codePath: string; projectSourcePath: string; projectMember: ProjectMember; }
```

Fixes needed:
- `yaml.load()` returns `unknown` → type-assert to inline interface
- `process.env.checkState` is `string | undefined` → use `?? ''` or `as string`
- `fs.readdirSync` with `{ recursive: true }` → add `{ encoding: 'utf-8' }` to get `string[]`
- `catch (e)` blocks → `e instanceof Error` guard before `e.stack` access

### `bin/run-tests.ts` / `bin/run-post-actions.ts`
- `catch (e)` → `e instanceof Error` guard (strict mode makes caught errors `unknown`)

### `server.ts`
- `fastify.server.address()` returns `string | AddressInfo | null` → add null/type check before `.port`

---

## Step 6: Update Test Files

Both test files need vitest imports added at the top:

### `__tests__/packageChecker.test.ts`
```typescript
import { describe, test, expect } from 'vitest';
```
Type the `notVerifiableProjects` array: `Array<string | null | undefined>` (TypeScript will complain about null/undefined otherwise).

### `__tests__/index.test.ts`
```typescript
import { it, expect } from 'vitest';
```
`it(name, fn, 50000)` timeout syntax is identical in Vitest — no change.
`nock.disableNetConnect()` works identically (patches `node:http`, not module system).

---

## Step 7: Update `package.json` Scripts

```json
"scripts": {
  "build-run-tests": "ncc build bin/run-tests.ts -o dist/run-tests -m --source-map",
  "build-run-post-actions": "ncc build bin/run-post-actions.ts -o dist/run-post-actions -m --source-map",
  "build": "npm run build-run-tests && npm run build-run-post-actions",
  "test": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

---

## Step 8: Update `Makefile`

```makefile
test:
    ACTIONS_RUNNER_DEBUG=1 npx vitest run

typecheck:
    npx tsc --noEmit
```

No other targets change.

---

## Critical Files

- `/home/feycot/projects/work/project-action/tsconfig.json` — new, defines module resolution
- `/home/feycot/projects/work/project-action/vitest.config.ts` — new, replaces Jest
- `/home/feycot/projects/work/project-action/.npmrc` — remove Jest ESM flag
- `/home/feycot/projects/work/project-action/src/index.ts` — largest file, all key interfaces
- `/home/feycot/projects/work/project-action/src/packageChecker.ts` — polymorphic type pattern
- `/home/feycot/projects/work/project-action/package.json` — script updates

---

## Verification

```bash
npx tsc --noEmit           # zero type errors
ACTIONS_RUNNER_DEBUG=1 npx vitest run   # all tests pass
npm run build              # dist/ builds successfully via ncc
npx @biomejs/biome check   # no lint errors
