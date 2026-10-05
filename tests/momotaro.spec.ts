// 桃太郎の紙芝居が、表紙から最後の場面まで送れることを確かめる（p261004-02・p261004-03）
// PlayWright 共有環境で実行する（tools/40_test/run-tests.ps1）
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import { pathToFileURL } from 'url';

// 1 つずつ順に流す。並べて流すと、絵の動きと録画の負荷でスクリーンショットの撮影が失敗する
// （Page.captureScreenshot: Unable to capture screenshot。単独なら通る）
test.describe.configure({ mode: 'default' });

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
// 「日本一」は「にほんいち」、「大喜び」は「だいよろこび」と読まれた
const SPOKEN = TEXTS.map((t) => t.replace('日本一', 'にっぽんいち').replace('大喜び', 'おおよろこび'));

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

// 読み上げを差し替える。本物の声は、テストの環境ごとに有無も読む長さも変わるため
// voices: ブラウザにある声 / endMs: 1 文を読み終えるまでの時間（null は読み終わらない）
// holdIf: この語を含む文だけは読み終わらない（その文を読んでいる途中の字幕を見るため）
// 読んだ文を __spoken に、読んだ声の名前を __voices に残す
async function mockSpeech(page: Page, opts: { voices: Voice[]; endMs: number | null; holdIf?: string }) {
	await page.addInitScript((o) => {
		const w = window as any;
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
					if (cur === u && u.onboundary && comma >= 0) u.onboundary({ charIndex: comma, charLength: 1 });
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
	await expect(page.locator('.ks-caption .ks-said')).toHaveText('むかしむかし、');
	await expect(page.locator('.ks-caption .ks-now')).toHaveText(TEXTS[0].slice('むかしむかし、'.length));
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
	await expect(page.locator('.ks-caption .ks-said')).toHaveText(['「わたしが鬼を退治してきます」。', 'おばあさんは、']);
	await expect(page.locator('.ks-caption .ks-now')).toHaveText('日本一のきびだんごをこしらえて持たせてくれました。');
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
	await page.goto(WORK);
	await expect(page.locator('.ks-voice')).toContainText('なし');

	await page.locator('.ks-start').click();
	await expect(page.locator('.ks-caption')).toHaveText(TEXTS[0]);
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`, { timeout: 15_000 });
	expect(await page.evaluate(() => (window as any).__spoken)).toEqual([]);
});

// 「PC 内」はスマホで合わないため「内蔵」にした（iPhone では「Kyoko（PC 内）」と出ていた）
test('声の名前から一覧を開き、日本語の声だけが「内蔵」「ネット」の別つきで並ぶ', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	const options = page.locator('.ks-voice select option');
	await expect(options).toHaveText(['声A（内蔵）', '声B（ネット）']);
	// 何も選んでいなければ、内蔵の声が選ばれている
	await expect(page.locator('.ks-voice select')).toHaveValue('声A');
});

test('別の声を選ぶと、読み上げを止めて、今の場面を頭からその声で読み直す', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__voices)).toEqual(['声A']);

	await page.locator('.ks-voice select').selectOption('声B');
	await expect.poll(() => page.evaluate(() => (window as any).__voices)).toEqual(['声A', '声B']);
	expect(await page.evaluate(() => (window as any).__spoken)).toEqual([uttered(TEXTS[0]), uttered(TEXTS[0])]);
	expect(await page.evaluate(() => (window as any).__canceled)).toBeGreaterThan(0);
	await expect(page.locator('.ks-page')).toHaveText(`1 / ${N}`);
});

test('選んだ声を覚えていて、開き直してもその声で読む', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-voice select').selectOption('声B');

	await page.reload();
	await expect(page.locator('.ks-voice select')).toHaveValue('声B');
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__voices)).toEqual(['声B']);
});

test('覚えていた声が無くなっていたら、内蔵の声を選び直す', async ({ page }) => {
	await mockSpeech(page, { voices: THREE_VOICES, endMs: null });
	await page.goto(WORK);
	await page.evaluate(() => localStorage.setItem('kamishibai.voice', '無くなった声'));

	await page.reload();
	await expect(page.locator('.ks-voice select')).toHaveValue('声A');
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
	await expect(page.locator('.ks-sound')).toHaveText('音: オフ');
	await expect(page.locator('.ks-sound')).toHaveAttribute('aria-pressed', 'false');
	await expect.poll(async () => (await soundState(page)).bgm).toBe(null);
	expect((await soundState(page)).enabled).toBe(false);

	await page.locator('.ks-sound').click();
	await expect(page.locator('.ks-sound')).toHaveText('音: オン');
	await expect.poll(async () => (await soundState(page)).bgm).toBe('normal');
});

test('「読み上げ」ボタンで読み上げを止め、字幕だけで時間をおいて送る', async ({ page }) => {
	await mockSpeech(page, { voices: ONE_VOICE, endMs: null });
	await page.goto(WORK);
	await page.locator('.ks-start').click();
	await expect.poll(() => page.evaluate(() => (window as any).__spoken.length)).toBe(1);
	const canceled = await page.evaluate(() => (window as any).__canceled);

	await page.locator('.ks-speech').click();
	await expect(page.locator('.ks-speech')).toHaveText('読み上げ: オフ');
	expect(await page.evaluate(() => (window as any).__canceled)).toBeGreaterThan(canceled);
	await expect(page.locator('.ks-page')).toHaveText(`2 / ${N}`, { timeout: 15_000 });
	expect(await page.evaluate(() => (window as any).__spoken.length)).toBe(1);
});

test('作品一覧から桃太郎へ移れる', async ({ page }) => {
	await page.goto(pathToFileURL(path.join(ROOT, 'src/index.html')).href);
	await page.getByText('桃太郎', { exact: true }).click();
	await expect(page).toHaveTitle('桃太郎');
});
