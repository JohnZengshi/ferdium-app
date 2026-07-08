import { formatProxy } from '../../src/helpers/formatProxy';

describe('formatProxy', () => {
  it('returns empty string for null', () => {
    expect(formatProxy(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatProxy(undefined)).toBe('');
  });

  it('returns empty string for non-object', () => {
    expect(formatProxy('string')).toBe('');
    expect(formatProxy(42)).toBe('');
    expect(formatProxy(true)).toBe('');
  });

  it('returns empty string for empty object', () => {
    expect(formatProxy({})).toBe('');
  });

  it('returns empty string when proxy is not enabled', () => {
    expect(formatProxy({ isEnabled: false, host: 'x.example.com' })).toBe('');
  });

  it('returns empty string when enabled but missing host', () => {
    expect(formatProxy({ isEnabled: true })).toBe('');
    expect(formatProxy({ isEnabled: true, port: 8080 })).toBe('');
  });

  it('returns host when enabled with host only', () => {
    expect(formatProxy({ isEnabled: true, host: 'proxy.example.com' })).toBe(
      'proxy.example.com',
    );
  });

  it('returns host:port when enabled with host and numeric port', () => {
    expect(
      formatProxy({ isEnabled: true, host: 'proxy.example.com', port: 8080 }),
    ).toBe('proxy.example.com:8080');
  });

  it('returns host:port when enabled with host and string port', () => {
    expect(
      formatProxy({
        isEnabled: true,
        host: 'proxy.example.com',
        port: '3128',
      }),
    ).toBe('proxy.example.com:3128');
  });
});
