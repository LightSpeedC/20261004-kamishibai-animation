// 声ごとに、エンジンが「このかなで読む」と返す読み（読みの情報）を、全文の分だけ一覧にする（p261010-01）
// 音声を作る前に、読み間違い（「中から」を「ちゅうから」など）を目で見つけるために使う
// 使い方: node tools/20_build/list-voice-reading.ts [--voicevox http://127.0.0.1:50021] [--aivis http://127.0.0.1:10101]
// VOICEVOX 系（ずんだもん・四国めたん）と AivisSpeech 系（まお・コハク）は、それぞれ同じ辞書なので、各 1 声で足りる
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { applyFix } from './voice-fix.ts';

const workDir = path.resolve(import.meta.dirname, '..', '..', 'src', 'works', '01-momotaro');
const arg = (name: string, fallback: string) => {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const ENGINES = [
	{ name: 'VOICEVOX（ずんだもん・四国めたん）', base: arg('voicevox', 'http://127.0.0.1:50021'), id: 3, kind: 'voicevox' },
	{ name: 'AivisSpeech（まお・コハク）', base: arg('aivis', 'http://127.0.0.1:10101'), id: 888753760, kind: 'aivis' },
];

// make-voice.ts と同じ分け方（player.js とも揃える）
const sentences = (t: string): string[] => t.match(/[^。！？]+[。！？」]*/g) || [];
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

const win: any = {};
vm.runInNewContext(fs.readFileSync(path.join(workDir, 'story.js'), 'utf8'), { window: win });
const scenes: { text: string; read?: string }[] = win.STORY.scenes;

async function kana(base: string, id: number, text: string): Promise<string> {
	const res = await fetch(`${base}/audio_query?speaker=${id}&text=${encodeURIComponent(text)}`, { method: 'POST', signal: AbortSignal.timeout(30000) });
	if (!res.ok) throw new Error(`${res.status}: ${base}`);
	const q: any = await res.json();
	return q.accent_phrases.map((ap: any) => ap.moras.map((m: any) => m.text).join('') + (ap.pause_mora ? '、' : '')).join(' ');
}

for (const e of ENGINES) {
	try {
		await fetch(`${e.base}/version`, { signal: AbortSignal.timeout(5000) });
	} catch {
		console.log(`\n■ ${e.name}: エンジンに繋がらない（${e.base}）ので飛ばす`);
		continue;
	}
	console.log(`\n■ ${e.name}`);
	for (let i = 0; i < scenes.length; i++) {
		const read = sentences(scenes[i].read ?? scenes[i].text);
		for (let k = 0; k < read.length; k++) {
			// 実際に音声を作るときと同じ文字をエンジンに渡す
			const parts = e.kind === 'voicevox'
				? [await kana(e.base, e.id, read[k].replace(/[「」]/g, ''))]
				: await Promise.all(phraseTexts(read[k]).map((p) => kana(e.base, e.id, applyFix(p))));
			console.log(`${i + 1}-${k + 1}\t${parts.join(' | ')}`);
		}
	}
}
