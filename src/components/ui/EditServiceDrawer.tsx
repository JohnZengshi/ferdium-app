import { ipcRenderer } from 'electron';
import { debounce } from 'lodash';
import { useCallback, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { CloseIcon, ErrorCircleFilledIcon } from 'tdesign-icons-react';
import {
  Button,
  Drawer,
  Input,
  MessagePlugin,
  Select,
  Switch,
  Textarea,
} from 'tdesign-react';

const messages = defineMessages({
  bindAccountDialogTitle: {
    id: 'editDrawer.bindAccountDialogTitle',
    defaultMessage: 'Bind Account',
  },
  basicSettings: {
    id: 'editDrawer.basicSettings',
    defaultMessage: 'Basic Settings',
  },
  accountRemark: {
    id: 'editDrawer.accountRemark',
    defaultMessage: 'Account Notes',
  },
  accountRemarkPlaceholder: {
    id: 'editDrawer.accountRemarkPlaceholder',
    defaultMessage: 'Enter notes here',
  },
  proxySettings: {
    id: 'editDrawer.proxySettings',
    defaultMessage: 'Proxy Settings',
  },
  proxyRiskWarning: {
    id: 'editDrawer.proxyRiskWarning',
    defaultMessage:
      'It is recommended to enable proxy, disabling it may pose risks',
  },
  autoFillLabel: {
    id: 'editDrawer.autoFillLabel',
    defaultMessage: 'Auto-Fill',
  },
  autoFillPlaceholder: {
    id: 'editDrawer.autoFillPlaceholder',
    defaultMessage: 'Paste IP info here — it will auto-fill the fields below',
  },
  proxyType: {
    id: 'editDrawer.proxyType',
    defaultMessage: 'Proxy Type',
  },
  proxyHost: {
    id: 'editDrawer.proxyHost',
    defaultMessage: 'Host',
  },
  proxyHostPlaceholder: {
    id: 'editDrawer.proxyHostPlaceholder',
    defaultMessage: 'e.g. http://127.0.0.1',
  },
  proxyPort: {
    id: 'editDrawer.proxyPort',
    defaultMessage: 'Port',
  },
  proxyPortPlaceholder: {
    id: 'editDrawer.proxyPortPlaceholder',
    defaultMessage: 'e.g. 8080',
  },
  proxyUser: {
    id: 'editDrawer.proxyUser',
    defaultMessage: 'Username',
  },
  proxyUserPlaceholder: {
    id: 'editDrawer.proxyUserPlaceholder',
    defaultMessage: 'Fill in if applicable',
  },
  proxyPassword: {
    id: 'editDrawer.proxyPassword',
    defaultMessage: 'Password',
  },
  proxyPasswordPlaceholder: {
    id: 'editDrawer.proxyPasswordPlaceholder',
    defaultMessage: 'Fill in if applicable',
  },
  proxyCheck: {
    id: 'editDrawer.proxyCheck',
    defaultMessage: 'Test Connection',
  },
  proxyCheckDesc: {
    id: 'editDrawer.proxyCheckDesc',
    defaultMessage: 'Test proxy by accessing WhatsApp Web',
  },
  cookieSettings: {
    id: 'editDrawer.cookieSettings',
    defaultMessage: 'Cookie Settings',
  },
  cookieAutoFill: {
    id: 'editDrawer.cookieAutoFill',
    defaultMessage: 'Auto-Fill Cookie',
  },
  cookiePlaceholder: {
    id: 'editDrawer.cookiePlaceholder',
    defaultMessage: 'Enter cookie content',
  },
  cookieHint: {
    id: 'editDrawer.cookieHint',
    defaultMessage: 'Used for login session persistence',
  },
  cancel: {
    id: 'editDrawer.cancel',
    defaultMessage: 'Cancel',
  },
  confirm: {
    id: 'editDrawer.confirm',
    defaultMessage: 'Confirm',
  },
  proxyWarningMessage: {
    id: 'editDrawer.proxyWarningMessage',
    defaultMessage: 'Please enter proxy host and port first',
  },
  proxySuccessMessage: {
    id: 'editDrawer.proxySuccessMessage',
    defaultMessage: '{label} proxy connected (latency: {latency}ms)',
  },
  proxyErrorMessage: {
    id: 'editDrawer.proxyErrorMessage',
    defaultMessage: '{label} proxy connection failed: {error}',
  },
  proxyTestFailedMessage: {
    id: 'editDrawer.proxyTestFailedMessage',
    defaultMessage: 'Test failed, please check proxy config',
  },
  proxyWhatsAppRequestFailed: {
    id: 'editDrawer.proxyWhatsAppRequestFailed',
    defaultMessage: 'Proxy test failed',
  },
  autoFillFormatHint: {
    id: 'editDrawer.autoFillFormatHint',
    defaultMessage:
      'HTTP: http://[user:pass@]host:port\nSOCKS5: socks5://[user:pass@]host:port',
  },
  autoFillFormatError: {
    id: 'editDrawer.autoFillFormatError',
    defaultMessage:
      'Format not recognized. Use http://[user:pass@]host:port or socks5://[user:pass@]host:port',
  },
});

interface ParsedProxy {
  isEnabled: boolean;
  protocol?: string;
  host?: string;
  port?: string;
  user?: string;
  password?: string;
}

const parseProxyString = (content: string): ParsedProxy => {
  if (!content?.trim()) return { isEnabled: false };
  const regex =
    /^(?<protocol>https?|socks5):\/\/(?:(?<user>[^:]+):(?<password>[^@]+)@)?(?<host>[^:]+):(?<port>\d+)$/;
  const match = content.trim().match(regex);
  if (match?.groups) {
    return {
      isEnabled: true,
      protocol:
        match.groups.protocol === 'https' ? 'http' : match.groups.protocol,
      host: match.groups.host,
      port: match.groups.port,
      user: match.groups.user || '',
      password: match.groups.password || '',
    };
  }
  return { isEnabled: false };
};

export interface ServiceProxy {
  isEnabled?: boolean;
  protocol?: string;
  host?: string;
  port?: string | number;
  user?: string;
  password?: string;
}

interface EditServiceDrawerProps {
  visible: boolean;
  /** Existing service data for editing; null/undefined means create mode */
  initialData?: {
    name?: string;
    proxy?: ServiceProxy | null;
    cookie?: string;
  } | null;
  onClose: () => void;
  onConfirm: (data: { name: string; proxy: ServiceProxy }) => void;
  defaultName?: string;
}

export default function EditServiceDrawer({
  visible,
  initialData,
  onClose,
  onConfirm,
  defaultName = 'WhatsApp',
}: EditServiceDrawerProps) {
  const intl = useIntl();

  const existingProxy = (initialData?.proxy as ServiceProxy | null) || {};

  const [remark, setRemark] = useState(initialData?.name ?? '');
  const [proxyEnabled, setProxyEnabled] = useState(
    existingProxy?.isEnabled ?? false,
  );
  const [proxyType, setProxyType] = useState(existingProxy?.protocol ?? 'http');
  const [proxyHost, setProxyHost] = useState(existingProxy?.host ?? '');
  const [proxyPort, setProxyPort] = useState(
    existingProxy?.port == null ? '' : String(existingProxy.port),
  );
  const [proxyUser, setProxyUser] = useState(existingProxy?.user ?? '');
  const [proxyPassword, setProxyPassword] = useState(
    existingProxy?.password ?? '',
  );
  const [cookieEnabled, setCookieEnabled] = useState(!!initialData?.cookie);
  const [cookie, setCookie] = useState(initialData?.cookie ?? '');
  const [isProxyTesting, setIsProxyTesting] = useState(false);

  // Auto-fill textarea (not persisted in state, fires on paste)
  const handleAutoFillRef = useRef(
    debounce((content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      const parsed = parseProxyString(trimmedContent);
      if (!parsed.isEnabled) {
        MessagePlugin.warning(intl.formatMessage(messages.autoFillFormatError));
        return;
      }

      setProxyEnabled(true);
      setProxyType(parsed.protocol || 'http');
      setProxyHost(parsed.host || '');
      setProxyPort(parsed.port || '');
      setProxyUser(parsed.user || '');
      setProxyPassword(parsed.password || '');
    }, 300),
  );

  const handleProxyCheck = useCallback(async () => {
    if (!proxyHost || !proxyPort) {
      MessagePlugin.warning(intl.formatMessage(messages.proxyWarningMessage));
      return;
    }
    setIsProxyTesting(true);
    try {
      const result = await ipcRenderer.invoke('proxy-test-request', {
        host: proxyHost,
        port: Number.parseInt(proxyPort, 10),
        protocol: proxyType,
        user: proxyUser || undefined,
        password: proxyPassword || undefined,
        timeout: 10_000,
      });
      if (result.reachable) {
        const label = result.protocol === 'socks5' ? 'SOCKS5' : 'HTTP';
        MessagePlugin.success(
          intl.formatMessage(messages.proxySuccessMessage, {
            label,
            latency: result.latency,
          }),
        );
      } else {
        let errorMessage: string;
        if (result.error === 'WHATSAPP_REQUEST_FAILED') {
          errorMessage = intl.formatMessage(
            messages.proxyWhatsAppRequestFailed,
          );
        } else {
          const label = proxyType === 'socks5' ? 'SOCKS5' : 'HTTP';
          errorMessage = intl.formatMessage(messages.proxyErrorMessage, {
            label,
            error: result.error || 'Check host and port',
          });
        }
        MessagePlugin.error(errorMessage);
      }
    } catch {
      MessagePlugin.error(intl.formatMessage(messages.proxyTestFailedMessage));
    } finally {
      setIsProxyTesting(false);
    }
  }, [proxyHost, proxyPort, proxyType, proxyUser, proxyPassword, intl]);

  const handleConfirm = () => {
    const proxy: ServiceProxy = proxyEnabled
      ? {
          isEnabled: true,
          protocol: proxyType,
          host: proxyHost,
          port: proxyPort,
          user: proxyUser,
          password: proxyPassword,
        }
      : { isEnabled: false };

    onConfirm({ name: remark || defaultName, proxy });
  };

  return (
    <Drawer
      header={
        <div className="flex items-center justify-between w-full h-full">
          <span className="text-[18px] font-semibold text-primary">
            {intl.formatMessage(messages.bindAccountDialogTitle)}
          </span>
          <CloseIcon
            className="w-[16px] h-[16px] text-secondary cursor-pointer"
            onClick={onClose}
          />
        </div>
      }
      visible={visible}
      size="548px"
      onClose={onClose}
      destroyOnClose
      closeOnOverlayClick={false}
      placement="right"
      closeBtn={false}
      className="[&_.t-drawer__body]:!p-0"
      footer={
        <div className="flex items-center justify-end h-full px-[24px] gap-[12px] border-t border-line">
          <Button
            theme="default"
            variant="base"
            className="!w-[80px] !h-[40px] !bg-secondary-container !text-primary border-none"
            onClick={onClose}
          >
            {intl.formatMessage(messages.cancel)}
          </Button>
          <Button
            theme="primary"
            className="!w-[88px] !h-[40px] !bg-brand"
            onClick={handleConfirm}
          >
            {intl.formatMessage(messages.confirm)}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-[24px] pt-[28px] pb-[32px]">
          {/* Basic Settings */}
          <div className="mb-[40px]">
            <div className="text-[16px] font-semibold text-primary mb-[24px]">
              {intl.formatMessage(messages.basicSettings)}
            </div>
            <div className="flex items-start gap-x-[12px] mb-[20px]">
              <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                {intl.formatMessage(messages.accountRemark)}
              </div>
              <div className="relative w-[406px]">
                <Input
                  className="!h-[40px] !border-line"
                  placeholder={intl.formatMessage(
                    messages.accountRemarkPlaceholder,
                  )}
                  value={remark}
                  onChange={val => setRemark(val)}
                />
                <span className="absolute right-[12px] top-[10px] text-[12px] text-brand">
                  {remark.length}/10
                </span>
              </div>
            </div>
          </div>

          {/* Proxy Settings */}
          <div className="mb-[40px]">
            <div className="flex items-center gap-x-[12px] mb-[24px]">
              <span className="text-[16px] font-semibold text-primary">
                {intl.formatMessage(messages.proxySettings)}
              </span>
              <Switch
                value={proxyEnabled}
                onChange={val => setProxyEnabled(val)}
              />
              {!proxyEnabled && (
                <div className="flex items-center gap-x-[4px]">
                  <ErrorCircleFilledIcon className="w-[16px] h-[16px] text-warning" />
                  <span className="text-[12px] text-placeholder">
                    {intl.formatMessage(messages.proxyRiskWarning)}
                  </span>
                </div>
              )}
            </div>

            {proxyEnabled && (
              <>
                <div className="flex items-start gap-x-[12px] mb-[20px]">
                  <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                    {intl.formatMessage(messages.autoFillLabel)}
                  </div>
                  <div className="w-[406px] flex flex-col gap-[8px]">
                    <Textarea
                      className="flex-auto !border-line w-full"
                      placeholder={intl.formatMessage(
                        messages.autoFillPlaceholder,
                      )}
                      onChange={val => handleAutoFillRef.current(val)}
                    />
                    <div className="mt-[8px] whitespace-pre-line text-[12px] text-placeholder">
                      {intl.formatMessage(messages.autoFillFormatHint)}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-x-[12px] mb-[16px]">
                  <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                    {intl.formatMessage(messages.proxyType)}
                  </div>
                  <Select
                    className="!w-[406px]"
                    value={proxyType}
                    disabled
                    options={[
                      { label: 'HTTP', value: 'http' },
                      { label: 'SOCKS5', value: 'socks5' },
                    ]}
                  />
                </div>
                <div className="flex items-start gap-x-[12px] mb-[16px]">
                  <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                    {intl.formatMessage(messages.proxyHost)}
                  </div>
                  <Input
                    className="!w-[406px] !h-[40px] !border-line"
                    placeholder={intl.formatMessage(
                      messages.proxyHostPlaceholder,
                    )}
                    value={proxyHost}
                    onChange={val => setProxyHost(val)}
                  />
                </div>
                <div className="flex items-start gap-x-[12px] mb-[16px]">
                  <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                    {intl.formatMessage(messages.proxyPort)}
                  </div>
                  <Input
                    className="!w-[406px] !h-[40px] !border-line"
                    placeholder={intl.formatMessage(
                      messages.proxyPortPlaceholder,
                    )}
                    value={proxyPort}
                    onChange={val => setProxyPort(val)}
                  />
                </div>
                <div className="flex items-start gap-x-[12px] mb-[16px]">
                  <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                    {intl.formatMessage(messages.proxyUser)}
                  </div>
                  <Input
                    className="!w-[406px] !h-[40px] !border-line"
                    placeholder={intl.formatMessage(
                      messages.proxyUserPlaceholder,
                    )}
                    value={proxyUser}
                    onChange={val => setProxyUser(val)}
                  />
                </div>
                <div className="flex items-start gap-x-[12px] mb-[16px]">
                  <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                    {intl.formatMessage(messages.proxyPassword)}
                  </div>
                  <Input
                    type="password"
                    className="!w-[406px] !h-[40px] !border-line"
                    placeholder={intl.formatMessage(
                      messages.proxyPasswordPlaceholder,
                    )}
                    value={proxyPassword}
                    onChange={val => setProxyPassword(val)}
                  />
                </div>
                <div className="ml-[94px]">
                  <Button
                    className="min-w-[118px] !h-[40px] !bg-brand !text-white !font-medium"
                    onClick={handleProxyCheck}
                    loading={isProxyTesting}
                  >
                    {intl.formatMessage(messages.proxyCheck)}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Cookie Settings */}
          <div>
            <div className="flex items-center justify-start gap-[12px] w-full mb-[24px]">
              <span className="text-[16px] font-semibold text-primary">
                {intl.formatMessage(messages.cookieSettings)}
              </span>
              <Switch
                value={cookieEnabled}
                onChange={val => setCookieEnabled(val)}
              />
            </div>

            {cookieEnabled && (
              <div className="flex flex-col">
                <Textarea
                  className="w-full min-h-[148px] !border-line !p-[12px] self-end"
                  placeholder={intl.formatMessage(messages.cookiePlaceholder)}
                  value={cookie}
                  onChange={val => setCookie(val)}
                />
                <div className="mt-[8px] text-[12px] text-placeholder self-end">
                  {intl.formatMessage(messages.cookieHint)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
