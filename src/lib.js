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

import path from "node:path";

function parseInstallMode(value) {
  const mode = String(value ?? "auto").trim().toLowerCase() || "auto";
  if (mode !== "auto" && mode !== "always" && mode !== "never") {
    throw new Error(`unsupported install mode: ${mode}`);
  }
  return mode;
}

function normalizeOtaVersion(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "";
  }
  const normalized = String(value).trim();
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

function otaBinaryName(platform = process.platform) {
  return platform === "win32" ? "ota.exe" : "ota";
}

function otaInstallDirectories(env = process.env, platform = process.platform) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const directories = [];
  if (env.OTA_BIN_DIR) {
    directories.push(env.OTA_BIN_DIR);
  }
  if (platform === "win32" && env.LOCALAPPDATA) {
    directories.push(pathApi.join(env.LOCALAPPDATA, "ota", "bin"));
  }
  if (env.HOME) {
    directories.push(pathApi.join(env.HOME, ".local", "bin"));
    directories.push(pathApi.join(env.HOME, ".cargo", "bin"));
  }
  return [...new Set(directories)];
}

function pathEntries(env = process.env, platform = process.platform) {
  const delimiter = platform === "win32" ? path.win32.delimiter : path.posix.delimiter;
  return String(env.PATH || "")
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isPathLike(bin) {
  return bin.includes("/") || bin.includes("\\") || path.isAbsolute(bin);
}

function parseInstalledVersion(stdout) {
  const match = String(stdout ?? "").match(/v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  if (!match) {
    throw new Error(`unable to parse ota version from output: ${String(stdout ?? "").trim()}`);
  }
  const normalized = match[0];
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

function exposeBinaryDirectory(binaryPath, addPath, env = process.env, pathModule = path) {
  const directory = pathModule.dirname(binaryPath);
  const entries = String(env.PATH || "")
    .split(pathModule.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!entries.includes(directory)) {
    addPath(directory);
  }

  return directory;
}

export {
  exposeBinaryDirectory,
  isPathLike,
  normalizeOtaVersion,
  otaBinaryName,
  otaInstallDirectories,
  parseInstallMode,
  parseInstalledVersion,
  pathEntries
};
