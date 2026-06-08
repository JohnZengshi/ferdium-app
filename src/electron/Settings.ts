import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { outputJsonSync, pathExistsSync, readJsonSync } from 'fs-extra';
import { action, makeObservable, observable, toJS } from 'mobx';
import { userDataPath } from '../environment-remote';

const debug = require('../preload-safe-debug')('Ferdium:Settings');

export default class Settings {
  type: string = '';

  defaultState: object;

  @observable store: object = {};

  profileEmail: string = '';

  constructor(type: string, defaultState = {}) {
    makeObservable(this);

    this.type = type;
    this.store = this._clone(defaultState);
    this.defaultState = defaultState;

    if (pathExistsSync(this.settingsFile)) {
      this._hydrate();
    } else {
      this._writeFile();
    }
  }

  @action setProfileEmail(email?: string | null): void {
    this.profileEmail = email?.trim().toLowerCase() ?? '';
    if (pathExistsSync(this.settingsFile)) {
      this._hydrate();
    } else {
      this.store = this._clone(this.defaultState);
      this._writeFile();
    }
  }

  @action set(settings: object): void {
    this.store = this._merge(settings);

    this._writeFile();
  }

  get all(): object {
    return this.store;
  }

  get allSerialized(): object {
    return toJS(this.store);
  }

  get(key: string | number): any {
    return this.store[key];
  }

  _merge(settings: object): object {
    return Object.assign(
      this._clone(this.defaultState),
      this._clone(this.store),
      settings,
    );
  }

  _clone(settings: object): object {
    return JSON.parse(JSON.stringify(settings));
  }

  _hydrate(): void {
    this.store = this._merge(readJsonSync(this.settingsFile));
    debug('Hydrate store', this.type, this.allSerialized);
  }

  _writeFile(): void {
    outputJsonSync(this.settingsFile, this.store, {
      spaces: 2,
    });
    debug('Write settings file', this.type, this.allSerialized);
  }

  get settingsFile(): string {
    const filename = `${this.type === 'app' ? 'settings' : this.type}.json`;
    if (!this.profileEmail) {
      return userDataPath('config', filename);
    }
    const profileHash = createHash('sha256')
      .update(this.profileEmail)
      .digest('hex');
    return join(
      userDataPath(),
      'profiles',
      'wa-akg',
      profileHash,
      'config',
      filename,
    );
  }
}
