export interface ServiceProxyConfig {
  isEnabled?: boolean;
  host?: string;
  port?: string | number;
}

export function formatProxy(proxy: unknown): string {
  if (!proxy || typeof proxy !== 'object') return '';
  const config = proxy as ServiceProxyConfig;
  if (!config.isEnabled || !config.host) return '';
  return config.port ? `${config.host}:${config.port}` : config.host;
}
