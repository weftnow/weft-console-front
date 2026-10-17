#!/usr/bin/env node
// Dependency-free checks for required paths, concise instructions, and local links.
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function confinedPath(root, candidate) {
  const resolved = path.resolve(candidate);
  if (!inside(root, resolved)) throw new Error("Path escapes repository");
  // Check existing ancestors too, including symlinks above missing destinations.
  let ancestor = resolved;
  while (!existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error("Cannot resolve path");
    ancestor = parent;
  }
  if (!inside(root, realpathSync(ancestor))) throw new Error("Path escapes repository through a symlink");
  return resolved;
}

function localPath(root, value) {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value)) {
    throw new Error("Harness paths must be nonempty repository-relative strings");
  }
  return confinedPath(root, path.resolve(root, value));
}

function loadConfig(root) {
  const config = JSON.parse(readFileSync(path.join(root, "scripts/harness.json"), "utf8"));
  for (const key of ["required", "markdownRoots"]) {
    if (!Array.isArray(config[key])) throw new Error(`${key} must be a list`);
    for (const value of config[key]) localPath(root, value);
  }
  for (const key of ["agents", "activePlans"]) localPath(root, config[key]);
  if (!Number.isInteger(config.maxAgentLines) || config.maxAgentLines < 1) {
    throw new Error("maxAgentLines must be a positive integer");
  }
  return config;
}

function* markdownFiles(file) {
  const stat = lstatSync(file);
  if (stat.isSymbolicLink()) return;
  if (stat.isFile() && path.extname(file).toLowerCase() === ".md") yield file;
  else if (stat.isDirectory()) {
    for (const child of readdirSync(file).sort()) yield* markdownFiles(path.join(file, child));
  }
}

function prose(content) {
  const lines = [];
  let fence = null;
  for (const line of content.split(/\r?\n/)) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      const [, run, tail] = marker;
      if (!fence) { fence = run; continue; }
      if (run[0] === fence[0] && run.length >= fence.length && !tail.trim()) { fence = null; continue; }
    }
    if (!fence) lines.push(line);
  }
  return lines.join("\n").replace(/(`+)[\s\S]*?\1/g, "");
}

export function checkHarness(directory) {
  try {
    const root = realpathSync(directory);
    const config = loadConfig(root);
    const errors = [];
    for (const value of new Set([...config.required, config.agents, config.activePlans])) {
      if (!existsSync(localPath(root, value))) errors.push(`Missing harness path: ${value}`);
    }
    const active = localPath(root, config.activePlans);
    if (existsSync(active) && !lstatSync(active).isDirectory()) errors.push("activePlans must be a directory");
    const agent = localPath(root, config.agents);
    if (existsSync(agent)) {
      const content = readFileSync(agent, "utf8").trimEnd();
      const count = content ? content.split(/\r?\n/).length : 0;
      if (count > config.maxAgentLines) errors.push(`${config.agents} exceeds ${config.maxAgentLines} lines`);
    }
    const files = new Set();
    for (const value of config.markdownRoots) {
      const file = localPath(root, value);
      if (!existsSync(file)) errors.push(`Missing Markdown root: ${value}`);
      else for (const markdown of markdownFiles(file)) files.add(markdown);
    }
    for (const file of [...files].sort()) {
      const content = prose(readFileSync(file, "utf8"));
      // Conventional Markdown only; see docs/VERIFICATION.md for parser limits.
      const targets = [
        ...content.matchAll(/!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)/g),
        ...content.matchAll(/^\s{0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)/gm),
      ];
      for (const match of targets) {
        const target = match[1].replace(/^<|>$/g, "");
        if (/^(#|\/\/|[a-zA-Z][\w+.-]*:)/.test(target)) continue;
        const label = path.relative(root, file);
        try {
          const relative = decodeURIComponent(target.split(/[?#]/, 1)[0]);
          if (!relative) continue;
          const candidate = confinedPath(root, path.resolve(path.dirname(file), relative));
          if (!existsSync(candidate)) errors.push(`${label}: broken local link: ${target}`);
        } catch (error) {
          errors.push(`${label}: invalid local link: ${target} (${error.message})`);
        }
      }
    }
    return errors;
  } catch (error) {
    return [`Harness check could not finish: ${error.message}`];
  }
}

const entrypoint = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(entrypoint)) {
  const errors = checkHarness(path.resolve(path.dirname(entrypoint), ".."));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Harness documentation checks passed.");
}
