# 調査: 日本語の音声合成サービスと仕組み

費用・API・その場で作れるか・字幕に使える時刻が取れるか。紙芝居で使う仕組みを考える材料

> 📅 作成: 2026-10-10 / 更新: 2026-10-11

[⌂](../../README.md)

Web 検索と公式ページで調べた（2026-10-10）。実機で動かしたのは VOICEVOX と AivisSpeech だけ（結果は「試す順と残る点」）。数値は公式ページで読めたものと、二次情報・未確認を分けて書く。採用前に公式ページと実機で確かめる。

1. [わかったこと](#1-わかったこと)
2. [費用](#2-費用)
3. [仕組みの型](#3-仕組みの型)
4. [PC に入れて使うもの](#4-pc-に入れて使うもの)
5. [クラウドのサービス](#5-クラウドのサービス)
6. [ブラウザの中で作るもの](#6-ブラウザの中で作るもの)
7. [試す順と残る点](#7-試す順と残る点)

## 1. わかったこと

- **無料で試せて、API で使えるのは VOICEVOX と AivisSpeech**。どちらも PC に入れると `127.0.0.1` に HTTP の API が立ち、文を送るたびにその場で音声を返す。商用でも使えるが、声ごとの規約に従い、VOICEVOX はクレジットの表記が要る
- **字幕の句の色に使う時刻は、VOICEVOX なら取れる**（実機で確認）。合成の前に返る読みの情報に、音ごとの長さが入っている
- **クラウドは無料枠があるが、多くはアカウントとカード登録が要る**。Azure（毎月 50 万文字）・Google・Amazon Polly に無料枠。時刻は Azure・Polly・Google（目印を置く方式）・ElevenLabs で取れる。OpenAI は取れない
- **公開ページ（GitHub Pages）から、クラウドやローカルの API をその場で呼ぶのは向かない**。クラウドは鍵を公開ページに置けず、ローカルの API は見る人の PC には無い。公開するなら、前もって作った音声を置く形になる
- **見る人のブラウザの中で、その場で作る方法もある**。日本語で動くと確かめられたのは piper-plus だけで、初回に数十 MB の読み込みが要る
- この PC には、VOICEVOX・AivisSpeech・COEIROINK・ffmpeg のどれも入っていない（実測）

## 2. 費用

| 名前 | 種類 | 費用 | 無料で試すときの条件 |
|---|---|---|---|
| VOICEVOX | PC | 無料 | 商用も可。クレジット（「VOICEVOX:〈声の名前〉」）が必須。声ごとの規約に従う |
| AivisSpeech | PC | 無料（公式での確認は未） | 声（モデル）ごとに規約がある。まお・コハクは ACML 1.0 で、クレジットは任意（案内は「AivisSpeech: 名前」） |
| COEIROINK | PC | 未確認 | クレジット（「COEIROINK:〈声の名前〉」）が必須。商用不可の声もある |
| Style-Bert-VITS2 | PC | 無料（AGPL-3.0） | モデルごとの規約を見る。ネット越しに提供するとソース公開の義務がかかる |
| piper-plus | ブラウザ | 無料（MIT） | モデルの重みのライセンスは未確認 |
| Web Speech API | ブラウザ | 無料 | いま使っている。声は見る人の端末しだい |
| Azure AI Speech | クラウド | 無料枠: Neural 50 万文字／月 | Azure のアカウントが要る。カード登録の要否は未確認 |
| Google Cloud TTS | クラウド | 無料枠あり（WaveNet 100 万文字／月など。表の数値は要再確認） | 課金アカウント（カード）が要る（二次情報） |
| Amazon Polly | クラウド | 無料枠: Standard 500 万文字／月、Neural 100 万文字／月（最初の 12 か月） | AWS のアカウントが要る |
| ElevenLabs | クラウド | 無料プラン: 10,000 クレジット／月 | 商用ライセンスは有料プラン（Starter）から |
| OpenAI TTS | クラウド | 有料（tts-1 は 100 万文字あたり $15） | 無料枠は見当たらない。AI 音声であることの明示が要る |
| VOICEPEAK | PC | 有料の買い切り（約 2.4 万円〜、二次情報） | — |
| A.I.VOICE | PC | 有料（標準は個人の非商用のみ） | — |
| AITalk WebAPI | クラウド | 月額 80,000 円〜 | 評価版の申込みあり |
| CoeFont | クラウド | API の料金は未確認（法人向け月 $350） | — |

紙芝居 1 作の台本は 1,000 文字ほど。クラウドの無料枠でも、作り直しを含めて十分に収まる量。

## 3. 仕組みの型

「いつ、どこで音声を作るか」で 5 つに分かれる。

| 型 | 作る時と場所 | 使えるもの | 公開ページ（GitHub Pages） | 字幕の時刻 | 弱いところ |
|---|---|---|---|---|---|
| 1. 前もって作って置く | 作者の PC で、台本を直したとき | どれでも（PC・クラウドとも） | そのまま置ける | 作るときに控えて、一緒に置く | 台本を直すたびに作り直す。ファイルの大きさ |
| 2. 作者の PC の API でその場で作る | 見ている PC で、場面ごと | VOICEVOX・AivisSpeech・Style-Bert-VITS2 | 使えない（見る人の PC に API が無い） | その場で取れる | 手元の試作・下書き用。ブラウザから呼ぶには CORS の設定が要る |
| 3. クラウドの API でその場で作る | サービスで、場面ごと | Azure・Google・Polly・ElevenLabs 等 | 鍵を隠す中継のサーバーが要る（静的サイトだけでは無理） | サービスしだい | 費用が見る人の数に比例する。サーバーが要る |
| 4. 見る人のブラウザの中で作る | 見る人の端末で、その場 | piper-plus（WASM） | 置ける | 自前で取れるはず（未確認） | 初回に数十 MB を読み込む。端末の負荷。品質は未確認 |
| 5. ブラウザの声（いまの作り） | 見る人の端末で、その場 | Web Speech API | 置ける | 声によって来ない（ネットの声では来ないことが多い） | 声の有無・質・読みが端末しだい |

> [!NOTE]
> **組み合わせられる**: 2 で手元の下書きを聞きながら作り、決まったら 1 で書き出して公開する、という使い分けができる。VOICEVOX 系なら同じ API で両方まかなえる。

## 4. PC に入れて使うもの

| 名前 | API | その場で作れるか | 字幕の時刻 | 出力 | ブラウザから直接 |
|---|---|---|---|---|---|
| VOICEVOX | HTTP（既定 `127.0.0.1:50021`）。`POST /audio_query` で読みの情報を作り、`POST /synthesis` で音声にする。`/docs` に説明 | できる。GPU は任意。速さは未計測。エンジンだけを動かせる。Docker もある | 読みの情報に音ごとの長さ（子音・母音・間）が入っている（実機で確認。合計と WAV の長さの差は 0.005 秒） | WAV（24 kHz） | `--cors_policy_mode`・`--allow_origin` で許せば可 |
| AivisSpeech | VOICEVOX とおおむね同じ形の HTTP（既定 `10101`） | できる。初回はモデルの読み込み（約 900 MB）で数分かかる | **取れない**（実機で確認。読みの情報の音ごとの長さが、すべて 0 で返る） | WAV（44.1 kHz） | VOICEVOX と同じ設定で可 |
| COEIROINK | ローカルの API がある（ポート・形は未確認） | 未確認 | 未確認 | 未確認 | 未確認 |
| Style-Bert-VITS2 | FastAPI のサーバー。Python のライブラリとしても使える | できる（CPU でも可）。1 回 100 文字まで（設定で変更可） | 未確認 | 未確認 | 既定で全許可 |
| VOICEPEAK | 公式の HTTP API は見当たらない。コマンドで書き出す例はある | コマンドを都度起動 | 未確認 | WAV・FLAC | 不可の見込み |
| A.I.VOICE | .NET の API のみ（エディターの起動が要る） | 同じ PC の中だけ | 無し（文書上） | 未確認 | 不可 |

- 出典: [VOICEVOX ENGINE](https://github.com/VOICEVOX/voicevox_engine) ／ [VOICEVOX 利用規約](https://voicevox.hiroshiba.jp/term/) ／ [AivisSpeech Engine](https://github.com/Aivis-Project/AivisSpeech-Engine) ／ [COEIROINK 利用規約](https://coeiroink.com/terms) ／ [Style-Bert-VITS2](https://github.com/litagin02/Style-Bert-VITS2) ／ [A.I.VOICE Editor API](https://aivoice.jp/manual/editor/en-us/api.html)

## 5. クラウドのサービス

| 名前 | 日本語の声 | 字幕の時刻 | 読みの指定 | 公開ページから呼ぶとき |
|---|---|---|---|---|
| Azure AI Speech | 12 種（Nanami・Keita ほか） | SDK の単語の境界の知らせ（単語・文の位置と時刻）。日本語で出るかは未確認 | SSML（読み・置き換え・辞書） | サーバーで 10 分有効のトークンを発行して渡す形が取れる |
| Google Cloud TTS | 41 種（Standard・WaveNet・Neural2・Chirp 3 HD） | SSML の目印（`<mark>`）を句の境目に置くと、その時刻が返る | SSML（よみがな・置き換え） | 鍵を置けない。中継が要る |
| Amazon Polly | 4 名（Mizuki・Takumi・Kazuha・Tomoko） | Speech Marks（単語・文の時刻）。音声とは別に呼ぶ。位置はバイト数 | SSML | 未確認 |
| ElevenLabs | 日本語対応のモデルあり。声の数は未確認 | 文字ごとの開始・終了の時刻が返る（いちばん直接的） | 未確認 | 鍵を置けない。中継が要る |
| OpenAI TTS | 汎用の声（日本語専用なし） | 無し | SSML なし（文章で指示） | 鍵を置けない。中継が要る |

- 出典: [Azure 料金](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/) ／ [Azure 対応言語](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts) ／ [Google 料金](https://cloud.google.com/text-to-speech/pricing) ／ [Google 声の一覧](https://docs.cloud.google.com/text-to-speech/docs/voices) ／ [Polly 料金](https://aws.amazon.com/polly/pricing/) ／ [Polly Speech Marks](https://docs.aws.amazon.com/polly/latest/dg/using-speechmarks.html) ／ [ElevenLabs 料金](https://elevenlabs.io/pricing/api) ／ [ElevenLabs 時刻付き合成](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps) ／ [OpenAI TTS](https://developers.openai.com/api/docs/guides/text-to-speech) ／ [AITalk WebAPI](https://www.ai-j.jp/products/cloud_webapi/)

## 6. ブラウザの中で作るもの

- **piper-plus**: 日本語に対応（OpenJTalk 系の辞書で読みを作る）。モデル約 38 MB（6 言語版）、読みを作る部品が gzip で約 19 MB。2 回目からはキャッシュで速い。ブラウザで動くデモがある。品質とブラウザでの日本語の速さは未確認
- **Kokoro**: 日本語の声が 5 つあるが、評価は低め。ブラウザ版で日本語が動くかは未確認
- **sherpa-onnx**: 日本語のモデルはあるが、ブラウザ版の日本語は未確認
- **Web Speech API**（いまの作り）: 句の位置の知らせ（boundary）は、ネットの声では来ないことが多い。iPhone では日本語の声が一覧に出ない報告がある（未確認）。ネットの声は文を外のサービスへ送る

- 出典: [piper-plus](https://github.com/ayutaz/piper-plus/) ／ [piper-plus のデモ](https://ayutaz.github.io/piper-plus/) ／ [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) ／ [sherpa-onnx の日本語モデル](https://k2-fsa.github.io/sherpa/onnx/tts/all/Japanese/index.html) ／ [MDN boundary](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event) ／ [WebKit の報告](https://bugs.webkit.org/show_bug.cgi?id=250665)

## 7. 試す順と残る点

### 無料で試す順（案）

1. **VOICEVOX** を入れ、API で 1 場面の文を作って聞く。`/audio_query` の JSON で、句の時刻が取れるかを見る（型 1・2 の両方を確かめられる）
2. **AivisSpeech** で同じ文を作り、声と抑揚を聞き比べる
3. **piper-plus のデモ**をブラウザで開き、日本語の質と読み込みの重さを見る（型 4）
4. クラウドは、無料の 3 つで足りないときに、カード登録の要否を確かめてから試す

### VOICEVOX を動かした結果（2026-10-11）

- Windows の zip 版（DirectML、0.25.2）を展開し、同梱のエンジン（`vv-engine/run.exe`）だけを起動した。`/version` は `0.25.2` を返した
- ✅ 「むかしむかし、あるところに、おじいさんとおばあさんがすんでいました。」を、声 ID 3 で WAV（24 kHz）にできた
- ✅ `/audio_query` の JSON には、モーラごとの子音・母音の長さと、句の後の間が入っている。合計すると 5.424 秒になり、できた WAV は 5.429 秒だった。**合成の前に文の長さと、句ごとの時刻が取れる**
- 速さ: 読みの情報 1.7 秒、合成 2.2 秒（初回の 1 文。2 回目以降と長い文は未計測）

### AivisSpeech を動かした結果（2026-10-11）

- Windows の zip 版（`1.1.0-dev`）を展開し、同梱のエンジン（`AivisSpeech-Engine/run.exe`）だけを起動した。ポート 10101 で `/version` が `1.1.0-dev` を返した。**dev 版**なので、安定版では結果が変わるかもしれない
- ✅ `/speakers` に、まお（ノーマル・ふつー・あまあま・おちつき・からかい・せつなめ の 6 スタイル）とコハク（ノーマル・あまあま・せつなめ・ねむたい の 4 スタイル）が入っている。VOICEVOX と同じ形の JSON で返り、声 ID は 888753760 のような大きな数
- ✅ VOICEVOX と同じ 1 文を、まお（ノーマル）・コハク（ノーマル）で WAV（44.1 kHz）にできた。`/audio_query` → `/synthesis` の呼び方は VOICEVOX と同じ
- ❌ **`/audio_query` が返すモーラごとの子音・母音の長さと高さは、すべて 0**。VOICEVOX のように、合成の前に句ごとの時刻を取る手は使えない。長さは合成して WAV を作るまで分からない
- ⚠️ 同じ声で同じ文を 2 回作ると、長さが変わる（まお 5.320 秒と 5.217 秒、コハク 5.508 秒と 5.485 秒）。VOICEVOX は同じ文なら同じ長さになる見込み（2 回目は未計測）
- 速さ: 1 回目は 7.6〜7.8 秒（モデルの読み込みを含む）、2 回目は 2.3〜2.7 秒。読みの情報は 50 ms 以下
- WAV の大きさ: 1 文（約 5.3 秒）で約 450 KB。VOICEVOX（24 kHz）は同じ長さで約 260 KB の見込み。声を増やす・全編を置くと、AivisSpeech のほうが重い
- `README.txt` に書いてあるのは、AivisSpeech 本体の LGPL-3.0 のライセンスだけ。声（まお・コハク）ごとの利用規約とクレジットの書き方は書かれていない。AivisHub の各モデルのページで確かめた（2026-10-11）: ライセンスは ACML 1.0、クレジットの案内は「AivisSpeech: まお」「AivisSpeech: コハク」。ACML 1.0 の本文では、クレジットは任意、禁止事項（なりすまし・誹謗中傷・政治宗教の宣伝など）に当たらなければ商用・公開も可で、モデルを配布するときだけライセンス文書の添付が要る。生成した音声の公開には条件が無い

### 全 15 場面を 4 声で作った結果（2026-10-11）

桃太郎の台本の全場面（`read` があればそれ）を、場面ごとに 1 つの WAV にした。紙芝居の読み上げは文ごとなので、組み込みでは文ごとに作る（次の確認は文ごと）。

| 声 | WAV の形式 | 全 15 場面の長さ | WAV の大きさ（合計） | 合成にかかった時間（合計） |
|---|---|---:|---:|---:|
| VOICEVOX ずんだもん | 24 kHz | 125 秒 | 5.7 MB | 43 秒 |
| VOICEVOX 四国めたん | 24 kHz | 109 秒 | 5.0 MB | 37 秒 |
| AivisSpeech まお | 44.1 kHz | 124 秒 | 10.4 MB | 55 秒 |
| AivisSpeech コハク | 44.1 kHz | 130 秒 | 10.9 MB | 56 秒 |

- ✅ 4 声とも、全場面が作れた。1 場面は 2〜4 秒で作れる。台本を直したときの作り直しは、全体でも 1 分ほど
- ⚠️ 4 声を置くと、WAV だけで約 32 MB。1 声だけを読み込むなら 5〜11 MB。mp3 にすればおよそ 1 割になる見込み（ffmpeg が無く、未計測）
- ✅ VOICEVOX は、読みの情報から句の終わりの時刻を作れる。場面 1・4 で、WAV の無音の終わりと 0.01〜0.06 秒の差で合った
- ⚠️ **WAV の無音（0.15 秒以上）から句の区切りを取る方法は、そのままでは当てにならない**。台本の全 27 文を、文ごとに作って調べた。無音の数が字幕の句の数と合ったのは、ずんだもん 21 文・四国めたん 26 文・まお 26 文・コハク 24 文。合わない文は、句の途中の自然な間を拾って多すぎる（「二人はこの子を「桃太郎」と名づけました」など）か、「どんぶらこ、どんぶらこ」の読点の間が短くて少なすぎる。閾値を変えても全部は合わない
- ✅ **句ごとに別々に合成してつなぐと、境目の時刻が確実に分かる**。まお・コハクの 2 文（句 4 個・3 個）で、つなぎ目の時刻が出た。聞いた印象（抑揚が句の境目で途切れないか）は未確認

### まだ確かめていないこと

- 句ごとに合成してつないだ音声を聞いて、自然さが許せるか（`tmp/voice-phrasewise/` にまお・コハクの 2 文がある）
- ずんだもん・四国めたんの公式の規約（公開ページでの利用・クレジットの書き方。いまは第三者の要約で確認）
- クラウドの料金表の正確な数値、カード登録の要否、生成した音声を公開してよいかの条文
- wav をそのまま置いたときの大きさと、mp3 にする道具（ffmpeg）を入れるかどうか

[⌂](../../README.md)
