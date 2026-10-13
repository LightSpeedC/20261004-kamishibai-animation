// 事前生成の音声（p261010-01）。作品の全場面の文を、声ごとに WAV にして置く
// 使い方: node tools/20_build/make-voice.ts [--voicevox http://127.0.0.1:50021] [--aivis http://127.0.0.1:10101] [--voice zundamon,metan,mao,kohaku]
// 先に、使う声のエンジン（VOICEVOX・AivisSpeech）を起動しておく。止めるのは利用者
// 出力: src/works/01-momotaro/voice/<声>/sNN-K-<指紋>.wav と .mp3（共有ツールの convert-audio で変換）、一覧の src/works/01-momotaro/voice.js
// 文の中身（読み・声・エンジン）が変わらない文は作り直さない。指紋が名前に入っているので、変わった文だけが作り直しになる
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { applyFix } from './voice-fix.ts';
import { checkKeys } from './voice-key.ts';

const root = path.resolve(import.meta.dirname, '..', '..');
const workDir = path.join(root, 'src', 'works', '01-momotaro');
const voiceDir = path.join(workDir, 'voice');

// 声の表。id は各エンジンの声 ID（ノーマル）。先頭の声が、まだ何も選んでいないときの既定
// label は選択欄の文言。権利表記（規約の書き方に近い「VOICEVOX: 名前」、AivisSpeech も同じ形の「AivisSpeech: 名前」。コロンの後に空白を入れるのは利用者の指示）もこの文言で示す
// label の {size} は、その声の形式と音声ファイルの合計の大きさ（例: wav 6MB ／ wav➡mp3 1MB）に置き換える
// 「ﾌｧｲﾙ」は半角。等幅で数えると「内蔵」と、「VOICEVOX」は「動的生成」と同じ幅になり、一覧で位置がそろう（利用者の指定。p261012-02）
const VOICES = [
	{ key: 'zundamon', engine: 'voicevox', id: 3, label: '無料: ﾌｧｲﾙ: VOICEVOX: ずんだもん ({size})' },
	{ key: 'metan', engine: 'voicevox', id: 2, label: '無料: ﾌｧｲﾙ: VOICEVOX: 四国めたん ({size})' },
	{ key: 'mao', engine: 'aivis', id: 888753760, label: '無料: ﾌｧｲﾙ: AivisSpeech: まお ({size})' },
	{ key: 'kohaku', engine: 'aivis', id: 1878365376, label: '無料: ﾌｧｲﾙ: AivisSpeech: コハク ({size})' },
] as const;
checkKeys(VOICES);
// mp3 のビットレート。1 声 約 1 MB。利用者が聞いて問題なかった（p261012-02 の 72-A）
const MP3_KBPS = 64;

function arg(name: string, fallback: string) {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const BASE: Record<string, string> = {
	voicevox: arg('voicevox', 'http://127.0.0.1:50021'),
	aivis: arg('aivis', 'http://127.0.0.1:10101'),
};
const wanted = arg('voice', VOICES.map((v) => v.key).join(',')).split(',');

// player.js と同じ分け方。変えるときは両方を揃える
const sentences = (text: string): string[] => text.match(/[^。！？]+[。！？」]*/g) || [];
const phraseEnds = (s: string): number[] => {
	const ends: number[] = [];
	const m = /[、。！？]+」?/g;
	let hit: RegExpExecArray | null;
	while ((hit = m.exec(s)) !== null) ends.push(hit.index + hit[0].length);
	if (ends.length === 0 || ends[ends.length - 1] < s.length) ends.push(s.length);
	return ends;
};
const phraseTexts = (s: string): string[] => {
	let from = 0;
	return phraseEnds(s).map((e) => { const t = s.slice(from, e); from = e; return t; });
};

function loadStory(): { scenes: { text: string; read?: string }[] } {
	const win: any = {};
	vm.runInNewContext(fs.readFileSync(path.join(workDir, 'story.js'), 'utf8'), { window: win, console });
	return win.STORY;
}

async function post(url: string, body?: unknown) {
	const res = await fetch(url, body === undefined ? { method: 'POST' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url.split('?')[0]}`);
	return res;
}
async function query(base: string, id: number, text: string): Promise<any> {
	return (await post(`${base}/audio_query?speaker=${id}&text=${encodeURIComponent(text)}`)).json();
}
async function synth(base: string, id: number, q: unknown): Promise<Buffer> {
	return Buffer.from(await (await post(`${base}/synthesis?speaker=${id}`, q)).arrayBuffer());
}

// WAV の data チャンクを取り出す（先頭の 44 バイト固定とは決めつけない）
function parseWav(wav: Buffer) {
	const rate = wav.readUInt32LE(24);
	let pos = 12;
	while (pos < wav.length - 8) {
		const id = wav.toString('ascii', pos, pos + 4);
		const size = wav.readUInt32LE(pos + 4);
		if (id === 'data') return { rate, data: wav.subarray(pos + 8, pos + 8 + size), head: wav.subarray(0, pos + 8) };
		pos += 8 + size;
	}
	throw new Error('WAV に data が無い');
}
const seconds = (w: { rate: number; data: Buffer }) => w.data.length / 2 / w.rate;	// 16 ビット・モノラル

// VOICEVOX: 文を 1 回で合成し、句の終わり（読点の間の終わり）を読みの情報から出す
async function makeVoicevox(v: { id: number }, read: string) {
	const base = BASE.voicevox;
	// かぎ括弧を読みの情報が休みとして数え、読点のない所に句の終わりが出るので、合成には渡さない（読みは変わらない）
	const q = await query(base, v.id, read.replace(/[「」]/g, ''));
	const wav = await synth(base, v.id, q);
	const w = parseWav(wav);
	const speed = q.speedScale || 1;
	let t = q.prePhonemeLength || 0;
	const marks: number[] = [];
	for (const ap of q.accent_phrases) {
		for (const m of ap.moras) t += (m.consonant_length || 0) + m.vowel_length;
		if (ap.pause_mora) {
			t += ap.pause_mora.vowel_length * (q.pauseLengthScale ?? 1);
			marks.push(t / speed);
		}
	}
	const total = seconds(w);
	return { wav, ends: [...marks, total], total, marks: marks.length };
}

// AivisSpeech: 読みの情報の長さが 0 なので、句ごとに別々に合成してつなぎ、つなぎ目を句の終わりにする
async function makeAivis(v: { id: number; key: string }, read: string) {
	const base = BASE.aivis;
	const parts = [];
	// 読みの直し（voice-fix.ts）は、句に分けたあとの文字に当てる。句の数が変わらないようにするため
	for (const p of phraseTexts(read)) parts.push(parseWav(await synth(base, v.id, await query(base, v.id, applyFix(p, v.key)))));
	const pcm = Buffer.concat(parts.map((p) => p.data));
	const head = Buffer.from(parts[0].head);
	head.writeUInt32LE(pcm.length, head.length - 4);
	head.writeUInt32LE(head.length - 8 + pcm.length, 4);
	let t = 0;
	const ends = parts.map((p) => (t += seconds(p)));
	return { wav: Buffer.concat([head, pcm]), ends, total: t, marks: ends.length - 1 };
}

// エンジンは、作り直す文が出たときに初めて確かめる（流用だけなら、エンジンを起動しなくてよい）
const checked = new Set<string>();
async function checkEngine(engine: string) {
	if (checked.has(engine)) return;
	checked.add(engine);
	try {
		await fetch(`${BASE[engine]}/version`, { signal: AbortSignal.timeout(5000) });
	} catch {
		throw new Error(`${engine} のエンジンに繋がらない（${BASE[engine]}）。先にエンジンを起動する`);
	}
}

const story = loadStory();
const targets = VOICES.filter((v) => wanted.includes(v.key));
if (targets.length === 0) throw new Error(`声が選ばれていない: ${wanted.join(',')}`);

// 既存の一覧から、ほかの声の分を引き継ぐ（--voice で一部の声だけ作り直したとき）
const listPath = path.join(workDir, 'voice.js');
let list: { voices: any[] } = { voices: [] };
if (fs.existsSync(listPath)) {
	const win: any = {};
	vm.runInNewContext(fs.readFileSync(listPath, 'utf8'), { window: win });
	if (win.VOICE?.voices) list = win.VOICE;
}

let made = 0, kept = 0, warned = 0;
for (const v of targets) {
	const dir = path.join(voiceDir, v.key);
	fs.mkdirSync(dir, { recursive: true });
	const used = new Set<string>();
	const scenes: { file: string; ends: number[] }[][] = [];
	for (let i = 0; i < story.scenes.length; i++) {
		const scene = story.scenes[i];
		const reads = sentences(scene.read ?? scene.text);
		const shown = sentences(scene.text);
		if (reads.length !== shown.length) throw new Error(`場面${i + 1}: 字幕と読みの文の数が違う（${shown.length} と ${reads.length}）`);
		const items = [];
		for (let k = 0; k < reads.length; k++) {
			const read = reads[k];
			const fp = crypto.createHash('sha256').update(`${v.engine}\n${v.id}\n${v.engine === 'aivis' ? applyFix(read, v.key) : read}`).digest('hex').slice(0, 8);
			const name = `s${String(i + 1).padStart(2, '0')}-${k + 1}-${fp}.wav`;
			const file = path.join(dir, name);
			const metaFile = file + '.json';
			used.add(name).add(name + '.json');
			let ends: number[];
			if (fs.existsSync(file) && fs.existsSync(metaFile)) {
				ends = JSON.parse(fs.readFileSync(metaFile, 'utf8')).ends;
				kept++;
			} else {
				await checkEngine(v.engine);
				const r = v.engine === 'voicevox' ? await makeVoicevox(v, read) : await makeAivis(v, read);
				ends = r.ends.map((e) => Math.round(e * 1000) / 1000);
				if (ends.length !== phraseEnds(read).length) {
					console.log(`⚠️ [${v.key}] 場面${i + 1}-${k + 1}: 句の数が合わない（字幕 ${phraseEnds(read).length} / 時刻 ${ends.length}）: ${read}`);
					warned++;
				}
				fs.writeFileSync(file, r.wav);
				fs.writeFileSync(metaFile, JSON.stringify({ ends }));
				made++;
				console.log(`✅ [${v.key}] 場面${i + 1}-${k + 1} ${r.total.toFixed(2)} 秒`);
			}
			items.push({ file: `voice/${v.key}/${name}`, ends });
		}
		scenes.push(items);
	}
	// wav から mp3 を作る（p261012-02）。同じ名前で拡張子だけを替え、無いものだけを作る
	// 句の終わりの時刻は wav のものを使う（長さの差は最大 0.3 ミリ秒。2026-10-12 に全 108 本で実測）
	const wavs = [...used].filter((f) => f.endsWith('.wav'));
	const toMp3 = (f: string) => f.replace(/\.wav$/, '.mp3');
	const missing = wavs.filter((f) => !fs.existsSync(path.join(dir, toMp3(f))));
	if (missing.length > 0) {
		execFileSync('convert-audio', [...missing.map((f) => path.join(dir, f)), '--to', 'mp3', '--bitrate', String(MP3_KBPS), '--out', dir], { shell: true, stdio: 'ignore', timeout: 600000 });
		for (const f of missing) if (!fs.existsSync(path.join(dir, toMp3(f)))) throw new Error(`mp3 を作れなかった: ${v.key}/${toMp3(f)}`);
		console.log(`✅ [${v.key}] mp3 ${missing.length} 文`);
	}
	for (const f of wavs) used.add(toMp3(f));
	// 文が変わって要らなくなった音声を消す
	for (const f of fs.readdirSync(dir)) if (!used.has(f)) fs.rmSync(path.join(dir, f));
	list.voices = list.voices.filter((x) => x.key !== v.key);
	const mb = (ext: string) => {
		let bytes = 0;
		for (const f of used) if (f.endsWith(ext)) bytes += fs.statSync(path.join(dir, f)).size;
		return Math.max(1, Math.round(bytes / 1024 / 1024));
	};
	// format は一覧の値（r:key:形式）の形式（p261012-01）。声ごとに mp3、wav の順に並べる（p261012-02 の 76-A）
	const mp3Scenes = scenes.map((items) => items.map((it) => ({ ...it, file: toMp3(it.file) })));
	list.voices.push({ key: v.key, format: 'mp3', label: v.label.replace('{size}', `wav➡mp3 ${mb('.mp3')}MB`), scenes: mp3Scenes });
	list.voices.push({ key: v.key, format: 'wav', label: v.label.replace('{size}', `wav ${mb('.wav')}MB`), scenes });
}
const FORMATS = ['mp3', 'wav'];
list.voices.sort((a, b) => VOICES.findIndex((x) => x.key === a.key) - VOICES.findIndex((x) => x.key === b.key) || FORMATS.indexOf(a.format) - FORMATS.indexOf(b.format));

// 一覧。<script src> で読めるようにし、ファイルを直接開いても動く形にする
const body = JSON.stringify(list, null, '\t');
fs.writeFileSync(listPath, `// 事前生成の音声の一覧。tools/20_build/make-voice.ts が書き出す。手で直さない\n// voices[] = { key, format: 形式, label: 選択欄の文言, scenes }。scenes[場面][文] = { file: 音声, ends: 句の終わりの秒 }\nwindow.VOICE = ${body};\n`);
console.log(`済: 作った ${made} 文 / 流用 ${kept} 文 / 警告 ${warned} 件`);
