# 計画: 紙芝居アニメの試作（外部サービス不使用）

> 📅 作成: 2026-10-04 / 更新: 2026-10-08

[⌂](../../README.md)

1. [目的](#1-目的)
2. [成果物](#2-成果物)
3. [進め方](#3-進め方)
4. [着手前に確かめる前提](#4-着手前に確かめる前提)
5. [サンプル](#5-サンプル)
6. [作品の置き場と公開](#6-作品の置き場と公開)
7. [範囲外](#7-範囲外)

## 1. 目的

Claude Code と手元のツールだけで、絵・動き・音声のついた紙芝居を作れるかを確かめる。クラウドの画像生成・音声合成など、外部サービスは使わない。

規模は 3 場面に絞る。作り方が成り立つかを見るための試作であり、作品の出来は問わない。

## 2. 成果物

| 成果物 | 置き場 | 内容 |
|---|---|---|
| 共通の仕組み | `src/engine/` | 舞台・字幕・送り（`kamishibai.css`・`player.js`）と、ブラウザの読み上げ（`speech.js`） |
| 作品 | `src/works/01-momotaro/` | 桃太郎。15 場面。台本と絵（SVG）は `story.js` に持つ |
| 音声合成のサンプル | `notes/samples/voice-list.ps1`<br>`notes/samples/voice-speak.ps1`<br>`notes/samples/voice-to-wav.ps1`<br>`notes/samples/voice-winrt.ps1` | 段階 2 の下調べで使ったサンプル。同名の cmd ランチャー付き。読み上げは Web Speech API にしたため、紙芝居では使っていない |
| 動画化スクリプト | `tools/20_build/make-video.ps1` | 紙芝居をコマ撮りし、音声と合わせて mp4 にする。同名の cmd ランチャーを付ける |
| 動画 | `dist/kamishibai.mp4` | 動画化スクリプトの出力（Git 管理外） |

## 3. 進め方

3 段階に分け、段階ごとに利用者の確認を取ってから次へ進む。

### 段階 1: 紙芝居 HTML（音声なし）

- 題材は桃太郎。台本は作品の `story.js` に書く
- 場面ごとの絵を SVG で描き、場面の切り替えと字幕表示を作る
- 送りはクリック・矢印キーの手動と、読み終わりでの自動の両方にする
- 詳しくは [計画: Web 紙芝居「桃太郎」の冒頭](p261004-02-momotaro-web.md)と [計画: 桃太郎を最後まで](p261004-03-momotaro-full.md)

### 段階 2: 読み上げ音声

- ブラウザの Web Speech API で、場面に入ったら台本を読み上げ、読み終わったら次の場面へ送る（`src/engine/speech.js`）。wav は作らない
- 下調べで使ったコードは「サンプル」の章にまとめる

### 段階 3: 動画化

- PlayWright 共有環境で紙芝居を再生しながらコマ撮りする
- ffmpeg でコマと音声をまとめ、mp4 にする

## 4. 着手前に確かめる前提

該当する段階の着手前に確かめる。

| 前提 | 確かめ方 | 段階 | 結果 |
|---|---|---|---|
| 日本語の音声（Haruka 等）が入っている | `System.Speech` の `GetInstalledVoices()` で一覧を出す | 2 | ✅ 確認済み。`System.Speech` で Haruka Desktop、WinRT で Ayumi・Haruka・Ichiro。どれも wav 保存・再生まで動いた |
| ffmpeg が PATH にある | `ffmpeg -version` | 3 | ⬜ 未実施 |
| PlayWright 共有環境でコマ撮りできる | 共有環境の利用方法の資料を読む | 3 | ⬜ 未実施 |

> [!NOTE]
> **前提が欠けていたとき**: ffmpeg が無ければ、追加のインストールが要る。どれを入れるかは、その時点で案を出して決める。

## 5. サンプル

### 音声合成

Windows の音声合成には、従来の `System.Speech` と、新しい WinRT（`Windows.Media.SpeechSynthesis`）の 2 つがある。選べる声と、声を選ぶときに使う値が違う。この PC で一覧を出した結果は次のとおり。

| 仕組み | 声を選ぶときの値 | 言語 | 性別 |
|---|---|---|---|
| `System.Speech` | `Microsoft Haruka Desktop` | ja-JP | 女性 |
| `System.Speech` | `Microsoft Zira Desktop` | en-US | 女性 |
| WinRT | `Microsoft Ayumi`（既定） | ja-JP | 女性 |
| WinRT | `Microsoft Haruka` | ja-JP | 女性 |
| WinRT | `Microsoft Ichiro` | ja-JP | 男性 |

- `System.Speech` は `SelectVoice` に名前（`Name`）を渡して選ぶ
- WinRT は `AllVoices` から `DisplayName` で探し、見つけた声を `Voice` に入れる
- Windows の設定情報には WinRT 側の声として Sayaka も登録されているが、`AllVoices` には出ない

#### 声の一覧を出す

`notes/samples/voice-list.ps1`（`voice-list.cmd` 付き）。2 つの仕組みそれぞれについて、選べる声を出す。上の表はこの出力から作った。

```powershell
$ErrorActionPreference = 'Stop'

Write-Output '--- System.Speech（SelectVoice に渡す値は Name） ---'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
foreach ($v in $synth.GetInstalledVoices()) {
	$i = $v.VoiceInfo
	Write-Output ("Name={0} / Culture={1} / Gender={2} / 有効={3}" -f $i.Name, $i.Culture, $i.Gender, $v.Enabled)
}
$synth.Dispose()

Write-Output ''
Write-Output '--- WinRT（Voice に入れる声を DisplayName で探す） ---'
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
foreach ($v in [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices) {
	Write-Output ("DisplayName={0} / Language={1} / Gender={2}" -f $v.DisplayName, $v.Language, $v.Gender)
}
Write-Output ("既定: {0}" -f [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::DefaultVoice.DisplayName)
```

- `[Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]`: WinRT の型を PowerShell 5.1 に読み込む書き方。`Add-Type` は使わない
- `DefaultVoice`: 声を選ばないときに使われる声

#### スピーカーから読み上げるだけ

`notes/samples/voice-speak.ps1`（ダブルクリック用の `voice-speak.cmd` 付き）。保存せず、その場で鳴らす最小の形。

```powershell
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Haruka Desktop')
$synth.Speak('むかしむかし、ある山のふもとに、小さな村がありました。')
$synth.Dispose()
```

- `Add-Type -AssemblyName System.Speech`: Windows に入っている .NET Framework の音声合成の部品を読み込む
- `SelectVoice`: 使う音声を名前で選ぶ。省くと Windows の既定の音声になる
- `Speak`: 読み終わるまで待つ。待たずに先へ進むなら `SpeakAsync`
- 速さは `$synth.Rate`（-10〜10）、音量は `$synth.Volume`（0〜100）で変える

#### wav に保存して再生する

`notes/samples/voice-to-wav.ps1`（`voice-to-wav.cmd` 付き）。音声の一覧を出し、日本語の音声を探して選び、wav に書き出してから再生する。

```powershell
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
Write-Output '--- インストール済みの音声 ---'
foreach ($v in $synth.GetInstalledVoices()) {
	$i = $v.VoiceInfo
	Write-Output ("{0} / {1} / {2} / 有効={3}" -f $i.Name, $i.Culture, $i.Gender, $v.Enabled)
}

$ja = $synth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'ja-JP' } | Select-Object -First 1
if (-not $ja) {
	Write-Output '日本語の音声が見つからない'
	exit 1
}
$synth.SelectVoice($ja.VoiceInfo.Name)
Write-Output ("使用する音声: {0}" -f $ja.VoiceInfo.Name)

$outDir = Join-Path $PSScriptRoot '../../tmp'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory $outDir | Out-Null }
$wav = Join-Path $outDir 'voice-to-wav.wav'
$synth.SetOutputToWaveFile($wav)
$synth.Speak('むかしむかし、ある山のふもとに、小さな村がありました。')
$synth.SetOutputToNull()
$synth.Dispose()

$size = (Get-Item $wav).Length
Write-Output ("wav を書き出した: tmp/voice-to-wav.wav（{0:N0} バイト）" -f $size)

$player = New-Object System.Media.SoundPlayer $wav
$player.PlaySync()
Write-Output '再生終了'
```

- `GetInstalledVoices()`: 入っている音声の一覧。言語（`Culture`）が `ja-JP` のものを選ぶ
- `SetOutputToWaveFile`: 出力先を wav にする。この後の `Speak` はスピーカーで鳴らず、ファイルに書かれる
- `SetOutputToNull`: 出力先を切り替えて、wav を閉じる
- `System.Media.SoundPlayer` の `PlaySync`: wav を鳴らし、終わるまで待つ

#### WinRT の声を切り替えて再生する

`notes/samples/voice-winrt.ps1`（`voice-winrt.cmd` 付き）。Ayumi・Haruka・Ichiro の順に、名乗りを入れた文を wav に書き出して再生する。

```powershell
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]

# WinRT の非同期操作を .NET の Task に変えて待つ
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
	$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Wait-WinRT($op, [Type]$type) {
	$task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
	[void]$task.Wait(-1)
	$task.Result
}

$outDir = Join-Path $PSScriptRoot '../../tmp'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory $outDir | Out-Null }
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
foreach ($name in 'Ayumi', 'Haruka', 'Ichiro') {
	$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq "Microsoft $name" }
	if (-not $voice) {
		Write-Output ("見つからない: Microsoft {0}" -f $name)
		continue
	}
	$synth.Voice = $voice
	$text = "わたしは{0}です。むかしむかし、ある山のふもとに、小さな村がありました。" -f $name
	$stream = Wait-WinRT ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])

	$wav = Join-Path $outDir ("voice-{0}.wav" -f $name)
	$src = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
	$dst = [System.IO.File]::Create($wav)
	$src.CopyTo($dst)
	$dst.Close()
	$src.Close()

	Write-Output ("{0}: tmp/voice-{0}.wav（{1:N0} バイト）を再生" -f $name, (Get-Item $wav).Length)
	$player = New-Object System.Media.SoundPlayer $wav
	$player.PlaySync()
}
Write-Output '再生終了'
```

- `Wait-WinRT`: WinRT の処理は終わるのを待たずに戻る。PowerShell 5.1 には待つ書き方が無いため、.NET の `Task` に変えて終わるまで待つ
- `SynthesizeTextToStreamAsync`: 読み上げを音声データ（wav 形式）にする。WinRT にはスピーカーで直接鳴らす機能が無いため、ファイルに書き出してから `SoundPlayer` で鳴らす
- `AsStreamForRead`: WinRT のデータを .NET のストリームに変え、`CopyTo` でファイルへ写す

> [!NOTE]
> **BOM が要る**: 日本語を含む ps1 は BOM 付き UTF-8 で保存する。BOM が無いと Windows PowerShell 5.1 が文字コードを読み違え、構文エラーで止まる。`System.Speech` は .NET Framework の部品のため、5.1 で動かす（PowerShell 7 での動作は未確認）。

## 6. 作品の置き場と公開

作品をいくつか作るため、共通の仕組みと作品を分けて置く。作品は台本と絵だけを持ち、送り・音・読み上げは共通の仕組みを使う。

```text
src/
  engine/                共通の仕組み
    kamishibai.css        舞台の枠・字幕・切り替えの動き
    player.js             送り・自動再生・操作
    sound.js              効果音・BGM（Web Audio）
    speech.js             読み上げ（Web Speech）
  works/
    01-momotaro/          桃太郎
      index.html          engine を読み込むだけ
      story.js            台本・場面ごとの絵（SVG）・音の指定
```

- 作品のフォルダ名は `番号-英数字`（`01-momotaro`）。番号は作った順
- 作品名は漢字で付け、`<title>`・README の作品の章・画面の表題に使う。1 作目は「桃太郎」。計画は [計画: Web 紙芝居「桃太郎」の冒頭](p261004-02-momotaro-web.md)と、全編に広げた [計画: 桃太郎を最後まで](p261004-03-momotaro-full.md)
- 共通の JS は `<script src>` で読み込む。ES モジュール（`import`）はファイルを直接開いたとき読み込めないため使わない
- 台本は各作品の `story.js` に持つ

### 公開

- GitHub Pages で、`develop` ブランチの root から公開する
- root に `index.html`（`README.html` へのリダイレクト）と `.nojekyll` を置く。作品一覧のページは置かず、README の作品の章から各作品へ直接リンクする。作品の画面の ⌂ は README へ戻る
- 無料プランの Pages は public リポジトリが要る。公開前に git の初期化と、公開してよい内容かの点検を行う

## 7. 範囲外

- アニメ調のイラスト（ローカルでの画像生成）。GPU とモデルの導入が要るため、別の計画にする
- VOICEVOX など、標準以外の音声合成ソフト
- BGM・効果音

[⌂](../../README.md)
