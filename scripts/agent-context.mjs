import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function section(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return "";

  const level = heading.match(/^#+/)?.[0].length ?? 2;
  const end = lines.findIndex((line, index) => {
    if (index <= start) return false;
    const match = line.match(/^(#+)\s+/);
    return Boolean(match && match[1].length <= level);
  });

  return lines.slice(start, end === -1 ? lines.length : end).join("\n").trim();
}

function printBlock(title, body) {
  console.log(`\n## ${title}\n`);
  console.log(body.trim());
}

const agents = read("AGENTS.md");
const workflow = read("WORKFLOW.md");
const worklog = read("WORKLOG.md");

console.log("# Agent Bootstrap Context");
console.log("");
console.log("Run this before broad repo search. Pick one primary spec, then continue.");

printBlock("AGENTS Mission", section(agents, "## Mission"));
printBlock("AGENTS Default Flow", section(agents, "## Default Flow"));
printBlock("AGENTS Hard Rules", section(agents, "## Hard Rules"));
printBlock("Skill Triggers", section(agents, "## Skill Triggers"));
printBlock("Current Worklog Task", section(worklog, "## Current Task"));
printBlock("Current Source Specs", section(worklog, "## Source Specs"));
printBlock("Next", section(worklog, "## Next"));
printBlock("Workflow Verification Gate", section(workflow, "## 6. Verification Gate"));

console.log("\n## Just-In-Time References\n");
console.log("- Code/spec/test index: docs/agent/code-index.md");
console.log("- Skill routing: docs/agent/skill-routing.md");
console.log("- Harness structure: docs/agent/harness.md");
console.log("- UI/design tasks: DESIGN.md");
