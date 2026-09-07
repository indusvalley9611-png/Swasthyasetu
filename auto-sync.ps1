$repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/yourusername/swasthyasetu.git)"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Git is not installed. Please download and install Git from https://git-scm.com/download/win" -ForegroundColor Red
    exit
}

Write-Host "Initializing Git Repository..." -ForegroundColor Cyan
git init
git add .
git commit -m "Initial commit of SwasthyaSetu Hackathon project"
git branch -M main
git remote add origin $repoUrl
git push -u origin main

Write-Host "`nSuccessfully pushed to GitHub!" -ForegroundColor Green
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
