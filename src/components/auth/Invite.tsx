import { noop } from 'lodash';
import { observer } from 'mobx-react';
import { Component } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import { Link } from 'react-router-dom';
import { email, required } from '../../helpers/validation-helpers';
import Form from '../../lib/Form';
import Infobox from '../ui/Infobox';
import Button from '../ui/button';
import Appear from '../ui/effects/Appear';
import { H1 } from '../ui/headline';
import Input from '../ui/input/index';

const messages = defineMessages({
  settingsHeadline: {
    id: 'settings.invite.headline',
    defaultMessage: 'Invite Friends',
  },
  headline: {
    id: 'invite.headline.friends',
    defaultMessage: 'Invite 3 of your friends or colleagues',
  },
  nameLabel: {
    id: 'invite.name.label',
    defaultMessage: 'Name',
  },
  emailLabel: {
    id: 'invite.email.label',
    defaultMessage: 'Email address',
  },
  submitButtonLabel: {
    id: 'invite.submit.label',
    defaultMessage: 'Send invites',
  },
  skipButtonLabel: {
    id: 'invite.skip.label',
    defaultMessage: 'I want to do this later',
  },
  inviteSuccessInfo: {
    id: 'invite.successInfo',
    defaultMessage: 'Invitations sent successfully',
  },
});

interface IProps extends WrappedComponentProps {
  onSubmit: (...args: any[]) => void;
  embed?: boolean;
  isInviteSuccessful?: boolean;
  isLoadingInvite?: boolean;
}

interface IState {
  showSuccessInfo: boolean;
}

@observer
class Invite extends Component<IProps, IState> {
  form: Form;

  constructor(props: IProps) {
    super(props);

    this.state = { showSuccessInfo: false };
    this.form = new Form({
      fields: {
        invite: [
          ...Array.from({ length: 3 }).fill({
            fields: {
              name: {
                label: this.props.intl.formatMessage(messages.nameLabel),
                placeholder: this.props.intl.formatMessage(messages.nameLabel),
                onChange: () => {
                  this.setState({ showSuccessInfo: false });
                },
                validators: [required],
                // related: ['invite.0.email'], // path accepted but does not work
              },
              email: {
                label: this.props.intl.formatMessage(messages.emailLabel),
                placeholder: this.props.intl.formatMessage(messages.emailLabel),
                onChange: () => {
                  this.setState({ showSuccessInfo: false });
                },
                validators: [email],
              },
            },
          }),
        ],
      },
    });
  }

  componentDidMount() {
    const selector: HTMLElement | null =
      document.querySelector('input:first-child');
    if (selector) {
      selector.focus();
    }
  }

  submit(e) {
    e.preventDefault();

    this.form?.submit({
      onSuccess: form => {
        this.props.onSubmit({ invites: form.values().invite });
        this.form?.clear();
        // this.form.$('invite.0.name').focus(); // path accepted but does not focus ;(

        const selector: HTMLElement | null =
          document.querySelector('input:first-child');
        if (selector) {
          selector.focus();
        }

        this.setState({ showSuccessInfo: true });
      },
      onError: noop,
    });
  }

  render() {
    const { form } = this;
    const { intl } = this.props;
    const {
      embed = false,
      isInviteSuccessful = false,
      isLoadingInvite = false,
    } = this.props;

    const atLeastOneEmailAddress = form
      .$('invite')
      .map(invite => invite.$('email').value)
      .some(emailValue => emailValue.trim() !== '');

    const sendButtonClassName = `${[
      'mt-2 w-full rounded-[3px] border-none bg-[#0052d9]',
      'px-6 py-2 font-[\'PingFang_SC\',-apple-system,BlinkMacSystemFont,\'Segoe_UI\',sans-serif]',
      'text-[16px] leading-[24px] text-[rgba(255,255,255,0.9)]',
      'cursor-pointer transition-colors duration-200',
      'hover:bg-[#0046b8] active:bg-[#003a9e]',
      'disabled:cursor-not-allowed disabled:bg-[#6b89d6]',
    ].join(' ')}${embed ? ' invite__embed--button' : ''}`;

    const renderForm = (
      <>
        {this.state.showSuccessInfo && isInviteSuccessful && (
          <Appear>
            <Infobox
              type="success"
              icon="checkbox-marked-circle-outline"
              dismissible
            >
              {intl.formatMessage(messages.inviteSuccessInfo)}
            </Infobox>
          </Appear>
        )}

        <form className="auth__form franz-form flex w-full flex-col gap-5" onSubmit={e => this.submit(e)}>
          {!embed && (
            <img src="./assets/images/logo.svg" className="auth__logo block h-auto w-[150px] -mt-[105px] mx-auto mb-5 rounded-[var(--theme-border-radius)]" alt="" />
          )}
          <H1 className={`${embed ? 'invite__embed' : 'auth__title'}`}>
            {intl.formatMessage(messages.headline)}
          </H1>
          {form.$('invite').map(invite => (
            <div className="grid" key={invite.key}>
              <div className="grid__row">
                <Input {...invite.$('name').bind()} showLabel={false} />
                <Input {...invite.$('email').bind()} showLabel={false} />
              </div>
            </div>
          ))}
          <Button
            type="submit"
            className={`${sendButtonClassName} auth__button`}
            disabled={!atLeastOneEmailAddress}
            label={intl.formatMessage(messages.submitButtonLabel)}
            loaded={!isLoadingInvite}
            onClick={noop}
          />
          {!embed && (
            <Link
              to="/"
              className="auth__button auth__button--skip franz-form__button franz-form__button--secondary rounded-[3px] border-none bg-[#0052d9] px-6 py-2 font-['PingFang_SC',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[16px] leading-[24px] text-[rgba(255,255,255,0.9)] cursor-pointer transition-colors duration-200 hover:bg-[#0046b8] active:bg-[#003a9e] block text-center mx-auto w-[20%] mt-2.5"
            >
              {intl.formatMessage(messages.skipButtonLabel)}
            </Link>
          )}
        </form>
      </>
    );

    return (
      <div
        className={
          embed ? 'settings__main' : 'auth__container mx-auto my-0 w-[496px] max-w-full rounded-[12px] bg-white px-12 py-[52px] relative shadow-[0_0_12px_0_rgba(0,0,0,0.08),0_20px_32px_-8px_rgba(0,0,0,0.2)]'
        }
      >
        {embed && (
          <div className="settings__header">
            <H1>{intl.formatMessage(messages.settingsHeadline)}</H1>
          </div>
        )}
        {embed ? (
          <div className="settings__body invite__form">{renderForm}</div>
        ) : (
          <div>{renderForm}</div>
        )}
      </div>
    );
  }
}

export default injectIntl(Invite);
