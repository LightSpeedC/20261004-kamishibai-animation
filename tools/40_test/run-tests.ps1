# tests/ のテストを PlayWright 共有環境で実行する
# 引数は Playwright にそのまま渡す（例: -g "表紙から" で名前に一致するテストだけを実行）
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path.Replace('\', '/')
$testDir = "$root/tests"
if (-not (Test-Path $testDir)) {
	Write-Output "テストのフォルダが見つからない: tests/"
	exit 2
}

$env:MY_PLAYWRIGHT_TEST_DIR = $testDir
$env:MY_PLAYWRIGHT_OUT_DIR = "$root/tmp/playwright"
# tests/ は共有環境の外にあるため、@playwright/test の在りかを教える
$env:NODE_PATH = 'T:/PlayWright/node_modules'
& 'T:/PlayWright/bin/playwright-test.cmd' @args
$code = $LASTEXITCODE
if ($code -eq 0) { Write-Output 'テスト: すべて成功' } else { Write-Output "テスト: 失敗あり（終了コード $code）" }
exit $code
