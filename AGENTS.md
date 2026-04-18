<!--
                █████
               ░░███
       ██████  ███████    ██████
      ███░░███░░░███░    ░░░░░███
     ░███ ░███  ░███      ███████
     ░███ ░███  ░███ ███ ███░░███
     ░░██████   ░░█████ ░░████████
      ░░░░░░     ░░░░░   ░░░░░░░░

   Copyright (C) 2026 — 2026, Ota. All Rights Reserved.

   DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.

   Licensed under the Apache License, Version 2.0. See LICENSE for the full license text.
   You may not use this file except in compliance with that License.
   Unless required by applicable law or agreed to in writing, software distributed under the
   License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
   either express or implied. See the License for the specific language governing permissions
   and limitations under the License.

   If you need additional information or have any questions, please email: os@ota.run
-->

# AGENTS.md

Generated from `./ota.yaml`.

## Repo

- `project`: `@ota-run/setup`
- `description`: `Official GitHub Action for installing ota in GitHub Actions`

## Agent Contract

- `entrypoint`: `setup` (`ota run setup`)
- `default_task`: `ci` (`ota run ci`)
- `safe_tasks`: `setup` (`ota run setup`), `test` (`ota run test`), `build` (`ota run build`), `verify:dist` (`ota run verify:dist`), `ci` (`ota run ci`)
- `verify_after_changes`: `test` (`ota run test`), `build` (`ota run build`), `verify:dist` (`ota run verify:dist`)
- `writable_paths`: `src`, `dist`, `test`, `.github`, `lib`, `README.md`, `CHANGELOG.md`, `action.yml`, `package.json`, `package-lock.json`, `ota.yaml`, `.gitignore`
- `protected_paths`: `LICENSE`

## Bootstrap

Only install ota if it is missing and installation is approved.

- `sh`: `curl -fsSL https://dist.ota.run/install.sh | sh`
- `powershell`: `irm https://dist.ota.run/install.ps1 | iex`

## Architecture

This is a GitHub Action that bootstraps the `ota` CLI for use in GitHub Actions workflows.

**Key components:**
- `src/index.js`: Main action entry point that orchestrates installation and binary resolution
- `src/lib.js`: Utility functions for cross-platform binary detection, version parsing, and path manipulation
- `lib/bump-version.mjs`: Custom semver version bumper for package.json and package-lock.json
- `lib/verify-dist.mjs`: Git-based validator to ensure dist/ bundle stays in sync with source
- `dist/index.js`: Bundled action output (auto-generated via `npm run build`, committed to repo)

**Cross-platform concerns:**
- Binary resolution handles Windows executables (with .exe extension) and Unix binaries
- Path handling uses both forward slashes and backslashes appropriately per platform
- Installation directories check standard locations: `OTA_BIN_DIR` env var, `%LOCALAPPDATA%\ota\bin` on Windows, `~/.local/bin` and `~/.cargo/bin` on Unix
- Command execution via `spawn()` with platform-specific shell defaults (powershell on Windows, sh on Unix)

**Action inputs/outputs:**
- Inputs: `install` (auto|always|never), `ota-version` (optional semantic version), `ota-bin` (binary name or path)
- Outputs: `ota-bin` (resolved binary path), `ota-version` (installed version), `installed` (boolean)

## Development patterns

**Module system:** ES modules only (`"type": "module"` in package.json). Use `import` statements, Node.js built-in modules with `node:` prefix.

**Testing:** Node.js built-in test runner via `node:test` and `node:assert/strict`. Test file: `test/lib.test.js` tests utility functions in isolation with both Unix and Windows platform mocking.

**Build process:** `@vercel/ncc` bundles `src/index.js` into `dist/index.js` with licenses. The dist/ output is committed and must stay in sync (verified by `lib/verify-dist.mjs`). After source changes, always run `npm run build` and commit dist/.

**Version management:** `bump-version.mjs` reads package.json/package-lock.json, computes next semver, and writes back. Supports `major`, `minor`, `patch`, `prerelease`, or explicit semver (e.g., `1.2.3-rc.0`).

## Notes

Treat Ota as the default workflow for this repository.
Use `ota validate` to verify the repo contract.
Use `ota doctor` to inspect readiness and agent guidance.
Use `ota run setup` to install dependencies.
Use `ota run test` to verify the test suite.
Use `ota run build` to refresh the bundled action output.
Use `ota run verify:dist` to confirm `dist/` is committed and current.
Use `ota run ci` as the canonical verification path before release.
Use `ota run version:bump --version patch` to prepare the next release version.
Use `ota run version:bump --version minor` or `--version major` when you need a larger bump.
You do not need to know the current version first.
The task also accepts `prerelease` or an explicit semver value.
