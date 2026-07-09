import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import { Button, Dialog, DialogPlugin, Select, Switch } from 'tdesign-react';

import type { StoresProps } from '../../@types/ferdium-components.types';
import { LIVE_FERDIUM_API, LOCAL_SERVER } from '../../config';
import { isSnap, isWinPortable } from '../../environment';
import { ferdiumVersion } from '../../environment-remote';
import { updateVersionParse } from '../../helpers/update-helpers';
import { APP_LOCALES } from '../../i18n/languages';

const messages = defineMessages({
  title: {
    id: 'settingsModal.title',
    defaultMessage: 'Settings',
  },
  languageLabel: {
    id: 'settingsModal.languageLabel',
    defaultMessage: 'Language',
  },
  themeLabel: {
    id: 'settingsModal.themeLabel',
    defaultMessage: 'Theme',
  },
  themeLight: {
    id: 'settingsModal.themeLight',
    defaultMessage: 'Light',
  },
  themeDark: {
    id: 'settingsModal.themeDark',
    defaultMessage: 'Dark',
  },
  themeSystem: {
    id: 'settingsModal.themeSystem',
    defaultMessage: 'Follow system',
  },
  spellcheckLabel: {
    id: 'settingsModal.spellcheckLabel',
    defaultMessage: 'Enable spell check',
  },
  spellcheckDesc: {
    id: 'settingsModal.spellcheckDesc',
    defaultMessage:
      "AITALK uses your Mac's built-in spell checker to check for spelling errors. To change the spell check language, go to macOS System Settings.",
  },
  restartHint: {
    id: 'settingsModal.restartHint',
    defaultMessage: 'Restart to take effect',
  },
  logoutButton: {
    id: 'settingsModal.logoutButton',
    defaultMessage: 'Log out',
  },
  logoutConfirmTitle: {
    id: 'settingsModal.logoutConfirmTitle',
    defaultMessage: 'Log out',
  },
  logoutConfirmContent: {
    id: 'settingsModal.logoutConfirmContent',
    defaultMessage:
      'Logging out will not disconnect your accounts. Are you sure you want to log out?',
  },
  updatesLabel: {
    id: 'settingsModal.updatesLabel',
    defaultMessage: 'Updates',
  },
  automaticUpdatesLabel: {
    id: 'settingsModal.automaticUpdatesLabel',
    defaultMessage: 'Automatic updates',
  },
  betaUpdatesLabel: {
    id: 'settingsModal.betaUpdatesLabel',
    defaultMessage: 'Receive beta updates',
  },
  checkForUpdatesButton: {
    id: 'settingsModal.checkForUpdatesButton',
    defaultMessage: 'Check for updates',
  },
  installUpdateButton: {
    id: 'settingsModal.installUpdateButton',
    defaultMessage: 'Restart & install update',
  },
  updateAvailableSnap: {
    id: 'settingsModal.updateAvailableSnap',
    defaultMessage: 'Update available. Please update via Snap Store.',
  },
  updateStatusSearching: {
    id: 'settingsModal.updateStatusSearching',
    defaultMessage: 'Searching for updates...',
  },
  updateStatusAvailable: {
    id: 'settingsModal.updateStatusAvailable',
    defaultMessage: 'Update available, downloading...',
  },
  currentVersionLabel: {
    id: 'settingsModal.currentVersionLabel',
    defaultMessage: 'Current version:',
  },
  latestVersionLabel: {
    id: 'settingsModal.latestVersionLabel',
    defaultMessage: 'Latest version:',
  },
  updateStatusUpToDate: {
    id: 'settingsModal.updateStatusUpToDate',
    defaultMessage: 'You are using the latest version of Aitalk.',
  },
  updateFailedMessage: {
    id: 'settingsModal.updateFailedMessage',
    defaultMessage: 'An error occurred (check the console for more details).',
  },
  servicesUpdatedMessage: {
    id: 'settingsModal.servicesUpdatedMessage',
    defaultMessage: 'Your services have been updated.',
  },
  reloadServicesButton: {
    id: 'settingsModal.reloadServicesButton',
    defaultMessage: 'Reload services',
  },
  servicesUpToDateMessage: {
    id: 'settingsModal.servicesUpToDateMessage',
    defaultMessage: 'Your services are up-to-date.',
  },
});

interface IProps extends Partial<StoresProps>, WrappedComponentProps {
  visible: boolean;
  onClose: () => void;
}

interface IState {
  selectedLocale: string;
  themeMode: string;
  spellcheckEnabled: boolean;
  automaticUpdates: boolean;
  beta: boolean;
}

const ALLOWED_LOCALES = new Set(['en-US', 'zh-HANS', 'zh-HANT']);
const localeOptions = Object.entries(APP_LOCALES)
  .filter(([value]) => ALLOWED_LOCALES.has(value))
  .map(([value, label]) => ({
    label,
    value,
  }));

const getThemeMode = (settings: {
  adaptableDarkMode: boolean;
  darkMode: boolean;
}): string => {
  if (settings.adaptableDarkMode) return 'system';
  if (settings.darkMode) return 'dark';
  return 'light';
};

@inject('stores', 'actions')
@observer
class SettingsModal extends Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    const { stores } = this.props;
    this.state = {
      selectedLocale: stores!.app.locale,
      themeMode: getThemeMode(stores!.settings.all.app),
      spellcheckEnabled: stores!.settings.app.enableSpellchecking,
      automaticUpdates: stores!.settings.app.automaticUpdates,
      beta: stores!.settings.app.beta,
    };
  }

  componentDidUpdate(prevProps: IProps): void {
    if (!prevProps.visible && this.props.visible) {
      const { stores } = this.props;
      this.setState({
        selectedLocale: stores!.app.locale,
        themeMode: getThemeMode(stores!.settings.all.app),
        spellcheckEnabled: stores!.settings.app.enableSpellchecking,
        automaticUpdates: stores!.settings.app.automaticUpdates,
        beta: stores!.settings.app.beta,
      });
    }
  }

  handleLocaleChange = (value: string): void => {
    if (typeof value !== 'string') return;
    this.setState({ selectedLocale: value });

    const { stores, actions } = this.props;
    actions!.settings.update({ type: 'app', data: { locale: value } });
    stores!.app.changeLocale(value);
    actions!.user.update({ userData: { locale: value } });
  };

  handleThemeChange = (value: string): void => {
    if (!['light', 'dark', 'system'].includes(value)) return;

    this.setState({ themeMode: value });

    const { actions } = this.props;
    actions!.settings.update({
      type: 'app',
      data: {
        adaptableDarkMode: value === 'system',
        darkMode: value === 'dark',
      },
    });
  };

  handleSpellcheckChange = (value: boolean): void => {
    this.setState({ spellcheckEnabled: value });

    const { actions } = this.props;
    actions!.settings.update({
      type: 'app',
      data: { enableSpellchecking: value },
    });
  };

  handleAutomaticUpdatesChange = (value: boolean): void => {
    this.setState({ automaticUpdates: value });

    const { actions } = this.props;
    actions!.settings.update({
      type: 'app',
      data: { automaticUpdates: value },
    });
  };

  handleBetaChange = (value: boolean): void => {
    this.setState({ beta: value });

    const { actions } = this.props;
    actions!.settings.update({
      type: 'app',
      data: { beta: value },
    });
  };

  handleLogout = (): void => {
    const { intl, stores, actions, onClose } = this.props;

    onClose();

    const confirmDia = DialogPlugin.confirm({
      header: intl.formatMessage(messages.logoutConfirmTitle),
      body: intl.formatMessage(messages.logoutConfirmContent),
      placement: 'center',
      onConfirm: () => {
        const isUsingWithoutAccount =
          stores!.settings.app.server === LOCAL_SERVER;

        if (isUsingWithoutAccount) {
          actions!.settings.update({
            type: 'app',
            data: { server: LIVE_FERDIUM_API },
          });
        }
        stores!.user.isLoggingOut = true;
        actions!.user.logout();
        stores!.router.push(stores!.user.logoutRedirectRoute);
        confirmDia.hide();
      },
      onClose: () => {
        confirmDia.hide();
      },
    });
  };

  render(): ReactElement {
    const { visible, onClose, intl, stores, actions } = this.props;
    const {
      selectedLocale,
      themeMode,
      spellcheckEnabled,
      automaticUpdates,
      beta,
    } = this.state;

    const { updateStatus, updateVersion, updateStatusTypes, isOnline } =
      stores!.app;
    const { checkForUpdates, installUpdate } = actions!.app;
    const { showServicesUpdatedInfoBar } = stores!.ui;

    const isCheckingForUpdates = updateStatus === updateStatusTypes.CHECKING;
    const isUpdateAvailable = updateStatus === updateStatusTypes.AVAILABLE;
    const noUpdateAvailable = updateStatus === updateStatusTypes.NOT_AVAILABLE;
    const updateIsReadyToInstall =
      updateStatus === updateStatusTypes.DOWNLOADED;
    const updateFailed = updateStatus === updateStatusTypes.FAILED;
    const installUpdateMessage = isSnap
      ? messages.updateAvailableSnap
      : messages.installUpdateButton;

    let updateButtonLabelMessage = messages.checkForUpdatesButton;
    if (isCheckingForUpdates) {
      updateButtonLabelMessage = messages.updateStatusSearching;
    } else if (isUpdateAvailable) {
      updateButtonLabelMessage = messages.updateStatusAvailable;
    }

    return (
      <Dialog
        visible={visible}
        header={false}
        footer={false}
        closeBtn={false}
        width={707}
        destroyOnClose
        onClose={onClose}
        className="[&_.t-dialog]:rounded-none [&_.t-dialog\\_\\_body]:!p-0 [&_.t-dialog\\_\\_wrap]:!items-center [&_.t-dialog]:!p-0 overflow-hidden"
      >
        <div className="flex h-[640px] flex-col">
          <div className="flex h-[60px] shrink-0 items-center justify-between bg-component pl-[32px] pr-[36px]">
            <span className="text-[20px] font-semibold leading-[24px] text-primary">
              {intl.formatMessage(messages.title)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer border-none bg-transparent p-0 text-[20px] leading-none text-secondary hover:text-primary"
            >
              ×
            </button>
          </div>

          <div className="flex flex-auto flex-col bg-container px-[32px] pt-[22px]">
            <div className="text-[16px] font-semibold leading-[20px] text-primary">
              {intl.formatMessage(messages.languageLabel)}
            </div>

            <div className="mt-[10px]">
              <Select
                options={localeOptions}
                value={selectedLocale}
                onChange={value => {
                  if (typeof value === 'string') {
                    this.handleLocaleChange(value);
                  }
                }}
                className="!h-[32px] !w-full [&_.t-select__trigger]:!h-[32px] [&_.t-select__trigger]:!rounded-[3px] [&_.t-select__trigger]:!border-line"
              />
            </div>

            <div className="mt-[23px] text-[16px] font-semibold leading-[20px] text-primary">
              {intl.formatMessage(messages.themeLabel)}
            </div>

            <div className="mt-[10px]">
              <Select
                options={[
                  {
                    label: intl.formatMessage(messages.themeLight),
                    value: 'light',
                  },
                  {
                    label: intl.formatMessage(messages.themeDark),
                    value: 'dark',
                  },
                  {
                    label: intl.formatMessage(messages.themeSystem),
                    value: 'system',
                  },
                ]}
                value={themeMode}
                onChange={value => {
                  if (typeof value === 'string') {
                    this.handleThemeChange(value);
                  }
                }}
                className="!h-[32px] !w-full [&_.t-select__trigger]:!h-[32px] [&_.t-select__trigger]:!rounded-[3px] [&_.t-select__trigger]:!border-line"
              />
            </div>

            <div className="mt-[23px] flex items-center gap-[12px]">
              <span className="text-[16px] font-semibold leading-[22px] text-primary">
                {intl.formatMessage(messages.spellcheckLabel)}
              </span>
              <Switch
                value={spellcheckEnabled}
                onChange={this.handleSpellcheckChange}
              />
            </div>

            <div className="mt-[9px] text-[14px] leading-[21px] text-placeholder">
              {intl.formatMessage(messages.spellcheckDesc)}
            </div>

            <div className="mt-[9px] flex items-center gap-[9px]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="7" cy="7" r="7" fill="#EF7D16" />
                <rect
                  x="6.5"
                  y="3.5"
                  width="1"
                  height="4.5"
                  rx="0.5"
                  fill="white"
                />
                <rect
                  x="6.5"
                  y="9"
                  width="1"
                  height="1.5"
                  rx="0.5"
                  fill="white"
                />
              </svg>
              <span className="text-[14px] leading-[20px] text-placeholder">
                {intl.formatMessage(messages.restartHint)}
              </span>
            </div>

            <div className="mt-[23px] text-[16px] font-semibold leading-[20px] text-primary">
              {intl.formatMessage(messages.updatesLabel)}
            </div>

            <div className="mt-[12px] flex items-center gap-[12px]">
              <span className="text-[14px] leading-[20px] text-primary">
                {intl.formatMessage(messages.automaticUpdatesLabel)}
              </span>
              <Switch
                value={automaticUpdates}
                onChange={this.handleAutomaticUpdatesChange}
              />
            </div>

            {automaticUpdates && !isWinPortable && (
              <div className="mt-[12px] space-y-[10px]">
                <div className="flex items-center gap-[12px]">
                  <span className="text-[14px] leading-[20px] text-primary">
                    {intl.formatMessage(messages.betaUpdatesLabel)}
                  </span>
                  <Switch value={beta} onChange={this.handleBetaChange} />
                </div>

                <div className="flex flex-wrap items-center gap-[8px]">
                  {updateIsReadyToInstall || (isSnap && isUpdateAvailable) ? (
                    <Button
                      size="small"
                      onClick={installUpdate}
                      disabled={isSnap}
                      theme={isSnap ? 'default' : 'primary'}
                    >
                      {intl.formatMessage(installUpdateMessage)}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outline"
                      onClick={checkForUpdates}
                      disabled={
                        !automaticUpdates ||
                        isCheckingForUpdates ||
                        isUpdateAvailable ||
                        !isOnline
                      }
                      loading={isCheckingForUpdates && !isUpdateAvailable}
                    >
                      {intl.formatMessage(updateButtonLabelMessage)}
                    </Button>
                  )}
                </div>

                <div className="text-[14px] leading-[20px] text-placeholder">
                  {isUpdateAvailable ||
                  updateIsReadyToInstall ||
                  (updateFailed && updateVersion) ? (
                    <>
                      {intl.formatMessage(messages.currentVersionLabel)}{' '}
                      {ferdiumVersion}
                      <span className="ml-[12px]">
                        {intl.formatMessage(messages.latestVersionLabel)}{' '}
                        {updateVersionParse(updateVersion)}
                      </span>
                    </>
                  ) : (
                    <>
                      {intl.formatMessage(messages.currentVersionLabel)}{' '}
                      {ferdiumVersion}
                    </>
                  )}
                </div>

                {noUpdateAvailable && (
                  <div className="text-[14px] leading-[20px] text-placeholder">
                    {intl.formatMessage(messages.updateStatusUpToDate)}
                  </div>
                )}

                {updateFailed && (
                  <div className="text-[14px] leading-[20px] text-error">
                    {intl.formatMessage(messages.updateFailedMessage)}
                  </div>
                )}

                {showServicesUpdatedInfoBar ? (
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[14px] leading-[20px] text-placeholder">
                      {intl.formatMessage(messages.servicesUpdatedMessage)}
                    </span>
                    <Button
                      size="small"
                      onClick={() => window.location.reload()}
                    >
                      {intl.formatMessage(messages.reloadServicesButton)}
                    </Button>
                  </div>
                ) : (
                  <div className="text-[14px] leading-[20px] text-placeholder">
                    {intl.formatMessage(messages.servicesUpToDateMessage)}
                  </div>
                )}
              </div>
            )}

            <div className="mt-auto flex justify-end pb-[32px]">
              <Button
                className="!h-[32px] !w-[88px] !rounded-[4px] !border-none !bg-component !text-[14px] !text-primary"
                onClick={this.handleLogout}
              >
                {intl.formatMessage(messages.logoutButton)}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }
}

export default injectIntl(SettingsModal);
