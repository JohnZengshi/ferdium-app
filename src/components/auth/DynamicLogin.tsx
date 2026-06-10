import classnames from 'classnames';
import { makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import type { WrappedComponentProps } from 'react-intl';
import { defineMessages, injectIntl } from 'react-intl';
import { LockOnIcon, UserIcon } from 'tdesign-icons-react';
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

const messages = defineMessages({
  userFriendlyError: {
    id: 'dynamicLogin.userFriendlyError',
    defaultMessage: 'Login failed. Check your network or try again later',
  },
  heading: {
    id: 'dynamicLogin.heading',
    defaultMessage: 'Welcome to Tuoke!',
  },
  rememberPassword: {
    id: 'dynamicLogin.rememberPassword',
    defaultMessage: 'Remember Password',
  },
  enterApp: {
    id: 'dynamicLogin.enterApp',
    defaultMessage: 'Enter Tuoke',
  },
});

function getFieldIcon(fieldType: AuthFieldType): ReactElement {
  switch (fieldType) {
    case AuthFieldType.EMAIL:
    case AuthFieldType.TEXT:
    case AuthFieldType.TEL: {
      return <UserIcon />;
    }
    case AuthFieldType.PASSWORD: {
      return <LockOnIcon />;
    }
    default: {
      return <UserIcon />;
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
              this.authError =
                result.error ||
                this.props.intl.formatMessage(messages.userFriendlyError);
            });
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          debug(`Authentication error caught: ${message}`);
          runInAction(() => {
            this.authError =
              message ||
              this.props.intl.formatMessage(messages.userFriendlyError);
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
      const $field = this.form.$(field.id);

      return (
        <div key={field.id} className="auth__field w-full">
          <Input
            value={$field.value}
            onChange={(val: string) => $field.set(val)}
            type={inputType as InputType}
            placeholder={field.placeholder || field.label}
            className={customInputClass}
            prefixIcon={getFieldIcon(field.type)}
          />
        </div>
      );
    };

    const customInputClass =
      'h-[48px] w-full rounded-[4px] border border-solid border-line bg-container !shadow-none [&_.t-input]:!h-full [&_.t-input]:!border-none [&_.t-input]:!shadow-none [&_.t-input]:!rounded-[4px] [&_.t-input]:!pl-[16px] [&_.t-input]:!pr-[12px] [&_.t-input]:!text-[14px] [&_.t-input]:!text-primary [&_.t-input]::placeholder:!text-placeholder [&_.t-input__prefix]:!absolute [&_.t-input__prefix]:!left-[12px] [&_.t-input__prefix]:!top-1/2 [&_.t-input__prefix]:!-translate-y-1/2 [&_.t-input__prefix]:!text-placeholder [&_.t-input__suffix]:!hidden';

    return (
      <div className="auth__container w-full">
        <div className="auth__form-wrapper flex flex-col">
          <div className="mb-[32px]">
            <div className="text-[30px] font-bold text-brand">
              {intl.formatMessage(messages.heading)}
            </div>
          </div>

          <form
            className="auth__form flex w-full flex-col gap-[18px]"
            onSubmit={e => {
              e.preventDefault();
              this.submitForm();
            }}
          >
            {nonPasswordFields.map(field => renderField(field))}

            {passwordField && (
              <div className="auth__password-section flex flex-col gap-[18px]">
                {renderField(passwordField)}
                <div className="auth__remember -mt-1 flex justify-end">
                  <Checkbox
                    checked={this.rememberPassword}
                    onChange={(checked: boolean) =>
                      runInAction(() => {
                        this.rememberPassword = checked;
                      })
                    }
                    className="[&_.t-checkbox__label]:text-[13px] [&_.t-checkbox__label]:text-primary"
                  >
                    {intl.formatMessage(messages.rememberPassword)}
                  </Checkbox>
                </div>
              </div>
            )}

            {this.authError && (
              <p className="auth__error-message mt-2.5 text-center text-[14px] text-error">
                {this.authError}
              </p>
            )}

            <Button
              type="submit"
              block
              size="large"
              loading={this.isAuthenticating}
              className="!h-[48px] !rounded-[4px] !bg-brand !text-[16px] !font-normal !text-text-anti hover:!bg-brand-hover"
            >
              {intl.formatMessage(messages.enterApp)}
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

        {(config.showSignup || config.showForgotPassword) && (
          <div className="auth__links--top mt-[24px] flex flex-row gap-4 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[14px]">
            {config.showSignup && (
              <div className="auth__signup-row inline-flex items-start gap-2">
                <span className="auth__link-secondary leading-[22px] text-secondary">
                  {intl.formatMessage({
                    id: 'dynamicLogin.link.signup.prefix',
                    defaultMessage: 'Don\u2019t have an account? ',
                  })}
                </span>
                <Link
                  to="/auth/signup"
                  className="auth__link-primary cursor-pointer leading-[22px] text-brand hover:underline"
                >
                  {intl.formatMessage({
                    id: 'dynamicLogin.link.signup',
                    defaultMessage: 'Sign up',
                  })}
                </Link>
              </div>
            )}
            {config.showForgotPassword && (
              <Link
                to="/auth/password"
                className="auth__link-primary cursor-pointer leading-[22px] text-brand hover:underline"
              >
                {intl.formatMessage({
                  id: 'dynamicLogin.link.forgotPassword',
                  defaultMessage: 'Forgot password?',
                })}
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default injectIntl(DynamicLogin);
