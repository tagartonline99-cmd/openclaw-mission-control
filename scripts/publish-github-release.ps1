param(
  [string]$Owner = "tagartonline99-cmd",
  [string]$Repo = "openclaw-mission-control",
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Version)) {
  $packageJson = Get-Content -Raw -LiteralPath (Join-Path $root "package.json") | ConvertFrom-Json
  $Version = $packageJson.version
}
$tag = "v$Version"
$artifactDir = Join-Path $root "release-artifacts\$tag"
$assetNames = @(
  "latest.json",
  "OpenClaw Mission Control_$($Version)_x64-setup.exe",
  "OpenClaw Mission Control_$($Version)_x64-setup.exe.sig",
  "OpenClaw Mission Control_$($Version)_x64_en-US.msi"
)

if (!(Test-Path -LiteralPath $artifactDir)) {
  throw "Artifact folder not found: $artifactDir"
}

foreach ($name in $assetNames) {
  $path = Join-Path $artifactDir $name
  if (!(Test-Path -LiteralPath $path)) {
    throw "Missing release asset: $path"
  }
}

function Get-GitHubToken {
  if ($env:GITHUB_TOKEN) {
    return $env:GITHUB_TOKEN
  }

  $credentialQuery = "protocol=https`nhost=github.com`n`n"
  $credentialOutput = $credentialQuery | git credential fill
  $passwordLine = $credentialOutput | Where-Object { $_ -like "password=*" } | Select-Object -First 1

  if (!$passwordLine) {
    throw "No GitHub token found in GITHUB_TOKEN or Git Credential Manager."
  }

  return $passwordLine.Substring("password=".Length)
}

function Invoke-GitHubJson {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body = $null
  )

  $headers = @{
    Authorization = "Bearer $script:token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "OpenClaw-Mission-Control-Release-Publisher"
  }

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
  }

  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -ContentType "application/json" -Body $json
}

function Invoke-GitHubUpload {
  param(
    [string]$Uri,
    [string]$Path
  )

  $headers = @{
    Authorization = "Bearer $script:token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "OpenClaw-Mission-Control-Release-Publisher"
  }

  return Invoke-RestMethod -Method Post -Uri $Uri -Headers $headers -ContentType "application/octet-stream" -InFile $Path
}

$script:token = Get-GitHubToken
$apiRoot = "https://api.github.com/repos/$Owner/$Repo"

try {
  $release = Invoke-GitHubJson -Method Get -Uri "$apiRoot/releases/tags/$tag"
  Write-Host "Found existing release $tag."
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -ne 404) {
    throw
  }

  $releaseBody = @{
    tag_name = $tag
    name = "OpenClaw Mission Control $Version"
    body = "Updater verification release $Version. Confirms signed GitHub updater detection, prompt, install, relaunch, and data preservation."
    draft = $false
    prerelease = $false
  }

  $release = Invoke-GitHubJson -Method Post -Uri "$apiRoot/releases" -Body $releaseBody
  Write-Host "Created release $tag."
}

$uploadBase = $release.upload_url -replace "\{.*$", ""
$existingAssets = Invoke-GitHubJson -Method Get -Uri "$apiRoot/releases/$($release.id)/assets?per_page=100"

foreach ($name in $assetNames) {
  $existing = $existingAssets | Where-Object { $_.name -eq $name } | Select-Object -First 1
  if ($existing) {
    Invoke-GitHubJson -Method Delete -Uri "$apiRoot/releases/assets/$($existing.id)" | Out-Null
    Write-Host "Deleted existing asset $name."
  }

  $assetPath = Join-Path $artifactDir $name
  $encodedName = [System.Uri]::EscapeDataString($name)
  Invoke-GitHubUpload -Uri "$($uploadBase)?name=$encodedName" -Path $assetPath | Out-Null
  Write-Host "Uploaded $name."
}

Write-Host "Release upload complete: https://github.com/$Owner/$Repo/releases/tag/$tag"
