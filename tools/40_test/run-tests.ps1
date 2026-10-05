# tests/ のテストを PlayWright 共有環境で実行する
# 引数は Playwright にそのまま渡す（例: -g "表紙から" で名前に一致するテストだけを実行。空白は入れられない）
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path.Replace('\', '/')
$testDir = "$root/tests"
if (-not (Test-Path $testDir)) {
	Write-Output "テストのフォルダが見つからない: tests/"
	exit 2
}

# tests/ は共有環境の外にあるため、@playwright/test の在りかを NODE_PATH で教える。
# 共有環境は実体のパス（subst のドライブを解いた先）で動くため、こちらも実体のパスで渡す。
# subst のドライブのまま渡すと、同じモジュールが 2 つのパスから読まれて止まる
# （Requiring @playwright/test second time）
$modules = node -e "console.log(require('fs').realpathSync.native('T:/PlayWright/node_modules'))"
if ($LASTEXITCODE -ne 0 -or -not $modules) {
	Write-Output '共有環境の node_modules が見つからない'
	exit 2
}
$env:NODE_PATH = $modules

# テストの置き場と出力先は引数で渡す（共有環境のランチャーは環境変数を読まない）
# 引数に | や空白を含めない。ランチャーは cmd を通るため、| はパイプになり、空白で引数が分かれる
# （-g で絞るときは、テスト名のうち空白を含まない一部を渡す。例: -g "矢印キーで全"）
# ブラウザは chromium と webkit（iPhone の Safari と同じしくみ）。firefox は共有環境側で描画のエラーが出るため外す
& 'T:/PlayWright/bin/playwright-test.cmd' --test-dir $testDir --out-dir "$root/tmp/playwright" --project=chromium --project=webkit @args
$code = $LASTEXITCODE
if ($code -eq 0) { Write-Output 'テスト: すべて成功' } else { Write-Output "テスト: 失敗あり（終了コード $code）" }
exit $code
