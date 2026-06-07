import { inject, observer } from 'mobx-react';
import { Component, type ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { ConfigProvider } from 'tdesign-react';

import generatedTranslations from './i18n/translations';
import enConfig from 'tdesign-react/cjs/locale/en_US';
import zhCnConfig from 'tdesign-react/cjs/locale/zh_CN';
import zhTwConfig from 'tdesign-react/cjs/locale/zh_TW';
import jaConfig from 'tdesign-react/cjs/locale/ja_JP';
import koConfig from 'tdesign-react/cjs/locale/ko_KR';
import ruConfig from 'tdesign-react/cjs/locale/ru_RU';
import itConfig from 'tdesign-react/cjs/locale/it_IT';
import arConfig from 'tdesign-react/cjs/locale/ar_KW';
import type AppStore from './stores/AppStore';
import type UserStore from './stores/UserStore';

const translations = generatedTranslations();

const TDESIGN_LOCALE_MAP: Record<string, object> = {
  zh: zhCnConfig,
  'zh-HANS': zhCnConfig,
  'zh-CN': zhCnConfig,
  'zh-HANT': zhTwConfig,
  'zh-TW': zhTwConfig,
  en: enConfig,
  'en-US': enConfig,
  ja: jaConfig,
  'ja-JP': jaConfig,
  ko: koConfig,
  'ko-KR': koConfig,
  ru: ruConfig,
  it: itConfig,
  'it-IT': itConfig,
  ar: arConfig,
};

const resolveTDesignLocale = (locale: string): object =>
  TDESIGN_LOCALE_MAP[locale] ?? enConfig;

interface Props {
  stores: {
    app: AppStore;
    user: UserStore;
  };
  children: ReactNode;
}

class I18N extends Component<Props> {
  componentDidUpdate(): void {
    window['ferdium'].menu.rebuild();
  }

  render(): ReactNode {
    const { stores, children } = this.props;
    const { locale } = stores.app;

    return (
      <IntlProvider
        locale={locale}
        key={locale}
        messages={translations[locale]}
        ref={intlProvider => {
          window['ferdium'].intl = intlProvider
            ? intlProvider.state.intl
            : null;
        }}
      >
        <ConfigProvider globalConfig={resolveTDesignLocale(locale)}>
          {children}
        </ConfigProvider>
      </IntlProvider>
    );
  }
}

export default inject('stores')(observer(I18N));
