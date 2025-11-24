#!/usr/bin/env node

/**
 * Deploys the latest build artifact into a target branch (default: gh-pages).
 *
 * Usage examples:
 *   node scripts/publish-build.js
 *   node scripts/publish-build.js gh-pages dist "pnpm build"
 *
 * Positional parameters:
 *   1) target branch name              (default: gh-pages)
 *   2) build output directory          (default: dist)
 *   3) build command to execute first  (default: pnpm build)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const [branchArg, buildDirArg, buildCommandArg] = process.argv.slice(2);
const branch = branchArg || process.env.DEPLOY_BRANCH || 'gh-pages';
const buildDir = buildDirArg || process.env.BUILD_DIR || 'dist';
const buildCommand = buildCommandArg || process.env.BUILD_COMMAND || 'pnpm build';

const repoRoot = process.cwd();
const buildPath = path.join(repoRoot, buildDir);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-build-'));
const tempBuildPath = path.join(tempRoot, buildDir);

const ensureGitRepo = () => {
  if (!fs.existsSync(path.join(repoRoot, '.git'))) {
    throw new Error('This script must be run from the root of a git repository.');
  }
};

const run = (command) => {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: 'inherit' });
};

const ensureBuildExists = () => {
  if (!fs.existsSync(buildPath) || !fs.statSync(buildPath).isDirectory()) {
    throw new Error(`Expected build directory "${buildDir}" to exist after running the build command.`);
  }
};

const copyBuildToTemp = () => {
  fs.cpSync(buildPath, tempBuildPath, { recursive: true });
  fs.rmSync(buildPath, { recursive: true, force: true });
};

const copyTempToRepo = () => {
  fs.cpSync(tempBuildPath, buildPath, { recursive: true });
};

const cleanRepoExcept = (exceptions) => {
  for (const entry of fs.readdirSync(repoRoot)) {
    if (exceptions.has(entry)) continue;
    fs.rmSync(path.join(repoRoot, entry), { recursive: true, force: true });
  }
};

const moveBuildContentsToRoot = () => {
  for (const entry of fs.readdirSync(buildPath)) {
    fs.renameSync(path.join(buildPath, entry), path.join(repoRoot, entry));
  }
  fs.rmSync(buildPath, { recursive: true, force: true });
};

const cleanupTemp = () => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
};

const main = () => {
  ensureGitRepo();
  try {
    console.log(`Building project with "${buildCommand}"...`);
    run(buildCommand);
    ensureBuildExists();

    console.log('Persisting build artifacts temporarily...');
    copyBuildToTemp();

    console.log(`Switching to ${branch} branch...`);
    run(`git checkout ${branch}`);

    console.log('Restoring build artifacts onto branch...');
    copyTempToRepo();

    console.log('Removing existing branch contents (except build folder and .git)...');
    cleanRepoExcept(new Set(['.git', buildDir]));

    console.log('Flattening build output into repository root...');
    moveBuildContentsToRoot();

    console.log('Done! Review changes, commit, and push when ready.');
  } finally {
    cleanupTemp();
  }
};

main();

