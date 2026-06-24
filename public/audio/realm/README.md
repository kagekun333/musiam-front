# public/audio/realm/

地方ごとの環境音ループ（放送ハイブリッド R3）を置く場所。
仕様: `docs/AMBIENT_AUDIO_SPEC.md`。

ファイル名 = 地方id（atlas/regions.ts と一致）:
shrine / highland / coast / reverie / dawn / alley / citadel / market / library / skyfield / frontier

例: `shrine.mp3`（20〜45秒・シームレスループ・〜1MB）

ここに置くだけで、没入ホームが自動でクロスフェード再生します（無いidは静寂）。
入領の効果音は `public/audio/sfx/enter.mp3`。
