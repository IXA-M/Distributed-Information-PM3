const fs = require("fs");
const path = require("path");

const testFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      testFiles.push(fullPath);
    }
  }
}

walk(path.join(process.cwd(), "test"));
walk(path.join(process.cwd(), "tests"));

if (testFiles.length === 0) {
  console.log("No test files found");
  process.exit(0);
}

async function run() {
  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    const cases = require(file);
    for (const [name, fn] of Object.entries(cases)) {
      try {
        await fn();
        passed += 1;
        console.log(`ok - ${path.relative(process.cwd(), file)} - ${name}`);
      } catch (error) {
        failed += 1;
        console.error(`not ok - ${path.relative(process.cwd(), file)} - ${name}`);
        console.error(error.stack);
      }
    }
  }

  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error(error.stack);
  process.exit(1);
});
