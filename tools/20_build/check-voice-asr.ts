// 事前生成の音声を、音声認識（共有ツールの transcribe）で書き起こし、読みが台本どおりかを確かめる（p261010-01）
// 人が聞く代わりの確認。書き起こした文と台本の読みを、どちらも VOICEVOX の読みの情報で、かなに直して比べる
// 使い方: node tools/20_build/check-voice-asr.ts [--voicevox http://127.0.0.1:50021] [--voice zundamon,mao]
// 先に VOICEVOX のエンジンを起動しておく（かなに直すのに使う）
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..', '..');
const workDir = path.join(root, 'src', 'works', '01-momotaro');
const outDir = path.join(root, 'tmp', 'voice-asr');
const arg = (name: string, fallback = '') => {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const vv = arg('voicevox', 'http://127.0.0.1:50021');

const load = (file: string) => {
	const win: any = {};
	vm.runInNewContext(fs.readFileSync(path.join(workDir, file), 'utf8'), { window: win });
	return win;
};
const story = load('story.js').STORY;
const list = load('voice.js').VOICE;
const wanted = arg('voice', list.voices.map((v: any) => v.key).join(',')).split(',');
const sentences = (t: string): string[] => t.match(/[^。！？]+[。！？」]*/g) || [];

// 文を、VOICEVOX が読むかな（カタカナ）に直す。句読点・間は落として、音だけを比べる
async function kana(text: string): Promise<string> {
	const res = await fetch(`${vv}/audio_query?speaker=3&text=${encodeURIComponent(text.replace(/[「」]/g, ''))}`, { method: 'POST' });
	if (!res.ok) throw new Error(`${res.status}: VOICEVOX`);
	const q: any = await res.json();
	return q.accent_phrases.map((ap: any) => ap.moras.map((m: any) => m.text).join('')).join('');
}

// かなの並びの違いを、編集距離で数える
function distance(a: string, b: string) {
	const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
	for (let j = 1; j <= b.length; j++) d[0][j] = j;
	for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
	return d[a.length][b.length];
}

const items: { voice: string; no: string; read: string; file: string; txt: string }[] = [];
for (const v of list.voices.filter((x: any) => wanted.includes(x.key))) {
	story.scenes.forEach((scene: any, i: number) => {
		const read = sentences(scene.read ?? scene.text);
		v.scenes[i].forEach((item: any, k: number) => {
			const file = path.join(workDir, item.file);
			const txt = path.join(outDir, v.key, path.basename(file, '.wav') + '.txt');
			items.push({ voice: v.key, no: `${i + 1}-${k + 1}`, read: read[k], file, txt });
		});
	});
}
if (items.length === 0) throw new Error(`声が選ばれていない: ${wanted.join(',')}`);

// モデルの読み込みを 1 回で済ませるため、声ごとにまとめて渡す。書き起こしは --out の下に <名前>.txt で出る
for (const key of new Set(items.map((x) => x.voice))) {
	const dir = path.join(outDir, key);
	fs.mkdirSync(dir, { recursive: true });
	const files = items.filter((x) => x.voice === key).map((x) => x.file);
	execFileSync('transcribe', [...files, '--lang', 'ja', '--out', dir], { stdio: 'ignore', timeout: 3_600_000, shell: true });
}

const rows = [];
for (const x of items) {
	const heard = fs.readFileSync(x.txt, 'utf8').replace(/\s+/g, '');
	const want = await kana(x.read);
	const got = await kana(heard);
	rows.push({ ...x, heard, want, got, diff: distance(want, got) });
}
rows.sort((a, b) => b.diff - a.diff);
fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(rows, null, '\t'));
for (const r of rows) console.log(`${r.diff === 0 ? '✅' : '⚠️'} ${r.diff}\t${r.voice} ${r.no}\t聞こえた: ${r.heard}${r.diff ? `\n\t\t期待: ${r.want}\n\t\t実際: ${r.got}` : ''}`);
console.log(`一致 ${rows.filter((r) => r.diff === 0).length} / ${rows.length}`);
