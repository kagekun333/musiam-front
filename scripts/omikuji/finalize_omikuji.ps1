Param()
$ErrorActionPreference = "Stop"
$root = "src/data/omikuji"
node scripts/omikuji/detect_translated_base.mjs
if ($LASTEXITCODE -eq 2) {
  if ($env:OMIKUJI_RESYNC -eq "1") {
    if (Test-Path "scripts/omikuji/sync_omikuji.py") {
      python scripts/omikuji/sync_omikuji.py --out_dir src/data/omikuji
    } else {
      throw "Base already has translations. Set OMIKUJI_RESYNC=1 and re-run after regenerating base."
    }
  } else { throw "Base already has translations. Set OMIKUJI_RESYNC=1 and re-run." }
}
(Get-Content "$root\ja.txt" -Raw) -replace '=== TEXT END ===\s*','' | Set-Content -Encoding UTF8 "$root\ja.txt"
(Get-Content "$root\en.txt" -Raw) -replace '=== TEXT END ===\s*','' | Set-Content -Encoding UTF8 "$root\en.txt"
node scripts/omikuji/strip_bom.mjs "$root/ja.txt" "$root/en.txt"
node scripts/omikuji/normalize_categories.mjs
python scripts/omikuji/add_line_translations.py
Copy-Item "$root\ja.with_trans.txt" "$root\ja.txt" -Force
Copy-Item "$root\en.with_trans.txt" "$root\en.txt" -Force
node scripts/omikuji/strip_bom.mjs "$root/ja.txt" "$root/en.txt"
node scripts/omikuji/qa_validate.mjs
node scripts/omikuji/check_line_translations_zero.mjs
Write-Host "`n[OK] finalize pipeline finished."