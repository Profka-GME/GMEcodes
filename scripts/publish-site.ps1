param(
    [Parameter(Position = 0)]
    [string]$Message,

    [switch]$SkipPull
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    & git @Args
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Args -join ' ')"
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or not available in PATH."
}

Invoke-Git -Args @('rev-parse', '--is-inside-work-tree') | Out-Null

$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    throw "Could not detect current branch."
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "Site update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

$changes = & git status --porcelain
$hadChanges = -not [string]::IsNullOrWhiteSpace(($changes -join ''))
if ($hadChanges) {
    Write-Host "Staging and committing local changes..." -ForegroundColor Cyan
    Invoke-Git -Args @('add', '-A')
    Invoke-Git -Args @('commit', '-m', $Message)
} else {
    Write-Host "No local changes to commit." -ForegroundColor Yellow
    Write-Host "Tip: Save your edited files first, then run update-site.cmd again." -ForegroundColor Yellow
}

if (-not $SkipPull.IsPresent) {
    Write-Host "Pulling latest changes from origin/$branch..." -ForegroundColor Cyan
    Invoke-Git -Args @('pull', '--rebase', 'origin', $branch)
}

Write-Host "Pushing to origin/$branch..." -ForegroundColor Cyan
Invoke-Git -Args @('push', 'origin', $branch)

$remoteUrl = (& git remote get-url origin).Trim()
$latestCommit = (& git rev-parse --short HEAD).Trim()
Write-Host "Done. Site changes are pushed." -ForegroundColor Green
Write-Host "Remote: $remoteUrl" -ForegroundColor Green
Write-Host "Latest commit on this branch: $latestCommit" -ForegroundColor Green
if (-not $hadChanges) {
    Write-Host "No new commit was created in this run because no file changes were detected." -ForegroundColor Yellow
}
Write-Host "If GitHub Pages is enabled, your site will update in about 1-3 minutes." -ForegroundColor Green
