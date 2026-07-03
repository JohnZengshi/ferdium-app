import { session } from '@electron/remote';
import { ipcRenderer } from 'electron';
import { action, autorun, observable } from 'mobx';
import type { Stores } from '../../@types/stores.types';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:serviceProxy',
);

export const config = observable({
  isEnabled: true,
});

export default function init(stores: Stores) {
  debug('Initializing `serviceProxy` feature');

  const setIsEnabled = action((value: boolean) => {
    config.isEnabled = value;
  });

  autorun(async () => {
    setIsEnabled(true);

    const services = stores.services.enabled;
    const proxySettings = stores.settings.proxy;

    debug('Service Proxy autorun');

    const applyProxy = async (service: (typeof services)[number]) => {
      const sandbox = stores.app.sandboxServices.find(({ services }) =>
        services.includes(service.id),
      );
      const partition = stores.settings.app.sandboxServices
        ? sandbox
          ? `persist:sandbox-${sandbox.id}`
          : service.partition
        : 'persist:general-session';
      const s = session.fromPartition(partition);
      const serviceProxyConfig = proxySettings[service.id];

      if (
        config.isEnabled &&
        serviceProxyConfig?.isEnabled &&
        serviceProxyConfig.host
      ) {
        const proxyHost = `${serviceProxyConfig.host}${
          serviceProxyConfig.port ? `:${serviceProxyConfig.port}` : ''
        }`;

        const needsBridge =
          serviceProxyConfig.protocol === 'socks5' &&
          serviceProxyConfig.user &&
          serviceProxyConfig.password;

        let proxyRules: string;

        if (needsBridge) {
          try {
            const result = await ipcRenderer.invoke(
              'service-proxy-bridge-start',
              {
                serviceId: service.id,
                host: serviceProxyConfig.host,
                port: serviceProxyConfig.port,
                protocol: serviceProxyConfig.protocol,
                user: serviceProxyConfig.user,
                password: serviceProxyConfig.password,
              },
            );
            proxyRules = result.proxyRules;
          } catch (error) {
            debug(
              `Failed to start proxy bridge for "${service.name}" (${service.id})`,
              error,
            );
            proxyRules = `socks5://${proxyHost}`;
          }
        } else {
          ipcRenderer
            .invoke('service-proxy-bridge-stop', service.id)
            .catch(error => debug('Failed to stop proxy bridge', error));

          proxyRules = serviceProxyConfig.protocol
            ? `${serviceProxyConfig.protocol}://${proxyHost}`
            : proxyHost;
        }

        debug(
          `Setting proxy config from service settings for "${service.name}" (${service.id}) to`,
          proxyRules,
        );

        s.setProxy({ proxyRules })
          .then(() => {
            debug(
              `Using proxy "${proxyHost}" for "${service.name}" (${service.id})`,
            );
          })
          .catch(error => console.error(error));
      } else {
        debug(`Clearing proxy config for "${service.name}" (${service.id})`);

        ipcRenderer
          .invoke('service-proxy-bridge-stop', service.id)
          .catch(error => debug('Failed to stop proxy bridge', error));

        s.setProxy({ proxyRules: '' })
          .then(() => {
            debug(`Proxy cleared for "${service.name}" (${service.id})`);
          })
          .catch(error => console.error(error));
      }
    };

    await Promise.all(services.map(service => applyProxy(service)));
  });
}
