# 紙芝居アニメーション

絵・動き・音・読み上げのついた紙芝居を、ブラウザで動かす試作

> 📅 作成: 2026-10-04 / 更新: 2026-10-08

[⌂](../)

Claude Code と手元のツールだけで、紙芝居アニメーションを作れるかを確かめるプロジェクト。絵と動きは SVG、読み上げはブラウザの音声合成、効果音と BGM は Web Audio で作る。クラウドの画像生成は使わない。

## 1. 作品

絵をクリックするか、矢印キーで場面を送る。

[桃太郎 桃から生まれ、犬・猿・きじと鬼を退治して、村へ帰るまで。15 場面](src/works/01-momotaro/index.html)

## 2. 状態

- [状態: 紙芝居アニメーション](notes/30_status/status.md)

## 3. 計画

- [計画: 紙芝居アニメの試作（外部サービス不使用）](notes/10_plan/p261004-01-kamishibai-animation.md)
- [計画: Web 紙芝居「桃太郎」の冒頭](notes/10_plan/p261004-02-momotaro-web.md)
- [計画: 桃太郎を最後まで](notes/10_plan/p261004-03-momotaro-full.md)

## 4. サンプル

### Windows の音声合成

- [計画書「サンプル」の章](notes/10_plan/p261004-01-kamishibai-animation.md#5-サンプル)（`notes/samples/voice-*.ps1` の解説）

### ブラウザの読み上げ

- [サンプル: Web Speech API の読み上げ](notes/samples/speech-webspeech.md)

### ブラウザの効果音と BGM

- [サンプル: Web Audio API の効果音と BGM](notes/samples/sound-webaudio.md)

[⌂](../)
