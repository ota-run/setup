/*
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
*/

import { spawnSync } from "node:child_process";

const result = spawnSync("git", ["status", "--short", "--", "dist"], {
  cwd: process.cwd(),
  encoding: "utf8"
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || "failed to inspect dist status\n");
  process.exit(result.status ?? 1);
}

if (result.stdout.trim() !== "") {
  process.stderr.write("dist/ is not clean. Rebuild and commit the bundled action output.\n");
  process.stderr.write(result.stdout);
  process.exit(1);
}
