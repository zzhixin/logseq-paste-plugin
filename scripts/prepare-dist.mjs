import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const packageJsonPath = path.join(rootDir, "package.json");
const iconPath = path.join(rootDir, "icon.svg");
const readmePath = path.join(rootDir, "README.md");

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

const distPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: "index.html",
  logseq: packageJson.logseq,
};

await mkdir(distDir, { recursive: true });
await writeFile(
  path.join(distDir, "package.json"),
  `${JSON.stringify(distPackageJson, null, 2)}\n`,
  "utf8",
);
await cp(iconPath, path.join(distDir, "icon.svg"));
await cp(readmePath, path.join(distDir, "README.md"));
