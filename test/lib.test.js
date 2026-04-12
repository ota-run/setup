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
import path from "node:path";

import {
  exposeBinaryDirectory,
  normalizeOtaVersion,
  otaBinaryName,
  otaInstallDirectories,
  parseInstallMode,
  parseInstalledVersion
} from "../src/lib.js";

test("normalizeOtaVersion prefixes bare versions", () => {
  assert.equal(normalizeOtaVersion("1.4.4"), "v1.4.4");
  assert.equal(normalizeOtaVersion("v1.4.4"), "v1.4.4");
  assert.equal(normalizeOtaVersion(""), "");
});

test("parseInstallMode accepts supported values", () => {
  assert.equal(parseInstallMode("auto"), "auto");
  assert.equal(parseInstallMode("always"), "always");
  assert.equal(parseInstallMode("never"), "never");
  assert.throws(() => parseInstallMode("sometimes"), /unsupported install mode/i);
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

test("parseInstalledVersion extracts ota version output", () => {
  assert.equal(parseInstalledVersion("🦦 v1.4.4\n"), "v1.4.4");
  assert.equal(parseInstalledVersion("ota 1.4.4"), "v1.4.4");
  assert.throws(() => parseInstalledVersion("ready"), /unable to parse ota version/i);
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
