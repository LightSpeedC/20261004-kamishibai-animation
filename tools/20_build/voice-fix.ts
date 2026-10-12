// AivisSpeech だけに効かせる、読み方の直し（p261010-01）。make-voice.ts とテストが使う
// 読み（story.js の read）は全声で共通で、字幕の句の数を変えられない。ここは、エンジンに渡す句の文字だけを替える。
// 句の数は変わらない（読点を足しても、同じ句の中の間になるだけ）ので、字幕の色の進みには影響しない
// 3 つ目に声の key を書くと、その声だけに当てる（聞いて正しかった、ほかの声の音声を作り直さないため）
export const AIVIS_FIX: [string, string, string?][] = [
	// 「荒らして、わ宝物を」と読まれた。「は」のあとに間を置くと、助詞の「は」として読まれる
	['荒らしてはたからものを', '荒らしては、たからものを'],
	// コハク: 「わたしの」と聞こえた。「が」のあとに間を置く
	['わたしが鬼を', 'わたしが、鬼を', 'kohaku'],
];

export function applyFix(text: string, voice = ''): string {
	return AIVIS_FIX.filter(([, , only]) => !only || only === voice).reduce((t, [from, to]) => t.split(from).join(to), text);
}
