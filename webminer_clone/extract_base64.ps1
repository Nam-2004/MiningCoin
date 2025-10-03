param(
    [string]$JsDir = "c:\Users\Nam\Documents\GitHub\MiningCoin\webminer_clone\full_mirror\js"
)

if (-not (Test-Path $JsDir)) {
    Write-Error "JS directory not found: $JsDir"
    exit 1
}

$patterns = @(
    @{Name='javascript'; Pattern='data:text/javascript;base64,([A-Za-z0-9+/=_\-]+)'; Ext='js'},
    @{Name='wasm'; Pattern='data:application/wasm;base64,([A-Za-z0-9+/=_\-]+)'; Ext='wasm'}
)

$count = 0
foreach ($file in Get-ChildItem -Path $JsDir -Filter '*.js') {
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    } catch {
        Write-Warning "Failed to read $($file.FullName): $($_.Exception.Message)"
        continue
    }

    foreach ($pat in $patterns) {
        $found = [regex]::Matches($content, $pat.Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        foreach ($m in $found) {
            $count++
            $b64 = $m.Groups[1].Value
            # Normalize URL-safe base64
            $b64 = $b64.Replace('-','+').Replace('_','/')
            switch ($b64.Length % 4) {
                0 { }
                1 { $b64 += '===' }
                2 { $b64 += '==' }
                3 { $b64 += '=' }
            }
            try {
                $bytes = [System.Convert]::FromBase64String($b64)
            } catch {
                Write-Warning "Failed to decode base64 in $($file.Name) (match #$count): $($_.Exception.Message)"
                continue
            }
            $outName = "extracted_{0}_{1}.{2}" -f $file.BaseName, $count, $pat.Ext
            $outPath = Join-Path -Path $JsDir -ChildPath $outName
            try {
                [System.IO.File]::WriteAllBytes($outPath, $bytes)
                Write-Host "Wrote: $outPath ($($bytes.Length) bytes)"
            } catch {
                Write-Warning ("Failed to write {0}: {1}" -f $outPath, $_.Exception.Message)
            }
        }
    }
}

if ($count -eq 0) { Write-Host "No embedded base64 data URIs found in JS files." } else { Write-Host "Extraction complete. Total matches: $count" }
