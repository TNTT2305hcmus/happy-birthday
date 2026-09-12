$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('twinkle-r42-' + [guid]::NewGuid().ToString('N'))
$server = $null
$edge = $null
$port = 9347
$origin = 'http://127.0.0.1:4174'

try {
  if (-not (Test-Path -LiteralPath $edgePath)) {
    throw "Microsoft Edge was not found at $edgePath"
  }

  New-Item -ItemType Directory -Path $tempRoot | Out-Null
  $server = Start-Process -FilePath 'node.exe' -ArgumentList @(
    $vitePath,
    '--host', '127.0.0.1',
    '--port', '4174'
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

  $serverReady = $false
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri $origin -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -eq 200) {
        $serverReady = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 200
    }
  }
  if (-not $serverReady) {
    throw 'Vite did not become ready on port 4174.'
  }

  $profilePath = Join-Path $tempRoot 'edge-profile'
  New-Item -ItemType Directory -Path $profilePath | Out-Null
  $edge = Start-Process -FilePath $edgePath -ArgumentList @(
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--use-fake-device-for-media-stream',
    "--remote-debugging-port=$port",
    "--user-data-dir=$profilePath",
    '--window-size=1470,850',
    "$origin/?section=cake&quality=full"
  ) -WindowStyle Hidden -PassThru

  $readerPath = Join-Path $PSScriptRoot 'verify-refinement-r4-2-cdp.mjs'
  & node.exe $readerPath $port $origin
  if ($LASTEXITCODE -ne 0) {
    throw 'R4.2 browser verification failed.'
  }
} finally {
  if ($edge -and -not $edge.HasExited) {
    Stop-Process -Id $edge.Id -Force
  }
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
  Start-Sleep -Milliseconds 750
  if (Test-Path -LiteralPath $tempRoot) {
    $resolvedTempRoot = (Resolve-Path -LiteralPath $tempRoot).Path
    $systemTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedTempRoot.StartsWith($systemTempRoot, [StringComparison]::OrdinalIgnoreCase)) {
      for ($cleanupAttempt = 0; $cleanupAttempt -lt 5; $cleanupAttempt += 1) {
        try {
          Remove-Item -LiteralPath $resolvedTempRoot -Recurse -Force -ErrorAction Stop
          break
        } catch {
          if ($cleanupAttempt -eq 4) { throw }
          Start-Sleep -Milliseconds 500
        }
      }
    }
  }
}
