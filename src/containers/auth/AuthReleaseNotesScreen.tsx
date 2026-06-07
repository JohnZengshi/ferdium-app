import { inject, observer } from 'mobx-react';
import { Component } from 'react';

import { mdiArrowLeftCircle } from '@mdi/js';
import Markdown from 'markdown-to-jsx';
import { type IntlShape, defineMessages, injectIntl } from 'react-intl';
import Icon from '../../components/ui/icon';
import { ferdiumVersion } from '../../environment-remote';
import {
  getFerdiumVersion,
  getUpdateInfoFromGH,
} from '../../helpers/update-helpers';
import { openExternalUrl } from '../../helpers/url-helpers';

const messages = defineMessages({
  headline: {
    id: 'settings.releasenotes.headline',
    defaultMessage: 'Release Notes',
  },
});

interface IProps {
  intl: IntlShape;
}

interface IState {
  data: string;
}

class AuthReleaseNotesScreen extends Component<IProps, IState> {
  private handleClickBound = this.handleClick.bind(this);

  constructor(props) {
    super(props);

    this.state = { data: '' };
  }

  async componentDidMount() {
    const { intl } = this.props;

    const data = await getUpdateInfoFromGH(
      window.location.href,
      ferdiumVersion,
      intl,
    );

    // eslint-disable-next-line @eslint-react/no-set-state-in-component-did-mount
    this.setState({
      data,
    });

    for (const link of document.querySelectorAll('.releasenotes__body a')) {
      link.addEventListener('click', this.handleClickBound, false);
    }
  }

  handleClick(e) {
    e.preventDefault();
    openExternalUrl(e.target.href);
  }

  componentWillUnmount() {
    for (const link of document.querySelectorAll('.releasenotes__body a')) {
      link.removeEventListener('click', this.handleClickBound, false);
    }
  }

  render() {
    const { intl } = this.props;

    const { data } = this.state;
    return (
      <div className="auth__container h-fit w-full">
        <div className="auth__main--releasenotes mx-[4%] mt-0 mb-[2%] flex h-[-webkit-fill-available] flex-col justify-center">
          <div className="auth__header inline-flex h-fit flex-row flex-wrap content-center justify-center text-[x-large]">
            <span className="auth__header-item">
              Ferdium {getFerdiumVersion(window.location.href, ferdiumVersion)}{' '}
              {' | '}
            </span>
            <span className="auth__header-item auth__header-item__secondary pl-1.5">
              {intl.formatMessage(messages.headline)}
            </span>
          </div>
          <div className="auth__body releasenotes__body mt-[2%]">
            <Markdown options={{ wrapper: 'article' }}>{data}</Markdown>
          </div>
          <div className="auth__help flex h-fit justify-center pt-[2%] pb-[2%]">
            <button
              type="button"
              onClick={() => {
                // For some reason <Link> doesn't work here. So we hard code the path to take us to the Welcome Screen
                window.location.href = '#/auth/welcome';
              }}
            >
              <Icon icon={mdiArrowLeftCircle} size={1.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default injectIntl<'intl', IProps>(
  inject('stores', 'actions')(observer(AuthReleaseNotesScreen)),
);
