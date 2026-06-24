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

# `ota-run/setup`

Official GitHub Action for installing ota in GitHub Actions.

This repository is the dedicated setup/install surface for the Ota GitHub ecosystem:

- install `ota`
- put `ota` on `PATH` for later workflow steps
- keep installer behavior separate from readiness reporting

That boundary is intentional:

- [`ota-run/action`](https://github.com/ota-run/action) is the GitHub-native reporting wrapper
- `ota-run/setup` is the installer/bootstrap wrapper

The plain hosted installers are now stronger in GitHub Actions too: when they run inside Actions,
they export the resolved ota bin directory to `GITHUB_PATH` automatically, including the Windows
`%LOCALAPPDATA%\\ota\\bin` path. `ota-run/setup` remains the preferred wrapper when you want a
first-party GitHub Action surface with explicit outputs and deterministic binary selection.

## What `v1` does

- installs ota through the official installer by default
- adds the ota binary directory to `PATH` for later steps in the same job
- supports Linux, macOS, and Windows GitHub Actions runners
- can fail closed when installation is disabled
- can derive install truth from `agent.bootstrap.ota.source` in `ota.yaml`
- exposes the selected binary path and resolved ota version as action outputs

## Intended workflow shape

Use `ota-run/setup` when a job needs direct `ota` commands later in the same job:

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: ota-run/setup@v1
  - run: ota doctor
  - run: ota run setup --stream
  - run: ota run ci --stream
```

Pair it with `ota-run/action@v1` when the workflow also needs GitHub-native readiness summaries,
annotations, comments, or receipt artifacts.

Use contract mode when the repo already owns Ota bootstrap truth in `ota.yaml` and the workflow
should not restate `OTA_VERSION`, `OTA_GIT_REV`, `OTA_GIT_BRANCH`, or `--from-git` separately:

```yaml
steps:
  - uses: actions/checkout@v6
  - uses: ota-run/setup@v1
    with:
      source: contract
  - run: ota run ci --stream
```

Use the plain installer directly only when you intentionally do not want the GitHub Action wrapper.
For example, a minimal workflow step such as `curl -fsSL https://dist.ota.run/install.sh | sh` is
now safe in GitHub Actions without extra PATH glue, but it does not give you the setup action's
outputs or explicit install policy surface.

## Recommended workflow

Use `ota-run/setup@v1` when you want raw Ota commands to be the job contract:

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: ota-run/setup@v1
  - run: ota doctor
  - run: ota run ci --stream
```

Use a pinned installer version when you want tighter rollout control:

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: ota-run/setup@v1
    with:
      ota-version: v1.5.0
  - run: ota doctor
```

Use `source: contract` when the repo contract is the single source of truth:

```yaml
steps:
  - uses: actions/checkout@v6
  - uses: ota-run/setup@v1
    with:
      source: contract
      contract-path: ota.yaml
  - run: ota doctor
```

Use `install: never` on self-hosted runners when Ota should already be provisioned and the job must fail closed instead of mutating the runner:

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: ota-run/setup@v1
    with:
      install: never
  - run: ota --version
```

## Inputs

- `install`
  - `always` or `never`
  - default: `always`
- `source`
  - `explicit` or `contract`
  - default: `explicit`
- `contract-path`
  - path to `ota.yaml` or a repo directory containing it when `source=contract`
  - default: `ota.yaml`
- `ota-version`
  - optional version such as `v1.4.4` or `1.4.4` when `source=explicit`
- `ota-bin`
  - Ota binary name or path to use after installation resolution
  - default: `ota`

## Outputs

- `ota-bin`
- `ota-version`
- `installed`
- `source-kind`
- `source-version`
- `source-git-rev`
- `source-git-branch`
- `contract-path`

## Install behavior

- `install: always` forces installer use before selecting the binary
- `install: never` requires ota to already exist and fails closed otherwise
- `source: explicit` keeps workflow-owned install truth, optionally through `ota-version`
- `source: contract` reads `agent.bootstrap.ota.source` from the checked-out contract and supports
  structured `kind: version`, `kind: git_rev`, `kind: branch`, plus legacy shell inference
- when that resolved source is a git revision or branch, the action enables Cargo's CLI git fetch
  path through `CARGO_NET_GIT_FETCH_WITH_CLI=true` so unreleased source installs are more reliable
  on hosted runners
- the supported target is GitHub Actions runners; self-hosted runners should provide `pwsh` on Windows or `sh` plus `curl` on Unix-like runners when installer mode is used
- when those installer prerequisites are missing, the action now fails with an explicit message telling operators to install the missing tool or switch to `install: never`

## Release model

The public action contract is published through Git tags:

- immutable semver tags such as `v1.0.0`
- a moving major tag such as `v1`

Release prep is Ota-native:

1. `ota run version:bump --version patch`
   Put Ota command flags before task inputs, for example `ota run version:bump --stream --version patch`.
2. commit and push `main`
3. create and push a semver tag such as `v1.0.0`

## Developing this repo

This repository is managed through Ota.

- `ota validate` checks the repo contract
- `ota run setup` installs local dependencies
- `ota run test` runs the test suite
- `ota run build` refreshes the bundled action output
- `ota run ci` runs the canonical verification path for this repo
- `ota run version:bump --version patch` prepares the next release version without creating a tag

## License

Apache-2.0. See [LICENSE](./LICENSE).
