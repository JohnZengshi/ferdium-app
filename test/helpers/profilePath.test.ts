import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { profileHash, resolveProfilePath } from '../../src/helpers/profilePath';

jest.spyOn(require('node:fs'), 'existsSync');

describe('profilePath', () => {
  const mockedExistsSync = existsSync as jest.Mock;
  const baseDir = '/tmp/aitalk';
  const email = '  User@Example.COM  ';
  const hash = profileHash(email);

  beforeEach(() => {
    mockedExistsSync.mockReset();
  });

  describe('profileHash', () => {
    it('normalizes email before hashing', () => {
      expect(profileHash(email)).toBe(profileHash('user@example.com'));
    });

    it('produces different hashes for different emails', () => {
      expect(profileHash('a@example.com')).not.toBe(
        profileHash('b@example.com'),
      );
    });
  });

  describe('resolveProfilePath', () => {
    it('prefers new profile path when it exists', () => {
      const expectedPath = join(
        baseDir,
        'profiles',
        hash,
        'config',
        'settings.json',
      );
      mockedExistsSync.mockImplementation(path => path === expectedPath);

      expect(
        resolveProfilePath(baseDir, email, 'config', 'settings.json'),
      ).toBe(expectedPath);
      expect(mockedExistsSync).toHaveBeenNthCalledWith(1, expectedPath);
    });

    it('falls back to legacy path when only legacy path exists', () => {
      const newPath = join(baseDir, 'profiles', hash, 'server.sqlite');
      const legacyPath = join(
        baseDir,
        'profiles',
        'wa-akg',
        hash,
        'server.sqlite',
      );
      mockedExistsSync.mockImplementation(path => path === legacyPath);

      expect(resolveProfilePath(baseDir, email, 'server.sqlite')).toBe(
        legacyPath,
      );
      expect(mockedExistsSync).toHaveBeenNthCalledWith(1, newPath);
      expect(mockedExistsSync).toHaveBeenNthCalledWith(2, legacyPath);
    });

    it('defaults to new path when neither path exists', () => {
      const expectedPath = join(baseDir, 'profiles', hash, 'server.sqlite');
      mockedExistsSync.mockReturnValue(false);

      expect(resolveProfilePath(baseDir, email, 'server.sqlite')).toBe(
        expectedPath,
      );
    });

    it('works without subdirectories', () => {
      const expectedPath = join(baseDir, 'profiles', hash);
      mockedExistsSync.mockImplementation(path => path === expectedPath);

      expect(resolveProfilePath(baseDir, email)).toBe(expectedPath);
    });
  });
});
