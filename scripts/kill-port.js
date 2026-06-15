#!/usr/bin/env node
// -------------------------------------------------------------------
// kill-port.js — cross-platform port killer (replaces kill-port.sh
//                 and kill-port.ps1)
//
// Usage:  node scripts/kill-port.js [port]
//           (default port: 8080)
//
// Examples:
//   node scripts/kill-port.js          # kill whatever is on 8080
//   node scripts/kill-port.js 3000     # kill whatever is on 3000
// -------------------------------------------------------------------

const { execSync } = require('node:child_process');

const isWin = process.platform === 'win32';

const PORT = Number.parseInt(process.argv[2], 10) || 8080;

// Always check these Aitalk-related ports
const PORTS = [
  { port: PORT, label: 'user-specified / esbuild dev server' },
  { port: 35_729, label: 'esbuild/gulp-livereload' },
  { port: 46_569, label: 'Aitalk internal server' },
  { port: 4000, label: 'Aitalk todos frontend' },
  { port: 3000, label: 'Aitalk dev API' },
];

// -------------------------------------------------------------------
// Helper: retrieve PIDs listening on a given port
// -------------------------------------------------------------------
function getPIDs(port) {
  try {
    if (isWin) {
      // Windows: netstat + JS parsing (widely available)
      const raw = execSync('netstat -ano', {
        encoding: 'utf8',
        timeout: 10_000,
      });
      const suffix = `:${port}`;
      const pids = new Set();

      for (const line of raw.split(/\r?\n/)) {
        // netstat -ano columns: Proto  Local Address  Foreign Address  State  PID
        const parts = line.trim().split(/\s+/);
        if (
          parts.length >= 5 &&
          parts[3] === 'LISTENING' &&
          parts[1] &&
          parts[1].endsWith(suffix)
        ) {
          const pid = Number.parseInt(parts[4], 10);
          if (!Number.isNaN(pid)) pids.add(pid);
        }
      }
      return [...pids];
    }

    // macOS / Linux: lsof -ti returns bare PIDs, one per line
    const raw = execSync(`lsof -ti :${port} 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 10_000,
    });
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => Number.parseInt(line, 10));
  } catch {
    return [];
  }
}

// -------------------------------------------------------------------
// Helper: kill a list of PIDs
// -------------------------------------------------------------------
function killProcesses(pids) {
  if (pids.length === 0) return true;

  let ok = true;

  if (isWin) {
    // Windows: immediate force-kill (like the original PS1)
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe',
        });
        process.stdout.write(`  ✓ Killed process ${pid}\n`);
      } catch {
        process.stdout.write(`  - Process ${pid} already stopped\n`);
      }
    }
  } else {
    // macOS / Linux: graceful kill first, then force after a brief wait
    // (same pattern as the original bash script)
    try {
      execSync(`kill ${pids.join(' ')} 2>/dev/null`, {
        timeout: 5000,
        stdio: 'pipe',
      });
    } catch {
      // expected when the kill signal is sent — ignore
    }
    execSync('sleep 1', { timeout: 5000, stdio: 'pipe' });
    try {
      execSync(`kill -9 ${pids.join(' ')} 2>/dev/null`, {
        timeout: 5000,
        stdio: 'pipe',
      });
    } catch {
      ok = false;
    }
  }

  return ok;
}

// -------------------------------------------------------------------
// Free a single port
// -------------------------------------------------------------------
function freePort(port, label) {
  const pids = getPIDs(port);

  if (pids.length === 0) {
    process.stdout.write(`→ Port ${port} is free.\n`);
    return;
  }

  process.stdout.write(
    `→ Port ${port}${label ? ` (${label})` : ''} is in use. Killing process(es) ...\n`,
  );
  killProcesses(pids);

  // Verify the port is free
  const remaining = getPIDs(port);
  if (remaining.length === 0) {
    process.stdout.write(`✓ Port ${port} freed.\n`);
  } else {
    process.stdout.write(
      `⚠ Port ${port} could not be fully freed. PIDs still running: ${remaining.join(', ')}\n`,
    );
  }
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
process.stdout.write(
  `\n  kill-port — freeing port ${PORT} and Aitalk-related ports\n\n`,
);

for (const { port, label } of PORTS) {
  freePort(port, label);
}
