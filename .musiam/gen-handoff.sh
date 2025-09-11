#!/usr/bin/env bash
set -e
DAYS="${1:-1}"
ROOT="$(git rev-parse --show-toplevel)"
OUT="$ROOT/.musiam/HANDOFF.md"
mkdir -p "$(dirname "$OUT")"
{
  echo "# Handoff (musiam-front)"
  echo
  echo "> Paste this at the top of a new GPT chat to continue seamlessly."
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo
  echo "## Commits (last $DAYS day(s))"
  git log --since="$DAYS day ago" --pretty=format:'- %h %s' || echo "- (no commits)"
  echo
  echo "## Open Issues (top 10)"
  if command -v gh >/dev/null 2>&1; then
    gh issue list -L 10 --state open --json number,title,labels --template '{{range .}}{{printf "- #%v %s %v
" .number .title .labels}}{{end}}' || echo "- (failed to query via gh)"
  else
    echo "- (gh not installed; skipping)"
  fi
  echo
  echo "## Open PRs (top 10)"
  if command -v gh >/dev/null 2>&1; then
    gh pr list -L 10 --state open --json number,title,headRefName --template '{{range .}}{{printf "- #%v %s (%s)
" .number .title .headRefName}}{{end}}' || echo "- (failed to query via gh)"
  else
    echo "- (gh not installed; skipping)"
  fi
  echo
  echo "## Next 3 Tasks"
  echo "- [ ] (最重要)"
  echo "- [ ] (2番目)"
  echo "- [ ] (検証)"
  echo
  echo "## Links"
  echo "- Repo: $(git remote get-url origin 2>/dev/null)"
} > "$OUT"
echo "Generated $OUT"
