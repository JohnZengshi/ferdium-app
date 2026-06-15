# Migrating account data

This guide shows you how to export your current Aitalk setup from the hosted server or from an accountless session for safe-keeping, backup, or transferring to a new instance.

Before getting into the details of using an online account vs accountless, let's quickly review what the differences are between the two:

## Using Aitalk with an Account

The main advantage of using Aitalk with an account is that your configuration data is stored on a cloud server - and thus, when moving to a different machine, once you log in, all these configurations are applied to the Aitalk instance on your new machine.

**But**, if you use a hosted Aitalk server, you need to be able to reach it. If the server is not accessible, there are no local copies. It is advisable to make regular backups just to be safe.

## Using Aitalk without an account (Accountless)

Accountless instances have all the same functionality as account-based ones with the exception of multi-machine synchronization. If you don't intend to use this app on multiple machines, there's no benefit to having an online account. Having a backup of your `export.ferdium-data` file whenever you make changes to your setup provides a similarly secure (albeit manual) alternative to automatic syncing.

## Exporting

1. Have Aitalk running on your system. (Even if you are on the initial "Get started" page, these instructions will work.)
2. Go to `Help > Import/Export Configuration Data` which should open the corresponding URL in your default browser.
3. Click on `Export your data to a file`.
4. Save the exported data file to anywhere you'd like for safe-keeping/backup.

## Importing

1. Have Aitalk running on your system.
2. When you get to the screen that says "Get Started", go to `Help > Import/Export Configuration Data` which should open a local URL in your default browser.
3. Click on `Import your data from a file`.
4. Using the File browser button, find the previously saved data file on your system and click the "Import data" button.
5. Restart your application.

_Notes:_

1. Setting up new instances or migrating to an accountless setup will require all services to be logged-in again. Session information stays only on your local machine.
2. Importing data adds to the current list of services rather than replacing it. If you do not want duplicates, delete your pre-existing services prior to importing.
3. If you are migrating from an older Ferdi installation, you can use the migration scripts in `scripts/migration/` to automatically transfer your user data directory (configuration, services, and workspaces) from Ferdi to Aitalk. See `scripts/migration/migrate-unix.sh` (Linux/macOS) or `scripts/migration/migrate-windows.ps1` (Windows).
4. If you previously used the Ferdi server, consider self-hosting a [ferdium-server](https://github.com/ferdium/ferdium-server) instance or using the accountless mode with regular backups.
