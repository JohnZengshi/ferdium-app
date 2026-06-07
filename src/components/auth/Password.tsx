import { observer } from 'mobx-react';
import { Component, type FormEvent } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';

import { noop } from 'lodash';
import { email, required } from '../../helpers/validation-helpers';
import globalMessages from '../../i18n/globalMessages';
import Form from '../../lib/Form';
import Infobox from '../ui/Infobox';
import Link from '../ui/Link';
import Button from '../ui/button';
import { H1 } from '../ui/headline';
import Input from '../ui/input/index';

const messages = defineMessages({
  headline: {
    id: 'password.headline',
    defaultMessage: 'Reset password',
  },
  emailLabel: {
    id: 'password.email.label',
    defaultMessage: 'Email address',
  },
  successInfo: {
    id: 'password.successInfo',
    defaultMessage: 'Your new password was sent to your email address',
  },
  noUser: {
    id: 'password.noUser',
    defaultMessage: 'No user with that email address was found',
  },
  signupLink: {
    id: 'password.link.signup',
    defaultMessage: 'Create a free account',
  },
  loginLink: {
    id: 'password.link.login',
    defaultMessage: 'Sign in to your account',
  },
});

interface IProps extends WrappedComponentProps {
  onSubmit: (...args: any[]) => void;
  isSubmitting: boolean;
  signupRoute: string;
  loginRoute: string;
  status: string[];
}

@observer
class Password extends Component<IProps> {
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
      },
    });
  }

  submit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    this.form.submit({
      onSuccess: form => {
        this.props.onSubmit(form.values());
      },
      onError: noop,
    });
  }

  render() {
    const { form } = this;
    const { isSubmitting, signupRoute, loginRoute, status, intl } = this.props;

    return (
      <div className="auth__container w-full">
        <form
          className="auth__form franz-form flex w-full flex-col gap-5"
          onSubmit={e => this.submit(e)}
        >
          <Link className="auth__logo" to="/auth/welcome">
            <img
              src="./assets/images/logo.svg"
              className="block h-auto w-[150px]"
              alt=""
            />
          </Link>
          <H1 className="auth__title">
            {intl.formatMessage(messages.headline)}
          </H1>
          {status.length > 0 && status.includes('sent') && (
            <Infobox type="success" icon="checkbox-marked-circle-outline">
              {intl.formatMessage(messages.successInfo)}
            </Infobox>
          )}
          <Input className="auth__field" {...form.$('email').bind()} focus />
          {status.length > 0 && status.includes('no-user') && (
            <p className="auth__error-message mt-2.5 text-center text-[14px] text-[#d4183d]">
              {intl.formatMessage(messages.noUser)}
            </p>
          )}
          {isSubmitting ? (
            <Button
              className="auth__button mt-2 w-full rounded-[3px] border-none bg-[#0052d9] px-6 py-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[16px] leading-[24px] text-[rgba(255,255,255,0.9)] transition-colors duration-200 is-loading disabled:cursor-not-allowed disabled:bg-[#6b89d6] hover:not(:disabled):bg-[#0046b8] active:not(:disabled):bg-[#003a9e]"
              buttonType="secondary"
              label={`${intl.formatMessage(globalMessages.submit)} ...`}
              loaded={false}
              onClick={noop}
              disabled
            />
          ) : (
            <Button
              type="submit"
              className="auth__button mt-2 w-full rounded-[3px] border-none bg-[#0052d9] px-6 py-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[16px] leading-[24px] text-[rgba(255,255,255,0.9)] transition-colors duration-200 hover:not(:disabled):bg-[#0046b8] active:not(:disabled):bg-[#003a9e] disabled:cursor-not-allowed disabled:bg-[#6b89d6]"
              buttonType="secondary"
              label={intl.formatMessage(globalMessages.submit)}
              loaded={false}
              onClick={noop}
            />
          )}
        </form>
        <div className="auth__links mt-4 flex flex-col gap-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[14px]">
          <Link
            to={signupRoute}
            className="block text-center text-[#9b9b9b] no-underline transition-colors duration-200 hover:text-[#366ef4] hover:underline"
          >
            {intl.formatMessage(messages.signupLink)}
          </Link>
          <Link
            to={loginRoute}
            className="block text-center text-[#9b9b9b] no-underline transition-colors duration-200 hover:text-[#366ef4] hover:underline"
          >
            {intl.formatMessage(messages.loginLink)}
          </Link>
        </div>
      </div>
    );
  }
}

export default injectIntl(Password);
