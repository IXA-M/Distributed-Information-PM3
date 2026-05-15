const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = process.cwd();
const INCLUDE_DIRS = ["services", "scripts"];
const INCLUDE_FILES = ["ecosystem.config.js"];
const EXCLUDE_DIRS = new Set(["node_modules", ".git", "coverage", "lcov-report", ".codex_tmp_pdf"]);

const files = [];

for (const relativeDir of INCLUDE_DIRS) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (fs.existsSync(absoluteDir)) {
    walk(absoluteDir);
  }
}

for (const relativeFile of INCLUDE_FILES) {
  const absoluteFile = path.join(ROOT, relativeFile);
  if (fs.existsSync(absoluteFile)) {
    files.push(absoluteFile);
  }
}

const errors = [];

for (const file of files) {
  try {
    const source = fs.readFileSync(file, "utf8");
    new vm.Script(source, { filename: file });
  } catch (error) {
    errors.push(`${path.relative(ROOT, file)}: ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error("Static analysis failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Static analysis passed for ${files.length} JavaScript files.`);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
}
