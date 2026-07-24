import {
  isAuthorizedPayload,
  isPasswordPayload,
  isPasswordSubmittedPayload,
} from '../../../src/features/telegramAutomation/helpers';

describe('telegramAutomation login response classifiers', () => {
  describe('isAuthorizedPayload', () => {
    it('accepts explicit status authorized', () => {
      expect(isAuthorizedPayload({ status: 'authorized' })).toBe(true);
    });

    it('accepts explicit type authorized', () => {
      expect(isAuthorizedPayload({ type: 'authorized' })).toBe(true);
    });

    it('rejects legacy { ok: true }', () => {
      expect(isAuthorizedPayload({ ok: true })).toBe(false);
      expect(isAuthorizedPayload({ ok: true, me: { id: 1 } })).toBe(false);
    });

    it('rejects unauthorized / not_authorized (no fuzzy includes)', () => {
      expect(isAuthorizedPayload({ status: 'unauthorized' })).toBe(false);
      expect(isAuthorizedPayload({ status: 'not_authorized' })).toBe(false);
      expect(isAuthorizedPayload({ type: 'not_authorized' })).toBe(false);
    });

    it('rejects non-authorized bodies', () => {
      expect(isAuthorizedPayload(null)).toBe(false);
      expect(isAuthorizedPayload({})).toBe(false);
      expect(isAuthorizedPayload({ status: 'password_required' })).toBe(false);
      expect(isAuthorizedPayload({ status: 'password_submitted' })).toBe(false);
    });
  });

  describe('isPasswordPayload', () => {
    it('matches password_required status/type', () => {
      expect(isPasswordPayload({ status: 'password_required' })).toBe(true);
      expect(isPasswordPayload({ type: 'password_required' })).toBe(true);
    });

    it('does not match unrelated ok bodies', () => {
      expect(isPasswordPayload({ ok: true })).toBe(false);
      expect(isPasswordPayload({ status: 'authorized' })).toBe(false);
    });
  });

  describe('isPasswordSubmittedPayload', () => {
    it('matches password_submitted status/type', () => {
      expect(isPasswordSubmittedPayload({ status: 'password_submitted' })).toBe(
        true,
      );
      expect(isPasswordSubmittedPayload({ type: 'password_submitted' })).toBe(
        true,
      );
    });

    it('matches legacy { ok: true } as a pending submission', () => {
      expect(isPasswordSubmittedPayload({ ok: true })).toBe(true);
      expect(isPasswordSubmittedPayload({ ok: true, me: { id: 1 } })).toBe(
        true,
      );
    });

    it('does not match authorized or password_required', () => {
      expect(isPasswordSubmittedPayload({ status: 'authorized' })).toBe(false);
      expect(isPasswordSubmittedPayload({ status: 'password_required' })).toBe(
        false,
      );
      expect(isPasswordSubmittedPayload({})).toBe(false);
    });
  });
});
