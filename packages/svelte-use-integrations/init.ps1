# svelte-use-integrations Harness Initialization & Verification (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "=== svelte-use-integrations Harness Initialization & Verification ===" -ForegroundColor Cyan

function Invoke-Gate {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string[]]$BunArgs
    )
    Write-Host ">> $Label..." -ForegroundColor Yellow
    # NOTE: bun forwards its scripts' stderr, and Windows PowerShell 5.1
    # treats ANY native stderr output as an error object. Merging 2>&1
    # through a stringifying pipe keeps the output readable; the gate is
    # still judged by exit code ($LASTEXITCODE survives the pipe).
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & bun @BunArgs 2>&1 | ForEach-Object { "$_" }
        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE"
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

# Canonical path-leak pattern. Kept here (not in a scanned .md file) so the
# gate cannot match its own definition. Needs PCRE + lookbehind: a bare
# "letter, colon, separator" shape also matches the tail of any URL scheme.
# See .agents/rules/phase-gate.md §3.
$pathLeakPattern = '(?<![\w:/])[A-Za-z]:[/\\]|(?<!\w)/(?:home|Users)/[^/\s]+/'
$pathLeakGlobs = @('*.md', '*.ts', '*.js', '*.json', '*.svelte')

Invoke-Gate "Checking dependencies" @("install")
Invoke-Gate "Running typecheck (svelte-check)" @("run", "check")
Invoke-Gate "Running format check (oxfmt)" @("run", "format")
Invoke-Gate "Running linter (oxlint & eslint)" @("run", "lint")
Invoke-Gate "Running unit tests (vitest)" @("run", "test")
Invoke-Gate "Testing library packaging (prepack)" @("run", "prepack")

Write-Host ">> Scanning for machine-specific absolute paths..." -ForegroundColor Yellow
$leaks = & git grep -nP $pathLeakPattern -- $pathLeakGlobs 2>&1
if ($LASTEXITCODE -eq 0 -and $leaks) {
    $leaks | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    throw "Path-leak gate failed: machine-specific absolute path(s) in tracked files"
}
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1) {
    throw "Path-leak gate could not run (git grep exit code $LASTEXITCODE)"
}
Write-Host "   no leaks found" -ForegroundColor DarkGray

Write-Host "=== All Checks Passed Successfully ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps for agent:"
Write-Host "1. Read AGENTS.md and .agents/rules/*.md (package harness lives here)"
Write-Host "2. Check feature_list.json for the next adapter to port from VueUse integrations"
Write-Host "3. Follow Svelte 5 Runes & SSR-safe architecture guidelines"
Write-Host "4. Update progress.md and feature_list.json upon completion"
