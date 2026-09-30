# MUSIAM PARALLEL EXECUTION LAYER

**Status:** V1 implementation candidate
**Authority:** `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`
**Purpose:** Allow multiple MUSIAM workstreams to progress in parallel without allowing Chat / Codex / Work / field agents to overwrite one another or silently diverge from the canonical repository.

---

## 1. Why this exists

MUSIAM has reached the point where one serial writer is too slow.

The current roadmap has independent workstreams for:

- knowledge;
- analytics;
- media;
- commerce;
- sales.

Running them all in the canonical working tree would create the exact failure mode the Control Plane is intended to prevent:

- one agent edits a file another agent is also changing;
- the local repo stops matching GitHub;
- a stale branch is merged over newer work;
- a Work/Codex task quietly writes outside its assigned scope;
- a Preview is treated as if it came from the same source as another lane.

V1 therefore adds isolated Git worktrees and a merge queue.

---

## 2. Canonical rule

The canonical repository remains:

`/Users/kagekun/Desktop/musiam-front-clean`

Canonical branch:

`recovery/musiam-clean-20260920`

Parallel worktrees do not replace the canonical repository.

A lane may develop independently, but only the canonical repository may become the authoritative merged source.

No lane deploys directly to Production.

---

## 3. Five lanes

### knowledge-v2

Preferred tool: **Codex**

Mission:

- Owner Source Knowledge Coverage;
- Catalog Intelligence;
- work understanding;
- Count Chat factual/story knowledge.

Worktree:

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/knowledge-v2`

Branch:

`lane/knowledge-v2`

### analytics-spine

Preferred tool: **Codex**

Mission:

- traffic instrumentation;
- funnel;
- conversion;
- revenue;
- experiments;
- PostHog / analytics plumbing.

Worktree:

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/analytics-spine`

Branch:

`lane/analytics-spine`

### media-os

Preferred tool: **ChatGPT Work**

Mission:

- Letters operating system;
- Intelligence Underground;
- SEO;
- social distribution;
- content atomization.

Worktree:

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/media-os`

Branch:

`lane/media-os`

The worktree exists so any generated code/config can be isolated, but research-heavy work should normally happen in Work first.

### europe-opportunity

Preferred tool: **ChatGPT Work**

Mission:

- Europe Finds;
- zero-inventory commerce;
- sourcing;
- opportunity scoring;
- editorial-commerce candidates.

Worktree:

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/europe-opportunity`

Branch:

`lane/europe-opportunity`

OpenClaw may act as a field observer for repeated external checks where appropriate, but is not the source of strategic truth.

### sales-arena

Preferred tool: **Codex**

Mission:

- Sales Arena;
- conversation-quality benchmark;
- sales evaluation harness;
- Count Chat sales improvement.

Worktree:

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/sales-arena`

Branch:

`lane/sales-arena`

---

## 4. Lane ownership

Each lane declares:

- normal allowed paths;
- explicit shared integration paths.

A normal allowed path belongs to that lane's scope.

A shared integration path is allowed, but it is considered conflict-prone and must pass merge-queue conflict detection.

Current important shared file:

`src/pages/api/chat-experience-v3.ts`

It is intentionally declared shared across knowledge / analytics / sales rather than pretending it belongs to only one lane.

---

## 5. Per-worktree lease

Each worktree has its own:

`.musiam/control-plane/active-lease.json`

The existing lease system therefore becomes lane-local.

Example:

```bash
node scripts/control-plane/parallel-lanes.mjs acquire knowledge-v2 \
  --task OWNER_SOURCE_KNOWLEDGE_COVERAGE_V2 \
  --owner codex \
  --ttl-minutes 180
```

Two agents may work at the same time in different lanes.

Two agents may not acquire the same lane lease at the same time.

---

## 6. Bootstrap

Bootstrap all lanes:

```bash
node scripts/control-plane/parallel-lanes.mjs bootstrap all
```

Bootstrap one lane:

```bash
node scripts/control-plane/parallel-lanes.mjs bootstrap knowledge-v2
```

Each lane starts from the current canonical HEAD.

The lane state records:

- lane;
- branch;
- base commit;
- created time;
- last sync time.

The lane's `node_modules` is symlinked to the canonical dependency tree when available.

Secrets and local environment files are not copied into the worktree.

---

## 7. Validation receipt

A lane cannot enter the merge queue merely because an agent says “done.”

The Control Plane must execute a validation command at the lane's current HEAD.

Example:

```bash
node scripts/control-plane/parallel-lanes.mjs test knowledge-v2 -- \
  ./node_modules/.bin/tsx scripts/owner-source/validate-knowledge-coverage.ts
```

A successful run writes:

`.musiam/control-plane/lane-validation.json`

with:

- branch;
- base;
- current HEAD;
- executed command;
- exit code;
- time;
- stdout/stderr tail.

If the lane HEAD changes, the validation receipt becomes stale automatically.

---

## 8. Scope guard

Before queueing, the Control Plane compares every committed changed path against:

- lane allowed paths;
- lane shared integration paths;
- Human-owned paths;
- protected roots.

Any change outside the lane scope causes:

`LANE_SCOPE_VIOLATION`

and the lane cannot be queued.

This guard exists specifically to stop “I was asked to fix German and rewrote unrelated files” style scope drift.

---

## 9. Cross-lane collision detection

```bash
node scripts/control-plane/parallel-lanes.mjs status
```

reports file-level intersections between lanes.

If two lanes both changed:

`src/pages/api/chat-experience-v3.ts`

that collision is visible before merge.

Queueing also refuses paths already present in another queued lane:

`MERGE_QUEUE_PATH_CONFLICT`

The goal is not to eliminate shared integration work.

The goal is to make it impossible for shared work to be invisible.

---

## 10. Sync / rebase policy

Parallel lanes may share a starting base.

After one lane is merged, canonical HEAD advances.

Other lanes become stale.

Use:

```bash
node scripts/control-plane/parallel-lanes.mjs sync analytics-spine
```

The command compares:

- files changed by the lane;
- files changed in canonical since the lane base.

If those sets overlap, automatic sync stops:

`SYNC_CONFLICT_REQUIRES_REVIEW`

If they do not overlap, the lane is rebased onto current canonical HEAD and its old validation receipt is cleared.

It must be tested again.

---

## 11. Merge queue

After validation:

```bash
node scripts/control-plane/parallel-lanes.mjs queue knowledge-v2 \
  --note "Coverage V2 tranche"
```

Queueing requires:

- lane worktree exists;
- tracked working tree is clean;
- committed changes exist;
- no scope violations;
- validation receipt matches current lane HEAD;
- lane base equals current canonical HEAD;
- no queued-path collision.

Merge:

```bash
node scripts/control-plane/parallel-lanes.mjs merge-next
```

This is **FF-only**.

It does not push by default.

For an explicitly validated normal merge:

```bash
node scripts/control-plane/parallel-lanes.mjs merge-next --push
```

Production still follows the normal Preview → smoke → promote → receipt path.

---

## 12. Remote branch policy

Lane branches are **not** pushed merely because the worktree was created.

Policy:

`ON_FIRST_MEANINGFUL_COMMIT`

This avoids generating five empty Vercel previews just for branch setup.

Publish a meaningful lane:

```bash
node scripts/control-plane/parallel-lanes.mjs publish knowledge-v2
```

A pushed lane is still not canonical and is never Production authority.

---

## 13. Tool assignment

### This Chat

Role:

**MUSIAM Orchestrator / CEO room**

Responsibilities:

- choose the highest-value lane;
- assign tool;
- inspect cross-lane state;
- merge decisions;
- quality judgement;
- Preview / Production;
- update receipts.

### Codex

Use when the work is repository/data/evaluation heavy.

Primary lanes:

- knowledge-v2;
- analytics-spine;
- sales-arena.

### ChatGPT Work

Use when the work requires broad web research, many external pages, company/product discovery, media research or sustained external browsing.

Primary lanes:

- media-os;
- europe-opportunity.

### OpenClaw

Use as field operations / observer when it is useful for repeated external UI or state checks.

Examples:

- price changes;
- availability;
- public page changes;
- social publication state;
- repetitive browser verification.

OpenClaw evidence returns to the MUSIAM Control Plane.

It does not decide canonical truth or merge code.

### Skills

Create Skills only after a workflow has succeeded repeatedly.

Good future candidates:

- Owner Source Enrichment;
- Europe Deal Evaluator;
- Letter → Social Atomizer;
- Sales Conversation Critic;
- Release Audit.

Do not freeze immature workflows into a Skill.

---

## 14. Production rule

Parallel development does **not** mean parallel Production mutation.

All lanes converge through:

```
lane
→ validation receipt
→ merge queue
→ canonical repo
→ canonical tests
→ GitHub
→ Preview
→ smoke
→ Production
→ release receipt
```

The existing Production rollback and source-parity rules remain authoritative.

---

## 15. Initial execution after bootstrap

Once V1 is active, start these workstreams independently:

### Knowledge

`OWNER_SOURCE_KNOWLEDGE_COVERAGE_V2`

### Analytics

`MUSIAM_GROWTH_ANALYTICS_SPINE_V1`

### Media

`MUSIAM_MEDIA_OS_MVP`

### Europe

`MUSIAM_EUROPE_OPPORTUNITY_DESK_V1`

### Sales

`COUNT_CHAT_SALES_ARENA_V1`

The Orchestrator should not wait for Knowledge V2 to finish before beginning Analytics, Media, Europe or Sales.

---

## 16. Success conditions

V1 passes when:

- five lane branches exist;
- five registered worktrees exist;
- all are based on the same canonical HEAD at bootstrap;
- lane-local leases work independently;
- same-lane second lease is rejected;
- different lanes can hold leases simultaneously;
- lane scope violation is detectable;
- validation receipt is tied to lane HEAD;
- merge queue is nontracked local state;
- overlapping lane files are visible;
- stale lane sync is guarded;
- canonical Human-owned dirty files remain untouched;
- no lane branch is pushed merely for bootstrap;
- no Production mutation occurs during bootstrap.

**Target verdict: MUSIAM_PARALLEL_EXECUTION_LAYER = PASS_LOCAL**
