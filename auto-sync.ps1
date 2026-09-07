$repoUrl = "https://github.com/indusvalley9611-png/Swasthyasetu"

Write-Host "Starting Auto-Sync... (Keep this window open to automatically push changes to GitHub)" -ForegroundColor Yellow

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $PWD.Path
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Filter out node_modules, .git, and .next
$action = {
    $path = $Event.SourceEventArgs.FullPath
    if ($path -match '\\node_modules\\' -or $path -match '\\\.git\\' -or $path -match '\\\.next\\') { return }
    
    Write-Host "`nChange detected in: $path" -ForegroundColor Cyan
    Write-Host "Syncing to GitHub..." -ForegroundColor Cyan
    
    git add .
    git commit -m "Auto-sync update: $(Get-Date -Format 'HH:mm:ss')"
    git push origin main
}

Register-ObjectEvent $watcher "Changed" -Action $action > $null
Register-ObjectEvent $watcher "Created" -Action $action > $null
Register-ObjectEvent $watcher "Deleted" -Action $action > $null
Register-ObjectEvent $watcher "Renamed" -Action $action > $null

while ($true) { Start-Sleep 5 }
