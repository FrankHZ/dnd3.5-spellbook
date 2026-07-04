param(
    [string]$SshAlias = $env:DEPLOY_SSH_ALIAS,
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

function Import-EnvFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    foreach ($line in Get-Content -LiteralPath $Path -Encoding utf8) {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) {
            continue
        }

        $separator = $trimmed.IndexOf('=')
        if ($separator -le 0) {
            continue
        }

        $key = $trimmed.Substring(0, $separator).Trim()
        $value = $trimmed.Substring($separator + 1).Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if (-not [Environment]::GetEnvironmentVariable($key, 'Process')) {
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')
Import-EnvFile -Path (Join-Path $repoRoot '.env')

if ([string]::IsNullOrWhiteSpace($SshAlias)) {
    $SshAlias = $env:DEPLOY_SSH_ALIAS
}

if ([string]::IsNullOrWhiteSpace($SshAlias)) {
    throw 'DEPLOY_SSH_ALIAS is required. Copy .env.example to .env and set it to your local SSH host alias.'
}

$copies = @(
    @{
        Source = Join-Path $PSScriptRoot 'deploy-backend.sh'
        Target = "${SshAlias}:~/deploy-backend.sh"
    },
    @{
        Source = Join-Path $PSScriptRoot 'deploy-web.sh'
        Target = "${SshAlias}:~/deploy-web.sh"
    },
    @{
        Source = Join-Path $PSScriptRoot 'update-db.sh'
        Target = "${SshAlias}:~/update-db.sh"
    },
    @{
        Source = Join-Path $PSScriptRoot 'apply-nginx-site.sh'
        Target = "${SshAlias}:~/apply-nginx-site.sh"
    }
)

foreach ($copy in $copies) {
    $source = $copy.Source
    $target = $copy.Target

    if ($WhatIf) {
        Write-Output "scp $source $target"
        continue
    }

    $args = @($source, $target)
    & scp @args
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "scp failed with exit code $exitCode for $source"
    }
}

Write-Output "Remote deployment scripts synced to $SshAlias."
