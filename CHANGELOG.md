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
