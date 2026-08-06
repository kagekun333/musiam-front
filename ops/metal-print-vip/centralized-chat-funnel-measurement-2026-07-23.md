# Centralized Chat Funnel Measurement — Production Evidence

日時: 2026-07-23 JST
判定: `PROVEN_LIVE / CUSTOMER_TRAFFIC_ZERO`

## 解消した欠落

- 交易所・作品一覧・法人LPからDossierを経ずChatへ直行したsessionでも`metal_chat_start`を記録。
- 候補チップを使わずtextareaへ直接入力した場合も、最初のuser turnで`metal_first_message`を記録。
- first-message記録を`sendText`へ一本化し、入力方法による計測差を除去。
- 同一sessionはRedis HyperLogLogでdedupeされるため、Dossier CTAとChat mountの重複でsession数を水増ししない。

## Evidence

- production: `dpl_E4by38S5DVGi45DeiXQfM9mDzMAh`、`READY`、独自ドメインalias済み。
- typecheck、first-party funnel、funnel contract、attribution: PASS。
- local/Vercel build: PASS、1041 pages。
- PIIなしの`verification_centralized_entry`を本番APIへ送信。
- Redis verification snapshot: `metal_chat_start=1`、`metal_first_message=1`。
- campaign別にも両eventが1 sessionで記録。
- production customer namespaceとは分離。
- 一時環境ファイルは削除済み。

これは計測完全性を証明するが、実需要を証明しない。customer trafficとqualified pipelineは依然0。
