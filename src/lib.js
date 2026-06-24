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

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

function getEnvValue(env, key) {
  const direct = env[key];
  if (direct !== undefined) {
    return direct;
  }

  const normalizedKey = String(key).toLowerCase();
  for (const candidateKey of Object.keys(env)) {
    if (candidateKey.toLowerCase() === normalizedKey) {
      return env[candidateKey];
    }
  }

  return undefined;
}

function parseInstallMode(value) {
  const mode = String(value ?? "always").trim().toLowerCase() || "always";
  if (mode !== "always" && mode !== "never") {
    throw new Error(`unsupported install mode: ${mode}`);
  }
  return mode;
}

function parseSourceMode(value) {
  const mode = String(value ?? "explicit").trim().toLowerCase() || "explicit";
  if (mode !== "explicit" && mode !== "contract") {
    throw new Error(`unsupported source mode: ${mode}`);
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

function describeInstallSource(source) {
  if (source?.kind === "version") {
    return source.version ? `release ${normalizeOtaVersion(source.version)}` : "latest release";
  }
  if (source?.kind === "git_rev" && source.rev) {
    return `git revision ${source.rev}`;
  }
  if (source?.kind === "branch" && source.branch) {
    return `git branch ${source.branch}`;
  }
  return "latest release";
}

function installerEnvForSource(source, baseEnv = process.env) {
  const env = { ...baseEnv };
  delete env.OTA_VERSION;
  delete env.OTA_GIT_REV;
  delete env.OTA_GIT_BRANCH;

  if (source?.kind === "version" && source.version) {
    env.OTA_VERSION = normalizeOtaVersion(source.version);
    return env;
  }

  if (source?.kind === "git_rev" && source.rev) {
    env.OTA_GIT_REV = source.rev;
    env.CARGO_NET_GIT_FETCH_WITH_CLI = "true";
    return env;
  }

  if (source?.kind === "branch" && source.branch) {
    env.OTA_GIT_BRANCH = source.branch;
    env.CARGO_NET_GIT_FETCH_WITH_CLI = "true";
    return env;
  }

  return env;
}

function stripWrappingQuotes(value) {
  const text = String(value ?? "");
  if ((text.startsWith("\"") && text.endsWith("\"")) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function stripInlineComment(value) {
  let out = "";
  let inSingle = false;
  let inDouble = false;
  let prev = "";

  for (const ch of String(value ?? "")) {
    if (ch === "\"" && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === "#" && !inSingle && !inDouble) {
      break;
    }
    out += ch;
    prev = ch;
  }

  return out.trim();
}

function parseTargetedYamlFields(text, fieldPaths) {
  const targetSet = new Set(fieldPaths);
  const values = new Map();
  const keys = [];
  const indents = [];

  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) {
      continue;
    }

    let indent = 0;
    while (indent < rawLine.length && rawLine[indent] === " ") {
      indent += 1;
    }

    const trimmed = rawLine.slice(indent);
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    if (!key || key.startsWith("#") || key.startsWith("-")) {
      continue;
    }

    const rawValue = stripInlineComment(trimmed.slice(colonIndex + 1));

    while (indents.length > 0 && indents[indents.length - 1] >= indent) {
      indents.pop();
      keys.pop();
    }

    indents.push(indent);
    keys.push(key);

    if (!rawValue) {
      continue;
    }

    const path = keys.join(".");
    if (targetSet.has(path)) {
      values.set(path, stripWrappingQuotes(rawValue));
    }
  }

  return values;
}

function inferBootstrapSourceFromCommand(command) {
  const text = String(command ?? "");
  const matchers = [
    { kind: "branch", patterns: ["OTA_GIT_BRANCH", "\\$env:OTA_GIT_BRANCH"] },
    { kind: "git_rev", patterns: ["OTA_GIT_REV", "\\$env:OTA_GIT_REV"] },
    { kind: "version", patterns: ["OTA_VERSION", "\\$env:OTA_VERSION"] }
  ];

  for (const matcher of matchers) {
    for (const pattern of matcher.patterns) {
      const regex = new RegExp(`${pattern}\\s*=\\s*['"]?([^'"\\s;|]+)['"]?`);
      const match = text.match(regex);
      if (match) {
        return { kind: matcher.kind, value: match[1] };
      }
    }
  }

  return null;
}

async function resolveBootstrapSourceFromContract(contractPath) {
  const stat = await fs.stat(contractPath).catch(() => null);
  let resolvedPath = contractPath;
  if (stat?.isDirectory()) {
    resolvedPath = path.join(contractPath, "ota.yaml");
  }

  const contract = await fs.readFile(resolvedPath, "utf8").catch((error) => {
    throw new Error(`failed to read contract \`${contractPath}\`: ${error.message}`);
  });

  const values = parseTargetedYamlFields(contract, [
    "agent.bootstrap.ota.source.kind",
    "agent.bootstrap.ota.source.version",
    "agent.bootstrap.ota.source.rev",
    "agent.bootstrap.ota.source.branch",
    "agent.bootstrap.ota.sh",
    "agent.bootstrap.ota.powershell"
  ]);

  let kind = values.get("agent.bootstrap.ota.source.kind") || "";
  let version = values.get("agent.bootstrap.ota.source.version") || "";
  let rev = values.get("agent.bootstrap.ota.source.rev") || "";
  let branch = values.get("agent.bootstrap.ota.source.branch") || "";

  if (!kind) {
    const inferred = inferBootstrapSourceFromCommand(values.get("agent.bootstrap.ota.sh"))
      || inferBootstrapSourceFromCommand(values.get("agent.bootstrap.ota.powershell"));
    if (inferred) {
      kind = inferred.kind;
      if (kind === "version") {
        version = inferred.value;
      } else if (kind === "git_rev") {
        rev = inferred.value;
      } else if (kind === "branch") {
        branch = inferred.value;
      }
    }
  }

  if (kind === "version" && version) {
    return { contractPath: resolvedPath, kind, version: normalizeOtaVersion(version) };
  }
  if (kind === "git_rev" && rev) {
    return { contractPath: resolvedPath, kind, rev };
  }
  if (kind === "branch" && branch) {
    return { contractPath: resolvedPath, kind, branch };
  }

  throw new Error(
    `contract \`${resolvedPath}\` does not declare a usable agent.bootstrap.ota source`
  );
}

function otaBinaryName(platform = process.platform) {
  return platform === "win32" ? "ota.exe" : "ota";
}

function otaInstallDirectories(env = process.env, platform = process.platform) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const directories = [];
  const otaBinDir = getEnvValue(env, "OTA_BIN_DIR");
  const localAppData = getEnvValue(env, "LOCALAPPDATA");
  const home = getEnvValue(env, "HOME");
  const userProfile = getEnvValue(env, "USERPROFILE");
  const homeDrive = getEnvValue(env, "HOMEDRIVE");
  const homePath = getEnvValue(env, "HOMEPATH");
  const resolvedHome = home || userProfile || (homeDrive && homePath ? pathApi.join(homeDrive, homePath) : undefined);

  if (otaBinDir) {
    directories.push(otaBinDir);
  }
  if (platform === "win32" && localAppData) {
    directories.push(pathApi.join(localAppData, "ota", "bin"));
  }
  if (resolvedHome) {
    directories.push(pathApi.join(resolvedHome, ".local", "bin"));
    directories.push(pathApi.join(resolvedHome, ".cargo", "bin"));
  }
  return [...new Set(directories)];
}

function pathEntries(env = process.env, platform = process.platform) {
  const delimiter = platform === "win32" ? path.win32.delimiter : path.posix.delimiter;
  return String(getEnvValue(env, "PATH") || "")
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function postInstallBinaryDirectories(env = process.env, platform = process.platform) {
  const directories = [];
  const push = (value) => {
    const normalized = String(value ?? "").trim();
    if (!normalized || directories.includes(normalized)) {
      return;
    }
    directories.push(normalized);
  };

  const otaBinDir = getEnvValue(env, "OTA_BIN_DIR");
  if (otaBinDir) {
    push(otaBinDir);
  }

  for (const directory of otaInstallDirectories(env, platform)) {
    push(directory);
  }

  for (const entry of pathEntries(env, platform)) {
    push(entry);
  }

  return directories;
}

function isPathLike(bin) {
  return bin.includes("/") || bin.includes("\\") || path.isAbsolute(bin);
}

async function existingRunnableFile(candidate, platform = process.platform) {
  try {
    const stat = await fs.stat(candidate);
    if (!stat.isFile()) {
      return false;
    }

    const accessMode = platform === "win32"
      ? fsSync.constants.F_OK
      : fsSync.constants.X_OK;

    await fs.access(candidate, accessMode);
    return true;
  } catch {
    return false;
  }
}

function parseInstalledVersion(stdout) {
  const match = String(stdout ?? "").match(/v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  if (!match) {
    throw new Error(`unable to parse ota version from output: ${String(stdout ?? "").trim()}`);
  }
  const normalized = match[0];
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

function assertResolvedVersionMatchesRequested(source, resolvedVersion) {
  if (source?.kind !== "version" || !source.version) {
    return;
  }
  const requestedVersion = normalizeOtaVersion(source.version);
  const normalizedResolved = normalizeOtaVersion(resolvedVersion);
  if (requestedVersion === normalizedResolved) {
    return;
  }
  throw new Error(
    `requested ota ${requestedVersion} but resolved ${normalizedResolved}; the release asset may be missing for this runner or installation fell back to a stale binary`
  );
}

function installerPrerequisiteNames(platform = process.platform) {
  return platform === "win32" ? ["pwsh"] : ["sh", "curl"];
}

function missingInstallerPrerequisiteMessage(tool, platform = process.platform) {
  if (platform === "win32") {
    return `official ota installer requires \`${tool}\` on Windows runners; install PowerShell or use \`install: never\` with ota already on PATH`;
  }
  return `official ota installer requires \`${tool}\` on Unix-like runners; install the missing tool or use \`install: never\` with ota already on PATH`;
}

function exposeBinaryDirectory(binaryPath, addPath, env = process.env, pathModule = path) {
  const directory = pathModule.dirname(binaryPath);
  const entries = String(getEnvValue(env, "PATH") || "")
    .split(pathModule.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!entries.includes(directory)) {
    addPath(directory);
  }

  return directory;
}

export {
  describeInstallSource,
  getEnvValue,
  existingRunnableFile,
  exposeBinaryDirectory,
  installerEnvForSource,
  isPathLike,
  installerPrerequisiteNames,
  missingInstallerPrerequisiteMessage,
  normalizeOtaVersion,
  otaBinaryName,
  otaInstallDirectories,
  postInstallBinaryDirectories,
  parseInstallMode,
  parseSourceMode,
  parseInstalledVersion,
  assertResolvedVersionMatchesRequested,
  pathEntries,
  resolveBootstrapSourceFromContract
};
