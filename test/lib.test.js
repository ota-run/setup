//                █████
//               ░░███
//       ██████  ███████    ██████
//      ███░░███░░░███░    ░░░░░███
//     ░███ ░███  ░███      ███████
//     ░███ ░███  ░███ ███ ███░░███
//     ░░██████   ░░█████ ░░████████
//      ░░░░░░     ░░░░░   ░░░░░░░░
//
//   Copyright (C) 2026 — 2026, Ota. All Rights Reserved.
//
//   DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
//
//   Licensed under the Apache License, Version 2.0. See LICENSE for the full license text.
//   You may not use this file except in compliance with that License.
//   Unless required by applicable law or agreed to in writing, software distributed under the
//   License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
//   either express or implied. See the License for the specific language governing permissions
//   and limitations under the License.
//
//   If you need additional information or have any questions, please email: os@ota.run

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  describeInstallSource,
  existingRunnableFile,
  exposeBinaryDirectory,
  getEnvValue,
  installerEnvForSource,
  installerPrerequisiteNames,
  missingInstallerPrerequisiteMessage,
  normalizeOtaVersion,
  otaBinaryName,
  otaInstallDirectories,
  postInstallBinaryDirectories,
  parseInstallMode,
  parseSourceMode,
  parseInstalledVersion,
  pathEntries,
  resolveBootstrapSourceFromContract
} from "../src/lib.js";

test("normalizeOtaVersion prefixes bare versions", () => {
  assert.equal(normalizeOtaVersion("1.4.4"), "v1.4.4");
  assert.equal(normalizeOtaVersion("v1.4.4"), "v1.4.4");
  assert.equal(normalizeOtaVersion(""), "");
});

test("describeInstallSource renders release and git sources honestly", () => {
  assert.equal(describeInstallSource({ kind: "version", version: "1.6.22" }), "release v1.6.22");
  assert.equal(describeInstallSource({ kind: "version", version: "" }), "latest release");
  assert.equal(
    describeInstallSource({ kind: "git_rev", rev: "ec8e416cf07f7a6cfa13b61d1ec8d79e74c86f4d" }),
    "git revision ec8e416cf07f7a6cfa13b61d1ec8d79e74c86f4d"
  );
  assert.equal(
    describeInstallSource({ kind: "branch", branch: "1.6.22-implementation" }),
    "git branch 1.6.22-implementation"
  );
});

test("installerEnvForSource enables cargo cli fetch for git installs", () => {
  const versionEnv = installerEnvForSource(
    { kind: "version", version: "1.6.22" },
    { OTA_GIT_REV: "stale", PATH: "/usr/bin" }
  );
  assert.equal(versionEnv.OTA_VERSION, "v1.6.22");
  assert.equal(versionEnv.OTA_GIT_REV, undefined);
  assert.equal(versionEnv.CARGO_NET_GIT_FETCH_WITH_CLI, undefined);

  const gitRevEnv = installerEnvForSource(
    { kind: "git_rev", rev: "ec8e416cf07f7a6cfa13b61d1ec8d79e74c86f4d" },
    { PATH: "/usr/bin" }
  );
  assert.equal(gitRevEnv.OTA_GIT_REV, "ec8e416cf07f7a6cfa13b61d1ec8d79e74c86f4d");
  assert.equal(gitRevEnv.CARGO_NET_GIT_FETCH_WITH_CLI, "true");

  const branchEnv = installerEnvForSource(
    { kind: "branch", branch: "1.6.22-implementation" },
    { PATH: "/usr/bin", CARGO_NET_GIT_FETCH_WITH_CLI: "false" }
  );
  assert.equal(branchEnv.OTA_GIT_BRANCH, "1.6.22-implementation");
  assert.equal(branchEnv.CARGO_NET_GIT_FETCH_WITH_CLI, "true");
});

test("parseInstallMode accepts supported values", () => {
  assert.equal(parseInstallMode(""), "always");
  assert.equal(parseInstallMode("always"), "always");
  assert.equal(parseInstallMode("never"), "never");
  assert.throws(() => parseInstallMode("sometimes"), /unsupported install mode/i);
});

test("parseSourceMode accepts supported values", () => {
  assert.equal(parseSourceMode(""), "explicit");
  assert.equal(parseSourceMode("explicit"), "explicit");
  assert.equal(parseSourceMode("contract"), "contract");
  assert.throws(() => parseSourceMode("repo"), /unsupported source mode/i);
});

test("otaBinaryName follows platform conventions", () => {
  assert.equal(otaBinaryName("linux"), "ota");
  assert.equal(otaBinaryName("win32"), "ota.exe");
});

test("otaInstallDirectories includes standard unix paths", () => {
  const directories = otaInstallDirectories({ HOME: "/tmp/home" }, "linux");
  assert.deepEqual(directories, [
    "/tmp/home/.local/bin",
    "/tmp/home/.cargo/bin"
  ]);
});

test("otaInstallDirectories includes local app data on windows", () => {
  const directories = otaInstallDirectories({
    HOME: "C:\\Users\\bobai",
    LOCALAPPDATA: "C:\\Users\\bobai\\AppData\\Local"
  }, "win32");
  assert.deepEqual(directories, [
    "C:\\Users\\bobai\\AppData\\Local\\ota\\bin",
    "C:\\Users\\bobai\\.local\\bin",
    "C:\\Users\\bobai\\.cargo\\bin"
  ]);
});

test("otaInstallDirectories reads env keys case-insensitively on windows", () => {
  const directories = otaInstallDirectories({
    LocalAppData: "C:\\Users\\bobai\\AppData\\Local",
    Home: "C:\\Users\\bobai",
    USERPROFILE: "C:\\Users\\alt"
  }, "win32");
  assert.deepEqual(directories, [
    "C:\\Users\\bobai\\AppData\\Local\\ota\\bin",
    "C:\\Users\\bobai\\.local\\bin",
    "C:\\Users\\bobai\\.cargo\\bin"
  ]);
});

test("otaInstallDirectories falls back to USERPROFILE and HOMEDRIVE/HOMEPATH", () => {
  const withDrive = otaInstallDirectories({
    HOMEDRIVE: "C:",
    HOMEPATH: "\\Users\\runner",
    LocalAppData: "C:\\Users\\runner\\AppData\\Local"
  }, "win32");
  assert.deepEqual(withDrive, [
    "C:\\Users\\runner\\AppData\\Local\\ota\\bin",
    "C:\\Users\\runner\\.local\\bin",
    "C:\\Users\\runner\\.cargo\\bin"
  ]);
});

test("pathEntries reads PATH regardless of key casing", () => {
  const entries = pathEntries({ Path: "/usr/bin;/bin" }, "win32");
  assert.deepEqual(entries, ["/usr/bin", "/bin"]);
});

test("postInstallBinaryDirectories prefers OTA_BIN_DIR and install directories before PATH", () => {
  const directories = postInstallBinaryDirectories({
    OTA_BIN_DIR: "/tmp/ota-bin",
    HOME: "/tmp/home",
    PATH: "/tmp/home/.cargo/bin:/usr/bin:/tmp/home/.local/bin"
  }, "linux");
  assert.deepEqual(directories, [
    "/tmp/ota-bin",
    "/tmp/home/.local/bin",
    "/tmp/home/.cargo/bin",
    "/usr/bin",
  ]);
});

test("getEnvValue reads environment keys case-insensitively", () => {
  assert.equal(getEnvValue({ FoO: "bar" }, "foo"), "bar");
  assert.equal(getEnvValue({ PATH: "a;b" }, "path"), "a;b");
});

test("parseInstalledVersion extracts ota version output", () => {
  assert.equal(parseInstalledVersion("🦦 v1.4.4\n"), "v1.4.4");
  assert.equal(parseInstalledVersion("ota 1.4.4"), "v1.4.4");
  assert.throws(() => parseInstalledVersion("ready"), /unable to parse ota version/i);
});

test("installer prerequisites match hosted runner expectations", () => {
  assert.deepEqual(installerPrerequisiteNames("linux"), ["sh", "curl"]);
  assert.deepEqual(installerPrerequisiteNames("darwin"), ["sh", "curl"]);
  assert.deepEqual(installerPrerequisiteNames("win32"), ["pwsh"]);
});

test("missing installer prerequisite messages point to install never fallback", () => {
  assert.match(
    missingInstallerPrerequisiteMessage("curl", "linux"),
    /install the missing tool or use `install: never` with ota already on PATH/
  );
  assert.match(
    missingInstallerPrerequisiteMessage("pwsh", "win32"),
    /install PowerShell or use `install: never` with ota already on PATH/
  );
});

test("exposeBinaryDirectory adds missing directories", () => {
  const added = [];
  const env = { PATH: `/usr/bin${path.delimiter}/bin` };
  const directory = exposeBinaryDirectory("/tmp/ota/bin/ota", (value) => added.push(value), env);
  assert.equal(directory, "/tmp/ota/bin");
  assert.deepEqual(added, ["/tmp/ota/bin"]);
});

test("exposeBinaryDirectory does not add an existing directory twice", () => {
  const added = [];
  const env = { PATH: `/tmp/ota/bin${path.delimiter}/usr/bin` };
  exposeBinaryDirectory("/tmp/ota/bin/ota", (value) => added.push(value), env);
  assert.deepEqual(added, []);
});

test("existingRunnableFile rejects directories", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ota-setup-dir-"));
  await assert.rejects(async () => fs.access(path.join(directory, "missing")), /ENOENT/);
  assert.equal(await existingRunnableFile(directory), false);
  await fs.rm(directory, { recursive: true, force: true });
});

test("existingRunnableFile rejects non-executable files on posix", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX execute-bit semantics do not apply on Windows");
    return;
  }

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ota-setup-file-"));
  const file = path.join(directory, "ota");
  await fs.writeFile(file, "#!/bin/sh\necho ota\n");
  await fs.chmod(file, 0o644);
  assert.equal(await existingRunnableFile(file), false);

  await fs.chmod(file, 0o755);
  assert.equal(await existingRunnableFile(file), true);
  await fs.rm(directory, { recursive: true, force: true });
});

test("resolveBootstrapSourceFromContract reads structured version truth", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ota-setup-contract-"));
  const contract = path.join(directory, "ota.yaml");
  await fs.writeFile(contract, `version: 1
project:
  name: demo
agent:
  bootstrap:
    ota:
      source:
        kind: version
        version: 1.6.21
`);

  const resolved = await resolveBootstrapSourceFromContract(contract);
  assert.deepEqual(resolved, {
    contractPath: contract,
    kind: "version",
    version: "v1.6.21"
  });
  await fs.rm(directory, { recursive: true, force: true });
});

test("resolveBootstrapSourceFromContract reads structured git rev truth", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ota-setup-contract-"));
  const contract = path.join(directory, "ota.yaml");
  await fs.writeFile(contract, `version: 1
project:
  name: demo
agent:
  bootstrap:
    ota:
      source:
        kind: git_rev
        rev: 756b2b982e42de1b09a76a6d53c59962a94c2a30
`);

  const resolved = await resolveBootstrapSourceFromContract(directory);
  assert.deepEqual(resolved, {
    contractPath: contract,
    kind: "git_rev",
    rev: "756b2b982e42de1b09a76a6d53c59962a94c2a30"
  });
  await fs.rm(directory, { recursive: true, force: true });
});

test("resolveBootstrapSourceFromContract infers legacy shell truth", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ota-setup-contract-"));
  const contract = path.join(directory, "ota.yaml");
  await fs.writeFile(contract, `version: 1
project:
  name: demo
agent:
  bootstrap:
    ota:
      sh: curl -fsSL https://dist.ota.run/install.sh | OTA_GIT_BRANCH=1.6.21-implementation sh -s -- --from-git
`);

  const resolved = await resolveBootstrapSourceFromContract(contract);
  assert.deepEqual(resolved, {
    contractPath: contract,
    kind: "branch",
    branch: "1.6.21-implementation"
  });
  await fs.rm(directory, { recursive: true, force: true });
});
