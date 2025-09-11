Param([int]$Days = 1)
$ErrorActionPreference = "Stop"

# 出力をUTF-8に固定
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repo = (git rev-parse --show-toplevel) 2>$null
if (-not $repo) { Write-Error "Not a git repo"; exit 1 }

$handoff = Join-Path $repo ".musiam\HANDOFF.md"
New-Item -ItemType Directory -Force (Split-Path $handoff) | Out-Null

# ここからすべて UTF-8 明示
"# Handoff (musiam-front)" | Set-Content -Encoding utf8 $handoff
"`n> Paste this at the top of a new GPT chat to continue seamlessly." | Add-Content -Encoding utf8 $handoff
"Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Add-Content -Encoding utf8 $handoff

"`n## Commits (last $Days day(s))`n" | Add-Content -Encoding utf8 $handoff
$log = git -c i18n.logOutputEncoding=UTF-8 log --since="$Days day ago" --encoding=UTF-8 --pretty=format:"- %h %s"
if ([string]::IsNullOrWhiteSpace($log)) {
  "- (no commits in the last $Days day(s))" | Add-Content -Encoding utf8 $handoff
} else {
  $log | Add-Content -Encoding utf8 $handoff
}

"`n## Open Issues (top 10)`n" | Add-Content -Encoding utf8 $handoff
if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh issue list -L 10 --state open --json number,title,labels --template '{{range .}}{{printf "- #%v %s %v`n" .number .title .labels}}{{end}}' | Add-Content -Encoding utf8 $handoff
} else {
  "- (gh not installed; skipping)" | Add-Content -Encoding utf8 $handoff
}

"`n## Open PRs (top 10)`n" | Add-Content -Encoding utf8 $handoff
if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh pr list -L 10 --state open --json number,title,headRefName --template '{{range .}}{{printf "- #%v %s (%s)`n" .number .title .headRefName}}{{end}}' | Add-Content -Encoding utf8 $handoff
} else {
  "- (gh not installed; skipping)" | Add-Content -Encoding utf8 $handoff
}

"`n## Next 3 Tasks`n- [ ] (Top priority)`n- [ ] (Second)`n- [ ] (Validation)" | Add-Content -Encoding utf8 $handoff
"`n## Links`n- Repo: $(git remote get-url origin 2>$null)" | Add-Content -Encoding utf8 $handoff

Write-Host "Generated $handoff"
