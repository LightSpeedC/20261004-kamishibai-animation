// 効果音と BGM（Web Audio API）。音のファイルは使わず、波形をその場で計算して鳴らす（p261004-02 段階 3）
// ブラウザは操作の前に音を出せないため、最初の操作の中で unlock() を呼ぶ
// Web Audio の無いブラウザでは window.KamishibaiSound が null になり、紙芝居は音なしで進む
(function () {
	'use strict';

	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (!Ctx) {
		window.KamishibaiSound = null;
		return;
	}

	const MASTER = 0.9;	// 全体の音量
	const BGM_VOL = 0.5;	// BGM の音量（全体に対して）
	const DUCK = 0.7;	// 読み上げ中の BGM は、この割合まで下げる（0.3 では聞こえなかった）

	let ctx = null;
	let master = null;
	let bgmGain = null;
	let enabled = true;
	let ducked = false;
	let bgm = null;	// 流している BGM。{ tempo: 'normal' | 'fast', nodes, timer }
	let scheduled = [];	// 場面の効果音を鳴らすタイマー
	let paused = false;	// 一時停止中。音の時計とタイマーを止めている
	// 鳴らした音の名前（テストで確かめるため）。古いものから消す
	const history = [];

	function note(name) {
		history.push(name);
		if (history.length > 200) history.shift();
	}

	// ---- 一時停止で止められるタイマー ----
	// 音そのものは音の時計（ctx.currentTime）で鳴らすため、ctx を止めれば止まる。
	// 次に鳴らす音を組むタイマーは時計の外にあるため、残りの時間を控えて止め、再開で続きから数える
	const timers = new Set();

	function run(t) {
		t.due = Date.now() + t.left;
		t.id = setTimeout(() => {
			timers.delete(t);
			t.fn();
		}, t.left);
	}

	function later(fn, ms) {
		const t = { fn, left: ms, due: 0, id: null };
		timers.add(t);
		if (!paused) run(t);
		return t;
	}

	function cancelLater(t) {
		if (!t) return;
		clearTimeout(t.id);
		timers.delete(t);
	}

	function pause() {
		if (paused) return;
		paused = true;
		for (const t of timers) {
			if (t.id === null) continue;
			clearTimeout(t.id);
			t.id = null;
			t.left = Math.max(0, t.due - Date.now());
		}
		if (ctx) ctx.suspend();
	}

	function resume() {
		if (!paused) return;
		paused = false;
		if (ctx) ctx.resume();
		for (const t of timers) run(t);
	}

	// 最初の操作の中で呼ぶ。音の出口を作り、止まっていれば動かす（一時停止中は動かさない）
	function unlock() {
		if (!ctx) {
			ctx = new Ctx();
			master = ctx.createGain();
			master.gain.value = enabled ? MASTER : 0;
			master.connect(ctx.destination);
			bgmGain = ctx.createGain();
			bgmGain.gain.value = BGM_VOL;
			bgmGain.connect(master);
		}
		if (ctx.state === 'suspended' && !paused) ctx.resume();
	}

	// ラ（A4 = 440 Hz）から半音 n 個離れた音の周波数
	function freq(n) {
		return 440 * Math.pow(2, n / 12);
	}

	// ---- 音の部品 ----

	// 1 音。from から to へ高さを変え、出だしと終わりをなだらかにする
	function tone({ type = 'square', from, to = from, start = 0, dur, vol = 0.15, out = master }) {
		const t0 = ctx.currentTime + start;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(from, t0);
		if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
		gain.gain.setValueAtTime(0, t0);
		gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
		osc.connect(gain).connect(out);
		osc.start(t0);
		osc.stop(t0 + dur + 0.05);
		return osc;
	}

	// ノイズ。filter の種類と、削る境目の周波数 f（from → to）を選ぶ。swell: ゆっくり大きくしてから消す
	function noise({ start = 0, dur, vol = 0.3, filter = 'lowpass', f = 1000, fTo = f, q = 1, swell = false }) {
		const t0 = ctx.currentTime + start;
		const len = Math.floor(ctx.sampleRate * dur);
		const buf = ctx.createBuffer(1, len, ctx.sampleRate);
		const data = buf.getChannelData(0);
		for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
		const src = ctx.createBufferSource();
		src.buffer = buf;
		const flt = ctx.createBiquadFilter();
		flt.type = filter;
		flt.Q.value = q;
		flt.frequency.setValueAtTime(f, t0);
		if (fTo !== f) flt.frequency.exponentialRampToValueAtTime(fTo, t0 + dur);
		const gain = ctx.createGain();
		if (swell) {
			gain.gain.setValueAtTime(0.001, t0);
			gain.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.4);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
		} else {
			gain.gain.setValueAtTime(vol, t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
		}
		src.connect(flt).connect(gain).connect(master);
		src.start(t0);
	}

	// ---- 効果音 ----
	// 名前で呼ぶ。作品の story.js の sounds: [{ name, at }] に書く

	const EFFECTS = {
		// 拍子木: 木を打つ「カン、カン」
		hyoshigi() {
			[0, 0.22].forEach((s) => {
				noise({ start: s, dur: 0.12, vol: 0.9, filter: 'bandpass', f: 2200, q: 12 });
				tone({ type: 'triangle', from: 1900, to: 1500, start: s, dur: 0.12, vol: 0.25 });
			});
		},
		// 鳥の声: 高い音を素早く上下させる
		bird() {
			[0, 0.18, 0.5].forEach((s) => tone({ type: 'sine', from: 2600, to: 3600, start: s, dur: 0.12, vol: 0.12 }));
		},
		// 川の水音: ノイズを低く削り、ゆっくり大きくしてから消す
		water() {
			noise({ dur: 4, vol: 0.18, filter: 'bandpass', f: 700, q: 0.7, swell: true });
		},
		// どんぶらこ: 桃の揺れに合わせた、低い「ぽこん」
		donburako() {
			[0, 0.8, 1.6, 2.4, 3.2, 4.0].forEach((s) => tone({ type: 'sine', from: 330, to: 180, start: s, dur: 0.3, vol: 0.25 }));
		},
		// ぱかっ: 短いノイズと、高さが落ちる音
		pakka() {
			noise({ dur: 0.08, vol: 0.6, filter: 'highpass', f: 1500 });
			tone({ type: 'sine', from: 700, to: 200, dur: 0.18, vol: 0.3 });
		},
		// きらきら: 高い音を少しずつずらして重ねる
		kirakira() {
			[3, 7, 10, 15, 19, 22, 27].forEach((n, i) => tone({ type: 'triangle', from: freq(n + 12), start: i * 0.07, dur: 0.3, vol: 0.12 }));
		},
		// どすん: 重いものを持ち上げる低い音
		dosun() {
			tone({ type: 'sine', from: 120, to: 50, dur: 0.4, vol: 0.5 });
			noise({ dur: 0.25, vol: 0.3, filter: 'lowpass', f: 300 });
		},
		// 雷: 最初に鋭い音、あとに長く低い響き
		kaminari() {
			noise({ dur: 0.15, vol: 0.6, filter: 'highpass', f: 2000 });
			noise({ start: 0.05, dur: 2.5, vol: 0.5, filter: 'lowpass', f: 900, fTo: 60 });
		},
		// ワン: 犬の鳴き声。のこぎり波を高い方から下げ、帯域を絞る
		wan() {
			[0, 0.35].forEach((s) => tone({ type: 'sawtooth', from: 620, to: 330, start: s, dur: 0.16, vol: 0.18 }));
		},
		// キキッ: 猿の鳴き声。高く短い音を上げる
		kiki() {
			[0, 0.12, 0.24].forEach((s) => tone({ type: 'square', from: 1500, to: 2300, start: s, dur: 0.08, vol: 0.1 }));
		},
		// ケーン: きじの鳴き声と羽音
		ken() {
			[0, 0.4].forEach((s) => tone({ type: 'sawtooth', from: 1900, to: 1300, start: s, dur: 0.25, vol: 0.12 }));
			for (let i = 0; i < 6; i++) noise({ start: 0.9 + i * 0.09, dur: 0.06, vol: 0.25, filter: 'bandpass', f: 1200, q: 2 });
		},
		// 波: ノイズをゆっくり大きくして引かせる
		nami() {
			noise({ dur: 3, vol: 0.3, filter: 'lowpass', f: 600, swell: true });
		},
		// ドカーン: ノイズを、高い音を削るフィルターに通し、だんだん小さくする
		dokan() {
			noise({ dur: 1.5, vol: 0.8, filter: 'lowpass', f: 3000, fTo: 80 });
			tone({ type: 'sine', from: 90, to: 40, dur: 0.8, vol: 0.5 });
		},
	};

	function play(name) {
		if (!ctx || !enabled) return;
		if (name === 'bgm-fade') {
			fadeBgm(3);
			return;
		}
		const fx = EFFECTS[name];
		if (!fx) return;
		note(name);
		fx();
	}

	// 場面に入ったときに呼ぶ。list: [{ name, at: 秒 }]
	function schedule(list) {
		clearScheduled();
		for (const s of list) scheduled.push(later(() => play(s.name), (s.at || 0) * 1000));
	}

	function clearScheduled() {
		scheduled.forEach(cancelLater);
		scheduled = [];
	}

	// ---- BGM ----
	// song: { melody: [[ラからの半音数, 拍数]], bass: [[半音数, 拍数]], beat: 1 拍の秒数, fastBeat: 速いときの秒数 }

	function startBgm(song, { fast = false, delay = 0 } = {}) {
		const tempo = fast ? 'fast' : 'normal';
		if (!ctx || !enabled || !song) return;
		if (bgm && bgm.tempo === tempo) return;
		stopBgm();
		bgmGain.gain.cancelScheduledValues(ctx.currentTime);
		bgmGain.gain.setValueAtTime(ducked ? BGM_VOL * DUCK : BGM_VOL, ctx.currentTime);
		bgm = { tempo, nodes: [], timer: null };
		note(fast ? 'bgm-fast' : 'bgm-start');
		const beat = fast ? song.fastBeat : song.beat;
		const loop = (start) => {
			if (!bgm) return;
			let t = start;
			for (const [n, beats] of song.melody) {
				if (n !== null) bgm.nodes.push(tone({ type: 'square', from: freq(n), start: t, dur: beats * beat * 0.9, vol: 0.07, out: bgmGain }));
				t += beats * beat;
			}
			// 低い音。速いときは 1 拍ずつ刻んで勢いを出す
			let b = start;
			for (const [n, beats] of song.bass) {
				const step = fast ? 1 : beats;
				for (let k = 0; n !== null && k < beats; k += step) {
					bgm.nodes.push(tone({ type: 'triangle', from: freq(n), start: b + k * beat, dur: step * beat * 0.9, vol: fast ? 0.22 : 0.16, out: bgmGain }));
				}
				b += beats * beat;
			}
			// 曲の終わりの少し前に、次の 1 回分を組む
			bgm.timer = later(() => {
				if (!bgm) return;
				bgm.nodes = [];
				loop(0.05);
			}, (t - 0.05) * 1000);
		};
		loop(delay);
	}

	function stopBgm() {
		if (!bgm) return;
		cancelLater(bgm.timer);
		for (const osc of bgm.nodes) {
			try { osc.stop(); } catch (e) { /* 鳴り終わった音は止められない */ }
		}
		bgm = null;
		note('bgm-stop');
	}

	// sec 秒かけて BGM を消していく
	function fadeBgm(sec) {
		if (!bgm) return;
		const now = ctx.currentTime;
		bgmGain.gain.cancelScheduledValues(now);
		bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
		bgmGain.gain.linearRampToValueAtTime(0.0001, now + sec);
		const fading = bgm;
		later(() => {
			if (bgm === fading) stopBgm();
		}, sec * 1000);
		note('bgm-fade');
	}

	// 読み上げ中は BGM を小さくする
	function duck(on) {
		ducked = on;
		if (!ctx || !bgm) return;
		const now = ctx.currentTime;
		bgmGain.gain.cancelScheduledValues(now);
		bgmGain.gain.setTargetAtTime(on ? BGM_VOL * DUCK : BGM_VOL, now, 0.15);
	}

	// 音（効果音と BGM）を出すか。止めると、鳴らす予定の効果音と BGM も止める
	function setEnabled(on) {
		enabled = on;
		if (master) master.gain.setValueAtTime(on ? MASTER : 0, ctx.currentTime);
		if (!on) {
			clearScheduled();
			stopBgm();
		}
	}

	function isEnabled() {
		return enabled;
	}

	// 今の状態（テストで確かめるため）
	function state() {
		return { enabled, bgm: bgm ? bgm.tempo : null, ducked, paused };
	}

	window.KamishibaiSound = { unlock, play, schedule, clearScheduled, startBgm, stopBgm, fadeBgm, duck, setEnabled, isEnabled, pause, resume, state, history };
})();
