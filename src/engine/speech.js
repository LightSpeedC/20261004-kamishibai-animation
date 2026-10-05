// 読み上げ（Web Speech API）。日本語の声を選び、渡された文を読む（p261004-02）
// 声が無いブラウザでは window.KamishibaiSpeech が null になり、紙芝居は字幕だけで進む
(function () {
	'use strict';

	const RATE = 0.95;	// 紙芝居らしく、少しゆっくり読む
	// 読み上げを始めるたびに先頭の音が削れる（声や文頭の「、」では直らない）。
	// 先頭に「っ」を置くと、削れる分をその無音が引き受け、最初の音まで聞こえる
	const LEAD = 'っ';

	const synth = window.speechSynthesis;
	if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
		window.KamishibaiSpeech = null;
		return;
	}

	const STORE_KEY = 'kamishibai.voice';	// 選んだ声の名前を残す localStorage のキー

	let jaVoices = [];
	let voice = null;
	const listeners = [];
	// 読み上げ中の発話。参照を持っていないと、終わりの合図が来ないことがある（Chrome）
	let current = null;

	// 残せない環境（プライベートウィンドウ等）でも、読み上げは続ける
	function loadName() {
		try {
			return localStorage.getItem(STORE_KEY);
		} catch (e) {
			return null;
		}
	}
	function saveName(name) {
		try {
			localStorage.setItem(STORE_KEY, name);
		} catch (e) {
			// 残せなくても、今回の読み上げには使える
		}
	}

	// 選んで残した声を使う。無ければ内蔵の（PC・スマホの中で動く）日本語の声、それも無ければネットの日本語の声
	function pick() {
		jaVoices = synth.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'));
		const saved = loadName();
		voice = jaVoices.find((v) => v.name === saved) || jaVoices.find((v) => v.localService) || jaVoices[0] || null;
		listeners.forEach((f) => f());
	}
	pick();
	// 声の一覧は後から届くことがある
	synth.addEventListener('voiceschanged', pick);

	function ready() {
		return voice !== null;
	}

	function voiceName() {
		return voice ? voice.name : '';
	}

	// 選べる日本語の声。local は内蔵の声（PC・スマホの中で動く）か
	function voices() {
		return jaVoices.map((v) => ({ name: v.name, local: v.localService }));
	}

	// 声を変えて残す。一覧に無い名前なら変えない
	function setVoice(name) {
		const v = jaVoices.find((x) => x.name === name);
		if (!v) return false;
		voice = v;
		saveName(name);
		return true;
	}

	// 声の一覧が変わったときに呼ぶ
	function onVoicesChanged(f) {
		listeners.push(f);
	}

	// text を読む。onboundary(text のうち読み終えた文字数) と onend() を呼ぶ。止めたときも onend() が来る
	function speak(text, { onboundary, onend }) {
		const u = new SpeechSynthesisUtterance(LEAD + text);
		u.voice = voice;
		u.lang = voice.lang;
		u.rate = RATE;
		let ended = false;
		const end = () => {
			if (ended) return;
			ended = true;
			clearTimeout(guard);
			if (current === u) current = null;
			onend();
		};
		u.onend = end;
		u.onerror = end;
		// 位置は「っ」を除いた text の中の文字数にして渡す
		u.onboundary = (e) => {
			if (onboundary) onboundary(Math.max(0, e.charIndex + (e.charLength || 0) - LEAD.length));
		};
		// 終わりの合図が来ないまま止まった場合に備え、文の長さから見た上限で打ち切る
		const guard = setTimeout(end, text.length * 400 + 5000);
		current = u;
		synth.resume();
		synth.speak(u);
	}

	function cancel() {
		current = null;
		synth.cancel();
	}

	window.KamishibaiSpeech = { ready, voiceName, voices, setVoice, onVoicesChanged, speak, cancel };
})();
