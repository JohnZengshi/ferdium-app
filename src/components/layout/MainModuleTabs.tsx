import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import {
  BookOpenFilledIcon,
  BookOpenIcon,
  ChatBubble1FilledIcon,
  ChatBubble1Icon,
  HomeFilledIcon,
  HomeIcon,
} from 'tdesign-icons-react';
import { Badge } from 'tdesign-react';

import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import type { Stores } from '../../@types/stores.types';
import { navigationStore } from '../../stores/NavigationStore';
import type { FerdiumModule } from '../../stores/NavigationStore';
import { isDevMode } from '../../environment-remote';

const WHATSAPP_RECIPE_ID = 'whatsapp';

const TOGGLE_CLICK_THRESHOLD = 10;
const TOGGLE_RESET_MS = 3000;

const SCRIPT_AUTO_SHOW = `
  (function() {
    console.log('[WA-AutoShow] start');
    var maxA = 15;
    var intA = 1000;
    var attA = 0;
    function tryShow() {
      attA++;
      window.__waAiDebugVisible = true;
      var p = document.querySelector('.wa-ai-debug-panel');
      console.log('[WA-AutoShow] attempt', attA, 'panel:', !!p);
      if (p) {
        p.classList.remove('wa-ai-debug-hidden');
        var s = document.getElementById('wa-akg-si');
        if (s) s.style.display = '';
        console.log('[WA-AutoShow] done');
        return;
      }
      if (attA < maxA) setTimeout(tryShow, intA);
      else console.log('[WA-AutoShow] max attempts reached');
    }
    tryShow();
  })();
`;

const SCRIPT_TOGGLE_DEBUG = `
  (function() {
    console.log('[WA-Script-Toggle] start');
    var maxT = 10;
    var intT = 1000;
    var attT = 0;
    function tryToggle() {
      attT++;
      var w = window.__waAi;
      console.log('[WA-Script-Toggle] attempt', attT, 'waAi:', !!w, 'toggleDebugPanel:', !!(w && w.toggleDebugPanel));
      if (w && w.toggleDebugPanel) {
        console.log('[WA-Script-Toggle] calling waAI.toggleDebugPanel');
        w.toggleDebugPanel();
        return;
      }
      var p = document.querySelector('.wa-ai-debug-panel');
      console.log('[WA-Script-Toggle] panel found:', !!p);
      if (p) {
        p.classList.toggle('wa-ai-debug-hidden');
        var s = document.getElementById('wa-akg-si');
        if (s) s.style.display = s.style.display === 'none' ? '' : 'none';
        return;
      }
      if (attT < maxT) setTimeout(tryToggle, intT);
      else console.log('[WA-Script-Toggle] max attempts reached, giving up');
    }
    tryToggle();
  })();
`;

const MODULES: {
  id: FerdiumModule;
  activeIcon: ReactElement;
  inactiveIcon: ReactElement;
}[] = [
  {
    id: 'home',
    activeIcon: <HomeFilledIcon size="24px" />,
    inactiveIcon: <HomeIcon size="24px" />,
  },
  {
    id: 'service-type',
    activeIcon: <ChatBubble1FilledIcon size="24px" />,
    inactiveIcon: <ChatBubble1Icon size="24px" />,
  },
  {
    id: 'knowledge-base',
    activeIcon: <BookOpenFilledIcon size="24px" />,
    inactiveIcon: <BookOpenIcon size="24px" />,
  },
];

const messages = defineMessages({
  home: {
    id: 'mainModuleTabs.home',
    defaultMessage: 'Home',
  },
  serviceType: {
    id: 'mainModuleTabs.serviceType',
    defaultMessage: 'Whats',
  },
  knowledgeBase: {
    id: 'mainModuleTabs.knowledgeBase',
    defaultMessage: 'Knowledge',
  },
  aiAssistant: {
    id: 'mainModuleTabs.aiAssistant',
    defaultMessage: 'AI Assistant',
  },
});

interface IProps {
  stores?: Stores;
}

const formatHandoffBadge = (total: number): string | null => {
  if (total <= 0) return null;
  if (total > 99) return '99+';
  return String(total);
};

@inject('stores')
@observer
class MainModuleTabs extends Component<IProps & WrappedComponentProps> {
  private _logoClickCount = 0;

  private _logoClickTimer: ReturnType<typeof setTimeout> | null = null;

  private _logoElement: HTMLImageElement | null = null;

  componentDidMount(): void {
    this._logoElement?.addEventListener('click', this._handleLogoClick);
    if (isDevMode) {
      this._autoShowDebugPanel();
    }
  }

  componentWillUnmount(): void {
    if (this._logoClickTimer) clearTimeout(this._logoClickTimer);
    this._logoElement?.removeEventListener('click', this._handleLogoClick);
  }

  private _autoShowDebugPanel = (attempt = 0) => {
    if (attempt >= 3) return;
    const { stores } = this.props;
    const services = stores?.services.allDisplayed ?? [];
    for (const service of services) {
      if (service.recipe?.id === WHATSAPP_RECIPE_ID && service.webview) {
        service.webview.executeJavaScript(SCRIPT_AUTO_SHOW).catch(() => {});
      }
    }
    setTimeout(() => this._autoShowDebugPanel(attempt + 1), 1500);
  };

  private _toggleWhatsAppDebug = () => {
    const { stores } = this.props;
    const services = stores?.services.allDisplayed ?? [];
    for (const service of services) {
      if (service.recipe?.id === WHATSAPP_RECIPE_ID && service.webview) {
        service.webview.executeJavaScript(SCRIPT_TOGGLE_DEBUG).catch(() => {});
      }
    }
  };

  private _handleLogoClick = () => {
    this._logoClickCount += 1;
    if (this._logoClickTimer) clearTimeout(this._logoClickTimer);
    this._logoClickTimer = setTimeout(() => {
      this._logoClickCount = 0;
    }, TOGGLE_RESET_MS);
    if (this._logoClickCount >= TOGGLE_CLICK_THRESHOLD) {
      this._logoClickCount = 0;
      this._toggleWhatsAppDebug();
    }
  };

  render(): ReactElement {
    const { stores, intl } = this.props;
    const badge = stores?.services.mainModuleBadge;
    const handoffBadge = formatHandoffBadge(stores?.handoff.unreadCount ?? 0);

    return (
      <nav className="flex flex-col items-center w-[88px] py-[24px] h-full min-h-0 bg-container border-r border-solid border-line">
        <img
          src="./assets/images/sidebar-logo.svg"
          alt="logo"
          ref={el => {
            this._logoElement = el;
          }}
        />

        <div className="flex flex-col items-center h-fit my-auto gap-[4px] w-[64px] p-[8px] rounded-xl shadow-[0px_5px_5px_-3px_rgba(0,0,0,0.10),0px_8px_10px_1px_rgba(0,0,0,0.06),0px_3px_14px_2px_rgba(0,0,0,0.05)]">
          {MODULES.map(mod => {
            const isActive = navigationStore.activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                className="relative flex flex-col items-center justify-center gap-0.5 border-0 bg-transparent cursor-pointer"
                onClick={() => {
                  navigationStore.setModule(mod.id);
                }}
              >
                <Badge
                  count={
                    mod.id === 'service-type'
                      ? badge
                      : mod.id === 'home'
                        ? handoffBadge
                        : null
                  }
                  size="small"
                  offset={[0, 0]}
                >
                  {isActive ? (
                    <span className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-brand-light text-brand">
                      {mod.activeIcon}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-[48px] h-[48px] text-secondary">
                      {mod.inactiveIcon}
                    </span>
                  )}
                </Badge>
                <span
                  className={`text-[12px] leading-5 whitespace-nowrap ${isActive ? 'text-brand' : 'text-secondary'}`}
                >
                  {intl.formatMessage(
                    (
                      {
                        home: messages.home,
                        'service-type': messages.serviceType,
                        'knowledge-base': messages.knowledgeBase,
                      } as const
                    )[mod.id],
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {false && (
          <img
            src="./assets/images/sidebar-ai-bot.png"
            alt={intl.formatMessage(messages.aiAssistant)}
            className="w-[40px]"
          />
        )}
        <div className="w-[40px]" />
      </nav>
    );
  }
}

export default injectIntl(MainModuleTabs);
