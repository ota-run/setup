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

## Current repo status

This repository is scaffolded and Ota-managed, but the action contract is not implemented yet.

That means:

- the repo is ready for the dedicated setup-action implementation
- the public boundary is defined
- the implementation should land here instead of overloading `ota-run/action`

## Developing this repo

This repository is managed through Ota.

- `ota validate` checks the repo contract
- `ota run ci` runs the canonical verification path for this repo

## License

Apache-2.0. See [LICENSE](./LICENSE).
