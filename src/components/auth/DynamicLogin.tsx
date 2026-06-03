import classnames from 'classnames';
import { makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Component } from 'react';
import type { WrappedComponentProps } from 'react-intl';
import { injectIntl } from 'react-intl';
import {
  Button,
  Checkbox,
  Input,
  Select,
  type SelectValue,
} from 'tdesign-react';
import type { AuthField, AuthProvider } from '../../@types/auth';
import { AuthFieldType } from '../../@types/auth';
import type { Field } from '../../@types/mobx-form.types';
import { email, required } from '../../helpers/validation-helpers';
import Form from '../../lib/Form';
import Link from '../ui/Link';

const debug = require('../../preload-safe-debug')('Ferdium:auth:DynamicLogin');

const USER_FRIENDLY_ERROR = '登录失败，请检查网络连接或稍后重试';

const USER_ICON_PATH =
  'M6.75 1.5C5.30025 1.5 4.125 2.67525 4.125 4.125C4.125 5.57475 5.30025 6.75 6.75 6.75C8.19975 6.75 9.375 5.57475 9.375 4.125C9.375 2.67525 8.19975 1.5 6.75 1.5ZM2.625 4.125C2.625 1.84683 4.47183 0 6.75 0C9.02817 0 10.875 1.84683 10.875 4.125C10.875 6.40317 9.02817 8.25 6.75 8.25C4.47183 8.25 2.625 6.40317 2.625 4.125ZM0 12.75C0 10.6789 1.67893 9 3.75 9H9.75C11.8211 9 13.5 10.6789 13.5 12.75V15H0V12.75ZM3.75 10.5C2.50736 10.5 1.5 11.5074 1.5 12.75V13.5H12V12.75C12 11.5074 10.9926 10.5 9.75 10.5H3.75Z';

const LOCK_ICON_PATH =
  'M6.375 1.5C4.71815 1.5 3.375 2.84315 3.375 4.5V6.75001H9.375V4.5C9.375 2.84315 8.03185 1.5 6.375 1.5ZM10.875 6.75001H12.75V15.75H0V6.75001H1.875V4.5C1.875 2.01472 3.88972 0 6.375 0C8.86028 0 10.875 2.01472 10.875 4.5V6.75001ZM1.5 8.25001V14.25H11.25V8.25001H1.5ZM4.125 10.5H8.625V12H4.125V10.5Z';

function getFieldIconPath(fieldType: AuthFieldType): string {
  switch (fieldType) {
    case AuthFieldType.EMAIL:
    case AuthFieldType.TEXT:
    case AuthFieldType.TEL: {
      return USER_ICON_PATH;
    }
    case AuthFieldType.PASSWORD: {
      return LOCK_ICON_PATH;
    }
    default: {
      return USER_ICON_PATH;
    }
  }
}

type InputType =
  | 'text'
  | 'number'
  | 'url'
  | 'tel'
  | 'password'
  | 'search'
  | 'submit'
  | 'hidden';

function getFieldInputType(fieldType: AuthFieldType): InputType {
  switch (fieldType) {
    case AuthFieldType.EMAIL:
    case AuthFieldType.TEXT: {
      return 'text';
    }
    case AuthFieldType.PASSWORD: {
      return 'password';
    }
    case AuthFieldType.TEL: {
      return 'tel';
    }
    default: {
      return 'text';
    }
  }
}

function buildFormFields(fields: AuthField[]): { [key: string]: Field } {
  const result: { [key: string]: Field } = {};
  for (const field of fields) {
    if (field.type !== AuthFieldType.HIDDEN) {
      const validators = field.required ? [required] : [];
      if (field.type === AuthFieldType.EMAIL) {
        validators.push(email);
      }
      result[field.id] = {
        label: field.label,
        value: field.defaultValue ?? '',
        validators,
        type: field.type,
      };
    }
  }
  return result;
}

interface DynamicLoginProps extends WrappedComponentProps {
  provider: AuthProvider;
  onAuthenticated: (result: {
    success: boolean;
    token?: string;
    apiKey?: string;
  }) => void;
}

@observer
class DynamicLogin extends Component<DynamicLoginProps> {
  form: Form;

  @observable authError: string | null = null;

  @observable isAuthenticating = false;

  @observable rememberPassword = false;

  constructor(props: DynamicLoginProps) {
    super(props);
    const { provider } = props;
    this.form = new Form({
      fields: buildFormFields(provider.config.fields),
    });
    makeObservable(this);
    debug(`DynamicLogin initialized for provider: ${provider.name}`);
  }

  submitForm = (): void => {
    const { provider, onAuthenticated } = this.props;
    debug(`submitForm called, form has errors: ${this.form.hasError}`);
    this.form.submit({
      onSuccess: async () => {
        debug(
          `onSuccess callback called, authenticating with ${provider.name}...`,
        );
        runInAction(() => {
          this.authError = null;
          this.isAuthenticating = true;
        });
        try {
          const values = this.form.values();
          debug(`Form values: ${JSON.stringify(values)}`);
          const result = await provider.authenticate(values);
          debug(`Authenticate result: ${JSON.stringify(result)}`);
          if (result.success) {
            debug('Authentication successful');
            onAuthenticated({
              success: true,
              token: result.token,
              apiKey: result.apiKey,
            });
          } else {
            debug(`Authentication failed: ${result.error}`);
            runInAction(() => {
              this.authError = result.error || USER_FRIENDLY_ERROR;
            });
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          debug(`Authentication error caught: ${message}`);
          runInAction(() => {
            this.authError = message || USER_FRIENDLY_ERROR;
          });
        } finally {
          runInAction(() => {
            this.isAuthenticating = false;
          });
        }
      },
      onError: () => {
        debug('onError callback called - form validation failed');
      },
    });
  };

  render(): JSX.Element {
    const { provider, intl } = this.props;
    const { config } = provider;

    const visibleFields = config.fields.filter(
      f => f.type !== AuthFieldType.HIDDEN,
    );

    const nonPasswordFields = visibleFields.filter(
      f => f.type !== AuthFieldType.PASSWORD,
    );
    const passwordField = visibleFields.find(
      f => f.type === AuthFieldType.PASSWORD,
    );

    const renderField = (field: AuthField) => {
      if (field.type === AuthFieldType.SELECT) {
        return (
          <div key={field.id} className="auth__field w-full">
            <span className="text-sm font-medium">{field.label}</span>
            <Select
              className="w-full"
              value={this.form.$(field.id).value}
              onChange={(value: SelectValue) => {
                if (typeof value === 'string' || typeof value === 'number') {
                  this.form.$(field.id).set(String(value));
                }
              }}
              options={field.options}
            />
          </div>
        );
      }

      const inputType = getFieldInputType(field.type);
      const iconPath = getFieldIconPath(field.type);
      const $field = this.form.$(field.id);

      const viewBox =
        field.type === AuthFieldType.PASSWORD
          ? '0 0 12.75 15.75'
          : '0 0 13.5 15';

      return (
        <div key={field.id} className="auth__field w-full">
          <Input
            value={$field.value}
            onChange={(val: string) => $field.set(val)}
            type={inputType as InputType}
            placeholder={field.placeholder || field.label}
            prefixIcon={
              <svg fill="none" preserveAspectRatio="none" viewBox={viewBox}>
                <path d={iconPath} fill="currentColor" fillOpacity="0.4" />
              </svg>
            }
          />
        </div>
      );
    };

    return (
      <div className="auth__container w-full max-w-[496px] rounded-[12px] bg-white px-12 py-[52px] shadow-[0_0_12px_0_rgba(0,0,0,0.08),0_20px_32px_-8px_rgba(0,0,0,0.2)]">
        <div className="auth__form-wrapper flex flex-col gap-8">
          {(config.showSignup || config.showForgotPassword) && (
            <div className="auth__links--top flex flex-row gap-4 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[14px]">
              {config.showSignup && (
                <div className="auth__signup-row inline-flex items-start gap-2">
                  <span className="auth__link-secondary leading-[22px] text-[rgba(0,0,0,.6)]">
                    {intl.formatMessage({
                      id: 'dynamicLogin.link.signup.prefix',
                      defaultMessage: '没有账号吗 ? ',
                    })}
                  </span>
                  <Link
                    to="/auth/signup"
                    className="auth__link-primary cursor-pointer leading-[22px] text-[#366ef4] hover:underline"
                  >
                    {intl.formatMessage({
                      id: 'dynamicLogin.link.signup',
                      defaultMessage: '注册新账号',
                    })}
                  </Link>
                </div>
              )}
              {config.showForgotPassword && (
                <Link
                  to="/auth/password"
                  className="auth__link-primary cursor-pointer leading-[22px] text-[#366ef4] hover:underline"
                >
                  {intl.formatMessage({
                    id: 'dynamicLogin.link.forgotPassword',
                    defaultMessage: 'Forgot password?',
                  })}
                </Link>
              )}
            </div>
          )}

          <div className="auth__title mb-7 break-words font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[36px] font-semibold leading-[44px] text-[#0052d9]">
            {config.headerText || 'AI Chat 拓客销售系统'}
          </div>

          <form
            className="auth__form flex w-full flex-col gap-[20px]"
            onSubmit={e => {
              e.preventDefault();
              this.submitForm();
            }}
          >
            {nonPasswordFields.map(field => renderField(field))}

            {passwordField && (
              <div className="auth__password-section flex flex-col gap-6">
                {renderField(passwordField)}
                <div className="auth__remember -mt-2 flex items-center">
                  <Checkbox
                    checked={this.rememberPassword}
                    onChange={(checked: boolean) =>
                      runInAction(() => {
                        this.rememberPassword = checked;
                      })
                    }
                  >
                    记住密码
                  </Checkbox>
                </div>
              </div>
            )}

            {this.authError && (
              <p className="auth__error-message mt-2.5 text-center text-[14px] text-[#d4183d]">
                {this.authError}
              </p>
            )}

            <Button
              type="submit"
              block
              size="large"
              loading={this.isAuthenticating}
              className="auth__button mt-2 rounded-[6px] text-[16px] font-semibold"
            >
              {config.submitLabel}
            </Button>
          </form>
        </div>

        {config.extraLinks && config.extraLinks.length > 0 && (
          <div className="auth__links mt-4 flex flex-col gap-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[14px]">
            {config.extraLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={classnames('extra-link', link.variant)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default injectIntl(DynamicLogin);
