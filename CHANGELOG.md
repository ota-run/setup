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

# Changelog

## Unreleased

- hardened git-revision and branch installs by exporting `CARGO_NET_GIT_FETCH_WITH_CLI=true`
  through the official installer path when `source: contract` or explicit git source truth selects
  an unreleased Ota revision, so GitHub Actions jobs no longer depend on Cargo's flakier libgit
  transport for repo-owned source installs
- fixed setup action install logging so contract-owned git revision and branch installs are
  reported as `git revision ...` / `git branch ...` instead of the misleading generic `latest`
  release wording
- fixed the setup repo's own bootstrap truth to use an exact Ota git revision during `1.6.21`
  pressure testing instead of incorrectly claiming unreleased `v1.6.21` release truth in
  `agent.bootstrap.ota.source`
- fixed the setup repo's own `Ota Readiness` workflow to install Ota from the repo contract
  first and run `ota-run/action` with `install: never`, so readiness proof no longer falls back
  to released `v1.6.20` while the repo contract is pressure-testing unreleased structured
  bootstrap truth

## 1.0.7 - 2026-06-19

- fixed the setup repo’s own self-hosting workflows to execute the checked-out local action
  (`uses: ./`) instead of the previously published `ota-run/setup@v1`, so CI and tagged releases
  now verify the current repo state rather than an older already-published action build

## 1.0.6 - 2026-06-19

- fixed the setup repo’s own CI and release workflows to consume repo-owned bootstrap truth
  through `ota-run/setup@v1` with `source: contract`, so tagged releases no longer pin an older
  Ota binary that cannot parse the repository’s current `agent.bootstrap.ota.source` contract

## 1.0.5 - 2026-06-19

- fixed `source: contract` with `install: never`, so the setup action now correctly resolves and
  uses an existing ota binary on PATH instead of incorrectly rejecting contract-derived version
  truth as if it were an explicit `ota-version` request

## 1.0.4 - 2026-06-19

- widened `ota-run/setup` with a contract-owned install mode: workflows can now set
  `source: contract` and optionally `contract-path`, letting the action read
  `agent.bootstrap.ota.source` from `ota.yaml` and install the matching released version,
  deterministic git revision, or pressure-testing branch without duplicating install truth in
  workflow YAML

## 1.0.3 - 2026-06-13

- aligned the setup action guidance with the stronger ota installer contract: GitHub Actions jobs
  can now use the plain hosted installers without hand-written `GITHUB_PATH` glue because the
  installers export the resolved bin directory automatically, while `ota-run/setup` remains the
  preferred first-party wrapper when workflows want explicit outputs and deterministic binary
  selection
- aligned release docs and contract guidance with the current `ota run version:bump --version ...` form, including the rule that Ota command flags such as `--stream` should appear before task inputs.
- added explicit installer prerequisite failures for missing `pwsh`, `sh`, or `curl`, with guidance to use `install: never` when runners are pre-provisioned.
- strengthened the README examples around the intended `ota-run/setup` workflow: install Ota, then run raw `ota doctor` / `ota run ...` commands directly in the job.
- removed `install: auto` so the action now has a deterministic `always`/`never` contract with `always` as the default.

## 1.0.2 - 2026-04-12

- fixed `ota run version:bump` so multi-segment prerelease identifiers and build metadata are parsed correctly instead of being truncated or misread.

## 1.0.1 - 2026-04-12

- tightened binary discovery so the setup action only accepts runnable files instead of any existing filesystem entry, and documented the GitHub Actions runner shell prerequisites for installer mode on self-hosted runners.

## 1.0.0 - 2026-04-12

- implemented `ota-run/setup` as the dedicated GitHub Action for installing ota into GitHub Actions jobs, exposing the selected binary path, resolved version, and install mode behavior without overloading `ota-run/action`.
