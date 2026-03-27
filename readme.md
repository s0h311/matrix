# Matrix

## What is Matrix ?

Matrix spawns AFK (away from keyboard) agents (each named Smith) that work on Github issues subsequently.

## Requirements

- `node >= 24`
- `GH_TOKEN` environment variable with sufficient permissions in a `.env` file
- Claude Code subscription
- A PRD and subtasks as Github issues

## Setup

- Clone this repo, copy the absolute path on filesystem
- Create a `.matrix/config.json` file on root of your project (see [example config](./config.example.json))
- Create a script for running Matrix in your projects `package.json`.

```json
{
  ...,
  "scripts": {
    ...,
    "matrix": "node --env-file=.env <Path to Matrix>/src/index.ts"
  },
  ...
}
```

## Start building

Run `npm run matrix` or `pnpm matrix`

## Code Qualitiy

### Deterministic checks

It's recommended to use deterministic code quality and correctnes checks. Use the `checks` option in config to achieve this.
You can configure three checks: `checks.fmt`, `checks.lint` and `checks.test`.

_Example:_

```json
{
  ...,
  "checks": {
    "fmt": "pnpm fmt",
    "lint": "pnpm lint --format json",
    "test": "pnpm test --reporter agent"
  }
}
```

> We recommend to use as token efficient as possible. Especially,
> when you can save tokens without the code quality being degraded.
> This is why the additional `--format json` and `reporter agent` options are used for checks.
