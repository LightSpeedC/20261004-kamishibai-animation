// 紙芝居の再生。絵・字幕・送り・読み上げ（p261004-02）
// 作品の index.html から <script src> で読み込み、Kamishibai.start(STORY) で始める
// 読み上げは speech.js（window.KamishibaiSpeech）を先に読み込んだときだけ使う
(function () {
	'use strict';

	const PULL_MS = 700;	// 紙を引き抜く時間。kamishibai.css の --ks-pull と揃える
	const AFTER_MS = 1500;	// 読み終えてから次の場面へ送るまでの間
	const MIN_SCENE_MS = 5000;	// 1 場面を見せる最短の時間。短い文でも絵の動きを見せる
	const NO_VOICE_MS_PER_CHAR = 180;	// 声が無いとき、字幕を読む時間の目安（1 文字あたり）
	const GUESS_MS_PER_CHAR = 150;	// 読んだ位置の合図が来ない声で、句の終わりを見積もる読み速度（1 文字あたり）
	const VOICE_KEY = 'kamishibai.voice';	// 選んだ声を残す sessionStorage のキー（p261012-01）

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

	// 読む文 read を pos 文字目まで読んだとき、読んでいるのが何番目の句か（0 から）を返す
	// 読みを変えた文（read）でも「、」「。」の数は字幕と同じなので、字幕の句とは番号で対応させる
	function phraseAt(read, pos) {
		const readEnds = phraseEnds(read);
		const k = readEnds.findIndex((e) => e >= pos);
		return k < 0 ? readEnds.length - 1 : k;
	}

	// 操作ボタンの図形。文字（‹ › ⏮ ⏸）は字体によって上下の位置がずれるため、中心を揃えた SVG で描く
	const ICONS = {
		first: '<path d="M5 5h2.5v14H5zM19 5v14L8.5 12z"/>',
		prev: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
		next: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
		pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
		play: '<path d="M7 4.5v15l12-7.5z"/>',
	};
	function setIcon(button, name) {
		button.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
		button.dataset.icon = name;
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
		// 事前生成の音声（recorded.js）。選んでいるときは、ブラウザの声ではなくこちらを鳴らす
		const recorded = window.KamishibaiRecorded || null;
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

		const first = el('button', 'ks-nav ks-first');
		setIcon(first, 'first');
		first.setAttribute('aria-label', '表紙に戻る');
		first.title = '表紙に戻る';
		const prev = el('button', 'ks-nav ks-prev');
		setIcon(prev, 'prev');
		prev.setAttribute('aria-label', '前の場面');
		const next = el('button', 'ks-nav ks-next');
		setIcon(next, 'next');
		next.setAttribute('aria-label', '次の場面');
		const page = el('span', 'ks-page');
		const pauseButton = el('button', 'ks-nav ks-pause');
		// 「音」（効果音と BGM）と「読み上げ」を別々に消せるボタン。押すたびにオン・オフが替わる
		const soundButton = el('button', 'ks-toggle ks-sound');
		const speechButton = el('button', 'ks-toggle ks-speech');
		const voiceInfo = el('span', 'ks-voice');
		// 1 列に並べる: 音 ／ 表紙へ・前・ページ・次・一時停止 ／ 読み上げ・声
		const controls = el('div', 'ks-controls');
		if (sound !== null) controls.append(soundButton);
		controls.append(first, prev, page, next, pauseButton, speechButton, voiceInfo);

		const main = el('main', 'ks-main');
		main.append(frame, caption, controls);
		root.append(header, main);

		let token = 0;	// 読み上げの回。場面が変わったら増やし、前の回の合図を捨てる
		let timer = null;
		// 次の場面へ送るまでのタイマーは、一時停止で残りの時間を控えて止め、再開で続きから数える
		let timerFn = null;
		let timerDue = 0;
		let timerLeft = 0;
		let speaking = null;	// 読んでいる文の番号。読んでいなければ null

		// 一時停止（i261008-01）。読み上げ・送り・絵の動き・効果音・BGM をすべて止める
		let paused = false;
		// 再開したときに読み直す文の番号。止めた文は途中から続けず、頭から読み直す（33-A）
		let resumeFrom = null;
		// 止めている間に場面を替えたか。替えても止めたままにし、再開したらその場面を頭から始める（34-B）
		let sceneWaiting = false;

		function later(fn, ms) {
			clearTimeout(timer);
			timerFn = fn;
			timerDue = Date.now() + ms;
			timer = setTimeout(() => {
				timer = null;
				timerFn = null;
				fn();
			}, ms);
		}

		function usingRecorded() {
			return recorded !== null && recorded.current() !== null;
		}

		// 選んだ声は、声の一覧の値（b:声の名前 / r:key:形式）1 つを sessionStorage に残す（p261012-01）
		// タブを閉じれば消える。残せない環境（プライベートウィンドウ等）でも、声は選べる
		function loadVoiceChoice() {
			try {
				return sessionStorage.getItem(VOICE_KEY);
			} catch (e) {
				return null;
			}
		}
		function saveVoiceChoice(value) {
			try {
				sessionStorage.setItem(VOICE_KEY, value);
			} catch (e) {
				// 残せなくても、このタブの間は選んだ声を使う
			}
		}

		// 事前生成の声の一覧の値。区切りは「:」。key に「:」は使わない（make-voice.ts が確かめる）
		function recordedValue(v) {
			return 'r:' + v.key + ':' + v.format;
		}

		// 開いたときに、残っていた声を選び直す。無い・一覧に無いときは、既定の選び方のまま
		// b: の後ろは声の名前で、分けない（名前に「:」があってもよい）
		function restoreVoice() {
			const saved = loadVoiceChoice();
			if (saved === null) return;
			if (saved.startsWith('b:')) {
				if (recorded !== null) recorded.select(null);
				if (speech !== null) speech.prefer(saved.slice(2));
			} else if (saved.startsWith('r:') && recorded !== null) {
				const v = recorded.voices().find((x) => recordedValue(x) === saved);
				if (v) recorded.select(v.key, v.format);
			}
		}

		function voiceAvailable() {
			return usingRecorded() || (speech !== null && speech.ready());
		}

		function cancelVoice() {
			if (speech) speech.cancel();
			if (recorded) recorded.cancel();
		}

		function speechReady() {
			return speechOn && voiceAvailable();
		}

		function renderToggles() {
			const on = sound !== null && sound.isEnabled();
			// オン・オフは文字ではなく、スイッチの丸の位置と aria-pressed で示す
			soundButton.textContent = '音:';
			soundButton.setAttribute('aria-label', '音: ' + (on ? 'オン' : 'オフ'));
			soundButton.setAttribute('aria-pressed', String(on));
			speechButton.textContent = '読み上げ:';
			speechButton.setAttribute('aria-label', '読み上げ: ' + (speechOn ? 'オン' : 'オフ'));
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

		// 字幕を文ごとに出す。now 番目の文の phrase 番目の句を読んでいる。
		// 読んでいる句は強調（ks-now）、読み終えた所は薄く（ks-said）、まだの所は普通の字にする
		function renderCaption(shown, now, phrase) {
			caption.textContent = '';
			shown.forEach((s, k) => {
				if (k !== now) {
					caption.append(el('span', k < now ? 'ks-said' : null, s));
					return;
				}
				const ends = phraseEnds(s);
				const i = Math.min(phrase, ends.length - 1);
				const from = i > 0 ? ends[i - 1] : 0;
				const to = ends[i];
				if (from > 0) caption.append(el('span', 'ks-said', s.slice(0, from)));
				caption.append(el('span', 'ks-now', s.slice(from, to)));
				if (to < s.length) caption.append(el('span', null, s.slice(to)));
			});
		}

		function stopNarration() {
			token++;
			clearTimeout(timer);
			timer = null;
			timerFn = null;
			speaking = null;
			cancelVoice();
			if (sound) sound.duck(false);
		}

		// 今の場面を from 番目の文から読み、読み終えたら次の場面へ送る
		function narrate(from = 0) {
			stopNarration();
			if (current === 0) return;
			const my = token;
			const scene = pages[current];
			const shown = sentences(scene.text);
			const read = scene.read ? sentences(scene.read) : shown;
			const enteredAt = Date.now();

			const finish = () => {
				if (my !== token) return;
				speaking = null;
				if (sound) sound.duck(false);
				caption.textContent = scene.text;
				if (current >= pages.length - 1) return;
				const wait = Math.max(AFTER_MS, enteredAt + MIN_SCENE_MS - Date.now());
				later(() => {
					if (my === token) go(current + 1);
				}, wait);
			};

			if (!speechReady()) {
				// 声が無い: 字幕だけを出し、読む時間をおいて送る
				later(finish, scene.text.length * NO_VOICE_MS_PER_CHAR);
				return;
			}

			// 読み上げ中は BGM を小さくする
			if (sound) sound.duck(true);
			let i = from;
			// ブラウザの声で k 番目の文を読む。事前生成の音声が鳴らせなかったときも、これで読み続ける（37-A）。
			// ブラウザの声も無ければ、字幕だけで読む時間をおく
			const speakByBrowser = (k, next) => {
				if (speech === null || !speech.ready()) {
					later(next, shown[k].length * NO_VOICE_MS_PER_CHAR);
					return;
				}
				// 読んだ位置の合図（boundary）が来ない声がある（Chrome のネットの声など）。そのままだと 1 句目で止まるため、
				// 文字数から句の終わりの時刻を見積もって進める。合図が 1 度でも来たら、合図に任せる
				let gotBoundary = false;
				const guesses = phraseEnds(read[k]).slice(0, -1).map((end, i) => setTimeout(() => {
					if (!gotBoundary && my === token) renderCaption(shown, k, i + 1);
				}, end * GUESS_MS_PER_CHAR));
				speech.speak(read[k], {
					onboundary: (pos) => {
						gotBoundary = true;
						if (my === token) renderCaption(shown, k, phraseAt(read[k], pos));
					},
					onend: () => {
						guesses.forEach(clearTimeout);
						next();
					},
				});
			};
			const step = () => {
				if (my !== token) return;
				if (i >= read.length) {
					finish();
					return;
				}
				const k = i;
				speaking = k;
				renderCaption(shown, k, 0);	// 最初の句から
				const next = () => {
					i++;
					step();
				};
				if (!usingRecorded()) {
					speakByBrowser(k, next);
					return;
				}
				// 事前生成の音声: 句に入るたびに、その句を強調する
				recorded.speak(current - 1, k, {
					onphrase: (n) => {
						if (my === token) renderCaption(shown, k, n);
					},
					onend: next,
					onerror: () => {
						if (my === token) speakByBrowser(k, next);
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
			// 表紙では何も動いていないため、止められない
			pauseButton.disabled = current === 0;
		}

		function renderPause() {
			const label = paused ? '再開' : '一時停止';
			setIcon(pauseButton, paused ? 'play' : 'pause');
			pauseButton.setAttribute('aria-label', label);
			pauseButton.title = label;
		}

		// 絵の動き（SVG の animate）を止める・動かす
		function pauseCards(on) {
			stage.querySelectorAll('.ks-card > svg').forEach((svg) => {
				if (on) svg.pauseAnimations();
				else svg.unpauseAnimations();
			});
		}

		function setPaused(on) {
			if (on === paused || (on && current === 0)) return;
			paused = on;
			if (on) {
				if (timer !== null) {
					clearTimeout(timer);
					timer = null;
					timerLeft = Math.max(0, timerDue - Date.now());
				}
				if (speaking !== null) {
					// 読んでいる文を打ち切る。読み直すのは再開したとき
					resumeFrom = speaking;
					token++;
					speaking = null;
					cancelVoice();
				}
				if (sound) sound.pause();
				pauseCards(true);
			} else {
				if (sound) {
					sound.resume();
					sound.unlock();
				}
				pauseCards(false);
				if (sceneWaiting) {
					sceneWaiting = false;
					resumeFrom = null;
					narrate();
					soundScene();
				} else if (resumeFrom !== null) {
					const k = resumeFrom;
					resumeFrom = null;
					narrate(k);
				} else if (timerFn !== null) {
					later(timerFn, timerLeft);
				}
			}
			renderPause();
		}

		// 声や読み上げのオン・オフを替えたとき、今の場面を頭から読み直す。止めている間は、再開したときに読む
		function rereadScene() {
			if (current === 0) return;
			if (!paused) {
				narrate();
				return;
			}
			stopNarration();
			if (!sceneWaiting) resumeFrom = 0;
		}

		// 声の名前を選択欄で出す。クリックで日本語の声の一覧が開き、別の声を選べる
		// 一覧を開いている間に作り直すと閉じてしまうため、声の一覧が変わったときだけ作り直す
		function renderVoice() {
			voiceInfo.textContent = '';
			const browserVoices = speech !== null ? speech.voices() : [];
			const recordedVoices = recorded !== null ? recorded.voices() : [];
			if (browserVoices.length + recordedVoices.length === 0) {
				voiceInfo.textContent = '声: なし（字幕だけで進む）';
				return;
			}
			// 見出しは「声」。隣の「読み上げ」ボタンと同じ言葉にしない
			const label = el('label', null, '声: ');
			const select = el('select');
			select.setAttribute('aria-label', '読み上げの声');
			// 表示は「費用: 置き場: 作り方: 名前」。「内蔵」は PC・スマホに入っていて、ネットに繋がずに動く声
			for (const v of browserVoices) {
				const o = el('option', null, '無料: ' + (v.local ? '内蔵' : 'ネット') + ': 動的生成: ' + v.name);
				o.value = 'b:' + v.name;
				select.append(o);
			}
			for (const v of recordedVoices) {
				const o = el('option', null, v.label);
				o.value = recordedValue(v);
				select.append(o);
			}
			// どれも選ばれていない（ブラウザの声が無く、事前生成も選んでいない）ときは、空にしておく
			if (usingRecorded()) select.value = recordedValue(recorded.current());
			else if (speech !== null && speech.ready()) select.value = 'b:' + speech.voiceName();
			else select.selectedIndex = -1;
			// 権利表記（VOICEVOX の「VOICEVOX - 名前」など）は、選択欄の文言そのもので示す
			select.addEventListener('change', () => {
				let changed;
				if (select.value.startsWith('r:')) {
					const v = recordedVoices.find((x) => recordedValue(x) === select.value);
					changed = recorded.select(v.key, v.format);
				} else {
					if (recorded !== null) recorded.select(null);
					changed = speech.setVoice(select.value.slice(2));
				}
				// 残すのは利用者が選んだときだけ。開いたときに自動で選んだ声は残さない（71-A）
				if (changed) saveVoiceChoice(select.value);
				// 選んだ声で、今の場面を頭から読み直す
				if (changed) rereadScene();
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
			// 表紙へ戻るときは一時停止を解く。表紙では何も動かないため
			if (to === 0 && paused) {
				sceneWaiting = false;
				resumeFrom = null;
				paused = false;
				if (sound) sound.resume();
				renderPause();
			}
			current = to;
			render();
			if (paused) {
				// 止めたまま絵と字幕だけを替える。前の場面の読み上げと効果音は捨て、再開したらこの場面を頭から始める
				stopNarration();
				resumeFrom = null;
				sceneWaiting = true;
				if (sound) sound.clearScheduled();
			} else {
				narrate();
				soundScene();
			}
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
			// 止めている間に出した絵は、動きの始まりで止めておく
			if (paused) pauseCards(true);
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
		pauseButton.addEventListener('click', () => setPaused(!paused));
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
			rereadScene();
		});
		document.addEventListener('keydown', (e) => {
			if (e.altKey || e.ctrlKey || e.metaKey) return;
			// 声の一覧などの入力欄では、矢印キーをその欄の操作に使う
			if (e.target instanceof Element && e.target.closest('select, input, textarea')) return;
			if (e.key === 'ArrowRight' || e.key === 'PageDown') go(current + 1);
			else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(current - 1);
			else if (e.key === ' ') {
				// 見えているボタンにフォーカスがあるときは、スペースキーでそのボタンを押す（ブラウザの既定）
				const button = e.target instanceof Element ? e.target.closest('button') : null;
				if (button && !button.hidden && !button.disabled) return;
				e.preventDefault();
				if (!e.repeat) setPaused(!paused);
			}
		});

		stage.append(card(0), startButton);
		render();
		renderToggles();
		renderPause();
		restoreVoice();
		// 声の一覧が後から届いたら、表示を直す
		renderVoice();
		if (speech !== null) speech.onVoicesChanged(renderVoice);
	}

	window.Kamishibai = { start };
})();
