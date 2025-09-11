Param([switch]$NoCommit)

Write-Host ">> Installing dev dependencies (commitlint + husky)..." -ForegroundColor Cyan
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky

Write-Host ">> Initializing husky..." -ForegroundColor Cyan
npx husky install

Write-Host ">> Adding commit-msg hook..." -ForegroundColor Cyan
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'

Write-Host ">> Staging templates and config..." -ForegroundColor Cyan
git add .github commitlint.config.cjs

if (-not $NoCommit) {
  git commit -m "chore: add issue/pr templates and commitlint (Step1 kit)"
  Write-Host ">> Committed. You can now push: git push" -ForegroundColor Green
} else {
  Write-Host ">> Skipped commit (use --NoCommit). Files staged." -ForegroundColor Yellow
}
