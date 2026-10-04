# 音声合成で選べる声の一覧を、2 つの仕組みそれぞれについて出す（p261004-01）
$ErrorActionPreference = 'Stop'

Write-Output '--- System.Speech（SelectVoice に渡す値は Name） ---'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
foreach ($v in $synth.GetInstalledVoices()) {
	$i = $v.VoiceInfo
	Write-Output ("Name={0} / Culture={1} / Gender={2} / 有効={3}" -f $i.Name, $i.Culture, $i.Gender, $v.Enabled)
}
$synth.Dispose()

Write-Output ''
Write-Output '--- WinRT（Voice に入れる声を DisplayName で探す） ---'
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
foreach ($v in [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices) {
	Write-Output ("DisplayName={0} / Language={1} / Gender={2}" -f $v.DisplayName, $v.Language, $v.Gender)
}
Write-Output ("既定: {0}" -f [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::DefaultVoice.DisplayName)
