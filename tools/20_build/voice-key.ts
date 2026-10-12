// 事前生成の声の key の確かめ（p261012-01）
// 声の一覧の値は r:key:形式 の形で「:」で区切るため、key に「:」があると分けられない
export function checkKeys(voices: readonly { key: string }[]): void {
	const bad = voices.filter((v) => v.key.includes(':')).map((v) => v.key);
	if (bad.length > 0) throw new Error(`声の key に「:」は使えない: ${bad.join(', ')}`);
}
