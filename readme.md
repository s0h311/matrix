# Matrix

## What is Matrix?

Matrix spawns AFK (away from keyboard) agents — each named Smith — that autonomously work through GitHub issues one by one.

## Requirements

- `node >= 24`
- A `.env` file with a `GH_TOKEN` set as environment variable with at least the following permissions:
  - Contents - Read-only
  - Issues - Read and write
  - Pull requests - Read and write
- Claude Code subscription
- A PRD broken down into subtasks as GitHub issues

## Setup

1. Clone this repo and copy its absolute path.
2. Create a `.matrix/config.json` file at the root of your project (see [example config](./config.example.json)).
3. Add a script to your project's `package.json`:

```json
{
  "scripts": {
    "matrix": "node --env-file=.env <path to Matrix>/src/index.ts"
  }
}
```

## Start building

Run `npm run matrix` or `pnpm matrix`.

## Code Quality

### Deterministic checks

It is recommended to configure deterministic code quality and correctness checks using the `checks` option in your config. Three checks are supported: `checks.fmt`, `checks.lint`, and `checks.test`.

_Example:_

```json
{
  "checks": {
    "fmt": "pnpm fmt",
    "lint": "pnpm lint --format json",
    "test": "pnpm test --reporter agent"
  }
}
```

> Keep check output as token-efficient as possible. The `--format json` and `--reporter agent` flags shown above are good examples — they reduce noise without sacrificing signal.
