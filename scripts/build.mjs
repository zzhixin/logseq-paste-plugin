import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

await rm(distDir, { recursive: true, force: true });

await runCommand("npx", [
  "parcel",
  "build",
  "index.html",
  "--dist-dir",
  "dist",
  "--public-url",
  "./",
  "--no-cache",
  "--no-source-maps",
]);

await runCommand("node", ["scripts/prepare-dist.mjs"]);

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}
