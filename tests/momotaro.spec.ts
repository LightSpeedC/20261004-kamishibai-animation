// 桃太郎の紙芝居が、表紙から最後の場面まで送れることを確かめる（p261004-02・p261004-03）
// PlayWright 共有環境で実行する（tools/40_test/run-tests.ps1）
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import { pathToFileURL } from 'url';

// 1 つずつ順に流す。並べて流すと、絵の動きと録画の負荷でスクリーンショットの撮影が失敗する
// （Page.captureScreenshot: Unable to capture screenshot。単独なら通る）
test.describe.configure({ mode: 'default' });

// テストの間、Chromium の音を消す。効果音と BGM のテストは本当に音を鳴らすため、
// 消さないと PC のスピーカーから電子音が鳴り続ける。鳴らした記録（KamishibaiSound.history）は残る
// （WebKit には Web Audio が無く、このオプションも無いため付けない）
test.use({
	launchOptions: [async ({ browserName }, use) => {
		await use(browserName === 'chromium' ? { args: ['--mute-audio'] } : {});
	}, { scope: 'worker' }] as any,
});

// プロジェクトのフォルダ。このファイル（tests/）の 1 つ上
const ROOT = path.resolve(__dirname, '..');
const WORK = pathToFileURL(path.join(ROOT, 'src/works/01-momotaro/index.html')).href;
const SHOTS = path.join(ROOT, 'tmp/screens');

const TEXTS = [
	'むかしむかし、ある所に、おじいさんとおばあさんが住んでいました。',
	'おじいさんは山へしばかりに、おばあさんは川へせんたくに行きました。',
	'おばあさんが川でせんたくをしていると、川上から大きな桃が、どんぶらこ、どんぶらこと流れてきました。',
	'おばあさんは桃を家に持ち帰りました。おじいさんが包丁で切ろうとすると、桃がぱかっと割れて、中から元気な男の赤ちゃんが生まれました。',
	'桃から生まれたので、二人はこの子を「桃太郎」と名づけました。',
	'桃太郎はすくすくと育ち、村いちばんの力持ちになりました。',
	'ある日、海の向こうの鬼ヶ島から鬼がやってきて、村を荒らしては宝物を奪っていくと聞きました。',
	'「わたしが鬼を退治してきます」。おばあさんは、日本一のきびだんごをこしらえて持たせてくれました。',
	'しばらく行くと、犬がやってきました。「桃太郎さん、お腰につけたきびだんご、一つわたしにくださいな」。きびだんごをもらった犬は、家来になりました。',
	'つぎに、猿がやってきました。「桃太郎さん、お腰につけたきびだんご、一つわたしにくださいな」。きびだんごをもらった猿も、家来になりました。',
	'そのあと、きじが飛んできました。「桃太郎さん、お腰につけたきびだんご、一つわたしにくださいな」。きびだんごをもらったきじも、家来になりました。',
	'桃太郎たちは船に乗って、鬼ヶ島へ向かいました。',
	'鬼ヶ島に着くと、犬はかみつき、猿はひっかき、きじはつつき、桃太郎は鬼の大将をやっつけました。',
	'「まいりました。もう悪いことはしません」。鬼たちは、奪った宝物を差し出しました。',
	'桃太郎は宝物を持って村へ帰り、村の人たちに返しました。おじいさんもおばあさんも、村の人たちも、みんな大喜びしました。めでたし、めでたし。',
];
const N = TEXTS.length;

// 読み上げる文。音声合成が読み違える語は、読み用の文（read）でかなにしてある。字幕は漢字のまま
// 「日本一」は「にほんいち」、「大喜び」は「だいよろこび」、「中から」は「ちゅうから」と読まれた
const SPOKEN = TEXTS.map((t) => t.replace('日本一', 'にっぽんいち').replace('大喜び', 'おおよろこび').replace('中から', 'なかから').replace(/宝物/g, 'たからもの'));

// 読み上げは文ごとに区切る。player.js と同じ区切り方
function sentences(text: string): string[] {
	return text.match(/[^。！？]+[。！？」]*/g) ?? [];
}

// 読み上げる文の先頭には「っ」が付く。読み始めの音が削れるのを防ぐため（speech.js）
function uttered(sentence: string): string {
	return 'っ' + sentence;
}

// 場面ごとに、動きが一段落するまで待ってから撮る
// （3 は桃が流れ着くまで、4 は桃が割れるまで、13 は大将を投げ終えるまで、15 は車が止まって「めでたし」が出るまで）
const SETTLE_MS = [2500, 6500, 7500, 3500, 3000, 3000, 3000, 3000, 3000, 3000, 3500, 3000, 5000, 3000, 7000];

type Voice = { name: string; lang: string; localService: boolean };
const ONE_VOICE: Voice[] = [{ name: 'テストの声', lang: 'ja-JP', localService: true }];
// 日本語の声が内蔵とネットに 1 つずつ。英語の声は一覧に出ないこと
const THREE_VOICES: Voice[] = [
	{ name: '声A', lang: 'ja-JP', localService: true },
	{ name: '声B', lang: 'ja-JP', localService: false },
	{ name: 'English', lang: 'en-US', localService: true },
];

// 事前生成の声の表示名。tools/20_build/make-voice.ts の表と揃える（p261010-01）
// 「wav 6MB」の大きさは音声を作り直すと変わるため、数字は問わない
// 声ごとに mp3（wav から変換）、wav の順（p261012-02 の 76-A）
// 「ﾌｧｲﾙ」は半角。等幅で数えると「内蔵」と、「VOICEVOX」は「動的生成」と同じ幅になり、一覧で位置がそろう（利用者の指定）
const RECORDED_LABELS = [
	/^無料: ﾌｧｲﾙ: VOICEVOX: ずんだもん \(wav➡mp3 \d+MB\)$/,
	/^無料: ﾌｧｲﾙ: VOICEVOX: ずんだもん \(wav \d+MB\)$/,
	/^無料: ﾌｧｲﾙ: VOICEVOX: 四国めたん \(wav➡mp3 \d+MB\)$/,
	/^無料: ﾌｧｲﾙ: VOICEVOX: 四国めたん \(wav \d+MB\)$/,
	/^無料: ﾌｧｲﾙ: AivisSpeech: まお \(wav➡mp3 \d+MB\)$/,
	/^無料: ﾌｧｲﾙ: AivisSpeech: まお \(wav \d+MB\)$/,
	/^無料: ﾌｧｲﾙ: AivisSpeech: コハク \(wav➡mp3 \d+MB\)$/,
	/^無料: ﾌｧｲﾙ: AivisSpeech: コハク \(wav \d+MB\)$/,
];

// 事前生成の音声が無い作品の状態にする（voice.js が window.VOICE を書き込めなくする）
async function mockNoRecorded(page: Page) {
	await page.addInitScript(() => {
		Object.defineProperty(window, 'VOICE', { value: undefined, configurable: true });
	});
}

// 音声ファイルの再生を差し替える。本物の再生は、環境ごとに音の有無も長さも変わるため
// 鳴らしたファイルを __played に、止めた回数を __pausedAudio に残す。
// 再生の位置は __audio.currentTime を直接書き、終わりは __audioEmit('ended') で知らせる
// fail: true なら、再生の開始を断る（自動再生の禁止や、読めないファイルの代わり）
async function mockAudio(page: Page, opts: { fail?: boolean } = {}) {
	await page.addInitScript((o) => {
		const w = window as any;
		w.__played = [];
		w.__pausedAudio = 0;
		class FakeAudio {
			_src = '';
			currentTime = 0;
			listeners: Record<string, Array<() => void>> = {};
			get src() { return this._src; }
			set src(v: string) { this._src = v; this.currentTime = 0; }
			addEventListener(n: string, f: () => void) { (this.listeners[n] ??= []).push(f); }
			removeEventListener(n: string, f: () => void) { this.listeners[n] = (this.listeners[n] ?? []).filter((x) => x !== f); }
			play() {
				w.__played.push(this._src);
				w.__audio = this;
				return o.fail ? Promise.reject(new Error('再生できない')) : Promise.resolve();
			}
			pause() { w.__pausedAudio++; }
		}
		w.Audio = FakeAudio;
		w.__audioEmit = (n: string) => (w.__audio.listeners[n] ?? []).slice().forEach((f: () => void) => f());
	}, opts);
}

// 読み上げを差し替える。本物の声は、テストの環境ごとに有無も読む長さも変わるため
// voices: ブラウザにある声 / endMs: 1 文を読み終えるまでの時間（null は読み終わらない）
// holdIf: この語を含む文だけは読み終わらない（その文を読んでいる途中の字幕を見るため）
// 読んだ文を __spoken に、読んだ声の名前を __voices に残す
// keepDefaultVoice: 何も選んでいない状態のまま始める。付けないと、ブラウザの声を選んだ状態から始める
// （既定は事前生成のずんだもんで、本物の音声ファイルを鳴らして時間が変わるため）
// noBoundary: 読んだ位置の合図（boundary）を出さない声。Chrome のネットの声（Google 日本語など）はこうなる
async function mockSpeech(page: Page, opts: { voices: Voice[]; endMs: number | null; holdIf?: string; keepDefaultVoice?: boolean; noBoundary?: boolean }) {
	await page.addInitScript((o) => {
		const w = window as any;
		try {
			// 「b:」だけの値は、ブラウザの声を選んだ印（声の名前は既定の選び方で決まる）
			if (!o.keepDefaultVoice && sessionStorage.getItem('kamishibai.voice') === null) sessionStorage.setItem('kamishibai.voice', 'b:');
		} catch (e) { /* 残せない環境では、そのまま */ }
		w.__spoken = [];
		w.__voices = [];
		w.__canceled = 0;
		w.SpeechSynthesisUtterance = class {
			text: string;
			constructor(t: string) { this.text = t; }
		};
		let cur: any = null;
		const fake = {
			getVoices: () => o.voices,
			addEventListener: () => {},
			resume: () => {},
			speak(u: any) {
				w.__spoken.push(u.text);
				w.__voices.push(u.voice ? u.voice.name : null);
				cur = u;
				// 読み上げた文の、最初の「、」まで読んだ合図
				const comma = u.text.indexOf('、');
				setTimeout(() => {
					if (cur === u && u.onboundary && comma >= 0 && !o.noBoundary) u.onboundary({ charIndex: comma, charLength: 1 });
				}, 30);
				if (o.endMs !== null && !(o.holdIf && u.text.includes(o.holdIf))) {
					u.__timer = setTimeout(() => {
						if (cur !== u) return;
						cur = null;
						if (u.onend) u.onend();
					}, o.endMs);
				}
			},
			cancel() {
				w.__canceled++;
				if (!cur) return;
				const u = cur;
				cur = null;
				clearTimeout(u.__timer);
				if (u.onerror) u.onerror({ error: 'interrupted' });
			},
		};
		Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
	}, opts);
}

test('表紙から「はじまり」と矢印キーで全 15 場面を送り、字幕が台本どおりに変わる', async ({ page }) => {
	// 場面ごとに動きを待って撮るため、既定の 30 秒では足りない
	test.setTimeout(180_000);
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
	// 読み終わらない声にして、自動で送られないようにする
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });

	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto(WORK);
	await expect(page).toHaveTitle('桃太郎');
	await expect(page.locator('.ks-page')).toHaveText('表紙');
	await expect(page.locator('.ks-start')).toBeVisible();
	// ブラウザごとにフォルダを分ける（tmp/screens/chromium/ ・ tmp/screens/webkit/）。同じ名前だと後に終わった方で上書きされる
	const shots = path.join(SHOTS, test.info().project.name);
	await page.screenshot({ path: path.join(shots, 'momotaro-00.png') });

	await page.locator('.ks-start').click();
	for (let i = 0; i < TEXTS.length; i++) {
		if (i > 0) await page.keyboard.press('ArrowRight');
		await expect(page.locator('.ks-page')).toHaveText(`${i + 1} / ${TEXTS.length}`);
		await expect(page.locator('.ks-caption')).toHaveText(TEXTS[i]);
		await page.waitForTimeout(SETTLE_MS[i]);
		// 引き抜きが終われば、舞台に残る絵は 1 枚だけ
		await expect(page.locator('.ks-card')).toHaveCount(1);
		await page.screenshot({ path: path.join(shots, `momotaro-${String(i + 1).padStart(2, '0')}.png`) });
	}
	await expect(page.locator('.ks-start')).toBeHidden();

	// 最後の場面では「次へ」が押せない
	await expect(page.locator('.ks-next')).toBeDisabled();

	// 送りのボタンまで 1 画面に収まり、スクロールせずに操作できる
	const box = await page.locator('.ks-controls').boundingBox();
	expect(box && box.y + box.height).toBeLessThanOrEqual(900);

	// 前へ戻ると、前の場面の字幕になる
	await page.keyboard.press('ArrowLeft');
	await expect(page.locator('.ks-caption')).toHaveText(TEXTS[N - 2]);
	await page.waitForTimeout(1200);
	await expect(page.locator('.ks-card')).toHaveCount(1);

	expect(errors).toEqual([]);
});

test('読み上げが終わると次の場面へ自動で送られ、台本の文を順に読み（日本一は「にっぽんいち」、大喜びは「おおよろこび」）、最後の場面で止まる', async ({ page }) => {
	// 1 場面に最短 5 秒かかるため、全 15 場面で 80 秒ほどかかる
	test.setTimeout(240_000);
	await mockSpeech(page, { voices: ONE_VOICE, endMs: 200 });
	await page.goto(WORK);
	await expect(page.locator('.ks-voice')).toContainText('テストの声');

	await page.locator('.ks-start').click();
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`, { timeout: 15_000 });
	await expect(page.locator('.ks-page')).toHaveText(`${N} / ${N}`, { timeout: 180_000 });
	await expect.poll(() => page.evaluate(() => (window as any).__spoken.length), { timeout: 10_000 })
		.toBe(TEXTS.flatMap(sentences).length);
	expect(await page.evaluate(() => (window as any).__spoken)).toEqual(SPOKEN.flatMap(sentences).map(uttered));

	// 最後の場面を読み終えても、表紙や先へは進まない
	await page.waitForTimeout(3000);
	await expect(page.locator('.ks-page')).toHaveText(`${N} / ${N}`);
});

test('読んでいる文に色が付き、色の境目は読んでいる句の「、」「。」まで進めて待つ', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	// 「っむかしむかし、」の「、」まで読んだ合図で、字幕の境目は「むかしむかし、」の後ろになる
	// （先頭の「っ」の分をずらし忘れると、次の句の「、」まで進んでしまう）
	// 読んでいる句「むかしむかし、」だけが強調され、読み終えた句は無く、まだの句は普通の字になる
	// （先頭の「っ」の分をずらし忘れると、次の句が強調されてしまう）
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('むかしむかし、');
	await expect(page.locator('.ks-caption .ks-said')).toHaveCount(0);
});

test('読んだ位置の合図が来ない声（ネットの声）でも、時間から見積もって、強調する句を次の句へ進める', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null, noBoundary: true });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('むかしむかし、');
	// 1 句目（7 文字）を読む時間のあとに、2 句目へ。合図が 1 度も来なくても進む
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('ある所に、', { timeout: 5000 });
	await expect(page.locator('.ks-caption .ks-said')).toHaveText('むかしむかし、');
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('おじいさんとおばあさんが住んでいました。', { timeout: 8000 });
});

test('読み用の文を使った文も、字幕の色は句の順番で対応させて「、」まで進める', async ({ page }) => {
	// 8 場面目の 2 文目は「日本一」を「にっぽんいち」と読ませるため、字幕と読みで文字の位置がずれる
	await mockSpeech(page, { voices: ONE_VOICE, endMs: 200, holdIf: 'にっぽんいち' });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	for (let i = 1; i < 8; i++) {
		await expect(page.locator('.ks-card')).toHaveCount(1);
		await page.keyboard.press('ArrowRight');
	}
	await expect(page.locator('.ks-page')).toHaveText(`8 / ${N}`);
	// 「っおばあさんは、」の「、」まで読んだ合図で、字幕は「おばあさんは、」まで色が変わる
	await expect(page.locator('.ks-caption .ks-said')).toHaveText('「わたしが鬼を退治してきます」。');
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('おばあさんは、');
});

test('手で送ると、読み上げを止めて、新しい場面を読み直す', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__spoken)).toEqual([uttered(TEXTS[0])]);
	// 紙を引き抜いている間の送りは受け付けないため、引き抜き終わってから押す
	await expect(page.locator('.ks-card')).toHaveCount(1);

	await page.keyboard.press('ArrowRight');
	await expect.poll(() => page.evaluate(() => (window as any).__spoken)).toEqual([uttered(TEXTS[0]), uttered(TEXTS[1])]);
	expect(await page.evaluate(() => (window as any).__canceled)).toBeGreaterThan(0);
});

test('⏮ を押すと、読み上げを止めて表紙に戻る。表紙では押せない', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await expect(page.locator('.ks-first')).toBeDisabled();

	await page.locator('.ks-start').click();
	await expect(page.locator('.ks-card')).toHaveCount(1);
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`);
	await expect(page.locator('.ks-card')).toHaveCount(1);
	const canceled = await page.evaluate(() => (window as any).__canceled);

	await page.locator('.ks-first').click();
	await expect(page.locator('.ks-page')).toHaveText('表紙');
	await expect(page.locator('.ks-start')).toBeVisible();
	await expect(page.locator('.ks-caption')).toHaveText('「はじまり」を押すと始まります');
	await expect(page.locator('.ks-first')).toBeDisabled();
	expect(await page.evaluate(() => (window as any).__canceled)).toBeGreaterThan(canceled);
	// 表紙では読み上げない
	await page.waitForTimeout(1000);
	expect(await page.evaluate(() => (window as any).__spoken.length)).toBe(2);
	await expect(page.locator('.ks-card')).toHaveCount(1);
});

test('日本語の声が無いときは、字幕だけで時間をおいて次の場面へ送る', async ({ page }) => {
	await mockSpeech(page, { voices: [], endMs: 200 });
	await mockNoRecorded(page);
	await page.goto(WORK);
	await expect(page.locator('.ks-voice')).toContainText('なし');

	await page.locator('.ks-start').click();
	await expect(page.locator('.ks-caption')).toHaveText(TEXTS[0]);
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`, { timeout: 15_000 });
	expect(await page.evaluate(() => (window as any).__spoken)).toEqual([]);
});

// 「PC 内」はスマホで合わないため「内蔵」にした（iPhone では「Kyoko（PC 内）」と出ていた）
test('声の一覧は「費用: 置き場: 作り方: 名前」の形で、日本語の声だけが並び、事前生成の 4 声が続く', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	const options = page.locator('.ks-voice select option');
	await expect(options).toHaveText([
		'無料: 内蔵: 動的生成: 声A',
		'無料: ネット: 動的生成: 声B',
		...RECORDED_LABELS,
	]);
	// 何も選んでいなければ、内蔵の声が選ばれている（事前生成の音声を勝手に読み込まない）
	await expect(page.locator('.ks-voice select')).toHaveValue('b:声A');
});

test('別の声を選ぶと、読み上げを止めて、今の場面を頭からその声で読み直す', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__voices)).toEqual(['声A']);

	await page.locator('.ks-voice select').selectOption('b:声B');
	await expect.poll(() => page.evaluate(() => (window as any).__voices)).toEqual(['声A', '声B']);
	expect(await page.evaluate(() => (window as any).__spoken)).toEqual([uttered(TEXTS[0]), uttered(TEXTS[0])]);
	expect(await page.evaluate(() => (window as any).__canceled)).toBeGreaterThan(0);
	await expect(page.locator('.ks-page')).toHaveText(`1 / ${N}`);
});

test('選んだ声を覚えていて、開き直してもその声で読む', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('b:声B');

	await page.reload();
	await expect(page.locator('.ks-voice select')).toHaveValue('b:声B');
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__voices)).toEqual(['声B']);
});

test('覚えていた声が無くなっていたら、内蔵の声を選び直す', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	await page.evaluate(() => sessionStorage.setItem('kamishibai.voice', 'b:無くなった声'));

	await page.reload();
	await expect(page.locator('.ks-voice select')).toHaveValue('b:声A');
});

test('声の一覧で矢印キーを押しても、場面は送られない', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect(page.locator('.ks-card')).toHaveCount(1);

	await page.locator('.ks-voice select').focus();
	await page.keyboard.press('ArrowRight');
	await page.waitForTimeout(1000);
	await expect(page.locator('.ks-page')).toHaveText(`1 / ${N}`);
});

// ---- 事前生成の音声（p261010-01） ----

test('事前生成の声を選ぶと、その場面の文の音声ファイルを鳴らし、ブラウザの声では読まない', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await mockAudio(page);
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:zundamon:wav');
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__played.length)).toBe(1);
	expect(await page.evaluate(() => (window as any).__played[0])).toMatch(/voice\/zundamon\/s01-1-[0-9a-f]{8}\.wav$/);
	expect(await page.evaluate(() => (window as any).__spoken)).toEqual([]);
});

test('事前生成の声では、再生の位置が句の終わりを越えたら、字幕の色を次の句まで進める', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await mockAudio(page);
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:zundamon:wav');
	await page.locator('.ks-start').click();
	// 最初の句を読んでいる間: 「むかしむかし、」が強調される
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('むかしむかし、');
	// 1 文目は 3 つの句（「むかしむかし、」「ある所に、」「…住んでいました。」）。句の終わりの時刻を 1 つ越えるごとに、色が 1 句進む
	const at = (n: number) => page.evaluate((i) => {
		const w = window as any;
		w.__audio.currentTime = w.VOICE.voices[0].scenes[0][0].ends[i] + 0.1;
	}, n);
	await at(0);
	await expect(page.locator('.ks-caption .ks-said')).toHaveText('むかしむかし、');
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('ある所に、');
	await at(1);
	await expect(page.locator('.ks-caption .ks-said')).toHaveText('むかしむかし、ある所に、');
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('おじいさんとおばあさんが住んでいました。');
});

test('事前生成の音声を鳴らし終えると、次の場面へ送られ、その場面の音声を鳴らす', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await mockAudio(page);
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:metan:wav');
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__played.length)).toBe(1);
	await page.evaluate(() => (window as any).__audioEmit('ended'));
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`, { timeout: 15_000 });
	await expect.poll(() => page.evaluate(() => (window as any).__played.length)).toBe(2);
	expect(await page.evaluate(() => (window as any).__played[1])).toMatch(/voice\/metan\/s02-1-[0-9a-f]{8}\.wav$/);
});

test('事前生成の声で一時停止すると音声を止め、再開すると止めた文の音声を頭から鳴らし直す', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await mockAudio(page);
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:zundamon:wav');
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__played.length)).toBe(1);

	await page.locator('.ks-pause').click();
	expect(await page.evaluate(() => (window as any).__pausedAudio)).toBeGreaterThan(0);
	await page.locator('.ks-pause').click();
	await expect.poll(() => page.evaluate(() => (window as any).__played.length)).toBe(2);
	const played = await page.evaluate(() => (window as any).__played);
	expect(played[1]).toBe(played[0]);
});

test('事前生成の音声を鳴らせないときは、ブラウザの声に替えて読み続ける', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await mockAudio(page, { fail: true });
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:zundamon:wav');
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__spoken)).toEqual([uttered(TEXTS[0])]);
});

test('事前生成の音声を鳴らせず、ブラウザの声も無いときは、字幕だけで次の場面へ送る', async ({ page }) => {
	await mockSpeech(page, { voices: [], endMs: null });
	await mockAudio(page, { fail: true });
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:zundamon:wav');
	await page.locator('.ks-start').click();
	await expect(page.locator('.ks-caption')).toHaveText(TEXTS[0]);
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`, { timeout: 15_000 });
});

test('権利表記の別ラベルは出さず、選んだ声の権利表記は選択欄の文言で示す', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await mockAudio(page);
	await page.goto(WORK);
	const select = page.locator('.ks-voice select');
	await expect(page.locator('.ks-credit')).toHaveCount(0);
	// 選択欄に出る文言（選んだ声の名前）に、VOICEVOX・AivisSpeech と声の名前が入っている
	const shown = () => select.evaluate((s: HTMLSelectElement) => s.selectedOptions[0].textContent);
	await select.selectOption('r:zundamon:wav');
	// 規約が示す「VOICEVOX:名前」に近い形で、コロンの後に空白を入れる。AivisSpeech も同じ形
	// 形式と大きさは名前の後ろの括弧に置く（p261012-02）
	expect(await shown()).toMatch(/VOICEVOX: ずんだもん \(wav \d+MB\)$/);
	await select.selectOption('r:metan:wav');
	expect(await shown()).toMatch(/VOICEVOX: 四国めたん \(wav \d+MB\)$/);
	await select.selectOption('r:mao:wav');
	expect(await shown()).toMatch(/AivisSpeech: まお \(wav \d+MB\)$/);
	await select.selectOption('r:kohaku:wav');
	expect(await shown()).toMatch(/AivisSpeech: コハク \(wav \d+MB\)$/);
	await expect(page.locator('.ks-credit')).toHaveCount(0);
});

test('選んだ事前生成の声を覚えていて、開き直してもその声を選んでいる', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await mockAudio(page);
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:metan:wav');

	await page.reload();
	await expect(page.locator('.ks-voice select')).toHaveValue('r:metan:wav');
});

test('まだ何も選んでいないときの声はずんだもん。ブラウザの声を選ぶと、開き直してもブラウザの声のまま', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null, keepDefaultVoice: true });
	await mockAudio(page);
	await page.goto(WORK);
	await expect(page.locator('.ks-voice select')).toHaveValue('r:zundamon:mp3');
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__played.length)).toBe(1);
	expect(await page.evaluate(() => (window as any).__played[0])).toMatch(/voice\/zundamon\/.*\.mp3$/);

	await page.locator('.ks-voice select').selectOption('b:声A');
	await page.reload();
	await expect(page.locator('.ks-voice select')).toHaveValue('b:声A');
});

// 声の選択は sessionStorage のキー 1 つに、一覧の値をそのまま残す（p261012-01）
test('選んだ声は、一覧の値のまま sessionStorage の kamishibai.voice 1 つに残る', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null, keepDefaultVoice: true });
	await mockAudio(page);
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:metan:wav');
	expect(await page.evaluate(() => ({ ...sessionStorage }))).toEqual({ 'kamishibai.voice': 'r:metan:wav' });
	await page.locator('.ks-voice select').selectOption('b:声B');
	expect(await page.evaluate(() => ({ ...sessionStorage }))).toEqual({ 'kamishibai.voice': 'b:声B' });
	expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

// 自動で選んだ声は残さない。選んでいない人の分を残さないため（71-A）
test('開いただけでは、sessionStorage に何も書かない', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null, keepDefaultVoice: true });
	await mockAudio(page);
	await page.goto(WORK);
	await expect(page.locator('.ks-voice select')).toHaveValue('r:zundamon:mp3');
	expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

// タブを閉じれば消える。別のタブには引き継がない
test('選んだ声は、別のタブでは覚えていない', async ({ page, context }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null, keepDefaultVoice: true });
	await mockAudio(page);
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('r:metan:wav');

	const other = await context.newPage();
	await mockSpeech(other, { voices: THREE_VOICES, endMs: null, keepDefaultVoice: true });
	await mockAudio(other);
	await other.goto(WORK);
	await expect(other.locator('.ks-voice select')).toHaveValue('r:zundamon:mp3');
});

// 以前は localStorage の 2 つのキーに残していた。開いた人の手元から消す（clear-old-storage.js）
test('以前 localStorage に残した 2 つのキーは、開いたときに消え、読まれない', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null, keepDefaultVoice: true });
	await mockAudio(page);
	await page.goto(WORK);
	await page.evaluate(() => {
		localStorage.setItem('kamishibai.voice', '声B');
		localStorage.setItem('kamishibai.voice.recorded', 'metan');
	});

	await page.reload();
	await expect(page.locator('.ks-voice select')).toHaveValue('r:zundamon:mp3');
	expect(await page.evaluate(() => [localStorage.getItem('kamishibai.voice'), localStorage.getItem('kamishibai.voice.recorded')])).toEqual([null, null]);
});

// 値は r:key:形式 で分けるため、key に「:」があると分けられない（70-A）
test('音声の生成は、声の key に「:」があれば止まる', async () => {
	const { checkKeys } = await import(path.join(ROOT, 'tools/20_build/voice-key.ts'));
	expect(() => checkKeys([{ key: 'zundamon' }, { key: 'metan' }])).not.toThrow();
	expect(() => checkKeys([{ key: 'zunda:mon' }])).toThrow(/zunda:mon/);
});

test('PC の広い画面では、ボタンから声の選択欄までが 1 行に収まる', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	const tops = await page.locator('.ks-controls > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)));
	// 高さの中心がそろっていれば同じ行。折り返していれば、行の分だけずれる
	expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(6);
});

test('スイッチの溝と丸は、ボタンの上下の真ん中に出る（オン・オフとも）', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-speech').scrollIntoViewIfNeeded();
	// 疑似要素は位置を直接測れないため、表示に使われた値（top・高さ・transform）から中心を求め、ボタンの内側の高さの半分と比べる
	const gaps = async () => page.locator('.ks-speech').evaluate((b) => {
		const inner = b.clientHeight / 2;
		return ['::before', '::after'].map((p) => {
			const s = getComputedStyle(b, p);
			const ty = new DOMMatrix(s.transform).m42;
			return Math.abs(parseFloat(s.top) + ty + parseFloat(s.height) / 2 - inner);
		});
	});
	for (const g of await gaps()) expect(g).toBeLessThan(0.6);
	await page.locator('.ks-speech').click();
	for (const g of await gaps()) expect(g).toBeLessThan(0.6);
	await page.locator('.ks-controls').screenshot({ path: path.join(SHOTS, 'controls-off.png') });
	await page.locator('.ks-speech').click();
	await page.locator('.ks-controls').screenshot({ path: path.join(SHOTS, 'controls-on.png') });
});

test('操作は 1 列に並び、音・表紙へ・前・ページ・次・一時停止・読み上げ・声の順になる', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	const order = await page.locator('.ks-controls > *').evaluateAll((els) => els.map((e) => e.className.split(' ').pop()));
	// 音のボタンは Web Audio があるブラウザだけ出る
	const withoutSound = ['ks-first', 'ks-prev', 'ks-page', 'ks-next', 'ks-pause', 'ks-speech', 'ks-voice'];
	expect(order.filter((c) => c !== 'ks-sound')).toEqual(withoutSound);
	if (order.includes('ks-sound')) expect(order[0]).toBe('ks-sound');
});

// 一覧（voice.js）と音声ファイルと台本（story.js）が食い違うと、字幕の色が合わず、ブラウザの声に替わって聞こえる。
// 台本の読み（read）を直したのに音声を作り直していないときにも起きる。ブラウザを使わず、ファイルだけで確かめる
test('音声の一覧は、台本の全文・全声と合い、音声ファイルが在り、句の終わりの時刻が字幕の句の数と長さに合う', async () => {
	const fs = await import('fs');
	const vm = await import('vm');
	const work = path.join(ROOT, 'src/works/01-momotaro');
	const load = (file: string) => {
		const win: any = {};
		vm.runInNewContext(fs.readFileSync(path.join(work, file), 'utf8'), { window: win });
		return win;
	};
	const story = load('story.js').STORY;
	const list = load('voice.js').VOICE;
	const phraseCount = (s: string) => {
		let n = 0;
		const re = /[、。！？]+」?/g;
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(s)) !== null) { n++; last = m.index + m[0].length; }
		return last < s.length || n === 0 ? n + 1 : n;
	};
	// 読みを変えた文の指紋は、読み（read）から作る。同じ読みなら、音声ファイル名に入る指紋が一致する
	const crypto = await import('crypto');
	const { applyFix } = await import(path.join(ROOT, 'tools/20_build/voice-fix.ts'));
	const engineOf: Record<string, [string, number]> = { zundamon: ['voicevox', 3], metan: ['voicevox', 2], mao: ['aivis', 888753760], kohaku: ['aivis', 1878365376] };
	// 一覧の値（r:key:形式）の形式は、voice.js の format から作る（p261012-01）。声ごとに mp3、wav の順（p261012-02）
	expect(list.voices.map((v: any) => `${v.key}:${v.format}`)).toEqual(['zundamon:mp3', 'zundamon:wav', 'metan:mp3', 'metan:wav', 'mao:mp3', 'mao:wav', 'kohaku:mp3', 'kohaku:wav']);
	for (const v of list.voices) {
		expect(v.scenes.length).toBe(story.scenes.length);
		story.scenes.forEach((scene: any, i: number) => {
			const shown = sentences(scene.text);
			const read = sentences(scene.read ?? scene.text);
			expect(v.scenes[i].length, `場面 ${i + 1} の文の数（${v.key}）`).toBe(shown.length);
			shown.forEach((s, k) => {
				const item = v.scenes[i][k];
				const file = path.join(work, item.file);
				expect(fs.existsSync(file), `音声が在る: ${item.file}`).toBe(true);
				expect(item.ends.length, `場面 ${i + 1}-${k + 1} の句の数（${v.key}）`).toBe(phraseCount(s));
				expect(item.ends.every((e: number, j: number) => j === 0 || e > item.ends[j - 1])).toBe(true);
				// 最後の句の終わりは、音声の長さ（16 ビット・モノラル。ヘッダ 44 バイトとして概算）と 0.1 秒以内で合う
				// mp3 は wav の時刻をそのまま使う（長さの差は最大 0.3 ミリ秒。p261012-02 の 75-A）。長さは wav で見る
				if (v.format === 'wav') {
					const wav = fs.readFileSync(file);
					const seconds = (wav.length - 44) / 2 / wav.readUInt32LE(24);
					expect(Math.abs(item.ends[item.ends.length - 1] - seconds), `場面 ${i + 1}-${k + 1} の長さ（${v.key}）`).toBeLessThan(0.1);
				}
				// 音声が今の読みで作られている（読みを直したのに作り直していない音声を見つける）
				const [engine, id] = engineOf[v.key];
				const spoken = engine === 'aivis' ? applyFix(read[k], v.key) : read[k];
				const fp = crypto.createHash('sha256').update(`${engine}\n${id}\n${spoken}`).digest('hex').slice(0, 8);
				expect(item.file, `場面 ${i + 1}-${k + 1} が今の読みで作られている（${v.key}）`).toContain(`-${fp}.${v.format}`);
			});
		});
	}
});

// ---- 効果音と BGM（p261004-02 段階 3） ----
// 音そのものは聞けないため、sound.js が残す記録（鳴らした音の名前と、BGM・音量下げの状態）で確かめる

// Playwright の Windows 版 WebKit には Web Audio（AudioContext）が無い。iPhone の Safari にはある。
// Web Audio が無いブラウザでは音を鳴らさずに進む作りのため、音のテストは飛ばす
test.beforeEach(async ({ page }, testInfo) => {
	if (!testInfo.title.includes('BGM') && !testInfo.title.includes('効果音')) return;
	await page.goto(WORK);
	const hasAudio = await page.evaluate(() => 'AudioContext' in window || 'webkitAudioContext' in window);
	test.skip(!hasAudio, 'このブラウザには Web Audio が無い');
});

const soundState = (page: Page) => page.evaluate(() => (window as any).KamishibaiSound.state());
const soundHistory = (page: Page) => page.evaluate(() => (window as any).KamishibaiSound.history.slice());

// 紙を引き抜き終えてから、次の場面へ送る
async function forward(page: Page, times: number) {
	for (let i = 0; i < times; i++) {
		await expect(page.locator('.ks-card')).toHaveCount(1);
		await page.keyboard.press('ArrowRight');
	}
	await expect(page.locator('.ks-card')).toHaveCount(1);
}

test('「はじまり」で拍子木が鳴って BGM が始まり、表紙に戻ると BGM が止まる', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => soundHistory(page)).toContain('hyoshigi');
	await expect.poll(async () => (await soundState(page)).bgm).toBe('normal');

	await expect(page.locator('.ks-card')).toHaveCount(1);
	await page.locator('.ks-first').click();
	await expect.poll(async () => (await soundState(page)).bgm).toBe(null);
});

test('場面ごとの効果音が鳴り、13 場面（戦い）だけ BGM が速くなる', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await forward(page, 8);
	await expect(page.locator('.ks-page')).toHaveText(`9 / ${N}`);
	await expect.poll(() => soundHistory(page)).toContain('wan');

	await forward(page, 4);
	await expect(page.locator('.ks-page')).toHaveText(`13 / ${N}`);
	await expect.poll(async () => (await soundState(page)).bgm).toBe('fast');
	await expect.poll(() => soundHistory(page), { timeout: 8_000 }).toContain('dokan');

	await forward(page, 1);
	await expect.poll(async () => (await soundState(page)).bgm).toBe('normal');
});

test('読み上げ中は BGM の音量を下げ、読み終えたら戻す', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: 400 });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(async () => (await soundState(page)).ducked).toBe(true);
	// 1 場面目は 1 文。読み終えてから次の場面へ送るまで（5 秒）の間に戻る
	await expect.poll(async () => (await soundState(page)).ducked).toBe(false);
	await expect(page.locator('.ks-page')).toHaveText(`1 / ${N}`);
});

test('「音」ボタンで効果音と BGM を止め、もう一度押すと BGM が戻る', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(async () => (await soundState(page)).bgm).toBe('normal');

	await page.locator('.ks-sound').click();
	await expect(page.locator('.ks-sound')).toHaveText('音:');
	await expect(page.locator('.ks-sound')).toHaveAttribute('aria-pressed', 'false');
	await expect.poll(async () => (await soundState(page)).bgm).toBe(null);
	expect((await soundState(page)).enabled).toBe(false);

	await page.locator('.ks-sound').click();
	await expect(page.locator('.ks-sound')).toHaveAttribute('aria-pressed', 'true');
	await expect.poll(async () => (await soundState(page)).bgm).toBe('normal');
});

test('「読み上げ」ボタンで読み上げを止め、字幕だけで時間をおいて送る', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__spoken.length)).toBe(1);
	const canceled = await page.evaluate(() => (window as any).__canceled);

	await page.locator('.ks-speech').click();
	await expect(page.locator('.ks-speech')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('.ks-speech')).toHaveAttribute('aria-label', '読み上げ: オフ');
	expect(await page.evaluate(() => (window as any).__canceled)).toBeGreaterThan(canceled);
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`, { timeout: 15_000 });
	expect(await page.evaluate(() => (window as any).__spoken.length)).toBe(1);
});

// 作品一覧のページは置かず、README の作品の章から直接入る。作品の ⌂ は README へ戻る
test('README から桃太郎へ移れて、⌂ で README へ戻れる', async ({ page }) => {
	await page.goto(pathToFileURL(path.join(ROOT, 'README.html')).href);
	await page.getByText('桃太郎', { exact: true }).click();
	await expect(page).toHaveTitle('桃太郎');
	await page.locator('.ks-back').click();
	await expect(page).toHaveTitle('紙芝居アニメーション');
});

// ---- 一時停止（i261008-01） ----
// 止めている間は、読み上げ・自動の送り・絵の動き・効果音・BGM をすべて止める

const spokenList = (page: Page) => page.evaluate(() => (window as any).__spoken.slice() as string[]);
const cardPaused = (page: Page) => page.evaluate(() => {
	const svg = document.querySelector('.ks-card svg') as SVGSVGElement | null;
	return svg ? svg.animationsPaused() : null;
});

test('表紙では一時停止のボタンを押せない', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await expect(page.locator('.ks-pause')).toBeDisabled();
	await page.locator('.ks-start').click();
	await expect(page.locator('.ks-pause')).toBeEnabled();
});

// 再開したときは、止めた文を頭から読み直す（33-A）。文の途中から続ける作り（33-B）は、ブラウザによって続きが読まれないことがあるため採らない
test('一時停止すると読み上げと絵の動きが止まり、再開すると止めた文を頭から読み直す', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null, holdIf: 'むかしむかし' });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => spokenList(page)).toEqual([uttered(SPOKEN[0])]);
	await expect(page.locator('.ks-card')).toHaveCount(1);
	const canceled = await page.evaluate(() => (window as any).__canceled);

	await page.locator('.ks-pause').click();
	await expect(page.locator('.ks-pause')).toHaveAttribute('aria-label', '再開');
	await expect(page.locator('.ks-pause')).toHaveAttribute('data-icon', 'play');
	expect(await page.evaluate(() => (window as any).__canceled)).toBeGreaterThan(canceled);
	expect(await cardPaused(page)).toBe(true);

	await page.locator('.ks-pause').click();
	await expect(page.locator('.ks-pause')).toHaveAttribute('aria-label', '一時停止');
	await expect(page.locator('.ks-pause')).toHaveAttribute('data-icon', 'pause');
	await expect.poll(() => spokenList(page)).toEqual([uttered(SPOKEN[0]), uttered(SPOKEN[0])]);
	expect(await cardPaused(page)).toBe(false);
});

test('読み終えて次の場面を待つ間に一時停止すると送られず、再開すると残りの時間をおいて送る', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: 100 });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => spokenList(page)).toHaveLength(1);
	await expect(page.locator('.ks-card')).toHaveCount(1);
	await page.locator('.ks-pause').click();

	// 1 場面は最短 5 秒見せてから送る。止めている間はその時間が進まない
	await page.waitForTimeout(6000);
	await expect(page.locator('.ks-page')).toHaveText(`1 / ${N}`);

	await page.locator('.ks-pause').click();
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`, { timeout: 8_000 });
});

// 止めている間に場面を替えても、止めたままにする（34-B）。絵と字幕だけを替え、再開したらその場面を頭から読む
test('一時停止のまま矢印キーで場面を替えると、絵と字幕だけが替わり、再開するとその場面を読む', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => spokenList(page)).toHaveLength(1);
	await expect(page.locator('.ks-card')).toHaveCount(1);

	// スペースキーでも止められる
	await page.keyboard.press(' ');
	await expect(page.locator('.ks-pause')).toHaveAttribute('aria-label', '再開');
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`);
	await expect(page.locator('.ks-caption')).toHaveText(TEXTS[1]);
	await expect(page.locator('.ks-card')).toHaveCount(1);
	await expect(page.locator('.ks-pause')).toHaveAttribute('aria-label', '再開');
	expect(await cardPaused(page)).toBe(true);
	expect(await spokenList(page)).toHaveLength(1);

	await page.keyboard.press(' ');
	await expect(page.locator('.ks-pause')).toHaveAttribute('aria-label', '一時停止');
	await expect.poll(() => spokenList(page)).toEqual([uttered(SPOKEN[0]), uttered(sentences(SPOKEN[1])[0])]);
});

test('一時停止すると効果音と BGM が止まり、再開すると続きが鳴る', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(async () => (await soundState(page)).bgm).toBe('normal');
	// 4 場面は、入ってから 2 秒で「ぱかっ」が鳴る。その前に止める
	await forward(page, 3);
	await expect(page.locator('.ks-page')).toHaveText(`4 / ${N}`);
	await page.locator('.ks-pause').click();
	await expect.poll(async () => (await soundState(page)).paused).toBe(true);

	await page.waitForTimeout(3000);
	expect(await soundHistory(page)).not.toContain('pakka');

	await page.locator('.ks-pause').click();
	await expect.poll(async () => (await soundState(page)).paused).toBe(false);
	await expect.poll(() => soundHistory(page), { timeout: 5_000 }).toContain('pakka');
	expect((await soundState(page)).bgm).toBe('normal');
});
