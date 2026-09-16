# Linting & Code Quality Documentation

> **Project:** Advanced Next.js with Docker  
> **Linter:** ESLint v9+ (Flat Config) · **Type-checker:** TypeScript  
> **Git hooks:** Husky v9  
> **Package manager:** pnpm

---

## Table of Contents

1. [Overview](#overview)
2. [Enforcement Layers](#enforcement-layers)
3. [Husky Git Hooks](#husky-git-hooks)
4. [ESLint — Shared Philosophy](#eslint--shared-philosophy)
5. [Next.js App (`advanced_next_js`)](#nextjs-app-advanced_next_js)
   - [Plugins & Presets](#plugins--presets-nextjs)
   - [Naming Convention Rules](#naming-convention-rules)
   - [TypeScript Rules](#typescript-rules)
   - [General Code Quality Rules](#general-code-quality-rules)
   - [React-specific Rules](#react-specific-rules)
   - [File-type Overrides](#file-type-overrides-nextjs)
   - [Ignored Paths](#ignored-paths-nextjs)
6. [Express API (`node_js`)](#express-api-node_js)
   - [Plugins & Presets](#plugins--presets-nodejs)
   - [Differences from Next.js Config](#differences-from-nextjs-config)
   - [File-type Overrides](#file-type-overrides-nodejs)
   - [Ignored Paths](#ignored-paths-nodejs)
7. [TypeScript Strictness](#typescript-strictness)
8. [CI Enforcement](#ci-enforcement)
9. [Running Lint Locally](#running-lint-locally)
10. [Quick Reference — Rule Cheat Sheet](#quick-reference--rule-cheat-sheet)

---

## Overview

Both sub-projects (`advanced_next_js` and `node_js`) use **ESLint flat config** (`.mts` format, run via `tsx`/`jiti`) with a highly consistent rule set. The same naming convention, TypeScript safety, and code-quality rules apply to both — the only differences are React-specific plugins (Next.js only) and module system globals (browser+node vs. node-only).

Lint runs at **three points** in the development lifecycle:

```
git commit  →  Husky pre-commit  →  ESLint (both apps)
git push    →  Husky pre-push    →  tsc build (both apps)
PR opened   →  GitHub Actions CI →  ESLint (both apps, parallel matrix)
```

---

## Enforcement Layers

| Layer | Trigger | What runs | Blocks? |
|---|---|---|---|
| **Husky `pre-commit`** | `git commit` | `pnpm lint` on both apps | Yes — commit aborted |
| **Husky `pre-push`** | `git push` | `pnpm build` on both apps | Yes — push aborted |
| **CI (`ci.yml`) — Lint step** | PR opened/updated | `pnpm lint` on both apps (parallel matrix) | Yes — CI fails, no preview |
| **CI (`ci.yml`) — Test step** | PR opened/updated | `pnpm test` on both apps | Yes — CI fails, no preview |

> [!IMPORTANT]
> The pre-commit hook is the **first line of defence** — it catches lint errors before they ever reach GitHub. The CI step is the **safety net** that enforces the same rules for any commit that bypassed the hook (e.g. `--no-verify`).

---

## Husky Git Hooks

**Managed by:** Husky v9  
**Hook directory:** [`.husky/`](./.husky/)  
**Installed via:** `pnpm prepare` → runs `husky` (see `package.json` in `advanced_next_js`)

### `pre-commit` — Lint gate

**File:** [`.husky/pre-commit`](./.husky/pre-commit)

```sh
pnpm --dir advanced_next_js lint
pnpm --dir node_js lint
```

- Runs sequentially — `node_js` lint runs only after `advanced_next_js` passes.
- A failure in either exits with code 1, aborting the commit.
- Runs the `lint` script from each project's `package.json`, which resolves to plain `eslint` (ESLint v9 flat config auto-discovers `eslint.config.mts`).

### `pre-push` — Build gate

**File:** [`.husky/pre-push`](./.husky/pre-push)

```sh
pnpm --dir advanced_next_js build
pnpm --dir node_js build
```

- `advanced_next_js` build: `next build` — full Next.js production build including type-checking.
- `node_js` build: `tsc` — TypeScript compilation to `dist/`.
- Catches type errors that ESLint's type-aware rules might miss (e.g. missing `tsconfig` paths, broken module resolution).

> [!TIP]
> To bypass hooks in a genuine emergency: `git commit --no-verify` or `git push --no-verify`. This skips all hooks but **CI will still catch issues**.

---

## ESLint — Shared Philosophy

Both configs follow the same guiding principles:

1. **`snake_case` by default** — all identifiers (variables, functions, class members, types) default to `snake_case`. This is a deliberate project-wide convention to unify the backend and frontend codebases.
2. **`PascalCase` for types, classes, and React components** — respects language/framework conventions where `snake_case` would look wrong.
3. **Zero dead code** — unused imports and variables are errors, not warnings.
4. **Explicit over implicit** — return types, access modifiers, and type imports must all be explicit.
5. **Async safety** — floating promises and misused async callbacks are errors to prevent silent swallowed rejections.
6. **No `any`** — `any` is a hard error; the type system must be respected.
7. **Flat Config (ESLint v9+)** — both configs use `defineConfig` from `eslint/config` and `globalIgnores`. No legacy `.eslintignore` file.

---

## Next.js App (`advanced_next_js`)

**Config file:** [`advanced_next_js/eslint.config.mts`](./advanced_next_js/eslint.config.mts)

### Plugins & Presets (Next.js)

| Plugin / Preset | Package | Applied to |
|---|---|---|
| `js/recommended` | `@eslint/js` | All JS/TS files |
| `tseslint.configs.recommended` | `typescript-eslint` | All files (base TS rules) |
| `react-hooks/recommended-latest` | `eslint-plugin-react-hooks` | All JS/TS/JSX/TSX |
| `@eslint-react/recommended-type-checked` | `@eslint-react/eslint-plugin` | All JS/TS/JSX/TSX |
| `unused-imports` | `eslint-plugin-unused-imports` | TS files only |
| `markdown/recommended` (GFM) | `@eslint/markdown` | `*.md` files |
| `css/recommended` | `@eslint/css` | `*.css` files |

**Global environment:** `globals.browser` + `globals.node` (both available, since Next.js runs in both).

---

### Naming Convention Rules

Applied to all **TypeScript files** (`*.ts`, `*.mts`, `*.cts`, `*.tsx`).  
Rule: `@typescript-eslint/naming-convention` → **error**

| Selector | Allowed formats | Notes |
|---|---|---|
| Default (catch-all) | `snake_case` | Leading `_` allowed; trailing `_` forbidden |
| Destructured variable | Any (`format: null`) | Can't enforce format on destructured names |
| Property/method needing quotes | Any (`format: null`) | e.g. `"Content-Type"` in object literals |
| Variable | `snake_case`, `PascalCase`, `UPPER_CASE` | Leading `_` allowed |
| Variable ending in `Ref` | `camelCase` | e.g. `inputRef`, `containerRef` — React ref naming |
| Variable/function starting with `use` or `set` | `camelCase`, `snake_case` | Accommodates React hooks (`useState`, `useEffect`) |
| Function | `snake_case`, `PascalCase` | `PascalCase` for React components |
| Parameter | `snake_case`, `camelCase` | Leading `_` allowed (for unused params) |
| Class property / method | `snake_case` | Leading `_` allowed |
| Class / type-like | `PascalCase` | Interfaces, type aliases, enums, classes |
| Object literal property/method | `snake_case`, `camelCase` | Accommodates API response shapes |
| Type property/method | `snake_case`, `camelCase` | Same as object literals |
| Enum member | `UPPER_CASE` | e.g. `Status.ACTIVE` |
| Import | `camelCase`, `PascalCase`, `snake_case`, `UPPER_CASE` | Any — can't control third-party names |
| Config files | `naming-convention` **off** | `next.config.*`, `tailwind.config.*`, etc. |

**Why `snake_case` as the default?**  
Both the Express API and the Next.js frontend share type definitions and communicate over JSON. Using `snake_case` throughout reduces the mental overhead of switching contexts and eliminates the need for a camelCase↔snake_case transformation layer. React components and TypeScript types use `PascalCase` where the ecosystem requires it.

---

### TypeScript Rules

#### Unused code

| Rule | Severity | Behaviour |
|---|---|---|
| `no-unused-vars` | off | Disabled in favour of the plugin version |
| `@typescript-eslint/no-unused-vars` | off | Disabled in favour of `unused-imports` plugin |
| `unused-imports/no-unused-imports` | **error** | Import statements that are never used are removed |
| `unused-imports/no-unused-vars` | **error** | Variables prefixed with `_` are exempted |

**Why the plugin over the built-in?** `eslint-plugin-unused-imports` reports imports and variables separately and provides auto-fix for import removal, which the built-in rule cannot do cleanly.

#### Function signatures

| Rule | Severity | Config | Why |
|---|---|---|---|
| `@typescript-eslint/explicit-function-return-type` | **error** | `allowExpressions`, `allowHigherOrderFunctions`, `allowDirectConstAssertionInArrowFunctions` = true | Forces explicit return types on named/exported functions. Inline arrow expressions and HOF callbacks are exempt to avoid noise. |
| `@typescript-eslint/explicit-module-boundary-types` | off | — | Redundant with `explicit-function-return-type`. |
| `@typescript-eslint/explicit-member-accessibility` | **error** | `constructors: "no-public"`, accessors explicit | Class members must be marked `public`, `private`, or `protected`. Constructors don't need `public` (it's the default). |

#### Type safety

| Rule | Severity | Why |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | **error** | `any` defeats the purpose of TypeScript. Use `unknown` + narrowing. |
| `@typescript-eslint/no-non-null-assertion` | **warn** | `!` assertions hide potential null-deref bugs. Worth reviewing, but not always avoidable. |
| `@typescript-eslint/no-unnecessary-type-assertion` | **error** | Removing redundant `as Type` keeps the code clean and avoids misleading readers. |
| `@typescript-eslint/no-unsafe-assignment` | **warn** | Assigning `any` to a typed variable is suspicious. Downgraded to warn on `.tsx` files to reduce noise with third-party JSX. |
| `@typescript-eslint/no-unsafe-call` | off | Too noisy with some third-party libraries. |
| `@typescript-eslint/no-unsafe-member-access` | **warn** | Accessing members of `any` loses type info. |
| `@typescript-eslint/no-unsafe-return` | **warn** | Returning `any` propagates unsafety. |
| `@typescript-eslint/no-shadow` | **error** | Variable shadowing creates hard-to-trace bugs. `no-shadow` (base) is off to avoid false positives with TS type declarations. |

#### Import style

| Rule | Severity | Config | Why |
|---|---|---|---|
| `@typescript-eslint/consistent-type-imports` | **error** | `prefer: "type-imports"`, `fixStyle: "inline-type-imports"` | Type-only imports must use `import { type X }`. Enables better tree-shaking and avoids circular dep issues in some bundlers. |
| `@typescript-eslint/consistent-type-exports` | **error** | — | Same reasoning as above but for exports. |
| `no-duplicate-imports` | **error** | — | All imports from the same module must be in one statement. |

#### Async / Promise safety

| Rule | Severity | Config | Why |
|---|---|---|---|
| `@typescript-eslint/no-floating-promises` | **error** | — | A Promise that isn't awaited or `.catch()`-ed will silently swallow errors. This is a common source of hard-to-debug bugs in async-heavy Next.js code. |
| `@typescript-eslint/no-misused-promises` | **error** | `checksVoidReturn: { attributes: false }` | Prevents passing async functions where a void callback is expected (e.g. event handlers). `attributes: false` exempts JSX event handlers like `onClick={async () => {}}`. |
| `@typescript-eslint/await-thenable` | **error** | — | Catches `await nonPromise()` — a common typo. |
| `no-return-await` | **error** | — | `return await x` inside a non-try block adds an unnecessary microtask tick. |

#### Null / undefined handling

| Rule | Severity | Why |
|---|---|---|
| `@typescript-eslint/prefer-nullish-coalescing` | **warn** | Prefer `??` over `\|\|` when the intent is to handle `null`/`undefined` specifically, not all falsy values. |
| `@typescript-eslint/prefer-optional-chain` | **warn** | `a?.b?.c` is safer and shorter than `a && a.b && a.b.c`. |

---

### General Code Quality Rules

These are standard ESLint rules (not TypeScript-specific), applied to all files:

| Rule | Severity | Config | Why |
|---|---|---|---|
| `prefer-const` | **error** | — | Signals immutability intent. `let` should only be used when the variable is actually reassigned. |
| `no-console` | **error** | `allow: ["warn", "error"]` | `console.log` in production code is noise. Use a proper logger or `console.warn`/`console.error` for legitimate warnings. |
| `eqeqeq` | **error** | `"always"`, `null: "ignore"` | Always use `===`. The `null: "ignore"` exception allows `x == null` to catch both `null` and `undefined`. |
| `curly` | **error** | `"all"` | Every `if`/`else`/`for`/`while` body must have braces — even single-line. Prevents the classic off-by-one bug when adding a line. |
| `no-unneeded-ternary` | **error** | — | `x ? true : false` → just use `x`. |
| `prefer-template` | **error** | — | Template literals over string concatenation. Easier to read and avoids coercion surprises. |
| `object-shorthand` | **error** | `"always"` | `{ foo: foo }` → `{ foo }`. |
| `no-param-reassign` | **error** | `props: true` | Reassigning function parameters (including their properties) is a common source of bugs. Mutate a local copy instead. |
| `no-else-return` | **error** | `allowElseIf: false` | When a branch ends in `return`, the `else` block is dead code structure. Early return pattern is preferred. |

---

### React-specific Rules

| Rule | Severity | Why |
|---|---|---|
| `react-hooks/rules-of-hooks` | **error** | Hooks must only be called at the top level of a function component or custom hook. |
| `react-hooks/exhaustive-deps` | **warn** | Missing `useEffect`/`useCallback`/`useMemo` dependencies cause stale closures. A warning (not error) because there are legitimate cases for suppression. |

**`@eslint-react/recommended-type-checked`** adds type-aware React rules:
- No unsafe component types
- Correct key prop usage
- Ref handling correctness  
- Display name requirements for debugging

---

### File-type Overrides (Next.js)

#### `.tsx` files
```
"@typescript-eslint/no-unsafe-assignment": "off"
```
Third-party component libraries often return `any`-typed props. This override prevents noisy warnings in JSX files where the risk is lower than in logic files.

#### Config files (`*.config.*`, `next.config.*`, etc.)
```
"@typescript-eslint/naming-convention": "off"
```
Config files frequently use camelCase keys (e.g. `moduleNameMapper`, `reactStrictMode`) that conflict with the project's `snake_case` convention. Naming rules are disabled for these files.

#### Test files (`*.test.*`, `*.spec.*`, `__tests__/**`)
```
"@typescript-eslint/no-explicit-any": "off"
"@typescript-eslint/no-non-null-assertion": "off"
"no-console": "off"
```
Tests often need `any` for mocks, `!` for test assertions, and `console` for debugging during development.

#### Markdown files (`*.md`)
- Plugin: `@eslint/markdown` with `markdown/gfm` language
- Extends: `markdown/recommended`
- Lints fenced code blocks within Markdown files

#### CSS files (`*.css`)
- Plugin: `@eslint/css` with `css/css` language
- Extends: `css/recommended`, `tolerant: true`
- **Disabled rules:**
  - `css/no-invalid-at-rules` — Tailwind's `@tailwind` and `@apply` directives are non-standard
  - `css/use-baseline` — allows modern CSS features not yet at baseline
  - `css/no-important` — `!important` is sometimes necessary with utility-first CSS

---

### Ignored Paths (Next.js)

```
coverage/**   .next/**   out/**   build/**
eslint.config.mts   next-env.d.ts   package.json
postcss.config.mjs   pnpm-lock.yaml   pnpm-workspace.yaml
next.config.ts   .env.*   README.md   node_modules/**
```

---

## Express API (`node_js`)

**Config file:** [`node_js/eslint.config.mts`](./node_js/eslint.config.mts)

### Plugins & Presets (Node.js)

| Plugin / Preset | Package | Applied to |
|---|---|---|
| `js/recommended` | `@eslint/js` | All JS/TS files |
| `tseslint.configs.recommended` | `typescript-eslint` | All files |
| `unused-imports` | `eslint-plugin-unused-imports` | TS files only |
| `markdown/recommended` (GFM) | `@eslint/markdown` | `*.md` files |

**Global environment:** `globals.node` only (no browser globals — this is a pure server runtime).

**Notable difference:** `projectService.allowDefaultProject: ["jest.config.ts"]` — the Jest config file is outside the `src/` tree but needs type-aware linting, so it's explicitly allowed into the TypeScript project service.

---

### Differences from Next.js Config

| Aspect | `advanced_next_js` | `node_js` |
|---|---|---|
| React plugins | `eslint-plugin-react-hooks`, `@eslint-react/eslint-plugin` | **None** — no React |
| CSS linting | `@eslint/css` | **None** |
| Globals | `browser` + `node` | `node` only |
| `.tsx` override | `no-unsafe-assignment: off` | **None** (no TSX files) |
| Variable/function naming | Includes `use`/`set` prefix rule (React hooks) | **No `use`/`set` filter** |
| `react-hooks/rules-of-hooks` | **error** | **Not present** |
| `react-hooks/exhaustive-deps` | **warn** | **Not present** |
| TypeScript target | `ES2017` (browser compat) | `ES2022` (Node.js 18+) |

Everything else — naming conventions, TypeScript safety rules, async rules, code quality rules, test overrides — is **identical** between both configs.

---

### File-type Overrides (Node.js)

#### Config files (`*.config.*`, `prettier.config.*`)
```
"@typescript-eslint/naming-convention": "off"
```

#### Test files
```
"@typescript-eslint/no-explicit-any": "off"
"@typescript-eslint/no-non-null-assertion": "off"
"no-console": "off"
```

#### Markdown files
Same as Next.js — `@eslint/markdown` with GFM.

---

### Ignored Paths (Node.js)

```
dist/**   build/**   eslint.config.mts
package.json   pnpm-lock.yaml   .env.*   README.md   node_modules/**
```

---

## TypeScript Strictness

Both projects use `"strict": true` in their `tsconfig.json`, which enables:

- `strictNullChecks` — `null` and `undefined` are not assignable to other types
- `noImplicitAny` — variables must have explicit or inferable types
- `strictFunctionTypes` — function parameter types are checked contravariantly
- `strictBindCallApply` — `bind`/`call`/`apply` are type-checked
- `strictPropertyInitialization` — class properties must be initialised in the constructor

**Additional flags in `node_js` only:**

| Flag | Effect |
|---|---|
| `noImplicitReturns` | Every code path in a function must return a value |
| `noFallthroughCasesInSwitch` | Switch cases must have a `break` or `return` |
| `noUnusedLocals` | TypeScript itself errors on unused local variables (complements ESLint rule) |

**TypeScript versions:**

| Project | Version |
|---|---|
| `advanced_next_js` | TypeScript 5.x (`typescript@^5.9.3`) |
| `node_js` | TypeScript 6.x (`@typescript/typescript6@^6.0.2`) with native TypeScript checker (`@typescript/native`) |

The Node.js project is on TypeScript 6 with the native Go-based compiler for significantly faster type-checking during builds.

---

## CI Enforcement

**Workflow:** [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)  
**Trigger:** Pull Request — `opened`, `synchronize`, `reopened`

The CI runs lint and tests in a **parallel matrix** — both apps run simultaneously:

```yaml
strategy:
  fail-fast: false       # Both legs always run and report independently
  matrix:
    project:
      - name: next_js
        path: advanced_next_js
      - name: node_js
        path: node_js
```

#### CI Lint step

```yaml
- name: Lint
  working-directory: ${{ matrix.project.path }}
  run: pnpm lint
```

Runs exactly the same `eslint` command as the Husky hook — no special CI flags.

#### CI Test step

```yaml
- name: Test
  run: |
    if grep -q '"test"' package.json; then
      pnpm test
    else
      echo "No test script found, skipping."
    fi
```

Gracefully skips if a project has no test script, so adding a new sub-project won't break the matrix.

#### On failure → Slack notification

Any lint or test failure sends a Slack alert via `SLACK_WEBHOOK_URL` with:
- Which matrix leg failed (`next_js` / `node_js`)
- PR number and title
- Branch, commit SHA, actor
- Direct link to the Actions run logs

#### Gate: Preview deployment is blocked

The `preview` job has `needs: ci` and `if: needs.ci.result == 'success'`. This means:
- **If lint fails** → no preview environment is created
- **If tests fail** → no preview environment is created

The PR author gets immediate feedback from CI before any infrastructure is touched.

---

## Running Lint Locally

### Lint a single project

```bash
# Next.js app
pnpm --dir advanced_next_js lint

# Express API
pnpm --dir node_js lint
```

### Lint both (same as pre-commit hook)

```bash
pnpm --dir advanced_next_js lint && pnpm --dir node_js lint
```

### Auto-fix fixable issues

```bash
# Next.js
pnpm --dir advanced_next_js exec eslint --fix .

# Node.js
pnpm --dir node_js exec eslint --fix .
```

> [!NOTE]
> `unused-imports/no-unused-imports` supports auto-fix — running `--fix` will automatically remove unused import statements.

### Type-check without building

```bash
# Next.js (noEmit)
pnpm --dir advanced_next_js exec tsc --noEmit

# Node.js
pnpm --dir node_js exec tsc --noEmit
```

---

## Quick Reference — Rule Cheat Sheet

### ✅ Valid — Do this

```ts
// snake_case for variables and functions
const user_name = "Alice";
function get_user_details(): Promise<User[]> { ... }

// PascalCase for components and types
type UserProfile = { ... };
class UserRepository { ... }
function UserCard({ user }: Props): JSX.Element { ... }

// UPPER_CASE for enum members and constants
enum Status { ACTIVE, INACTIVE }
const MAX_RETRIES = 3;

// Explicit return types on exported functions
export async function fetch_data(): Promise<Result<Data>> { ... }

// Explicit class access modifiers
class MyClass {
  public my_method(): void { ... }
  private _state: string;
  // no 'public' on constructor
  constructor() { ... }
}

// Type-only imports
import { type User } from "@type/index";

// Nullish coalescing
const name = user.name ?? "Anonymous";

// Optional chaining
const city = user?.address?.city;

// Template literals
const msg = `Hello, ${user_name}`;

// Object shorthand
const obj = { user_name, user_id };

// Early return (no else after return)
if (!user) return null;
return <UserCard user={user} />;

// Prefix unused params with _
function handler(_req: Request, res: Response): void { ... }

// await Promises (no floating)
await send_email(user.email);
```

### ❌ Invalid — Don't do this

```ts
// camelCase for regular variables (unless hooks)
const userName = "Alice";          // ❌ use user_name

// any
const data: any = fetch();         // ❌ use unknown + narrowing

// Unused imports
import { unused } from "./utils";  // ❌ remove it

// Non-null assertion (prefer narrowing)
const el = document.getElementById("app")!;  // ⚠️ warn

// console.log in production code
console.log("debug");              // ❌ use console.warn/error

// Floating promise
send_email(user.email);            // ❌ must await or .catch()

// == instead of ===
if (x == 0) { ... }                // ❌ use ===

// No braces on if body
if (error) return;                 // ❌ must use { }

// String concatenation
const msg = "Hello, " + name;     // ❌ use template literal

// else after return
if (error) {
  return null;
} else {                           // ❌ remove else
  return <Content />;
}

// Parameter reassignment
function process(items: Item[]) {
  items = items.filter(...);       // ❌ assign to new const
}

// return await (outside try/catch)
return await fetch_data();         // ❌ just return fetch_data()
```

