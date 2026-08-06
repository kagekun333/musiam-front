# Works Index to 伯爵Chat — Production Evidence

日時: 2026-07-23 JST
判定: `PROVEN_LIVE / NO_TRAFFIC_YET`

- `/works` にCollector Previewを一枠だけ追加。
- CTAは `/chat?intent=metal-print` へ直行。
- attribution: `utm_source=works_index`、`utm_medium=owned`、`utm_campaign=catalog_discovery`、`utm_content=collector_preview`。
- 購入義務なし・印刷proof確認前は非販売と明記。
- production deployment: `dpl_9jE8bhpS1AoUw61dK2kgVPzEs92j` (`READY`、`www.hakusyaku.xyz` alias済み)。
- 公開HTML 186,213 bytesで見出し、CTA、Chat URL、source、campaign、proof文言を確認。
- `npm run typecheck`: PASS。
- `npm run validate:metal-print-inbound`: PASS。
- `npm run validate:metal-print-attribution`: PASS。
- local/Vercel build: PASS、1041 pages。

公開後に本番Redisから30日ファネルを再取得した時点では全event 0。これは入口稼働の証拠であり、需要・qualified pipeline・売上の証拠ではない。
