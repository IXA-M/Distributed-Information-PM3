const fs = require("fs");
const Module = require("module");
const path = require("path");
const vm = require("vm");

const roots = [process.cwd(), path.resolve(process.cwd(), "../../shared")];
const ignored = new Set(["node_modules", ".git", "coverage"]);
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && /\.(cjs|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
}

for (const root of roots) {
  walk(root);
}

let failed = false;
for (const file of files) {
  try {
    const source = fs.readFileSync(file, "utf8");
    new vm.Script(Module.wrap(source), { filename: file });
  } catch (error) {
    failed = true;
    process.stderr.write(`${file}\n${error.stack}\n`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax OK (${files.length} files checked)`);
