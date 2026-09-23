#!/usr/bin/env node
/**
 * Animation ownership audit. See lib/animation-ownership.md.
 *
 * Fails if a single file both imports from lib/gsap and uses a Motion animation prop, which
 * is the only way the two systems can end up on the same element in this codebase. Files that
 * merely import `motion/react` for layout-free reasons are fine; it is the combination that
 * is banned.
 *
 * KpiReview is the deliberate exception documented below: it imports GSAP and is rendered by
 * GovernanceRoom, which uses Motion — but the two never touch the same element, because the
 * GSAP subtree is fenced with [data-gsap-scope] and contains no motion.* components.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const DIRS = ["app", "components", "lib"];
const MOTION_PROPS = /\b(whileHover|whileTap|whileInView|layoutId|animate=|initial=|exit=)/;
const MOTION_IMPORT = /from\s+["']motion\/react["']/;
const GSAP_IMPORT = /from\s+["'](@\/lib\/gsap\/\w+|gsap[^"']*)["']/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(p);
  }
  return out;
}

const files = DIRS.flatMap((d) => {
  try {
    return walk(join(ROOT, d));
  } catch {
    return [];
  }
});

const conflicts = [];
const exceptions = [];

/** Comments discuss the rule constantly; only real code counts as a violation. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

for (const file of files) {
  const src = stripComments(readFileSync(file, "utf8"));
  const usesGsap = GSAP_IMPORT.test(src);
  const usesMotion = MOTION_IMPORT.test(src) && MOTION_PROPS.test(src);
  if (usesGsap && usesMotion) {
    // A file may hold both only with a declared, justified exception. The raw source is
    // searched (not the comment-stripped copy) because the declaration IS a comment.
    const raw = readFileSync(file, "utf8");
    const declared = raw.match(/@animation-ownership-exception:\s*(.+)/);
    if (declared) exceptions.push(`${relative(ROOT, file)} — ${declared[1].trim()}`);
    else conflicts.push(relative(ROOT, file));
  }
  // A motion component inside a declared GSAP scope is always a conflict.
  if (/data-gsap-scope/.test(src) && /<motion\./.test(src)) {
    conflicts.push(`${relative(ROOT, file)} (motion component inside [data-gsap-scope])`);
  }
}

if (conflicts.length) {
  console.error("Animation ownership conflicts:");
  for (const c of conflicts) console.error(`  - ${c}`);
  process.exit(1);
}

for (const e of exceptions) console.log(`Declared exception: ${e}`);
console.log(`Animation ownership: 0 conflicts across ${files.length} files.`);
