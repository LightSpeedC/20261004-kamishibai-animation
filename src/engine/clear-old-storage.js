// 以前 localStorage に残していた声の選択を消す（p261012-01）。声の選択は sessionStorage に移した
// 開いた人の手元から古い値を消すために置く。外す時期は課題 i261012-01
(function () {
	'use strict';

	const OLD_KEYS = ['kamishibai.voice', 'kamishibai.voice.recorded'];

	try {
		OLD_KEYS.forEach((k) => localStorage.removeItem(k));
	} catch (e) {
		// 触れない環境（プライベートウィンドウ等）では、残っていない
	}
})();
