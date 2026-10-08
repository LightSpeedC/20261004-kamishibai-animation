# tests/ のテストを PlayWright 共有環境で実行する
# 引数は Playwright にそのまま渡す（例: -g "表紙から" で名前に一致するテストだけを実行）
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path.Replace('\', '/')
$testDir = "$root/tests"
if (-not (Test-Path $testDir)) {
	Write-Output "テストのフォルダが見つからない: tests/"
	exit 2
}

# テストの置き場と出力先は引数で渡す（共有環境のランチャーは環境変数を読まない）
# ブラウザは chromium と webkit（iPhone の Safari と同じしくみ）。firefox は共有環境側で描画のエラーが出るため外す
& 'T:/PlayWright/bin/playwright-test.cmd' --test-dir $testDir --out-dir "$root/tmp/playwright" --project=chromium --project=webkit @args
$code = $LASTEXITCODE
if ($code -eq 0) { Write-Output 'テスト: すべて成功' } else { Write-Output "テスト: 失敗あり（終了コード $code）" }
exit $code
