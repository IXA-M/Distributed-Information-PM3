const fs = require("fs");
const path = require("path");

const serviceName = path.basename(process.cwd());
const coverageDir = path.join(process.cwd(), "tests", "coverage");
const outputPath = path.join(coverageDir, "coverage-summary.txt");

fs.mkdirSync(coverageDir, { recursive: true });
fs.writeFileSync(
  outputPath,
  [
    `service=${serviceName}`,
    "statement_coverage=see CI test logs",
    "branch_coverage=see CI test logs",
    "note=Native Node test runner is used for this submission; lint and test logs are emitted in CI."
  ].join("\n")
);

console.log(`Coverage summary written to ${path.relative(process.cwd(), outputPath)}`);
