// 紙芝居の再生。絵・字幕・送り・読み上げ（p261004-02）
// 作品の index.html から <script src> で読み込み、Kamishibai.start(STORY) で始める
// 読み上げは speech.js（window.KamishibaiSpeech）を先に読み込んだときだけ使う
(function () {
	'use strict';

	const PULL_MS = 700;	// 紙を引き抜く時間。kamishibai.css の --ks-pull と揃える
	const AFTER_MS = 1500;	// 読み終えてから次の場面へ送るまでの間
	const MIN_SCENE_MS = 5000;	// 1 場面を見せる最短の時間。短い文でも絵の動きを見せる
	const NO_VOICE_MS_PER_CHAR = 180;	// 声が無いとき、字幕を読む時間の目安（1 文字あたり）

	// 文ごとに区切る。閉じかぎ括弧は前の文に付ける
	function sentences(text) {
		return text.match(/[^。！？]+[。！？」]*/g) || [];
	}

	// pos 文字目まで読んだとき、その句の終わり（「、」「。」の直後）の位置を返す
	// 字幕の色の境目は、声が次の句に入るまでここで待つ
	function phraseEnd(s, pos) {
		const m = /[、。！？]+」?/g;
		m.lastIndex = Math.max(0, pos - 1);
		const hit = m.exec(s);
		return hit ? hit.index + hit[0].length : s.length;
	}

	function el(tag, cls, text) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (text != null) e.textContent = text;
		return e;
	}

	// 動きの終わりで fn を呼ぶ。終わりの合図が来ない場合に備え、時間でも打ち切る
	function afterAnimation(target, fn) {
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			fn();
		};
		target.addEventListener('animationend', finish, { once: true });
		setTimeout(finish, PULL_MS + 300);
	}

	// story: { title, cover: 表紙の SVG, scenes: [{ text: 字幕, read: 読み（省くと字幕を読む）, svg: 絵 }] }
	// read は音声合成が読み違える語だけをかなにした文。字幕と同じ数の文にする
	function start(story, root = document.body) {
		const speech = window.KamishibaiSpeech || null;
		document.title = story.title;
		// 0 番目が表紙。1 番目からが場面
		const pages = [{ svg: story.cover, text: '' }].concat(story.scenes);
		let current = 0;
		let busy = false;

		const header = el('header', 'ks-header');
		const back = el('a', 'ks-back', '⌂');
		back.href = '../../index.html';
		back.title = '作品一覧';
		header.append(back, el('h1', 'ks-title', story.title));

		const stage = el('div', 'ks-stage');
		const frame = el('div', 'ks-frame');
		frame.append(stage);
		const startButton = el('button', 'ks-start', 'はじまり');

		const caption = el('p', 'ks-caption');
		caption.setAttribute('aria-live', 'polite');

		const first = el('button', 'ks-nav ks-first', '⏮');
		first.setAttribute('aria-label', '表紙に戻る');
		first.title = '表紙に戻る';
		const prev = el('button', 'ks-nav ks-prev', '‹');
		prev.setAttribute('aria-label', '前の場面');
		const next = el('button', 'ks-nav ks-next', '›');
		next.setAttribute('aria-label', '次の場面');
		const page = el('span', 'ks-page');
		const controls = el('div', 'ks-controls');
		controls.append(first, prev, page, next);
		const voiceInfo = el('p', 'ks-voice');

		const main = el('main', 'ks-main');
		main.append(frame, caption, controls, voiceInfo);
		root.append(header, main);

		let token = 0;	// 読み上げの回。場面が変わったら増やし、前の回の合図を捨てる
		let timer = null;

		function speechReady() {
			return speech !== null && speech.ready();
		}

		// 字幕を文ごとに出す。now 番目の文を読んでいる途中で、pos 文字目まで読んだ
		function renderCaption(shown, now, pos) {
			caption.textContent = '';
			shown.forEach((s, k) => {
				if (k === now && pos > 0) {
					caption.append(el('span', 'ks-said', s.slice(0, pos)), el('span', 'ks-now', s.slice(pos)));
				} else {
					caption.append(el('span', k < now ? 'ks-said' : k === now ? 'ks-now' : null, s));
				}
			});
		}

		function stopNarration() {
			token++;
			clearTimeout(timer);
			timer = null;
			if (speech) speech.cancel();
		}

		// 今の場面を読み、読み終えたら次の場面へ送る
		function narrate() {
			stopNarration();
			if (current === 0) return;
			const my = token;
			const scene = pages[current];
			const shown = sentences(scene.text);
			const read = scene.read ? sentences(scene.read) : shown;
			const enteredAt = Date.now();

			const finish = () => {
				if (my !== token) return;
				caption.textContent = scene.text;
				if (current >= pages.length - 1) return;
				const wait = Math.max(AFTER_MS, enteredAt + MIN_SCENE_MS - Date.now());
				timer = setTimeout(() => {
					if (my === token) go(current + 1);
				}, wait);
			};

			if (!speechReady()) {
				// 声が無い: 字幕だけを出し、読む時間をおいて送る
				timer = setTimeout(finish, scene.text.length * NO_VOICE_MS_PER_CHAR);
				return;
			}

			let i = 0;
			const step = () => {
				if (my !== token) return;
				if (i >= read.length) {
					finish();
					return;
				}
				const k = i;
				renderCaption(shown, k, 0);
				speech.speak(read[k], {
					// 読みを変えた文は、文字の位置が字幕と合わないため、文の単位で色を付ける
					onboundary: (pos) => {
						if (my === token && read[k] === shown[k]) renderCaption(shown, k, phraseEnd(shown[k], pos));
					},
					onend: () => {
						i++;
						step();
					},
				});
			};
			step();
		}

		// 絵は場面に入るたびに作り直す。SVG の動きは差し込まれた時点から数えるため
		function card(i) {
			const c = el('div', 'ks-card');
			c.innerHTML = pages[i].svg;
			return c;
		}

		function render() {
			caption.textContent = current === 0 ? '「はじまり」を押すと始まります' : pages[current].text;
			page.textContent = current === 0 ? '表紙' : current + ' / ' + story.scenes.length;
			first.disabled = current === 0;
			prev.disabled = current === 0;
			next.disabled = current === pages.length - 1;
			startButton.hidden = current !== 0;
		}

		// 声の名前を選択欄で出す。クリックで日本語の声の一覧が開き、別の声を選べる
		// 一覧を開いている間に作り直すと閉じてしまうため、声の一覧が変わったときだけ作り直す
		function renderVoice() {
			voiceInfo.textContent = '';
			if (!speechReady()) {
				voiceInfo.textContent = '読み上げ: なし（字幕だけで進む）';
				return;
			}
			const label = el('label', null, '読み上げ: ');
			const select = el('select');
			select.setAttribute('aria-label', '読み上げの声');
			for (const v of speech.voices()) {
				const o = el('option', null, v.name + '（' + (v.local ? 'PC 内' : 'ネット') + '）');
				o.value = v.name;
				select.append(o);
			}
			select.value = speech.voiceName();
			select.addEventListener('change', () => {
				// 選んだ声で、今の場面を頭から読み直す
				if (speech.setVoice(select.value) && current !== 0) narrate();
			});
			label.append(select);
			voiceInfo.append(label);
		}

		function go(to) {
			if (busy || to < 0 || to >= pages.length || to === current) return;
			busy = true;
			const oldCard = stage.querySelector('.ks-card');
			const newCard = card(to);
			const forward = to > current;
			current = to;
			render();
			narrate();
			if (forward) {
				// 次へ: 新しい絵を下に置き、今の絵を右へ引き抜く
				stage.insertBefore(newCard, oldCard);
				oldCard.classList.add('is-pull');
				afterAnimation(oldCard, () => {
					oldCard.remove();
					busy = false;
				});
			} else {
				// 前へ: 前の絵を右から差し込む
				newCard.classList.add('is-insert');
				stage.append(newCard);
				afterAnimation(newCard, () => {
					newCard.classList.remove('is-insert');
					oldCard.remove();
					busy = false;
				});
			}
		}

		stage.addEventListener('click', () => go(current + 1));
		startButton.addEventListener('click', (e) => {
			e.stopPropagation();
			go(1);
		});
		// 表紙に戻る。表紙では読み上げないため、narrate() で止まったまま「はじまり」を待つ
		first.addEventListener('click', () => go(0));
		prev.addEventListener('click', () => go(current - 1));
		next.addEventListener('click', () => go(current + 1));
		document.addEventListener('keydown', (e) => {
			if (e.altKey || e.ctrlKey || e.metaKey) return;
			// 声の一覧などの入力欄では、矢印キーをその欄の操作に使う
			if (e.target instanceof Element && e.target.closest('select, input, textarea')) return;
			if (e.key === 'ArrowRight' || e.key === 'PageDown') go(current + 1);
			else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(current - 1);
		});

		stage.append(card(0), startButton);
		render();
		// 声の一覧が後から届いたら、表示を直す
		renderVoice();
		if (speech !== null) speech.onVoicesChanged(renderVoice);
	}

	window.Kamishibai = { start };
})();
