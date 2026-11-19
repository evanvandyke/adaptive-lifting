#!/usr/bin/env node
// Compile into a unique directory for every invocation. A failed compilation
// never falls through to tests or reuses a previous build's output.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const engineDir = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(engineDir);
const require = createRequire(import.meta.url);
const [command = "test", ...options] = process.argv.slice(2);

if (command === "--help" || command === "help") {
  console.log(`Usage: node engine/run.mjs [test|simulate|all|typecheck]
  test       Compile and run every engine/**/*.test.ts suite.
  simulate   Compile and run reproducible scenario histories.
  all        Compile once, run tests, then run scenario histories.
  typecheck  Compile with strict checks without running code.

Simulation options are forwarded to the scenario runner. Its default reports
are written to engine/reports/. Builds use fresh operating-system temporary
directories; this runner never deletes existing user or project files.`);
  process.exit(0);
}

if (!["test", "simulate", "all", "typecheck"].includes(command)) {
  console.error(`Unknown engine command: ${command}`);
  process.exit(2);
}
if ((command === "test" || command === "typecheck") && options.length > 0) {
  console.error(`${command} does not accept extra arguments.`);
  process.exit(2);
}

let runId;
let startedAt;
const reportDir = resolve(engineDir, "reports");
function markRun(status, detail = "") {
  if (command !== "simulate" && command !== "all") return;
  mkdirSync(reportDir, { recursive: true });
  if(status === "failed") {
    try {
      const report=JSON.parse(readFileSync(join(reportDir,"latest.json"),"utf8"));
      if(report.runId===runId&&report.status==="failed") {
        report.driverDetail=detail;
        writeFileSync(join(reportDir,"latest.json"),JSON.stringify(report,null,2)+"\n");
        return;
      }
    } catch { /* An interrupted run may have produced no complete report. */ }
  }
  writeFileSync(join(reportDir, "latest.json"), JSON.stringify({ runId, startedAt, status, detail, scenarios: [] }, null, 2) + "\n");
  writeFileSync(join(reportDir, "SUMMARY.md"), `# Engine simulation run\n\nRun: ${runId}\n\nStatus: **${status}**. ${detail}\n`);
}

function execute(args, stage) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectDir,
    stdio: "inherit",
    env: { ...process.env, ADAPTIVE_ENGINE_RUN_ID: runId, ADAPTIVE_ENGINE_STARTED_AT: startedAt },
    timeout: 120000,
  });
  if (result.error) {
    markRun("failed", `${stage}: ${result.error.message}`);
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    markRun("failed", `${stage} exited ${result.status ?? result.signal ?? "without status"}.`);
    if (result.signal) console.error(`Engine command ended with ${result.signal}.`);
    process.exit(result.status ?? 1);
  }
}

function collectTests(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(path);
    return entry.isFile() && entry.name.endsWith(".test.js") ? [path] : [];
  }).sort();
}

const buildDir = mkdtempSync(join(tmpdir(), "adaptive-lifting-engine-"));
runId = basename(buildDir);
startedAt = new Date().toISOString();
markRun("running", "Fresh compilation has started; this is not a passing result.");
console.log(`Fresh engine build: ${buildDir}`);
execute([
  require.resolve("typescript/bin/tsc"),
  "--project", join(engineDir, "tsconfig.json"),
  "--outDir", buildDir,
], "compile");

if (command === "test" || command === "all") {
  const tests = collectTests(join(buildDir, "tests"));
  if (tests.length === 0) {
    console.error("No compiled engine test suites found; nothing was verified.");
    process.exit(1);
  }
  execute(["--test", ...tests], "tests");
}

if (command === "simulate" || command === "all") {
  const entry = join(buildDir, "scenarios", "run.js");
  if (!existsSync(entry)) {
    console.error("The compiled scenario runner is missing; no simulation ran.");
    process.exit(1);
  }
  execute([entry, "--report-dir", reportDir, ...options], "simulations");
}

console.log(`Engine ${command} completed successfully.`);
