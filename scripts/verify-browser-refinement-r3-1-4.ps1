$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('twinkle-r3-1-6-' + [guid]::NewGuid().ToString('N'))
$server = $null

function Test-HeroViewport {
  param([string] $Name, [int] $Port, [int] $Width, [int] $Height, [string] $Motion)

  $profilePath = Join-Path $tempRoot $Name
  New-Item -ItemType Directory -Path $profilePath | Out-Null
  $arguments = @(
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-breakpad',
    '--disable-crash-reporter',
    "--remote-debugging-port=$Port",
    "--user-data-dir=$profilePath",
    "--window-size=$Width,$Height"
  )
  if ($Motion -eq 'reduced') { $arguments += '--force-prefers-reduced-motion=reduce' }
  $url = if ($Name -eq 'fallback-mobile') {
    'http://127.0.0.1:4178/?section=hero&webgl=off'
  } else {
    'http://127.0.0.1:4178/?section=hero&quality=full'
  }
  $arguments += $url
  $edgeProcess = Start-Process -FilePath $edgePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
  try {
    $readerPath = Join-Path $PSScriptRoot 'verify-refinement-r3-1-4-cdp.mjs'
    $output = & node.exe $readerPath $Port $Width $Height $Motion | Out-String
    if ($LASTEXITCODE -ne 0) { throw "R3.1-R3.6 browser verification failed for $Name." }
    Write-Output "$Name $output"
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
    $vitePath, '--host', '127.0.0.1', '--port', '4178'
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

  $serverReady = $false
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4178/' -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -eq 200) { $serverReady = $true; break }
    } catch { Start-Sleep -Milliseconds 200 }
  }
  if (-not $serverReady) { throw 'Vite did not become ready on port 4178.' }

  Test-HeroViewport -Name 'desktop-safe' -Port 9371 -Width 1470 -Height 850 -Motion 'full'
  Test-HeroViewport -Name 'desktop-reduced' -Port 9372 -Width 1440 -Height 900 -Motion 'reduced'
  Test-HeroViewport -Name 'mobile' -Port 9373 -Width 390 -Height 844 -Motion 'full'
  Test-HeroViewport -Name 'fallback-mobile' -Port 9374 -Width 390 -Height 844 -Motion 'full'
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
