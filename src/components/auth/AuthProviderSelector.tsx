import { observer } from 'mobx-react';
import type { FC } from 'react';
import type { AuthProvider } from '../../@types/auth';

const debug = require('../../preload-safe-debug')(
  'Ferdium:auth:AuthProviderSelector',
);

const MAX_TAB_PROVIDERS = 3;

interface AuthProviderSelectorProps {
  providers: AuthProvider[];
  activeProviderName: string;
  onProviderChange: (providerName: string) => void;
}

const AuthProviderSelector: FC<AuthProviderSelectorProps> = ({
  providers,
  activeProviderName,
  onProviderChange,
}) => {
  debug(
    `Rendering with ${providers.length} providers, active: ${activeProviderName}`,
  );

  if (providers.length <= 1) return null;

  // ≤3 providers: horizontal tab bar
  if (providers.length <= MAX_TAB_PROVIDERS) {
    return (
      <div
        className="flex items-center justify-center gap-1 rounded-lg bg-secondary-container p-1 dark:bg-container"
        role="tablist"
      >
        {providers.map(provider => {
          const isActive = provider.name === activeProviderName;
          return (
            <button
              key={provider.name}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand text-text-anti shadow'
                  : 'text-secondary hover:text-primary dark:text-secondary dark:hover:text-primary'
              }`}
              onClick={() => {
                debug(`Switching to provider: ${provider.name}`);
                onProviderChange(provider.name);
              }}
            >
              {provider.name}
            </button>
          );
        })}
      </div>
    );
  }

  // >3 providers: dropdown
  return (
    <div className="relative">
      <select
        className="w-full appearance-none rounded-lg border border-line bg-container px-4 py-2 pr-8 text-sm dark:border-line dark:bg-container"
        value={activeProviderName}
        onChange={e => {
          debug(`Switching to provider: ${e.target.value}`);
          onProviderChange(e.target.value);
        }}
      >
        {providers.map(provider => (
          <option key={provider.name} value={provider.name}>
            {provider.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
        <svg
          className="h-4 w-4 fill-current text-placeholder"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
};

export default observer(AuthProviderSelector);
