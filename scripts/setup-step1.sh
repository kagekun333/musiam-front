#!/usr/bin/env bash
set -euo pipefail

echo ">> Installing dev dependencies (commitlint + husky)..."
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky

echo ">> Initializing husky..."
npx husky install

echo ">> Adding commit-msg hook..."
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"' || true

echo ">> Staging templates and config..."
git add .github commitlint.config.cjs || true

echo ">> Done."
echo "Next:"
echo "  git commit -m "chore: add issue/pr templates and commitlint (Step1 kit)""
echo "  git push"
