$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('twinkle-r2-' + [guid]::NewGuid().ToString('N'))
$server = $null

function Test-R2Mode {
  param([string] $Mode, [int] $Port)

  $profilePath = Join-Path $tempRoot $Mode
  New-Item -ItemType Directory -Path $profilePath | Out-Null
  $url = if ($Mode -eq 'landing') {
    'http://127.0.0.1:4176/?stage=landing&quality=full'
  } else {
    'http://127.0.0.1:4176/?quality=full'
  }
  $arguments = @(
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-breakpad',
    '--disable-crash-reporter',
    "--remote-debugging-port=$Port",
    "--user-data-dir=$profilePath",
    '--window-size=1470,850',
    $url
  )
  $edgeProcess = Start-Process -FilePath $edgePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
  try {
    $readerPath = Join-Path $PSScriptRoot 'verify-refinement-r2-cdp.mjs'
    $output = & node.exe $readerPath $Port $Mode | Out-String
    if ($LASTEXITCODE -ne 0) { throw "R2 browser verification failed for $Mode." }
    Write-Output "$Mode $output"
  } finally {
    if (-not $edgeProcess.HasExited) {
      Stop-Process -Id $edgeProcess.Id -Force
      Wait-Process -Id $edgeProcess.Id -Timeout 5 -ErrorAction SilentlyContinue
    }
  }
}

try {
  if (-not (Test-Path -LiteralPath $edgePath)) { throw "Microsoft Edge was not found at $edgePath" }
  New-Item -ItemType Directory -Path $tempRoot | Out-Null
  $server = Start-Process -FilePath 'node.exe' -ArgumentList @(
    $vitePath, '--host', '127.0.0.1', '--port', '4176'
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

  $serverReady = $false
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4176/' -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -eq 200) { $serverReady = $true; break }
    } catch { Start-Sleep -Milliseconds 200 }
  }
  if (-not $serverReady) { throw 'Vite did not become ready on port 4176.' }

  if (-not $env:R2_BROWSER_CASE -or $env:R2_BROWSER_CASE -eq 'default') {
    Test-R2Mode -Mode 'default' -Port 9361
  }
  if (-not $env:R2_BROWSER_CASE -or $env:R2_BROWSER_CASE -eq 'landing') {
    Test-R2Mode -Mode 'landing' -Port 9362
  }
  if (-not $env:R2_BROWSER_CASE -or $env:R2_BROWSER_CASE -eq 'background') {
    Test-R2Mode -Mode 'background' -Port 9363
  }
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
  if (Test-Path -LiteralPath $tempRoot) {
    $resolvedTemp = [IO.Path]::GetFullPath($tempRoot)
    $systemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if (-not $resolvedTemp.StartsWith($systemTemp, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove non-temp path: $resolvedTemp"
    }
    for ($cleanupAttempt = 0; $cleanupAttempt -lt 6; $cleanupAttempt += 1) {
      try {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction Stop
        break
      } catch {
        if ($cleanupAttempt -eq 5) { throw }
        Start-Sleep -Milliseconds 300
      }
    }
  }
}
