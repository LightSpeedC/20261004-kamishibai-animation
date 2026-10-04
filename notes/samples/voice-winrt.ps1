# WinRT の音声合成で、声を切り替えて wav に書き出し、順に再生する（p261004-01）
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]

# WinRT の非同期操作を .NET の Task に変えて待つ
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
	$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Wait-WinRT($op, [Type]$type) {
	$task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
	[void]$task.Wait(-1)
	$task.Result
}

$outDir = Join-Path $PSScriptRoot '../../tmp'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory $outDir | Out-Null }
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
foreach ($name in 'Ayumi', 'Haruka', 'Ichiro') {
	$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq "Microsoft $name" }
	if (-not $voice) {
		Write-Output ("見つからない: Microsoft {0}" -f $name)
		continue
	}
	$synth.Voice = $voice
	$text = "わたしは{0}です。むかしむかし、ある山のふもとに、小さな村がありました。" -f $name
	$stream = Wait-WinRT ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])

	$wav = Join-Path $outDir ("voice-{0}.wav" -f $name)
	$src = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
	$dst = [System.IO.File]::Create($wav)
	$src.CopyTo($dst)
	$dst.Close()
	$src.Close()

	Write-Output ("{0}: tmp/voice-{0}.wav（{1:N0} バイト）を再生" -f $name, (Get-Item $wav).Length)
	$player = New-Object System.Media.SoundPlayer $wav
	$player.PlaySync()
}
Write-Output '再生終了'
