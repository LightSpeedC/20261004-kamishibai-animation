@echo off
rem 事前生成の音声を作る（先に VOICEVOX・AivisSpeech のエンジンを起動しておく）
node "%~dp0make-voice.ts" %*
pause
