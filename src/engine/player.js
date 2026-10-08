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

	// 文の中の句の終わり（「、」「。」の直後）の位置を、順に並べて返す。最後は文の終わり
	function phraseEnds(s) {
		const ends = [];
		const m = /[、。！？]+」?/g;
		let hit;
		while ((hit = m.exec(s)) !== null) ends.push(hit.index + hit[0].length);
		if (ends.length === 0 || ends[ends.length - 1] < s.length) ends.push(s.length);
		return ends;
	}

	// 読む文 read を pos 文字目まで読んだとき、字幕の文 shown のどこまで色を変えるかを返す
	// 色の境目は、読んでいる句の終わりまで進め、声が次の句に入るまでそこで待つ。
	// 読みを変えた文（read）でも「、」「。」の数は字幕と同じなので、何番目の句かで対応させる
	function captionEnd(shown, read, pos) {
		const readEnds = phraseEnds(read);
		let k = readEnds.findIndex((e) => e >= pos);
		if (k < 0) k = readEnds.length - 1;
		const shownEnds = phraseEnds(shown);
		return shownEnds[Math.min(k, shownEnds.length - 1)];
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

	// story: { title, cover: 表紙の SVG, bgm: BGM の曲（sound.js の startBgm を参照）,
	//   scenes: [{ text: 字幕, read: 読み（省くと字幕を読む）, svg: 絵, sounds: [{ name: 効果音, at: 秒 }], bgm: 'fast'（速い BGM） }] }
	// read は音声合成が読み違える語だけをかなにした文。字幕と同じ数の文にする
	// 効果音と BGM は sound.js（window.KamishibaiSound）を先に読み込んだときだけ鳴らす
	function start(story, root = document.body) {
		const speech = window.KamishibaiSpeech || null;
		const sound = window.KamishibaiSound || null;
		let speechOn = true;	// 「読み上げ」ボタンで切り替える
		document.title = story.title;
		// 0 番目が表紙。1 番目からが場面
		const pages = [{ svg: story.cover, text: '' }].concat(story.scenes);
		let current = 0;
		let busy = false;

		const header = el('header', 'ks-header');
		const back = el('a', 'ks-back', '⌂');
		back.href = '../../../README.html';
		back.title = 'README';
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
		// 「音」（効果音と BGM）と「読み上げ」を別々に消せるボタン。押すたびにオン・オフが替わる
		const soundButton = el('button', 'ks-toggle ks-sound');
		const speechButton = el('button', 'ks-toggle ks-speech');
		const voiceInfo = el('span', 'ks-voice');
		const options = el('div', 'ks-options');
		if (sound !== null) options.append(soundButton);
		options.append(speechButton, voiceInfo);

		const main = el('main', 'ks-main');
		main.append(frame, caption, controls, options);
		root.append(header, main);

		let token = 0;	// 読み上げの回。場面が変わったら増やし、前の回の合図を捨てる
		let timer = null;

		function voiceAvailable() {
			return speech !== null && speech.ready();
		}

		function speechReady() {
			return speechOn && voiceAvailable();
		}

		function renderToggles() {
			const on = sound !== null && sound.isEnabled();
			soundButton.textContent = '音: ' + (on ? 'オン' : 'オフ');
			soundButton.setAttribute('aria-pressed', String(on));
			speechButton.textContent = '読み上げ: ' + (speechOn ? 'オン' : 'オフ');
			speechButton.setAttribute('aria-pressed', String(speechOn));
		}

		// 場面に入ったときの音。表紙では BGM を止める。13 場面のように bgm: 'fast' の場面だけ速くする
		function soundScene() {
			if (sound === null) return;
			sound.clearScheduled();
			if (current === 0) {
				sound.stopBgm();
				return;
			}
			const scene = pages[current];
			// 最初の場面では、拍子木が鳴り終わってから BGM を始める
			sound.startBgm(story.bgm, { fast: scene.bgm === 'fast', delay: 0.8 });
			sound.schedule(scene.sounds || []);
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
			if (sound) sound.duck(false);
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
				if (sound) sound.duck(false);
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

			// 読み上げ中は BGM を小さくする
			if (sound) sound.duck(true);
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
					onboundary: (pos) => {
						if (my === token) renderCaption(shown, k, captionEnd(shown[k], read[k], pos));
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
			if (!voiceAvailable()) {
				voiceInfo.textContent = '声: なし（字幕だけで進む）';
				return;
			}
			// 見出しは「声」。隣の「読み上げ」ボタンと同じ言葉にしない
			const label = el('label', null, '声: ');
			const select = el('select');
			select.setAttribute('aria-label', '読み上げの声');
			for (const v of speech.voices()) {
				// 「内蔵」は PC・スマホに入っていて、ネットに繋がずに動く声
				const o = el('option', null, v.name + '（' + (v.local ? '内蔵' : 'ネット') + '）');
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
			// 音は操作の中でしか出せるようにならないため、送りの操作のたびに呼んでおく
			if (sound) sound.unlock();
			if (busy || to < 0 || to >= pages.length || to === current) return;
			busy = true;
			const oldCard = stage.querySelector('.ks-card');
			const newCard = card(to);
			const forward = to > current;
			current = to;
			render();
			narrate();
			soundScene();
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
		// 音を消すと、鳴らす予定の効果音と BGM も止める。点け直したら、今の場面の BGM から鳴らす
		soundButton.addEventListener('click', () => {
			sound.unlock();
			sound.setEnabled(!sound.isEnabled());
			if (sound.isEnabled()) soundScene();
			renderToggles();
		});
		// 読み上げを消すと、字幕だけで時間をおいて送る。点け直したら、今の場面を頭から読む
		speechButton.addEventListener('click', () => {
			speechOn = !speechOn;
			renderToggles();
			if (current !== 0) narrate();
		});
		document.addEventListener('keydown', (e) => {
			if (e.altKey || e.ctrlKey || e.metaKey) return;
			// 声の一覧などの入力欄では、矢印キーをその欄の操作に使う
			if (e.target instanceof Element && e.target.closest('select, input, textarea')) return;
			if (e.key === 'ArrowRight' || e.key === 'PageDown') go(current + 1);
			else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(current - 1);
		});

		stage.append(card(0), startButton);
		render();
		renderToggles();
		// 声の一覧が後から届いたら、表示を直す
		renderVoice();
		if (speech !== null) speech.onVoicesChanged(renderVoice);
	}

	window.Kamishibai = { start };
})();
