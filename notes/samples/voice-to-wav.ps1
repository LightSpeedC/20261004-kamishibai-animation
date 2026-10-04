# Windows 標準の音声合成で、読み上げを wav に保存して再生する例（p261004-01）
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
Write-Output '--- インストール済みの音声 ---'
foreach ($v in $synth.GetInstalledVoices()) {
	$i = $v.VoiceInfo
	Write-Output ("{0} / {1} / {2} / 有効={3}" -f $i.Name, $i.Culture, $i.Gender, $v.Enabled)
}

$ja = $synth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'ja-JP' } | Select-Object -First 1
if (-not $ja) {
	Write-Output '日本語の音声が見つからない'
	exit 1
}
$synth.SelectVoice($ja.VoiceInfo.Name)
Write-Output ("使用する音声: {0}" -f $ja.VoiceInfo.Name)

$outDir = Join-Path $PSScriptRoot '../../tmp'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory $outDir | Out-Null }
$wav = Join-Path $outDir 'voice-to-wav.wav'
$synth.SetOutputToWaveFile($wav)
$synth.Speak('むかしむかし、ある山のふもとに、小さな村がありました。')
$synth.SetOutputToNull()
$synth.Dispose()

$size = (Get-Item $wav).Length
Write-Output ("wav を書き出した: tmp/voice-to-wav.wav（{0:N0} バイト）" -f $size)

$player = New-Object System.Media.SoundPlayer $wav
$player.PlaySync()
Write-Output '再生終了'
