# Windows 標準の音声合成で、スピーカーから読み上げるだけの最小例（p261004-01）
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Haruka Desktop')
$synth.Speak('むかしむかし、ある山のふもとに、小さな村がありました。')
$synth.Dispose()
