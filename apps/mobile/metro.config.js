// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require("expo/metro-config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// This is a monorepo (npm workspaces) — watch the whole workspace so
// changes to shared packages (e.g. ../../convex) are picked up.
config.watchFolders = [workspaceRoot];

// Dependencies are hoisted to the workspace root node_modules. This is
// Expo's recommended default for npm/yarn workspace monorepos: it makes
// sure resolution checks the workspace root (and this project's own
// node_modules, for the rare package that can't be hoisted) before
// falling back to Node's normal hierarchical climb up the filesystem.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
