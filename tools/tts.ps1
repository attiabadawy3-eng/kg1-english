# Offline TTS: reads tools/audio_src.json [{key,lang,ssml}] and writes audio/<key>.wav using Windows OneCore voices.
# Run with Windows PowerShell 5.1. Skips files that already exist (delete one to regenerate it).
param([string]$Root = (Split-Path $PSScriptRoot))
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$voices = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices
$voiceFor = @{ en = ($voices | Where-Object { $_.Language -eq 'en-US' -and $_.DisplayName -like '*Zira*' })[0]; ar = ($voices | Where-Object { $_.Language -like 'ar*' })[0] }
$items = Get-Content -Raw -Encoding UTF8 (Join-Path $Root 'tools\audio_src.json') | ConvertFrom-Json
$made = 0
foreach ($it in $items) {
  $out = Join-Path $Root ("audio\" + $it.key + ".wav")
  if (Test-Path $out) { continue }
  $synth.Voice = $voiceFor[$it.lang]
  $loc = if ($it.lang -eq 'ar') { 'ar-SA' } else { 'en-US' }
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='$loc'>" + $it.ssml + "</speak>"
  $stream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $n = [uint32]$stream.Size
  $null = Await ($reader.LoadAsync($n)) ([uint32])
  $bytes = New-Object byte[] $n
  $reader.ReadBytes($bytes)
  [IO.File]::WriteAllBytes($out, $bytes)
  $made++
}
"made $made of $($items.Count)"
