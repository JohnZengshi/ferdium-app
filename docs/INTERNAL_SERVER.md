<p align="center">
    <img src="../src/internal-server/public/images/logo.png" alt="" width="300"/>
</p>

# Ferdium Internal Server

Ferdium ships with an embedded **AdonisJS 5** server in `src/internal-server/`. It powers the local/accountless mode and stores app configuration in a local SQLite database instead of requiring a remote Ferdium server.

## What it does

The internal server is used to:

- store local settings and preferences;
- persist services and workspaces for accountless usage;
- provide the import/export flow exposed through `Help > Import/Export Configuration Data`;
- serve a localhost-only API that the Electron app talks to.

## Runtime architecture

The server entrypoint is `src/internal-server/start.ts`.

At startup Ferdium:

1. sets `ENV_PATH` to `src/internal-server/env.ini`;
2. ensures a writable SQLite database exists at `<user data path>/server.sqlite`;
3. injects runtime environment variables such as `DB_PATH`, `USER_PATH`, `HOST`, `PORT`, and `FERDIUM_LOCAL_TOKEN`;
4. boots the AdonisJS HTTP server via `@adonisjs/ignitor`.

This means the checked-in `env.ini` is a template/default config, while the actual database file is created in the user's application data directory at runtime.

## Key differences from the hosted server flow

Compared with using a hosted Ferdium server, the embedded server:

- is bundled with the desktop app;
- runs locally on `localhost`;
- uses a local SQLite database (`server.sqlite`);
- does not depend on remote authentication for accountless mode;
- is intended for a single local app instance / user data directory.

## Configuration

Default configuration lives in `src/internal-server/env.ini`.

Notable values currently checked into the repository:

- `APP_NAME=Ferdium Internal Server`
- `DB_CONNECTION=sqlite`
- `IS_CREATION_ENABLED=true`
- `CONNECT_WITH_FRANZ=true`

`CONNECT_WITH_FRANZ` controls whether migration/import compatibility with older Franz/Ferdi ecosystems remains enabled.

## Backups and migration

Because accountless data is stored locally, there is no automatic cloud sync in this mode.

To back up or migrate local data:

1. open Ferdium;
2. go to `Help > Import/Export Configuration Data`;
3. export your data from the page opened in the browser;
4. keep the exported file somewhere safe.

To restore data, use the corresponding import option from the same page.

## Source layout

The internal server source is organized under:

- `src/internal-server/app/` - controllers, models, and app logic;
- `src/internal-server/config/` - AdonisJS configuration;
- `src/internal-server/database/` - migrations and SQLite template assets;
- `src/internal-server/public/` - static assets;
- `src/internal-server/resources/` - server-rendered resources/templates;
- `src/internal-server/start/` - AdonisJS startup hooks/providers.

## Development notes

Useful repo-level commands related to the internal server:

```bash
# Start the Electron app against the local API flow
pnpm start:local

# Start the internal server test entry directly
pnpm start:server
```

For broader app development commands, see `CONTRIBUTING.md` and `CLAUDE.md`.
