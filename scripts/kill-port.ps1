<#
.SYNOPSIS
    Kill processes occupying a given port (Windows equivalent of kill-port.sh)
.DESCRIPTION
    Finds and kills processes listening on a specified port (default: 8080)
    and the livereload port (35729) used by esbuild/gulp-livereload.
.PARAMETER Port
    The port number to kill processes on (default: 8080)
.EXAMPLE
    .\scripts\kill-port.ps1          # kill whatever is on 8080
    .\scripts\kill-port.ps1 3000     # kill whatever is on 3000
#>

param(
    [int]$Port = 8080
)

$LIVERELOAD_PORT = 35729
$FERDIUM_SERVER_PORT = 46569
$FERDIUM_TODOS_PORT = 4000
$FERDIUM_DEV_API_PORT = 3000

function Free-Port {
    param([int]$PortNumber)

    try {
        $connections = Get-NetTCPConnection -LocalPort $PortNumber -ErrorAction Stop
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

        if ($processIds.Count -gt 0) {
            Write-Host "→ Port $PortNumber is in use. Killing process(es) ..."
            foreach ($pid in $processIds) {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                    Write-Host "  ✓ Killed process $pid"
                } catch {
                    # Process might already be stopped
                }
            }
            Start-Sleep -Seconds 1
            Write-Host "✓ Port $PortNumber freed."
        }
    } catch {
        if ($_.Exception.Message -match "No MSFT_NetTCPConnection") {
            Write-Host "→ Port $PortNumber is free."
        } else {
            Write-Host "→ Port $PortNumber is free."
        }
    }
}

# User-specified port (default 8080, the esbuild dev server)
Free-Port -PortNumber $Port

# esbuild/gulp-livereload
Free-Port -PortNumber $LIVERELOAD_PORT

# Ferdium internal server (AdonisJS, see src/internal-server/env.ini)
Free-Port -PortNumber $FERDIUM_SERVER_PORT

# Ferdium todos frontend (see src/config.ts LOCAL_TODOS_FRONTEND_URL)
Free-Port -PortNumber $FERDIUM_TODOS_PORT

# Ferdium dev API (see src/config.ts LOCAL_API)
Free-Port -PortNumber $FERDIUM_DEV_API_PORT
