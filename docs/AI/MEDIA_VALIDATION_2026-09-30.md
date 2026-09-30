# Media OS MVP validation — 2026-09-30

- Branch/base observed: `lane/media-os` / `6b69804cd988661133158169c1457cede4c3813a`.
- Python contract: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/media -p 'test_*.py'` PASS, 17 tests. Coverage includes deterministic output, source hash and frontmatter binding, evidence kind/locator/provenance, DRAFT-only behavior, invalid input types, distinct channel purposes, path traversal, noncanonical paths, and symlink rejection.
- Python artifact: `PYTHONDONTWRITEBYTECODE=1 python3 scripts/media/pipeline.py ops/media/sources/human-role-selection-v1.json --check` PASS. JSON and review Markdown match deterministic compilation and source bytes.
- Node prototype: `node scripts/media/test.mjs` PASS; 15 invalid recipes rejected, deterministic compile confirmed, and absolute, dot, control-character, traversal and symlink paths rejected. Temporary symlink fixture was removed.
- Node artifact: `node scripts/media/validate.mjs` PASS. `node scripts/media/build.mjs` PASS; existing eight-channel DRAFT output matched and remained unchanged.
- Syntax: `node --check` passed on all four `.mjs` files; `python3 -m py_compile scripts/media/pipeline.py scripts/media/test_pipeline.py` passed. Generated `__pycache__` files were removed.
- `git diff --check` and staged whitespace validation are run immediately before commit.

The Python implementation is the documented MVP contract. The lane also contains an independent Node prototype with a separate recipe schema and `museum-not-label` sample; it was validated but is not called by the Python entrypoint. Merge-queue review should confirm the supported entrypoint/schema and decide whether to consolidate these two implementations.

All channel drafts and queues remain DRAFT / UNREVIEWED; publication is DISABLED and queue rows are non-executable. Source and route checks are local evidence only. No source content, site code, package dependencies, or production state changed. Editorial approval, semantic accuracy review, public delivery, demand, and revenue remain unverified. No network, account, publishing, deployment, push, or external mutation was used.
