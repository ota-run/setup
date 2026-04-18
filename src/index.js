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
import { spawn } from "node:child_process";

import * as core from "@actions/core";

import {
  getEnvValue,
  existingRunnableFile,
  exposeBinaryDirectory,
  isPathLike,
  normalizeOtaVersion,
  otaBinaryName,
  otaInstallDirectories,
  parseInstallMode,
  parseInstalledVersion,
  pathEntries
} from "./lib.js";

async function runCommand(bin, args, cwd, env = process.env) {
  return await new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });
  });
}

function executableCandidates(bin, env = process.env, platform = process.platform) {
  const extensions = platform === "win32"
    ? (getEnvValue(env, "PATHEXT") || ".EXE;.CMD;.BAT;.COM")
      .split(";")
      .filter(Boolean)
    : [""];

  const withExtensions = (base) => {
    if (platform !== "win32" || path.extname(base)) {
      return [base];
    }
    return extensions.map((ext) => `${base}${ext.toLowerCase()}`);
  };

  if (isPathLike(bin)) {
    return withExtensions(path.resolve(bin));
  }

  return pathEntries(env, platform).flatMap((entry) => withExtensions(path.join(entry, bin)));
}

async function resolveExistingBinary(bin, env = process.env, platform = process.platform) {
  for (const candidate of executableCandidates(bin, env, platform)) {
    if (await existingRunnableFile(candidate, platform)) {
      return candidate;
    }
  }
  return null;
}

async function installOta(version, cwd) {
  const env = { ...process.env };
  if (version) {
    env.OTA_VERSION = version;
  }

  if (process.platform === "win32") {
    return await runCommand(
      "pwsh",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "irm https://dist.ota.run/install.ps1 | iex"],
      cwd,
      env
    );
  }

  return await runCommand(
    "sh",
    ["-c", "curl -fsSL https://dist.ota.run/install.sh | sh"],
    cwd,
    env
  );
}

async function resolveInstalledVersion(binaryPath, cwd) {
  const result = await runCommand(binaryPath, ["--version"], cwd);
  if (result.exitCode !== 0) {
    throw new Error(`failed to read ota version from ${binaryPath} (exit code ${result.exitCode})`);
  }
  return parseInstalledVersion(result.stdout || result.stderr);
}

async function ensureOtaBinary(inputs, cwd) {
  const installMode = parseInstallMode(inputs.install);
  const requestedVersion = normalizeOtaVersion(inputs.otaVersion);
  const preferred = inputs.otaBin || "ota";
  const binaryName = otaBinaryName();
  const effectiveInstallMode = requestedVersion && installMode === "auto" ? "always" : installMode;
  const preferredExisting = await resolveExistingBinary(preferred);

  if (installMode === "never") {
    if (requestedVersion) {
      throw new Error("ota-version requires install=auto or install=always; install=never cannot honor a requested installer version");
    }
    if (preferredExisting) {
      exposeBinaryDirectory(preferredExisting, core.addPath);
      return { binaryPath: preferredExisting, installed: false };
    }
    throw new Error(
      `ota binary \`${preferred}\` was not found and install=never prevents automatic installation`
    );
  }

  if (effectiveInstallMode === "auto" && preferredExisting) {
    exposeBinaryDirectory(preferredExisting, core.addPath);
    core.info(`Using existing ota binary at ${preferredExisting}`);
    return { binaryPath: preferredExisting, installed: false };
  }

  core.info(
    `Installing ota ${requestedVersion || "latest"} via the official installer (${effectiveInstallMode} mode)`
  );

  const installResult = await installOta(requestedVersion, cwd);
  if (installResult.stdout.trim()) {
    core.info(installResult.stdout.trim());
  }
  if (installResult.stderr.trim()) {
    core.info(installResult.stderr.trim());
  }
  if (installResult.exitCode !== 0) {
    throw new Error(`failed to install ota (exit code ${installResult.exitCode})`);
  }

  if (isPathLike(preferred)) {
    const explicitPath = await resolveExistingBinary(preferred);
    if (explicitPath) {
      exposeBinaryDirectory(explicitPath, core.addPath);
      core.info(`Using ota binary at ${explicitPath}`);
      return { binaryPath: explicitPath, installed: true };
    }
  }

  for (const directory of otaInstallDirectories()) {
    const candidate = path.join(directory, binaryName);
    if (await existingRunnableFile(candidate)) {
      exposeBinaryDirectory(candidate, core.addPath);
      core.info(`Using ota binary at ${candidate}`);
      return { binaryPath: candidate, installed: true };
    }
  }

  const discovered = await resolveExistingBinary(preferred) ?? await resolveExistingBinary(binaryName);
  if (discovered) {
    exposeBinaryDirectory(discovered, core.addPath);
    core.info(`Using ota binary at ${discovered}`);
    return { binaryPath: discovered, installed: true };
  }

  throw new Error(
    "ota installation completed but no runnable ota binary was found on PATH or in the standard install locations"
  );
}

async function main() {
  const cwd = process.cwd();
  const inputs = {
    install: core.getInput("install"),
    otaVersion: core.getInput("ota-version"),
    otaBin: core.getInput("ota-bin")
  };

  const { binaryPath, installed } = await ensureOtaBinary(inputs, cwd);
  const resolvedVersion = await resolveInstalledVersion(binaryPath, cwd);

  core.setOutput("ota-bin", binaryPath);
  core.setOutput("ota-version", resolvedVersion);
  core.setOutput("installed", installed ? "true" : "false");
  core.info(`ota ready at ${binaryPath} (${resolvedVersion})`);
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
