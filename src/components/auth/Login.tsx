import { mdiArrowLeftCircle } from '@mdi/js';
import { noop } from 'lodash';
import { observer } from 'mobx-react';
import { Component, type FormEvent, type ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import type { GlobalError } from '../../@types/ferdium-components.types';
import { serverBase } from '../../api/apiBase'; // TODO: Remove this line after fixing password recovery in-app
import { LIVE_FRANZ_API } from '../../config';
import { API_VERSION } from '../../environment-remote';
import { email, required } from '../../helpers/validation-helpers';
import Form from '../../lib/Form';
import Link from '../ui/Link';
import Button from '../ui/button';
import { H1 } from '../ui/headline';
import Icon from '../ui/icon';
import Input from '../ui/input/index';

const messages = defineMessages({
  headline: {
    id: 'login.headline',
    defaultMessage: 'Sign in',
  },
  emailLabel: {
    id: 'login.email.label',
    defaultMessage: 'Email address',
  },
  passwordLabel: {
    id: 'login.password.label',
    defaultMessage: 'Password',
  },
  submitButtonLabel: {
    id: 'login.submit.label',
    defaultMessage: 'Sign in',
  },
  invalidCredentials: {
    id: 'login.invalidCredentials',
    defaultMessage: 'Email or password not valid',
  },
  customServerQuestion: {
    id: 'login.customServerQuestion',
    defaultMessage: 'Using a custom Ferdium server?',
  },
  customServerSuggestion: {
    id: 'login.customServerSuggestion',
    defaultMessage: 'Try importing your Franz account',
  },
  tokenExpired: {
    id: 'login.tokenExpired',
    defaultMessage: 'Your session expired, please login again.',
  },
  serverLogout: {
    id: 'login.serverLogout',
    defaultMessage: 'Your session expired, please login again.',
  },
  signupLink: {
    id: 'login.link.signup',
    defaultMessage: 'Create a free account',
  },
  passwordLink: {
    id: 'login.link.password',
    defaultMessage: 'Reset password',
  },
});

interface IProps extends WrappedComponentProps {
  onSubmit: (...args: any[]) => void;
  isSubmitting: boolean;
  isTokenExpired: boolean;
  isServerLogout: boolean;
  signupRoute: string;
  passwordRoute: string; // TODO: Uncomment this line after fixing password recovery in-app
  error: GlobalError;
}

@observer
class Login extends Component<IProps> {
  form: Form;

  constructor(props: IProps) {
    super(props);

    this.form = new Form({
      fields: {
        email: {
          label: this.props.intl.formatMessage(messages.emailLabel),
          value: '',
          validators: [required, email],
        },
        password: {
          label: this.props.intl.formatMessage(messages.passwordLabel),
          value: '',
          validators: [required],
          type: 'password',
        },
      },
    });
  }

  submit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    this.form.submit({
      onSuccess: (form: Form) => {
        this.props.onSubmit(form.values());
      },
      onError: noop,
    });
  }

  render(): ReactElement {
    const { form } = this;
    const {
      isSubmitting,
      isTokenExpired,
      isServerLogout,
      signupRoute,
      error,
      intl,
      // passwordRoute, // TODO: Uncomment this line after fixing password recovery in-app
    } = this.props;

    return (
      <div className="auth__container relative w-full max-w-[496px] rounded-[12px] bg-container px-12 py-[52px] shadow-[0_0_12px_0_rgba(0,0,0,0.08),0_20px_32px_-8px_rgba(0,0,0,0.2)]">
        <form
          className="auth__form franz-form flex w-full flex-col gap-5"
          onSubmit={e => this.submit(e)}
        >
          <Link to="/auth/welcome">
            <img
              src="./assets/images/logo.svg"
              className="auth__logo -mt-[105px] mb-5 block h-auto w-[150px] rounded-[var(--theme-border-radius)]"
              alt=""
            />
          </Link>
          <H1 className="auth__title">
            {intl.formatMessage(messages.headline)}
          </H1>
          {isTokenExpired && (
            <p className="auth__error-message mt-2.5 text-center text-[14px] text-error">
              {intl.formatMessage(messages.tokenExpired)}
            </p>
          )}
          {isServerLogout && (
            <p className="auth__error-message mt-2.5 text-center text-[14px] text-error">
              {intl.formatMessage(messages.serverLogout)}
            </p>
          )}
          <Input {...form.$('email').bind()} focus />
          <Input {...form.$('password').bind()} showPasswordToggle />
          {error.code === 'invalid-credentials' && (
            <>
              <h2 className="auth__error-message mt-2.5 text-center text-[14px] text-error">
                {intl.formatMessage(messages.invalidCredentials)}
              </h2>
              {window['ferdium'].stores.settings.all.app.server !==
                LIVE_FRANZ_API && (
                <>
                  <p className="auth__error-message mt-2.5 text-center text-[14px] text-error">
                    {intl.formatMessage(messages.customServerQuestion)}{' '}
                  </p>
                  <p className="auth__error-message mt-2.5 text-center text-[14px] text-error">
                    <Link
                      to={`${window[
                        'ferdium'
                      ].stores.settings.all.app.server.replace(
                        API_VERSION,
                        '',
                      )}/import`}
                      target="_blank"
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {intl.formatMessage(messages.customServerSuggestion)}
                    </Link>
                  </p>
                </>
              )}
            </>
          )}
          {isSubmitting ? (
            <Button
              className="auth__button is-loading mt-2 w-full rounded-[3px] border-none bg-brand px-6 py-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[16px] leading-[24px] text-text-anti transition-colors duration-200 hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:bg-brand-disabled"
              buttonType="secondary"
              label={`${intl.formatMessage(messages.submitButtonLabel)} ...`}
              loaded={false}
              disabled
              onClick={noop}
            />
          ) : (
            <Button
              type="submit"
              className="auth__button mt-2 w-full rounded-[3px] border-none bg-brand px-6 py-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[16px] leading-[24px] text-text-anti transition-colors duration-200 hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:bg-brand-disabled"
              label={intl.formatMessage(messages.submitButtonLabel)}
              onClick={noop}
            />
          )}
        </form>
        <div className="auth__links mt-4 flex flex-col gap-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[14px]">
          <Link to={signupRoute}>
            {intl.formatMessage(messages.signupLink)}
          </Link>
          <Link
            // to={passwordRoute} // TODO: Uncomment this line after fixing password recovery in-app
            to={`${serverBase()}/user/forgot`} // TODO: Remove this line after fixing password recovery in-app
            target="_blank" // TODO: Remove this line after fixing password recovery in-app
          >
            {intl.formatMessage(messages.passwordLink)}
          </Link>
        </div>
        <div className="auth__help flex h-fit justify-center pt-[2%] pb-[2%]">
          <Link to="/auth/welcome">
            <Icon icon={mdiArrowLeftCircle} size={1.5} />
          </Link>
        </div>
      </div>
    );
  }
}

export default injectIntl(Login);
