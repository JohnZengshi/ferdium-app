import { systemPreferences } from '@electron/remote';
import { noop } from 'lodash';
import { observer } from 'mobx-react';
import { Component } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import { isMac } from '../../environment';
import Form from '../../lib/Form';
import Button from '../ui/button';
import { H1 } from '../ui/headline';
import Input from '../ui/input/index';

const messages = defineMessages({
  headline: {
    id: 'locked.headline',
    defaultMessage: 'Locked',
  },
  touchId: {
    id: 'locked.touchId',
    defaultMessage: 'Unlock with Touch ID',
  },
  passwordLabel: {
    id: 'locked.password.label',
    defaultMessage: 'Password',
  },
  submitButtonLabel: {
    id: 'locked.submit.label',
    defaultMessage: 'Unlock',
  },
  unlockWithPassword: {
    id: 'locked.unlockWithPassword',
    defaultMessage: 'Unlock with Password',
  },
  invalidCredentials: {
    id: 'locked.invalidCredentials',
    defaultMessage: 'Password invalid',
  },
});

interface IProps extends WrappedComponentProps {
  onSubmit: (...args: any[]) => void;
  unlock: () => void;
  isSubmitting: boolean;
  useTouchIdToUnlock: boolean;
  error: boolean;
}

@observer
class Locked extends Component<IProps> {
  form: Form;

  constructor(props: IProps) {
    super(props);

    this.form = new Form({
      fields: {
        password: {
          label: this.props.intl.formatMessage(messages.passwordLabel),
          value: '',
          type: 'password',
        },
      },
    });
  }

  submit(e) {
    e.preventDefault();
    this.form.submit({
      onSuccess: form => {
        this.props.onSubmit(form.values());
      },
      onError: noop,
    });
  }

  touchIdUnlock() {
    const { intl } = this.props;

    systemPreferences
      .promptTouchID(intl.formatMessage(messages.touchId))
      .then(() => {
        this.props.unlock();
      });
  }

  render() {
    const { form } = this;
    const { isSubmitting, error, useTouchIdToUnlock, intl } = this.props;

    const touchIdEnabled = isMac
      ? useTouchIdToUnlock && systemPreferences.canPromptTouchID()
      : false;
    const submitButtonLabel = touchIdEnabled
      ? intl.formatMessage(messages.unlockWithPassword)
      : intl.formatMessage(messages.submitButtonLabel);

    return (
      <div className="auth__container w-full">
        <form
          className="auth__form franz-form flex w-full flex-col gap-5"
          onSubmit={e => this.submit(e)}
        >
          <img
            src="./assets/images/logo.svg"
            className="auth__logo -mt-[105px] mb-5 block h-auto w-[150px] rounded-[var(--theme-border-radius)]"
            alt=""
          />
          <H1 className="auth__title">
            {intl.formatMessage(messages.headline)}
          </H1>

          {touchIdEnabled && (
            <>
              <Button
                className="auth__button touchid__button mt-2 mb-[25px] w-full rounded-[3px] border-none bg-[#0052d9] px-6 py-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[16px] leading-[24px] text-[rgba(255,255,255,0.9)] transition-colors duration-200 hover:bg-[#0046b8] active:bg-[#003a9e] disabled:cursor-not-allowed disabled:bg-[#6b89d6]"
                label={intl.formatMessage(messages.touchId)}
                onClick={() => this.touchIdUnlock()}
                type="button"
              />
              <hr className="locked__or_line mb-5 h-[5px] overflow-visible border-0 border-t-2 border-solid border-[#9b9b9b] text-center text-[#9b9b9b]" />
            </>
          )}

          <Input
            className="auth__field"
            {...form.$('password').bind()}
            showPasswordToggle
            focus
          />
          {error && (
            <p className="auth__error-message center mt-2.5 text-center text-[14px] text-[#d4183d]">
              {intl.formatMessage(messages.invalidCredentials)}
            </p>
          )}
          {isSubmitting ? (
            <Button
              className="auth__button is-loading mt-2 w-full rounded-[3px] border-none bg-[#0052d9] px-6 py-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[16px] leading-[24px] text-[rgba(255,255,255,0.9)] transition-colors duration-200 hover:bg-[#0046b8] active:bg-[#003a9e] disabled:cursor-not-allowed disabled:bg-[#6b89d6]"
              buttonType="secondary"
              label={`${submitButtonLabel} ...`}
              loaded={false}
              onClick={noop}
              disabled
            />
          ) : (
            <Button
              type="submit"
              className="auth__button mt-2 w-full rounded-[3px] border-none bg-[#0052d9] px-6 py-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[16px] leading-[24px] text-[rgba(255,255,255,0.9)] transition-colors duration-200 hover:bg-[#0046b8] active:bg-[#003a9e] disabled:cursor-not-allowed disabled:bg-[#6b89d6]"
              label={submitButtonLabel}
              onClick={noop}
            />
          )}
        </form>
      </div>
    );
  }
}

export default injectIntl(Locked);
