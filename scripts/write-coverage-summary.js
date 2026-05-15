const fs = require("fs");
const path = require("path");

const services = ["chunk-catalog", "chunk-location", "replication-planner", "storage-gateway"];
const outputRoot = path.join(process.cwd(), "tests", "coverage");

fs.mkdirSync(outputRoot, { recursive: true });

for (const service of services) {
  const coveragePath = path.join(
    process.cwd(),
    "services",
    service,
    "tests",
    "coverage",
    "coverage-final.json"
  );
  if (!fs.existsSync(coveragePath)) {
    continue;
  }

  const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
  const summary = summarize(coverage);
  const content = [
    `service=${service}`,
    `statements=${summary.statements.toFixed(2)}%`,
    `branches=${summary.branches.toFixed(2)}%`,
    `functions=${summary.functions.toFixed(2)}%`,
    `lines=${summary.lines.toFixed(2)}%`,
    "framework=Jest + Supertest",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(outputRoot, `${service}-coverage-summary.txt`), content);
  fs.writeFileSync(
    path.join(process.cwd(), "services", service, "tests", "coverage", "coverage-summary.txt"),
    content
  );
}

function summarize(coverage) {
  const totals = {
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 },
    statements: { covered: 0, total: 0 }
  };

  for (const fileCoverage of Object.values(coverage)) {
    addCounter(totals.statements, Object.values(fileCoverage.s));
    addCounter(totals.functions, Object.values(fileCoverage.f));
    addCounter(totals.lines, Object.entries(fileCoverage.statementMap).map(([id]) => fileCoverage.s[id]));

    for (const branchHits of Object.values(fileCoverage.b)) {
      addCounter(totals.branches, branchHits);
    }
  }

  return {
    branches: percent(totals.branches),
    functions: percent(totals.functions),
    lines: percent(totals.lines),
    statements: percent(totals.statements)
  };
}

function addCounter(total, hits) {
  for (const hit of hits) {
    total.total += 1;
    if (hit > 0) {
      total.covered += 1;
    }
  }
}

function percent(total) {
  return total.total === 0 ? 100 : (total.covered / total.total) * 100;
}
