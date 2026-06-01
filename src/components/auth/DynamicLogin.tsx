import classnames from 'classnames';
import { makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Component } from 'react';
import type { WrappedComponentProps } from 'react-intl';
import { injectIntl } from 'react-intl';
import Link from '../ui/Link';
import type { AuthField, AuthProvider } from '../../@types/auth';
import { AuthFieldType } from '../../@types/auth';
import type { Field } from '../../@types/mobx-form.types';
import Form from '../../lib/Form';
import { required, email } from '../../helpers/validation-helpers';
import Input from '../ui/input/index';

const debug = require('../../preload-safe-debug')('Ferdium:auth:DynamicLogin');

const USER_FRIENDLY_ERROR = '登录失败，请检查网络连接或稍后重试';

interface DynamicLoginProps extends WrappedComponentProps {
  provider: AuthProvider;
  onAuthenticated: (result: {
    success: boolean;
    token?: string;
    apiKey?: string;
  }) => void;
}

function buildFormFields(fields: AuthField[]): { [key: string]: Field } {
  const result: { [key: string]: Field } = {};
  for (const field of fields) {
    if (field.type === AuthFieldType.HIDDEN) continue;
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
  return result;
}

function getFieldInputType(fieldType: AuthFieldType): string {
  switch (fieldType) {
    case AuthFieldType.EMAIL: {
      return 'email';
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

@observer
class DynamicLogin extends Component<DynamicLoginProps> {
  form: Form;

  @observable authError: string | null = null;

  @observable isAuthenticating = false;

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

    return (
      <div className="auth__container">
        <Link to="/auth/welcome">
          <img className="auth__logo" src="./assets/images/logo.svg" alt="" />
        </Link>
        {/* <H1>{intl.formatMessage({ id: 'dynamicLogin.title', defaultMessage: 'Sign in' })}</H1> */}

        <form
          className="franz-form auth__form"
          onSubmit={e => {
            e.preventDefault();
            this.submitForm();
          }}
        >
          {provider.config.fields
            .filter(f => f.type !== AuthFieldType.HIDDEN)
            .map(field => {
              if (field.type === AuthFieldType.SELECT) {
                return (
                  <div key={field.id} className="franz-form__field">
                    <label htmlFor={field.id}>{field.label}</label>
                    <select
                      id={field.id}
                      className="w-full rounded border border-gray-300 p-2 dark:border-neutral-600 dark:bg-neutral-800"
                      value={this.form.$(field.id).value}
                      onChange={e => this.form.$(field.id).set(e.target.value)}
                    >
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              const inputType = getFieldInputType(field.type);
              return (
                <Input
                  key={field.id}
                  {...this.form.$(field.id).bind()}
                  ref={undefined}
                  type={inputType}
                  placeholder={field.placeholder}
                  showPasswordToggle={field.type === AuthFieldType.PASSWORD}
                />
              );
            })}

          <button
            type="submit"
            className="auth__button"
            disabled={this.isAuthenticating}
          >
            {this.isAuthenticating ? '...' : config.submitLabel}
          </button>
        </form>

        {this.authError && (
          <p className="error-message center" style={{ marginTop: '10px' }}>
            {this.authError}
          </p>
        )}

        <div className="auth__links">
          {config.showSignup && (
            <Link to="/auth/signup">
              {intl.formatMessage({
                id: 'dynamicLogin.link.signup',
                defaultMessage: 'Create a free account',
              })}
            </Link>
          )}
          {config.showForgotPassword && (
            <Link to="/auth/password">
              {intl.formatMessage({
                id: 'dynamicLogin.link.forgotPassword',
                defaultMessage: 'Forgot password?',
              })}
            </Link>
          )}
          {config.extraLinks?.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={classnames('extra-link', link.variant)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* <div className="auth__help">
          <Link to="/auth/welcome">
            <Icon icon={mdiArrowLeftCircle} size={1.5} />
          </Link>
        </div> */}
      </div>
    );
  }
}

export default injectIntl(DynamicLogin);
