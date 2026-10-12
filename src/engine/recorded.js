// 事前生成の音声の再生（p261010-01）。作品の voice.js（window.VOICE）にある WAV を、文ごとに鳴らす
// voice.js が無い作品では window.KamishibaiRecorded が null になり、紙芝居はブラウザの声だけを使う
(function () {
	'use strict';

	const list = window.VOICE && window.VOICE.voices;
	if (!list || list.length === 0) {
		window.KamishibaiRecorded = null;
		return;
	}

	const POLL_MS = 50;	// 再生の位置を見て、句の色を進める間隔
	const MARGIN_MS = 15000;	// 終わりの合図が来ないとき、音声の長さにこれだけ足して打ち切る（読み込みの遅れの分）

	// 選んでいる事前生成の声の key。null はブラウザの声。既定は一覧の先頭の声（ずんだもん）
	// 選んだ声を残すのは player.js（p261012-01）
	let key = list[0].key;

	const audio = new Audio();
	let stop = null;	// 今の再生を止めて後始末する関数

	// 選べる事前生成の声。label は選択欄の文言（権利表記もこれで示す）。format は wav などの形式
	function voices() {
		return list.map((v) => ({ key: v.key, format: v.format, label: v.label }));
	}

	function current() {
		return key;
	}

	// 声を選ぶ。null はブラウザの声に戻す。一覧に無い key なら変えない
	function select(next) {
		if (next !== null && !list.some((v) => v.key === next)) return false;
		key = next;
		return true;
	}

	// scene 番目の場面の sentence 番目の文を鳴らす（どちらも 0 から）。
	// onphrase(n): n 番目の句に入ったとき / onend(): 鳴らし終えたとき / onerror(): 鳴らせなかったとき（音声が無い・読めない・始まらない）
	// cancel() で止めたときは、どれも呼ばない
	function speak(scene, sentence, { onphrase, onend, onerror }) {
		cancel();
		const voice = list.find((v) => v.key === key);
		const item = voice && voice.scenes[scene] && voice.scenes[scene][sentence];
		if (!item) {
			setTimeout(onerror, 0);
			return;
		}
		let done = false;
		let phrase = -1;
		const finish = (fn) => {
			if (done) return;
			done = true;
			cleanup();
			fn();
		};
		const poll = setInterval(() => {
			const t = audio.currentTime;
			let n = item.ends.findIndex((e) => t < e);
			if (n < 0) n = item.ends.length - 1;
			if (n !== phrase) {
				phrase = n;
				if (onphrase) onphrase(n);
			}
		}, POLL_MS);
		const guard = setTimeout(() => finish(onerror), item.ends[item.ends.length - 1] * 1000 + MARGIN_MS);
		const ended = () => finish(onend);
		const failed = () => finish(onerror);
		audio.addEventListener('ended', ended);
		audio.addEventListener('error', failed);
		function cleanup() {
			clearInterval(poll);
			clearTimeout(guard);
			audio.removeEventListener('ended', ended);
			audio.removeEventListener('error', failed);
			if (stop === cancel1) stop = null;
		}
		function cancel1() {
			done = true;
			cleanup();
			audio.pause();
		}
		stop = cancel1;
		audio.src = item.file;
		// 先頭の句の色は、再生が始まる前から付ける
		phrase = 0;
		if (onphrase) onphrase(0);
		const p = audio.play();
		if (p && typeof p.catch === 'function') p.catch(failed);
	}

	function cancel() {
		if (stop) stop();
	}

	window.KamishibaiRecorded = { voices, current, select, speak, cancel };
})();
