$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('twinkle-phase26-' + [guid]::NewGuid().ToString('N'))
$server = $null

function Invoke-Edge {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [string] $Url,
    [Parameter(Mandatory)] [string[]] $ExtraArguments
  )

  $profilePath = Join-Path $tempRoot $Name
  New-Item -ItemType Directory -Path $profilePath | Out-Null
  $arguments = @(
    '--headless=new'
    '--no-first-run'
    '--no-default-browser-check'
    '--force-device-scale-factor=1'
    "--user-data-dir=$profilePath"
  ) + $ExtraArguments + @($Url)

  return (& $edgePath @arguments | Out-String)
}

function Measure-Edge {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [int] $Port,
    [Parameter(Mandatory)] [string] $Url
  )

  $profilePath = Join-Path $tempRoot $Name
  New-Item -ItemType Directory -Path $profilePath | Out-Null
  $edgeProcess = Start-Process -FilePath $edgePath -ArgumentList @(
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    "--remote-debugging-port=$Port",
    "--user-data-dir=$profilePath",
    $Url
  ) -WindowStyle Hidden -PassThru

  try {
    $readerPath = Join-Path $PSScriptRoot 'read-performance-cdp.mjs'
    $measurementOutput = & node.exe $readerPath $Port | Out-String
    if ($LASTEXITCODE -ne 0) {
      throw "CDP performance reader failed for $Name."
    }
    return ($measurementOutput | ConvertFrom-Json)
  } finally {
    if (-not $edgeProcess.HasExited) {
      Stop-Process -Id $edgeProcess.Id -Force
    }
  }
}

try {
  if (-not (Test-Path -LiteralPath $edgePath)) {
    throw "Microsoft Edge was not found at $edgePath"
  }

  New-Item -ItemType Directory -Path $tempRoot | Out-Null
  $server = Start-Process -FilePath 'node.exe' -ArgumentList @(
    $vitePath,
    '--host', '127.0.0.1',
    '--port', '4173'
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

  $serverReady = $false
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/' -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -eq 200) {
        $serverReady = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 200
    }
  }

  if (-not $serverReady) {
    throw 'Vite did not become ready on port 4173.'
  }

  $fullMeasurement = Measure-Edge -Name 'full-measurement' -Port 9326 -Url 'http://127.0.0.1:4173/?section=hero&quality=full&debug=performance'
  $liteMeasurement = Measure-Edge -Name 'lite-measurement' -Port 9327 -Url 'http://127.0.0.1:4173/?section=hero&quality=lite&debug=performance'
  if ($fullMeasurement.quality -ne 'full' -or $liteMeasurement.quality -ne 'lite') {
    throw 'The browser did not preserve the requested Full/Lite quality modes.'
  }
  if ([int] $fullMeasurement.fps -lt 30 -or [int] $liteMeasurement.fps -lt 30) {
    throw "Hero performance is below 30 FPS (Full=$($fullMeasurement.fps), Lite=$($liteMeasurement.fps))."
  }

  $captureCases = @(
    @('fallback-desktop', '1440,900', 'http://127.0.0.1:4173/?section=hero&webgl=off', 'fallback-desktop.png'),
    @('fallback-mobile', '390,844', 'http://127.0.0.1:4173/?section=hero&webgl=off', 'fallback-mobile.png'),
    @('fps-full', '1440,900', 'http://127.0.0.1:4173/?section=hero&quality=full&debug=performance', 'fps-full.png'),
    @('fps-lite', '1440,900', 'http://127.0.0.1:4173/?section=hero&quality=lite&debug=performance', 'fps-lite.png')
  )

  foreach ($capture in $captureCases) {
    $outputPath = Join-Path $projectRoot $capture[3]
    Invoke-Edge -Name $capture[0] -Url $capture[2] -ExtraArguments @(
      "--window-size=$($capture[1])",
      '--virtual-time-budget=5000',
      '--run-all-compositor-stages-before-draw',
      "--screenshot=$outputPath"
    ) | Out-Null
  }

  [pscustomobject]@{
    FullFps = [int] $fullMeasurement.fps
    FullQuality = $fullMeasurement.quality
    LiteFps = [int] $liteMeasurement.fps
    LiteQuality = $liteMeasurement.quality
  } | ConvertTo-Json
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }

  if (Test-Path -LiteralPath $tempRoot) {
    $resolvedTempRoot = (Resolve-Path -LiteralPath $tempRoot).Path
    $systemTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedTempRoot.StartsWith($systemTempRoot, [StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $resolvedTempRoot -Recurse -Force
    }
  }
}
