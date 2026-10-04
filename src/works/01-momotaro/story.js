// 桃太郎の台本と絵（1〜5 場面は p261004-02、6〜15 場面は p261004-03）
// 絵は 1600×900 の SVG。動きは SMIL で付け、場面の絵が差し込まれた時点から数える
(function () {
	'use strict';

	const O = '#3b2a1e';	// 輪郭の色
	const SKIN = '#f6d6b4';
	const L = `stroke="${O}" stroke-width="6" stroke-linejoin="round"`;
	const L4 = `stroke="${O}" stroke-width="4" stroke-linejoin="round"`;
	const L3 = `stroke="${O}" stroke-width="3" stroke-linejoin="round"`;
	const MINCHO = `font-family="'Yu Mincho', 'Hiragino Mincho ProN', serif" font-weight="700"`;

	// ---- 動きの部品 ----

	// 繰り返し動かす
	function loop(type, values, dur, begin = '0s') {
		return `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>`;
	}

	// 一度だけ動かして、終わりの形で止める
	function once(type, values, dur, begin = '0s') {
		return `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}" begin="${begin}" fill="freeze"/>`;
	}

	// begin の時点から、見えたり消えたりを繰り返す
	function blink(begin, dur = '1.2s') {
		return `<animate attributeName="opacity" values="0;1;0" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>`;
	}

	// begin の時点で現れる
	function appear(begin) {
		return `<set attributeName="opacity" to="1" begin="${begin}" fill="freeze"/>`;
	}

	// ---- 絵の部品 ----

	function svg(body) {
		return `<svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
	}

	// 白い縁取りの付いた文字
	function text(x, y, size, str, fill = O) {
		return `<text x="${x}" y="${y}" font-size="${size}" ${MINCHO} fill="${fill}" stroke="#fff" stroke-width="${Math.round(size / 8)}" stroke-linejoin="round" paint-order="stroke" text-anchor="middle">${str}</text>`;
	}

	// 足元を (x, y) に置き、s 倍で描く。anim は全体に付ける動き
	function place(x, y, s, body, anim = '') {
		return `<g transform="translate(${x} ${y}) scale(${s})"><g>${anim}${body}</g></g>`;
	}

	// (x, y) から (dx, dy) だけ 6 秒かけて歩く
	function walker(x, y, s, body, dx, dy) {
		return `<g transform="translate(${x} ${y})"><g>${once('translate', `0 0;${dx} ${dy}`, '6s')}
			<g transform="scale(${s})"><g>${loop('translate', '0 0;0 -10;0 0', '0.6s')}${body}</g></g>
		</g></g>`;
	}

	// 人物は足元を原点に、高さ約 320 で描く。back は背中の物、front は手前に持つ物
	function grandpa({ back = '', front = '' } = {}) {
		return `${back}
		<path d="M-70 0 L-58 -165 Q0 -192 58 -165 L70 0 Z" fill="#8b6a45" ${L}/>
		<path d="M-28 -176 L0 -118 L28 -176" fill="none" stroke="#f3ead6" stroke-width="12" stroke-linejoin="round"/>
		<rect x="-64" y="-92" width="128" height="20" fill="#3f6b4a" ${L4}/>
		<circle cx="-66" cy="-100" r="15" fill="${SKIN}" ${L4}/>
		<circle cx="66" cy="-100" r="15" fill="${SKIN}" ${L4}/>
		<circle cx="0" cy="-228" r="56" fill="${SKIN}" ${L}/>
		<path d="M-52 -252 q-14 22 4 44 M52 -252 q14 22 -4 44" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
		<path d="M-34 -258 q10 -6 20 0 M14 -258 q10 -6 20 0" fill="none" stroke="#9aa0a6" stroke-width="7" stroke-linecap="round"/>
		<path d="M-26 -236 q8 -8 16 0 M10 -236 q8 -8 16 0" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>
		<circle cx="-34" cy="-214" r="8" fill="#f2a7a0"/>
		<circle cx="34" cy="-214" r="8" fill="#f2a7a0"/>
		<path d="M-32 -205 Q0 -128 32 -205 Q0 -186 -32 -205 Z" fill="#fff" ${L4}/>
		${front}`;
	}

	function grandma({ back = '', front = '' } = {}) {
		return `${back}
		<path d="M-66 0 L-56 -160 Q0 -186 56 -160 L66 0 Z" fill="#9b6bb0" ${L}/>
		<path d="M-40 -40 h20 M-10 -60 h20 M20 -30 h20 M-30 -130 h20 M15 -140 h20" stroke="#d9c2e6" stroke-width="8" stroke-linecap="round"/>
		<path d="M-26 -172 L0 -116 L26 -172" fill="none" stroke="#f3ead6" stroke-width="12" stroke-linejoin="round"/>
		<rect x="-62" y="-96" width="124" height="22" fill="#e8b84a" ${L4}/>
		<circle cx="-64" cy="-104" r="14" fill="${SKIN}" ${L4}/>
		<circle cx="64" cy="-104" r="14" fill="${SKIN}" ${L4}/>
		<circle cx="0" cy="-292" r="26" fill="#d9d9d9" ${L}/>
		<circle cx="0" cy="-222" r="54" fill="${SKIN}" ${L}/>
		<path d="M-54 -226 Q-56 -282 0 -282 Q56 -282 54 -226 Q36 -258 0 -256 Q-36 -258 -54 -226 Z" fill="#d9d9d9" ${L4}/>
		<path d="M-26 -222 q8 -8 16 0 M10 -222 q8 -8 16 0" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>
		<circle cx="-32" cy="-202" r="8" fill="#f2a7a0"/>
		<circle cx="32" cy="-202" r="8" fill="#f2a7a0"/>
		<path d="M-10 -194 q10 8 20 0" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
		${front}`;
	}

	// 背中に背負う柴の束
	const SHIBA = `<g>
		<rect x="-95" y="-262" width="190" height="72" rx="12" fill="#a0763f" ${L}/>
		<path d="M-85 -244 h170 M-85 -226 h170 M-85 -208 h170" stroke="#6b4a24" stroke-width="5"/>
		<path d="M-40 -262 v72 M40 -262 v72" stroke="#c43c2c" stroke-width="9"/>
	</g>`;

	// 洗濯のたらい
	const TARAI = `<g transform="translate(0 -70)">
		<path d="M-82 -22 L-66 30 L66 30 L82 -22 Z" fill="#c8955a" ${L}/>
		<ellipse cx="0" cy="-22" rx="82" ry="16" fill="#a8743f" ${L4}/>
		<path d="M-74 4 h148" stroke="#7a5230" stroke-width="5"/>
	</g>`;

	// 包丁。刃を左上へ向けて持つ
	const HOUCHOU = `<g transform="translate(-66 -100) rotate(25)">
		<path d="M-6 -14 L-120 -14 Q-132 0 -118 14 L-6 14 Z" fill="#e3e9ec" ${L4}/>
		<rect x="-8" y="-9" width="50" height="18" rx="5" fill="#7a5230" ${L4}/>
	</g>`;

	// 桃は中心を原点に、幅約 130 で描く。割れる場面のため左右の半分に分ける
	const PEACH_L = `<path d="M0 -50 C-20 -72 -66 -60 -64 -10 C-62 40 -25 72 0 78 Z" fill="#f7a8b4" ${L3}/>`;
	const PEACH_R = `<path d="M0 -50 C20 -72 66 -60 64 -10 C62 40 25 72 0 78 Z" fill="#f7a8b4" ${L3}/>
		<ellipse cx="30" cy="-18" rx="13" ry="22" fill="#fff" opacity="0.45"/>`;
	const LEAF = `<path d="M-6 -58 C-20 -90 -62 -92 -74 -70 C-50 -58 -26 -54 -6 -58 Z" fill="#6aae4f" ${L3}/>
		<path d="M4 -58 C18 -84 54 -88 64 -70 C44 -58 22 -54 4 -58 Z" fill="#7cc060" ${L3}/>
		<path d="M0 -50 C0 -60 -2 -70 -6 -78" fill="none" stroke="#6b4a24" stroke-width="5" stroke-linecap="round"/>`;
	const PEACH = PEACH_L + PEACH_R + LEAF;

	// 赤ちゃん。桃の中に収まる大きさで、中心を原点に描く
	const BABY = `<g>
		<path d="M-16 24 L-36 -4 M16 24 L36 -4" stroke="${O}" stroke-width="15" stroke-linecap="round"/>
		<path d="M-16 24 L-36 -4 M16 24 L36 -4" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>
		<ellipse cx="0" cy="40" rx="24" ry="24" fill="${SKIN}" ${L3}/>
		<path d="M-18 22 L18 22 L14 58 Q0 66 -14 58 Z" fill="#d9483b" ${L3}/>
		<circle cx="0" cy="-6" r="22" fill="${SKIN}" ${L3}/>
		<path d="M-4 -28 q4 -10 10 -4" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
		<path d="M-11 -8 q4 -4 8 0 M3 -8 q4 -4 8 0" fill="none" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>
		<circle cx="-13" cy="1" r="4" fill="#f2a7a0"/>
		<circle cx="13" cy="1" r="4" fill="#f2a7a0"/>
		<path d="M-6 4 q6 8 12 0 Z" fill="#c0392b" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
	</g>`;

	const STAR = `<path d="M0 -22 L6 -6 L22 0 L6 6 L0 22 L-6 6 L-22 0 L-6 -6 Z" fill="#ffe066" stroke="#d99a1a" stroke-width="3" stroke-linejoin="round"/>`;
	const HEART = `<path d="M0 14 C-34 -8 -24 -36 0 -22 C24 -36 34 -8 0 14 Z" fill="#f28aa0" ${L3}/>`;
	const BIRD = `<path d="M-22 0 q11 -14 22 0 q11 -14 22 0" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>`;

	// begin の時点から (x, y) で星が瞬く
	function sparkle(x, y, begin) {
		return `<g transform="translate(${x} ${y})" opacity="0">${blink(begin)}${STAR}</g>`;
	}

	function house() {
		return `<rect x="-200" y="-200" width="400" height="200" fill="#ecdcb4" ${L}/>
		<path d="M-200 -140 h400 M-110 -200 v200 M110 -200 v200" stroke="#7a5534" stroke-width="8"/>
		<rect x="-55" y="-150" width="110" height="150" fill="#6b4a2c" ${L}/>
		<rect x="130" y="-175" width="56" height="48" fill="#f6efd8" ${L4}/>
		<path d="M158 -175 v48 M130 -151 h56" stroke="${O}" stroke-width="3"/>
		<path d="M-255 -185 L-120 -330 L120 -330 L255 -185 Z" fill="#c9a24a" ${L}/>
		<path d="M-180 -200 L-90 -320 M-100 -192 L-30 -322 M-20 -190 L30 -322 M60 -190 L90 -322 M140 -195 L150 -320" stroke="#a8842e" stroke-width="4"/>
		<path d="M-135 -330 L135 -330 L112 -356 L-112 -356 Z" fill="#8a6a2a" ${L4}/>`;
	}

	function tree() {
		return `<rect x="-16" y="-150" width="32" height="150" fill="#8a5a30" ${L4}/>
		<circle cx="0" cy="-200" r="80" fill="#5e9e4c" ${L}/>
		<circle cx="-55" cy="-150" r="50" fill="#6aae56" ${L}/>
		<circle cx="55" cy="-150" r="50" fill="#6aae56" ${L}/>`;
	}

	function cloud(x, y, drift) {
		return `<g transform="translate(${x} ${y})"><g>${loop('translate', `0 0;${drift} 0;0 0`, '24s')}
			<ellipse cx="0" cy="0" rx="90" ry="40" fill="#fff"/>
			<ellipse cx="-70" cy="14" rx="60" ry="30" fill="#fff"/>
			<ellipse cx="70" cy="14" rx="60" ry="30" fill="#fff"/>
		</g></g>`;
	}

	function sun(x, y) {
		return `<g transform="translate(${x} ${y})">
			<g>${loop('rotate', '0;360', '30s')}
				<path d="M0 -110 V-86 M0 110 V86 M-110 0 H-86 M110 0 H86 M-78 -78 L-61 -61 M78 78 L61 61 M-78 78 L-61 61 M78 -78 L61 -61" stroke="#f0b030" stroke-width="10" stroke-linecap="round"/>
			</g>
			<circle r="70" fill="#ffd75a" stroke="#f0b030" stroke-width="6"/>
		</g>`;
	}

	// 川の波。160 ごとに並べ、同じ幅だけ流して繋ぎ目を見せない
	function waves(y, dur) {
		let d = '';
		for (let x = -160; x < 1760; x += 160) d += `M${x} 0 q20 -12 40 0 q20 12 40 0 `;
		return `<g transform="translate(0 ${y})"><g>${loop('translate', '0 0;160 0', dur)}
			<path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
		</g></g>`;
	}

	// ---- 表紙と場面 ----

	function cover() {
		return svg(`
		<rect width="1600" height="900" fill="#fdeef0"/>
		<circle cx="800" cy="500" r="300" fill="#fff8dc"/>
		<rect x="-10" y="700" width="1620" height="210" fill="#9fd3ef" ${L}/>
		${waves(760, '3s')}
		${waves(830, '2.4s')}
		${place(800, 560, 2.6, PEACH, loop('translate', '0 0;0 -8;0 0', '2s'))}
		${text(800, 220, 160, '桃太郎')}
		`);
	}

	// 1. おじいさんとおばあさんが住んでいる
	function scene1() {
		return svg(`
		<rect width="1600" height="900" fill="#cfeaf7"/>
		${sun(1420, 150)}
		${cloud(300, 130, 80)}
		${cloud(950, 90, -60)}
		<path d="M-40 640 L330 250 L700 640 Z" fill="#93c47d" ${L}/>
		<path d="M480 640 L860 300 L1240 640 Z" fill="#7cb86a" ${L}/>
		<rect x="-10" y="620" width="1620" height="290" fill="#b5dc8f" ${L}/>
		<g transform="translate(560 720)">${house()}</g>
		<g transform="translate(1410 720)">${tree()}</g>
		${place(930, 820, 0.95, grandpa(), loop('translate', '0 0;0 -6;0 0', '2.4s'))}
		${place(1130, 820, 0.95, grandma(), loop('translate', '0 0;0 -6;0 0', '2.4s', '1.2s'))}
		`);
	}

	// 2. おじいさんは山へ、おばあさんは川へ
	function scene2() {
		return svg(`
		<rect width="1600" height="900" fill="#cfeaf7"/>
		${cloud(1150, 120, 70)}
		<g>${loop('translate', '-100 170;1750 110', '14s')}${BIRD}<g transform="translate(60 26)">${BIRD}</g></g>
		<path d="M-60 640 L380 170 L820 640 Z" fill="#7cb86a" ${L}/>
		<path d="M300 330 l-28 56 h56 Z M440 400 l-28 56 h56 Z M250 480 l-28 56 h56 Z M520 520 l-28 56 h56 Z" fill="#4e8a3e" ${L4}/>
		<path d="M1100 625 Q1330 470 1610 540 L1610 625 Z" fill="#9fcf86" ${L}/>
		<rect x="-10" y="620" width="1620" height="290" fill="#b5dc8f" ${L}/>
		<path d="M1300 622 C1270 700 1400 770 1310 910 L1540 910 C1600 770 1360 700 1350 622 Z" fill="#8cc8ea" ${L}/>
		<path d="M1318 690 q8 -5 16 0 M1360 770 q12 -7 24 0 q12 7 24 0 M1380 860 q15 -8 30 0 q15 8 30 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
		<path d="M1236 830 l-10 -44 M1250 834 l0 -50 M1264 830 l10 -44 M1560 760 l-8 -40 M1572 764 l0 -46" stroke="#4e8a3e" stroke-width="6" stroke-linecap="round"/>
		<ellipse cx="1290" cy="900" rx="34" ry="14" fill="#b9bec4" ${L4}/>
		<path d="M690 910 C690 780 600 690 400 640 L460 628 C680 670 780 780 800 910 Z" fill="#e9d3a0" ${L4}/>
		<path d="M800 910 C820 780 940 690 1120 645 L1150 662 C990 710 910 790 910 910 Z" fill="#e9d3a0" ${L4}/>
		<g transform="translate(800 700)">
			<rect x="-10" y="-170" width="20" height="170" fill="#8a5f38" ${L4}/>
			<path d="M-10 -160 L-120 -160 L-150 -135 L-120 -110 L-10 -110 Z" fill="#f3e2bc" ${L4}/>
			${text(-75, -122, 34, 'やま')}
			<path d="M10 -100 L120 -100 L150 -75 L120 -50 L10 -50 Z" fill="#f3e2bc" ${L4}/>
			${text(75, -62, 34, 'かわ')}
		</g>
		${walker(690, 840, 0.85, grandpa({ back: SHIBA }), -280, -120)}
		${walker(920, 840, 0.85, grandma({ front: TARAI }), 250, -110)}
		`);
	}

	// 3. 川上から大きな桃が流れてくる
	// 川は左奥（川上）で細く、右手前で広がる。桃も遠くでは小さく、近づくにつれて大きくなる
	function scene3() {
		const RIVER = 'M-10 380 C400 380 900 400 1610 430 L1610 690 C1000 650 400 470 -10 440 Z';
		return svg(`
		<defs><clipPath id="s3-river"><path d="${RIVER}"/></clipPath></defs>
		<rect width="1600" height="900" fill="#cfeaf7"/>
		${cloud(1200, 90, -60)}
		<path d="M-10 340 L120 220 L260 340 Z M150 340 L320 190 L490 340 Z" fill="#93c47d" ${L}/>
		<path d="M-10 340 Q400 300 800 330 Q1200 290 1610 320 L1610 910 L-10 910 Z" fill="#a7d483" ${L}/>
		<g transform="translate(640 392) scale(0.42)">${tree()}</g>
		<g transform="translate(860 398) scale(0.48)">${tree()}</g>
		<g transform="translate(1250 420) scale(0.55)">${tree()}</g>
		<path d="${RIVER}" fill="#7fc0e6" ${L}/>
		<g clip-path="url(#s3-river)">
			${waves(405, '4s')}
			${waves(460, '3.4s')}
			${waves(530, '3s')}
			${waves(610, '2.6s')}
		</g>
		<path d="${RIVER}" fill="none" ${L}/>
		<ellipse cx="260" cy="560" rx="60" ry="22" fill="#b9bec4" ${L4}/>
		<ellipse cx="620" cy="700" rx="70" ry="26" fill="#b9bec4" ${L4}/>
		<ellipse cx="900" cy="820" rx="50" ry="20" fill="#b9bec4" ${L4}/>
		<path d="M420 640 l-10 -44 M434 644 l0 -50 M448 640 l10 -44 M1080 790 l-10 -44 M1094 794 l0 -50 M1108 790 l10 -44" stroke="#4e8a3e" stroke-width="6" stroke-linecap="round"/>
		<g transform="translate(60 410)"><g>${once('translate', '0 0;970 115', '7s')}
			<g>${once('scale', '0.45;1.3', '7s')}
				<ellipse cx="0" cy="74" rx="80" ry="12" fill="#fff" opacity="0.6"/>
				<g>${loop('translate', '0 0;0 -10;0 0', '1.6s')}<g>${loop('rotate', '-6;6;-6', '1.6s')}${PEACH}</g></g>
				<g><animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite"/>${text(0, -112, 40, 'どんぶらこ')}</g>
			</g>
		</g></g>
		${place(1380, 890, 0.85, grandma({ front: TARAI }))}
		<g opacity="0">${appear('6.5s')}${text(1460, 570, 100, '！', '#c0392b')}</g>
		`);
	}

	// 4. 桃が割れて、男の赤ちゃんが生まれる
	function scene4() {
		const SPLIT = '2s';	// 桃が割れる時点
		return svg(`
		<rect width="1600" height="900" fill="#f1dfb8"/>
		<path d="M0 120 H1600" stroke="#7a5534" stroke-width="16"/>
		<rect x="140" y="-10" width="34" height="650" fill="#8a5f38" ${L4}/>
		<rect x="1426" y="-10" width="34" height="650" fill="#8a5f38" ${L4}/>
		<g transform="translate(1040 170)">
			<rect width="300" height="260" fill="#fbf7ea" ${L4}/>
			<path d="M75 0 v260 M150 0 v260 M225 0 v260 M0 87 h300 M0 173 h300" stroke="#8a5f38" stroke-width="5"/>
		</g>
		<rect x="-10" y="630" width="1620" height="290" fill="#d8dca0" ${L}/>
		<path d="M0 760 H1600 M400 630 V900 M1200 630 V900" stroke="#b5bb78" stroke-width="5"/>
		<path d="M560 800 L1040 800 L1080 840 L520 840 Z" fill="#c8955a" ${L}/>
		${place(330, 860, 1, grandma())}
		${place(1270, 860, 1, grandpa({ front: HOUCHOU }))}
		<g transform="translate(800 630) scale(2.2)">
			${BABY}
			<g>${once('translate', '0 0;-60 6', '0.35s', SPLIT)}<g>${once('rotate', '0;-22', '0.35s', SPLIT)}${PEACH_L}${LEAF}</g></g>
			<g>${once('translate', '0 0;60 6', '0.35s', SPLIT)}<g>${once('rotate', '0;22', '0.35s', SPLIT)}${PEACH_R}</g></g>
		</g>
		${sparkle(640, 500, '2.2s')}
		${sparkle(960, 500, '2.5s')}
		${sparkle(690, 400, '2.8s')}
		${sparkle(910, 400, '2.4s')}
		<g opacity="0">${appear(SPLIT)}${text(800, 370, 90, 'ぱかっ', '#c0392b')}</g>
		`);
	}

	// 5. 桃太郎と名づける
	function scene5() {
		let hearts = '';
		[[560, '0s'], [1060, '1s'], [460, '2s'], [1160, '3s']].forEach(([x, begin]) => {
			hearts += `<g transform="translate(${x} 700)"><g opacity="0">
				<animate attributeName="opacity" values="0;1;1;0" dur="4s" begin="${begin}" repeatCount="indefinite"/>
				${loop('translate', '0 0;0 -380', '4s', begin)}${HEART}
			</g></g>`;
		});
		return svg(`
		<rect width="1600" height="900" fill="#f6e4c4"/>
		<circle cx="800" cy="560" r="360" fill="#fff4cc"/>
		<rect x="-10" y="700" width="1620" height="210" fill="#d8dca0" ${L}/>
		${hearts}
		<g transform="translate(800 60)">
			<rect x="-230" y="0" width="460" height="230" fill="#fffdf5" ${L}/>
			<rect x="-250" y="-14" width="500" height="22" rx="8" fill="#8a5f38" ${L4}/>
			${text(0, 70, 44, '命名')}
			${text(0, 185, 110, '桃太郎')}
		</g>
		${place(650, 860, 1.05, grandma({ front: `<g transform="translate(0 -110) scale(1.6)">${BABY}</g>` }), loop('translate', '0 0;0 -6;0 0', '2.4s'))}
		${place(960, 860, 1.05, grandpa(), loop('translate', '0 0;0 -6;0 0', '2.4s', '1.2s'))}
		${sparkle(470, 360, '0.3s')}
		${sparkle(1130, 380, '0.9s')}
		${sparkle(1240, 560, '0.6s')}
		`);
	}

	// ---- 6 場面目から先の部品（p261004-03） ----

	// 腕。肩 (x1, y1) から手 (x2, y2) まで袖の色で太く描き、先に手を付ける
	function arm(x1, y1, x2, y2, color, skin = SKIN, w = 26) {
		return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${O}" stroke-width="${w + 8}" stroke-linecap="round"/>
		<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>
		<circle cx="${x2}" cy="${y2}" r="${w / 2 + 3}" fill="${skin}" ${L4}/>`;
	}

	// 左右を反転して置く（右向きに描いた動物を左へ向ける）
	function mirror(x, y, s, body, anim = '') {
		return `<g transform="translate(${x} ${y}) scale(${-s} ${s})"><g>${anim}${body}</g></g>`;
	}

	// きびだんごの袋
	const POUCH = `<g>
		<path d="M-26 -18 Q0 -34 26 -18 L32 26 Q0 42 -32 26 Z" fill="#c8955a" ${L4}/>
		<path d="M-22 -14 h44" stroke="#c0392b" stroke-width="6"/>
		<circle cx="0" cy="10" r="9" fill="#fffdf5" ${L3}/>
	</g>`;

	// 桃太郎（若者）。足元を原点に、高さ約 330 で描く
	// arms: 'down'（下ろす）・'up'（上げる）・'right' / 'left'（その向きへ手を出す）
	// hachimaki: はちまき / flag: 背中の「日本一」の旗 / dango: 出した手にきびだんご
	function momotaro({ arms = 'down', hachimaki = false, flag = false, dango = false } = {}) {
		const KIMONO = '#f4efe2';
		const HAORI = '#c0392b';
		let hands;
		if (arms === 'up') hands = arm(-50, -170, -62, -330, HAORI) + arm(50, -170, 62, -330, HAORI);
		else if (arms === 'right') hands = arm(-50, -170, -70, -95, HAORI) + arm(50, -170, 128, -150, HAORI);
		else if (arms === 'left') hands = arm(-50, -170, -128, -150, HAORI) + arm(50, -170, 70, -95, HAORI);
		else hands = arm(-50, -170, -70, -95, HAORI) + arm(50, -170, 70, -95, HAORI);
		const handX = arms === 'left' ? -128 : 128;
		const flagSvg = flag ? `<g>
			<path d="M-40 -140 L-40 -560" stroke="${O}" stroke-width="14" stroke-linecap="round"/>
			<path d="M-40 -140 L-40 -560" stroke="#7a5230" stroke-width="8" stroke-linecap="round"/>
			<rect x="-36" y="-556" width="66" height="200" fill="#fff" ${L4}/>
			${['日', '本', '一'].map((c, i) => `<text x="-3" y="${-510 + i * 62}" font-size="50" ${MINCHO} fill="${O}" text-anchor="middle">${c}</text>`).join('')}
		</g>` : '';
		const band = hachimaki ? `<path d="M-50 -258 Q0 -272 50 -258 L50 -246 Q0 -260 -50 -246 Z" fill="#fff" ${L3}/>
			<path d="M48 -252 l28 -14 M48 -250 l30 4" stroke="${O}" stroke-width="11" stroke-linecap="round"/>
			<path d="M48 -252 l28 -14 M48 -250 l30 4" stroke="#fff" stroke-width="6" stroke-linecap="round"/>` : '';
		return `${flagSvg}
		<path d="M-58 0 L-50 -170 Q0 -195 50 -170 L58 0 Z" fill="${KIMONO}" ${L}/>
		<path d="M-60 0 L-54 -92 L54 -92 L60 0 L8 0 L0 -50 L-8 0 Z" fill="#3a4f8a" ${L}/>
		<path d="M-52 -168 Q0 -192 52 -168 L56 -96 L20 -96 L0 -150 L-20 -96 L-56 -96 Z" fill="${HAORI}" ${L4}/>
		<g transform="translate(-32 -128) scale(0.17)">${PEACH}</g>
		<rect x="-56" y="-102" width="112" height="14" fill="#f2c94c" ${L4}/>
		<path d="M-18 -94 L-96 -40" stroke="${O}" stroke-width="15" stroke-linecap="round"/>
		<path d="M-18 -94 L-96 -40" stroke="#2c2c34" stroke-width="9" stroke-linecap="round"/>
		<path d="M-8 -100 L-30 -86" stroke="#c9a24a" stroke-width="12" stroke-linecap="round"/>
		<g transform="translate(46 -70) scale(0.6)">${POUCH}</g>
		${hands}
		${dango ? `<circle cx="${handX}" cy="-176" r="13" fill="#fffdf5" ${L3}/>` : ''}
		<circle cx="0" cy="-232" r="50" fill="${SKIN}" ${L}/>
		<path d="M-50 -236 Q-52 -290 0 -290 Q52 -290 50 -236 Q40 -262 0 -262 Q-40 -262 -50 -236 Z" fill="#1f1a17" ${L4}/>
		<path d="M-8 -288 Q0 -322 28 -314 Q14 -302 8 -288 Z" fill="#1f1a17" ${L4}/>
		${band}
		<path d="M-30 -240 l18 -4 M12 -244 l18 4" stroke="${O}" stroke-width="6" stroke-linecap="round"/>
		<circle cx="-20" cy="-226" r="5" fill="${O}"/>
		<circle cx="20" cy="-226" r="5" fill="${O}"/>
		<circle cx="-30" cy="-210" r="7" fill="#f2a7a0"/>
		<circle cx="30" cy="-210" r="7" fill="#f2a7a0"/>
		<path d="M-12 -204 q12 10 24 0" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`;
	}

	// 村人。足元を原点に描く。up: 両手を上げて喜ぶ / worry: 困った顔 / point: 右手で右を指す
	function villager({ color = '#5b7fa6', hair = '#1f1a17', up = false, worry = false, point = false } = {}) {
		let hands = arm(-46, -150, -62, -90, color) + arm(46, -150, 62, -90, color);
		if (up) hands = arm(-46, -150, -72, -250, color) + arm(46, -150, 72, -250, color);
		else if (point) hands = arm(-46, -150, -62, -90, color) + arm(46, -150, 130, -190, color);
		const brows = worry ? `<path d="M-30 -232 l16 -6 M14 -238 l16 6" stroke="${O}" stroke-width="5" stroke-linecap="round"/>` : '';
		const mouth = worry
			? `<path d="M-10 -186 q10 -8 20 0" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`
			: up
				? `<path d="M-12 -194 q12 16 24 0 Z" fill="#c0392b" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`
				: `<path d="M-10 -192 q10 6 20 0" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`;
		return `<path d="M-60 0 L-50 -160 Q0 -184 50 -160 L60 0 Z" fill="${color}" ${L}/>
		<path d="M-24 -170 L0 -120 L24 -170" fill="none" stroke="#f3ead6" stroke-width="10" stroke-linejoin="round"/>
		<rect x="-56" y="-96" width="112" height="16" fill="#e8d8b0" ${L4}/>
		${hands}
		<circle cx="0" cy="-214" r="48" fill="${SKIN}" ${L}/>
		<path d="M-48 -218 Q-50 -268 0 -268 Q50 -268 48 -218 Q36 -244 0 -242 Q-36 -244 -48 -218 Z" fill="${hair}" ${L4}/>
		${brows}
		<circle cx="-18" cy="-212" r="5" fill="${O}"/>
		<circle cx="18" cy="-212" r="5" fill="${O}"/>
		${mouth}`;
	}

	// 犬。右を向き、足元を原点に描く。尾を振る
	function dog() {
		const FUR = '#e3a24f';
		const CREAM = '#fbe8c8';
		return `<g transform="translate(-66 -84)"><g>${loop('rotate', '-15;20;-15', '0.4s')}
			<path d="M0 0 C-26 -6 -36 -40 -10 -48" fill="none" stroke="${O}" stroke-width="22" stroke-linecap="round"/>
			<path d="M0 0 C-26 -6 -36 -40 -10 -48" fill="none" stroke="${FUR}" stroke-width="14" stroke-linecap="round"/>
		</g></g>
		<rect x="-58" y="-48" width="22" height="48" rx="8" fill="${FUR}" ${L4}/>
		<rect x="-30" y="-48" width="22" height="48" rx="8" fill="${FUR}" ${L4}/>
		<rect x="20" y="-48" width="22" height="48" rx="8" fill="${FUR}" ${L4}/>
		<rect x="46" y="-48" width="22" height="48" rx="8" fill="${FUR}" ${L4}/>
		<ellipse cx="0" cy="-70" rx="74" ry="38" fill="${FUR}" ${L}/>
		<ellipse cx="10" cy="-56" rx="44" ry="16" fill="${CREAM}"/>
		<path d="M52 -146 L60 -186 L80 -150 Z M88 -152 L106 -184 L112 -144 Z" fill="${FUR}" ${L4}/>
		<circle cx="80" cy="-116" r="42" fill="${FUR}" ${L}/>
		<ellipse cx="108" cy="-100" rx="24" ry="17" fill="${CREAM}" ${L4}/>
		<circle cx="128" cy="-106" r="7" fill="${O}"/>
		<circle cx="86" cy="-126" r="6" fill="${O}"/>
		<path d="M104 -88 q8 8 18 0" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
		<path d="M46 -86 Q68 -72 94 -80" fill="none" stroke="#c0392b" stroke-width="9" stroke-linecap="round"/>`;
	}

	// 猿。正面を向き、足元を原点に描く。reach: 右手を上げる
	function monkey({ reach = false } = {}) {
		const FUR = '#8b5a2b';
		const FACE = '#f2c4a8';
		return `<path d="M30 -30 C90 -20 100 -90 70 -110" fill="none" stroke="${O}" stroke-width="16" stroke-linecap="round"/>
		<path d="M30 -30 C90 -20 100 -90 70 -110" fill="none" stroke="${FUR}" stroke-width="9" stroke-linecap="round"/>
		<ellipse cx="-22" cy="-12" rx="22" ry="14" fill="${FUR}" ${L4}/>
		<ellipse cx="22" cy="-12" rx="22" ry="14" fill="${FUR}" ${L4}/>
		<ellipse cx="0" cy="-62" rx="44" ry="52" fill="${FUR}" ${L}/>
		<ellipse cx="0" cy="-56" rx="26" ry="32" fill="${FACE}"/>
		${arm(-36, -90, -54, -40, FUR, FACE, 16)}
		${reach ? arm(36, -90, 62, -160, FUR, FACE, 16) : arm(36, -90, 54, -40, FUR, FACE, 16)}
		<circle cx="-42" cy="-146" r="15" fill="${FACE}" ${L4}/>
		<circle cx="42" cy="-146" r="15" fill="${FACE}" ${L4}/>
		<circle cx="0" cy="-146" r="42" fill="${FUR}" ${L}/>
		<path d="M0 -112 C-36 -110 -36 -156 -16 -164 Q-2 -164 0 -150 Q2 -164 16 -164 C36 -156 36 -110 0 -112 Z" fill="${FACE}" ${L3}/>
		<circle cx="-12" cy="-146" r="5" fill="${O}"/>
		<circle cx="12" cy="-146" r="5" fill="${O}"/>
		<path d="M-10 -128 q10 8 20 0" fill="none" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/>`;
	}

	// きじ。右を向き、体の中心を原点に描く。fly: 羽ばたく（止まるときは足が原点の 52 下に来る）
	function kiji({ fly = false } = {}) {
		const wing = fly
			? `<g transform="translate(-6 -16)"><g>${loop('rotate', '-25;25;-25', '0.45s')}<path d="M0 0 C-30 -80 40 -100 46 -18 Z" fill="#3a8f7a" ${L4}/></g></g>`
			: `<path d="M-30 -10 C-10 -36 30 -30 36 0 C10 10 -20 8 -30 -10 Z" fill="#3a8f7a" ${L4}/>`;
		return `<path d="M-48 -2 L-178 -30 L-172 -14 L-48 12 Z" fill="#a0703a" ${L4}/>
		<path d="M-70 -4 l-8 14 M-100 -10 l-8 14 M-130 -16 l-8 14 M-158 -22 l-6 12" stroke="#6b4a24" stroke-width="4"/>
		${fly ? '' : `<path d="M-6 30 v22 M10 30 v22" stroke="#c88a2a" stroke-width="6" stroke-linecap="round"/>`}
		<ellipse cx="0" cy="0" rx="56" ry="32" fill="#2e7d6b" ${L}/>
		${fly ? '' : wing}
		<path d="M30 -16 Q44 -40 54 -46" stroke="${O}" stroke-width="26" stroke-linecap="round"/>
		<path d="M30 -16 Q44 -40 54 -46" stroke="#2b4c8c" stroke-width="18" stroke-linecap="round"/>
		<circle cx="60" cy="-50" r="22" fill="#2b4c8c" ${L4}/>
		<ellipse cx="66" cy="-50" rx="10" ry="12" fill="#d63031"/>
		<path d="M80 -54 L98 -48 L80 -42 Z" fill="#f2c94c" ${L3}/>
		<circle cx="68" cy="-56" r="4" fill="${O}"/>
		${fly ? wing : ''}`;
	}

	// 鬼。足元を原点に、高さ約 450 で描く（8-B: 迫力のある鬼。12-A: 血やけがは描かない）
	// mood: 'angry'（怒る）・'sorry'（あやまる） / club: こん棒を振り上げる / kneel: ひざをついて座る / boss: 大将（角が 3 本）
	function oni({ color = '#d64541', mood = 'angry', club = true, kneel = false, boss = false } = {}) {
		const HORN = '#f3e6c4';
		const angry = mood === 'angry';
		const legs = kneel
			? `<ellipse cx="0" cy="-26" rx="104" ry="28" fill="${color}" ${L}/>`
			: `<rect x="-60" y="-100" width="44" height="100" rx="10" fill="${color}" ${L}/>
				<rect x="16" y="-100" width="44" height="100" rx="10" fill="${color}" ${L}/>`;
		let hands;
		if (!angry) hands = arm(-80, -235, -16, -175, color, color) + arm(80, -235, 16, -175, color, color);
		else if (club) hands = arm(-80, -235, -116, -140, color, color);
		else hands = arm(-80, -235, -116, -140, color, color) + arm(80, -235, 116, -140, color, color);
		// こん棒は手の位置を中心に振る。手は棒の上に描く
		const clubSvg = angry && club ? `<g transform="translate(132 -330)"><g>${loop('rotate', '12;-12;12', '1.2s')}
			<rect x="-20" y="-196" width="40" height="206" rx="14" fill="#5b5b66" ${L}/>
			${[-176, -136, -96, -56].map((y) => `<circle cx="-20" cy="${y}" r="7" fill="#b4b8be" ${L3}/><circle cx="20" cy="${y + 20}" r="7" fill="#b4b8be" ${L3}/>`).join('')}
			<circle cx="0" cy="0" r="18" fill="${color}" ${L4}/>
		</g></g>${arm(80, -235, 132, -330, color, color)}` : '';
		const face = angry
			? `<path d="M-50 -352 L-14 -336 M50 -352 L14 -336" stroke="${O}" stroke-width="12" stroke-linecap="round"/>
				<circle cx="-28" cy="-322" r="13" fill="#fff" ${L3}/>
				<circle cx="28" cy="-322" r="13" fill="#fff" ${L3}/>
				<circle cx="-24" cy="-320" r="6" fill="${O}"/>
				<circle cx="24" cy="-320" r="6" fill="${O}"/>
				<path d="M-40 -284 Q0 -272 40 -284 Q0 -246 -40 -284 Z" fill="#7a1f1f" ${L3}/>
				<path d="M-28 -282 l8 18 l8 -18 Z M12 -282 l8 18 l8 -18 Z" fill="#fff" ${L3}/>`
			: `<path d="M-50 -334 L-14 -350 M50 -334 L14 -350" stroke="${O}" stroke-width="10" stroke-linecap="round"/>
				<path d="M-42 -322 q13 9 26 0 M16 -322 q13 9 26 0" fill="none" stroke="${O}" stroke-width="6" stroke-linecap="round"/>
				<path d="M-20 -280 q7 -6 13 0 q7 6 14 0 q7 -6 13 0" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>
				<path d="M74 -390 q-12 20 0 26 q12 -6 0 -26 Z M90 -350 q-10 16 0 21 q10 -5 0 -21 Z" fill="#8fd3f4" ${L3}/>`;
		const horns = `<path d="M-34 -380 L-46 -446 L-12 -388 Z M34 -380 L46 -446 L12 -388 Z" fill="${HORN}" ${L4}/>`
			+ (boss ? `<path d="M-12 -398 L0 -476 L12 -398 Z" fill="#f2c94c" ${L4}/>` : '');
		const upper = `
			<path d="M-82 -95 L-88 -255 Q0 -300 88 -255 L82 -95 Z" fill="${color}" ${L}/>
			<path d="M-40 -232 q20 14 40 0 q20 14 40 0 M-30 -192 h60" fill="none" stroke="${O}" stroke-width="3" opacity="0.45"/>
			<path d="M-86 -150 L86 -150 L90 -86 L34 -66 L0 -92 L-34 -66 L-90 -86 Z" fill="#f2c230" ${L}/>
			<path d="M-62 -146 l10 34 M-22 -149 l8 36 M24 -149 l-6 38 M62 -146 l-10 34" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
			${hands}
			${clubSvg}
			<path d="M-62 -335 L-86 -352 L-64 -310 Z M62 -335 L86 -352 L64 -310 Z" fill="${color}" ${L4}/>
			${horns}
			<circle cx="0" cy="-330" r="64" fill="${color}" ${L}/>
			<path d="M-64 -340 Q-72 -402 0 -404 Q72 -402 64 -340 Q52 -372 32 -362 Q16 -386 0 -370 Q-16 -386 -32 -362 Q-52 -372 -64 -340 Z" fill="#1f1a17" ${L4}/>
			<ellipse cx="0" cy="-302" rx="11" ry="7" fill="${O}" opacity="0.35"/>
			${face}`;
		return `${legs}<g transform="translate(0 ${kneel ? 70 : 0})">${upper}</g>`;
	}

	// 船。右へ進む向きで、水面の中央を原点に描く
	function boatHull() {
		return `<path d="M-260 -60 L260 -60 L320 -120 L300 -60 L210 30 L-200 30 L-280 -60 Z" fill="#a0703a" ${L}/>
		<path d="M-250 -36 H250" stroke="#7a5230" stroke-width="6"/>`;
	}

	// 鬼ヶ島。下端の中央を原点に描く
	function island() {
		return `<path d="M-260 0 L-200 -120 L-150 -90 L-90 -230 L-30 -150 L20 -260 L80 -140 L140 -190 L200 -80 L260 0 Z" fill="#6d6875" ${L}/>
		<path d="M-150 -40 l40 -20 M60 -60 l50 10 M-60 -110 l30 -10" stroke="#4e4a56" stroke-width="5" stroke-linecap="round"/>
		<path d="M-44 0 Q0 -96 44 0 Z" fill="#2d2a32" ${L4}/>
		<path d="M20 -260 L20 -350" stroke="#5b3b1e" stroke-width="8"/>
		<path d="M20 -350 L100 -326 L20 -302 Z" fill="#c0392b" ${L4}/>
		${text(52, -316, 30, '鬼', '#fff')}`;
	}

	// 宝物の山。下端の中央を原点に描く
	const TREASURE = `<g>
		<path d="M-170 0 Q-130 -96 0 -116 Q130 -96 170 0 Z" fill="#f2c94c" ${L}/>
		<ellipse cx="-70" cy="-58" rx="18" ry="9" fill="#f9e076" ${L3}/>
		<ellipse cx="30" cy="-82" rx="18" ry="9" fill="#f9e076" ${L3}/>
		<ellipse cx="96" cy="-34" rx="18" ry="9" fill="#f9e076" ${L3}/>
		<rect x="-130" y="-160" width="110" height="80" fill="#8a5a30" ${L}/>
		<path d="M-130 -138 h110 M-130 -104 h110" stroke="#f2c94c" stroke-width="8"/>
		<g transform="translate(64 -126) rotate(-20)">
			<rect x="-10" y="-14" width="20" height="90" fill="#c0392b" ${L4}/>
			<rect x="-46" y="-52" width="92" height="42" rx="12" fill="#d4a017" ${L4}/>
		</g>
		<path d="M128 -20 l-10 -64 M124 -54 l22 -28 M118 -70 l-24 -22" stroke="${O}" stroke-width="16" stroke-linecap="round"/>
		<path d="M128 -20 l-10 -64 M124 -54 l22 -28 M118 -70 l-24 -22" stroke="#e74c3c" stroke-width="9" stroke-linecap="round"/>
		<circle cx="-40" cy="-30" r="15" fill="#5dade2" ${L3}/>
		<circle cx="10" cy="-44" r="12" fill="#e84393" ${L3}/>
		<circle cx="-110" cy="-22" r="12" fill="#55efc4" ${L3}/>
	</g>`;

	// 宝物を積んだ車。左へ進む向きで、足元の中央を原点に描く。車輪は turns 回まわる
	function cart(turns) {
		const wheel = (x) => `<g transform="translate(${x} -44)"><g>
			<animateTransform attributeName="transform" type="rotate" values="0;-360" dur="2s" repeatCount="${turns}"/>
			<circle r="44" fill="#c8955a" ${L}/>
			<path d="M-44 0 H44 M0 -44 V44 M-31 -31 L31 31 M-31 31 L31 -31" stroke="#7a5230" stroke-width="5"/>
		</g></g>`;
		return `<path d="M-170 -98 L-300 -80" stroke="${O}" stroke-width="16" stroke-linecap="round"/>
		<path d="M-170 -98 L-300 -80" stroke="#a0703a" stroke-width="9" stroke-linecap="round"/>
		<g transform="translate(0 -110) scale(0.8)">${TREASURE}</g>
		<rect x="-170" y="-110" width="340" height="24" fill="#a0703a" ${L}/>
		${wheel(-100)}
		${wheel(100)}`;
	}

	// 村の背景（空・山・野原）
	function village() {
		return `<rect width="1600" height="900" fill="#cfeaf7"/>
		${sun(1420, 150)}
		${cloud(300, 130, 80)}
		<path d="M-40 640 L330 250 L700 640 Z" fill="#93c47d" ${L}/>
		<path d="M480 640 L860 300 L1240 640 Z" fill="#7cb86a" ${L}/>
		<rect x="-10" y="620" width="1620" height="290" fill="#b5dc8f" ${L}/>`;
	}

	// 道の背景（空・遠くの丘・野原と道）
	function road() {
		return `<rect width="1600" height="900" fill="#cfeaf7"/>
		${cloud(1150, 120, -70)}
		<path d="M-10 640 Q300 520 620 600 Q980 500 1610 600 L1610 660 L-10 660 Z" fill="#9fcf86" ${L}/>
		<rect x="-10" y="640" width="1620" height="270" fill="#b5dc8f" ${L}/>
		<path d="M-10 760 Q800 730 1610 770 L1610 860 Q800 820 -10 870 Z" fill="#e9d3a0" ${L4}/>`;
	}

	// 鬼ヶ島の上の背景（岩の地面と、鬼の砦の門）
	function onigashima() {
		return `<rect width="1600" height="900" fill="#efe2d6"/>
		<path d="M-10 640 L120 420 L260 560 L420 360 L600 600 L1000 600 L1180 380 L1340 540 L1480 400 L1610 560 L1610 660 L-10 660 Z" fill="#8d8696" ${L}/>
		<rect x="560" y="300" width="40" height="340" fill="#7a2a2a" ${L4}/>
		<rect x="1000" y="300" width="40" height="340" fill="#7a2a2a" ${L4}/>
		<rect x="520" y="270" width="560" height="44" fill="#9b3030" ${L4}/>
		<rect x="-10" y="640" width="1620" height="270" fill="#b8ad9c" ${L}/>
		<ellipse cx="160" cy="760" rx="70" ry="26" fill="#9a9086" ${L4}/>
		<ellipse cx="1500" cy="800" rx="60" ry="22" fill="#9a9086" ${L4}/>`;
	}

	// 6. 桃太郎はすくすく育ち、力持ちになる
	function scene6() {
		const rock = `<g transform="translate(0 -360)">
			<path d="M-150 30 Q-170 -60 -60 -90 Q40 -120 130 -60 Q180 0 140 40 Q0 70 -150 30 Z" fill="#9aa0a6" ${L}/>
			<path d="M-60 -40 q30 -10 50 10 M40 -60 q20 10 30 40" fill="none" stroke="#6d7278" stroke-width="5"/>
		</g>`;
		return svg(`
		${village()}
		<g transform="translate(250 720) scale(0.7)">${house()}</g>
		${place(480, 840, 0.75, grandpa())}
		${place(600, 840, 0.75, grandma())}
		${place(850, 860, 1, rock + momotaro({ arms: 'up' }), loop('translate', '0 0;0 -16;0 0', '1.4s'))}
		${place(1210, 860, 0.6, villager({ color: '#e07a5f', up: true }))}
		${place(1340, 860, 0.55, villager({ color: '#5b7fa6', up: true }))}
		<g><animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite"/>${text(1275, 610, 64, 'すごい！', '#c0392b')}</g>
		`);
	}

	// 7. 鬼ヶ島の鬼が村を荒らしていると聞く
	function scene7() {
		return svg(`
		<rect width="1600" height="900" fill="#dcd6ea"/>
		<rect x="-10" y="430" width="1620" height="490" fill="#6fa8d6" ${L}/>
		${waves(480, '3.4s')}
		${waves(560, '3s')}
		<g transform="translate(1260 540)">${island()}</g>
		${place(1190, 420, 0.2, oni({ color: '#d64541' }))}
		${place(1330, 440, 0.18, oni({ color: '#3b6fc4' }))}
		<ellipse cx="1180" cy="110" rx="160" ry="54" fill="#8e8aa0" ${L4}/>
		<ellipse cx="1340" cy="90" rx="130" ry="48" fill="#8e8aa0" ${L4}/>
		<g opacity="0">${blink('0.5s', '1.6s')}<path d="M1060 140 L1010 250 L1050 250 L1015 360 L1110 210 L1065 210 L1100 140 Z" fill="#ffe066" stroke="#d99a1a" stroke-width="4" stroke-linejoin="round"/></g>
		<path d="M-10 690 Q300 660 700 700 Q760 760 800 910 L-10 910 Z" fill="#b5dc8f" ${L}/>
		<path d="M60 760 v-90 M130 750 v-90 M200 745 v-60 M50 700 h160" stroke="#8a5f38" stroke-width="10" stroke-linecap="round"/>
		<path d="M230 760 l70 -40" stroke="#8a5f38" stroke-width="10" stroke-linecap="round"/>
		${place(380, 870, 0.95, momotaro())}
		${place(600, 870, 0.9, villager({ color: '#7d6b9e', worry: true, point: true }))}
		${text(640, 540, 54, 'たいへんだ！', '#c0392b')}
		`);
	}

	// 8. 鬼退治に出かける。おばあさんがきびだんごを持たせる
	function scene8() {
		return svg(`
		${village()}
		<g transform="translate(330 720) scale(0.85)">${house()}</g>
		${place(1340, 850, 0.95, grandpa())}
		${place(760, 850, 0.95, grandma({ front: `<g transform="translate(96 -112)">${POUCH}</g>` }))}
		${place(1060, 850, 1, momotaro({ arms: 'left', hachimaki: true, flag: true }))}
		`);
	}

	// 9. 犬が家来になる
	function scene9() {
		return svg(`
		${road()}
		${place(560, 850, 1, momotaro({ arms: 'right', hachimaki: true, flag: true, dango: true }))}
		${mirror(940, 850, 1.1, dog())}
		<g opacity="0">${appear('1.2s')}${text(1000, 620, 64, 'ワン！', '#c0392b')}</g>
		`);
	}

	// 10. 猿が木から下りてきて、家来になる
	function scene10() {
		return svg(`
		${road()}
		<g transform="translate(1180 760) scale(1.7)">${tree()}</g>
		${place(320, 850, 0.85, dog())}
		${place(600, 850, 1, momotaro({ arms: 'right', hachimaki: true, flag: true, dango: true }))}
		<g transform="translate(1120 470)"><g>${once('translate', '0 0;-150 380', '1.5s')}
			<g transform="scale(0.95)">${monkey({ reach: true })}</g>
		</g></g>
		<g opacity="0">${appear('1.6s')}${text(1040, 560, 64, 'キキッ', '#c0392b')}</g>
		`);
	}

	// 11. きじが舞い下りて、家来になる
	function scene11() {
		return svg(`
		${road()}
		${place(300, 850, 0.85, dog())}
		${place(560, 850, 1, momotaro({ arms: 'right', hachimaki: true, flag: true, dango: true }))}
		${place(800, 850, 0.8, monkey({ reach: true }))}
		<g transform="translate(1520 110)"><g>${once('translate', '0 0;-450 420', '2.5s')}
			<g transform="scale(-1.2 1.2)">${kiji({ fly: true })}</g>
		</g></g>
		<g opacity="0">${appear('2.6s')}${text(1080, 420, 64, 'ケーン', '#c0392b')}</g>
		`);
	}

	// 12. 船に乗って鬼ヶ島へ
	function scene12() {
		const crew = `${place(-200, -50, 0.7, dog())}
			${place(-40, -50, 0.8, momotaro({ hachimaki: true, flag: true }))}
			${place(130, -50, 0.7, monkey())}
			${place(255, -150, 0.6, kiji())}`;
		return svg(`
		<rect width="1600" height="900" fill="#cfeaf7"/>
		${cloud(300, 120, 60)}
		<g>${loop('translate', '-100 200;1750 150', '16s')}${BIRD}</g>
		<rect x="-10" y="480" width="1620" height="430" fill="#6fa8d6" ${L}/>
		<g transform="translate(1400 540) scale(0.55)">${island()}</g>
		${waves(540, '3.4s')}
		<g transform="translate(700 690)"><g>${loop('rotate', '-3;3;-3', '3s')}<g>${loop('translate', '0 0;0 -10;0 0', '1.5s')}
			${crew}
			${boatHull()}
		</g></g></g>
		${waves(760, '2.6s')}
		${waves(850, '2.2s')}
		`);
	}

	// 13. 鬼ヶ島で戦い、鬼の大将をやっつける
	function scene13() {
		const HIT = '2.2s';	// 桃太郎が大将にぶつかる時点
		return svg(`
		${onigashima()}
		${place(450, 860, 0.85, oni({ color: '#3b6fc4' }))}
		${place(450, 520, 0.55, monkey({ reach: true }), loop('translate', '-8 0;8 0;-8 0', '0.3s'))}
		<g>${blink('0s', '0.6s')}<path d="M540 520 l40 -30 M548 548 l44 -30 M556 576 l40 -30" stroke="${O}" stroke-width="6" stroke-linecap="round"/></g>
		${place(250, 860, 0.8, dog(), loop('translate', '0 0;10 -6;0 0', '0.35s'))}
		<g>${blink('0s', '0.8s')}${text(300, 640, 52, 'ガブッ', '#c0392b')}</g>
		<g transform="translate(1180 870)"><g>${once('translate', '0 0;80 0', '0.4s', HIT)}<g>${once('rotate', '0;14', '0.4s', HIT)}
			${place(0, 0, 1, oni({ boss: true }))}
		</g></g></g>
		<g transform="translate(990 330)"><g>${loop('translate', '0 0;24 12;0 0', '0.45s')}${kiji({ fly: true })}</g></g>
		<g transform="translate(800 870)"><g>${once('translate', '0 0;90 -140;170 -40', '0.8s', '1.4s')}
			${place(0, 0, 1, momotaro({ arms: 'up', hachimaki: true }))}
		</g></g>
		<g opacity="0">${appear(HIT)}${text(1200, 230, 110, 'ドカーン', '#c0392b')}</g>
		${sparkle(1150, 330, '2.5s')}
		${sparkle(1300, 360, '2.8s')}
		<g opacity="0">${blink(HIT, '0.7s')}<ellipse cx="1100" cy="860" rx="90" ry="30" fill="#d8d0c4" ${L4}/><ellipse cx="1300" cy="870" rx="80" ry="26" fill="#d8d0c4" ${L4}/></g>
		`);
	}

	// 14. 鬼が降参して、宝物を差し出す
	function scene14() {
		return svg(`
		${onigashima()}
		${place(160, 870, 0.6, monkey())}
		${place(340, 870, 0.95, momotaro({ hachimaki: true, flag: true }))}
		${place(540, 870, 0.7, dog())}
		${place(770, 637, 0.6, kiji())}
		<g transform="translate(860 860) scale(1.2)">${TREASURE}</g>
		${sparkle(760, 640, '0.2s')}
		${sparkle(900, 600, '0.7s')}
		${sparkle(1000, 700, '0.4s')}
		${place(1250, 880, 0.85, oni({ boss: true, mood: 'sorry', kneel: true }))}
		${place(1470, 880, 0.65, oni({ color: '#3b6fc4', mood: 'sorry', kneel: true }))}
		<g opacity="0">${appear('1s')}${text(1340, 380, 60, 'まいりました')}</g>
		`);
	}

	// 15. 宝物を村へ持ち帰り、みんなで喜ぶ
	function scene15() {
		const party = `${cart(3)}
			${place(-60, -170, 0.5, monkey({ reach: true }))}
			${place(-340, 0, 0.85, momotaro({ arms: 'right', hachimaki: true, flag: true }))}
			${place(-180, 30, 0.7, dog())}
			<g transform="translate(60 -330)">${kiji({ fly: true })}</g>`;
		return svg(`
		${village()}
		<g transform="translate(170 720) scale(0.7)">${house()}</g>
		${place(380, 850, 0.9, grandpa(), loop('translate', '0 0;0 -14;0 0', '0.8s'))}
		${place(520, 850, 0.9, grandma(), loop('translate', '0 0;0 -14;0 0', '0.8s', '0.4s'))}
		${place(660, 850, 0.6, villager({ color: '#e07a5f', up: true }), loop('translate', '0 0;0 -14;0 0', '0.8s', '0.2s'))}
		<g transform="translate(1900 860)"><g>${once('translate', '0 0;-700 0', '6s')}${party}</g></g>
		<g opacity="0">${appear('6s')}${text(800, 210, 100, 'めでたし めでたし', '#c0392b')}</g>
		${sparkle(420, 520, '6.2s')}
		${sparkle(1180, 300, '6.5s')}
		${sparkle(600, 420, '6.8s')}
		`);
	}

	window.STORY = {
		title: '桃太郎',
		cover: cover(),
		scenes: [
			{ text: 'むかしむかし、ある所に、おじいさんとおばあさんが住んでいました。', svg: scene1() },
			{ text: 'おじいさんは山へしばかりに、おばあさんは川へせんたくに行きました。', svg: scene2() },
			{ text: 'おばあさんが川でせんたくをしていると、川上から大きな桃が、どんぶらこ、どんぶらこと流れてきました。', svg: scene3() },
			{ text: 'おばあさんは桃を家に持ち帰りました。おじいさんが包丁で切ろうとすると、桃がぱかっと割れて、中から元気な男の赤ちゃんが生まれました。', svg: scene4() },
			{ text: '桃から生まれたので、二人はこの子を「桃太郎」と名づけました。', svg: scene5() },
			{ text: '桃太郎はすくすくと育ち、村いちばんの力持ちになりました。', svg: scene6() },
			{ text: 'ある日、海の向こうの鬼ヶ島から鬼がやってきて、村を荒らしては宝物を奪っていくと聞きました。', svg: scene7() },
			{
				text: '「わたしが鬼を退治してきます」。おばあさんは、日本一のきびだんごをこしらえて持たせてくれました。',
				// 「日本一」は「にほんいち」と読まれる。昔話の読みの「にっぽんいち」にする
				read: '「わたしが鬼を退治してきます」。おばあさんは、にっぽんいちのきびだんごをこしらえて持たせてくれました。',
				svg: scene8(),
			},
			{ text: 'しばらく行くと、犬がやってきました。「桃太郎さん、お腰につけたきびだんご、一つわたしにくださいな」。きびだんごをもらった犬は、家来になりました。', svg: scene9() },
			{ text: 'つぎに、猿がやってきました。「桃太郎さん、お腰につけたきびだんご、一つわたしにくださいな」。きびだんごをもらった猿も、家来になりました。', svg: scene10() },
			{ text: 'そのあと、きじが飛んできました。「桃太郎さん、お腰につけたきびだんご、一つわたしにくださいな」。きびだんごをもらったきじも、家来になりました。', svg: scene11() },
			{ text: '桃太郎たちは船に乗って、鬼ヶ島へ向かいました。', svg: scene12() },
			{ text: '鬼ヶ島に着くと、犬はかみつき、猿はひっかき、きじはつつき、桃太郎は鬼の大将をやっつけました。', svg: scene13() },
			{ text: '「まいりました。もう悪いことはしません」。鬼たちは、奪った宝物を差し出しました。', svg: scene14() },
			{
				text: '桃太郎は宝物を持って村へ帰り、村の人たちに返しました。おじいさんもおばあさんも、村の人たちも、みんな大喜びしました。めでたし、めでたし。',
				// 「大喜び」は「だいよろこび」と読まれる
				read: '桃太郎は宝物を持って村へ帰り、村の人たちに返しました。おじいさんもおばあさんも、村の人たちも、みんなおおよろこびしました。めでたし、めでたし。',
				svg: scene15(),
			},
		],
	};
})();
