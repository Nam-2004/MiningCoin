<#
Simple recursive site mirror for same-host assets.
Usage (PowerShell):
  pwsh -ExecutionPolicy Bypass -File .\webminer_clone\mirror_site.ps1 -Url "https://webminer.pages.dev/" -OutputDir ".\webminer_clone\full_mirror"

Notes:
- Designed for PowerShell 5.1+. It uses Invoke-WebRequest to download files and simple regex parsing to discover links.
- It only downloads resources on the same host as the start URL.
- It queues HTML/CSS/JS and parses them for additional resources (href/src and css url()).
- Be careful: the site contains miner JS/WASM. Do not open downloaded pages in a browser you rely on without first auditing/removing miner assets.
- There's a safety limit of max files to avoid runaway downloads; increase `-MaxFiles` if you trust the target.
#>
param(
    [string]$Url = 'https://webminer.pages.dev/',
    [string]$OutputDir = '.\webminer_clone\full_mirror',
    [int]$MaxFiles = 1000
)

Write-Output "Starting mirror of $Url -> $OutputDir"

function Normalize-PathForSave($uri, $baseOutput) {
    $path = $uri.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
    # if looks like folder, save as index.html inside it
    if ($path.EndsWith('/')) { $path = "$path`index.html" }
    # preserve querystring for some assets
    if (-not ($path -match '\.[a-zA-Z0-9]{1,6}$') -and -not [string]::IsNullOrEmpty($uri.Query)) {
        # add safe querystring suffix
        $qs = $uri.Query.TrimStart('?') -replace '[^a-zA-Z0-9\-_]', '_'
        $path = "$path`_`$qs"
    }
    $local = Join-Path $baseOutput $path
    return $local
}

# ensure output dir
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$startUri = [Uri]$Url
$hostOnly = $startUri.Host.ToLower()

$visited = New-Object System.Collections.Generic.HashSet[string]
$queue = New-Object System.Collections.Generic.Queue[System.Uri]
$queue.Enqueue($startUri)
$visited.Add($startUri.AbsoluteUri) | Out-Null

function Enqueue-IfNew([Uri]$u) {
    if ($u.Host.ToLower() -ne $hostOnly) { return }
    $key = $u.AbsoluteUri
    if (-not $visited.Contains($key)) {
        $visited.Add($key) | Out-Null
        $queue.Enqueue($u)
    }
}

$downloaded = 0

while ($queue.Count -gt 0) {
    if ($downloaded -ge $MaxFiles) {
        Write-Warning "Reached max files limit ($MaxFiles). Stopping."
        break
    }
    $current = $queue.Dequeue()
    Write-Output "Processing: $($current.AbsoluteUri)"
    try {
        $localPath = Normalize-PathForSave $current $OutputDir
        $localDir = Split-Path $localPath -Parent
        if (-not (Test-Path $localDir)) { New-Item -ItemType Directory -Force -Path $localDir | Out-Null }

        # Download file. Use -OutFile so binary files preserved
        Invoke-WebRequest -Uri $current.AbsoluteUri -OutFile $localPath -Headers @{ 'User-Agent' = 'Mozilla/5.0 (MirrorScript)' } -TimeoutSec 30 -ErrorAction Stop
        $downloaded++

        # Read content to find more links for text-based files
        $content = $null
        try { $content = Get-Content -Raw -LiteralPath $localPath -ErrorAction Stop } catch { $content = $null }

        if ($content) {
            # find href/src attributes (handle double- and single-quoted separately for simpler quoting)
            $hrefs = @()
            $matches1 = [regex]::Matches($content, '(?i)(?:href|src)\s*=\s*"([^"]+)"')
            foreach ($m in $matches1) { $hrefs += $m.Groups[1].Value }
            $matches2 = [regex]::Matches($content, "(?i)(?:href|src)\s*=\s*'([^']+)'")
            foreach ($m in $matches2) { $hrefs += $m.Groups[1].Value }
            foreach ($h in $hrefs) {
                # skip data: URIs and javascript: links
                if ($h -match '^data:' -or $h -match '^javascript:') { continue }
                try {
                    $resolved = [Uri]::new($current, $h)
                    Enqueue-IfNew $resolved
                } catch { }
            }

            # find CSS url(...) references using a simpler regex (capture content inside url(...))
            $cssurls = [regex]::Matches($content, '(?i)url\(\s*([^)]*?)\s*\)') | ForEach-Object { $_.Groups[1].Value }
            foreach ($c in $cssurls) {
                if ($c -match '^data:') { continue }
                try {
                    $resolved = [Uri]::new($current, $c)
                    Enqueue-IfNew $resolved
                } catch { }
            }

            # also find .wasm asset references with a simpler regex
            $assetMatches = [regex]::Matches($content, '\S+\.wasm(\?\S+)?', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase) | ForEach-Object { $_.Groups[0].Value }
            foreach ($a in $assetMatches) {
                if ($a -match '^data:') { continue }
                try { $resolved = [Uri]::new($current, $a); Enqueue-IfNew $resolved } catch { }
            }
        }

    } catch {
        Write-Warning "Failed to download $($current.AbsoluteUri): $_"
    }
}

Write-Output "Done. Downloaded $downloaded files to $OutputDir"
Write-Output "NOTE: Please audit downloaded JS and WASM files before opening the mirror in a browser (they may contain an in-browser miner)."

