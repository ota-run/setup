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

## What `v1` does

- installs ota through the official installer by default
- adds the ota binary directory to `PATH` for later steps in the same job
- supports Linux, macOS, and Windows GitHub Actions runners
- can reuse an existing ota binary or fail closed when installation is disabled
- exposes the selected binary path and resolved ota version as action outputs

## Intended workflow shape

Use `ota-run/setup` when a job needs direct `ota` commands later in the same job:

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: ota-run/setup@v1
  - run: ota run setup --stream
  - run: ota run ci --stream
```

Pair it with `ota-run/action@v1` when the workflow also needs GitHub-native readiness summaries,
annotations, comments, or receipt artifacts.

## Inputs

- `install`
  - `auto`, `always`, or `never`
  - default: `auto`
- `ota-version`
  - optional version such as `v1.4.4` or `1.4.4`
- `ota-bin`
  - Ota binary name or path to use after installation resolution
  - default: `ota`

## Outputs

- `ota-bin`
- `ota-version`
- `installed`

## Install behavior

- `install: auto` reuses an existing ota binary when present and installs ota only when missing
- `install: always` forces installer use before selecting the binary
- `install: never` requires ota to already exist and fails closed otherwise
- setting `ota-version` with `install: auto` promotes the run to installer mode so the requested version is honored

## Release model

The public action contract is published through Git tags:

- immutable semver tags such as `v1.0.0`
- a moving major tag such as `v1`

Release prep is Ota-native:

1. `ota run version:bump . --version patch`
2. commit and push `main`
3. create and push a semver tag such as `v1.0.0`

## Developing this repo

This repository is managed through Ota.

- `ota validate` checks the repo contract
- `ota run setup` installs local dependencies
- `ota run test` runs the test suite
- `ota run build` refreshes the bundled action output
- `ota run ci` runs the canonical verification path for this repo
- `ota run version:bump . --version patch` prepares the next release version without creating a tag

## License

Apache-2.0. See [LICENSE](./LICENSE).
