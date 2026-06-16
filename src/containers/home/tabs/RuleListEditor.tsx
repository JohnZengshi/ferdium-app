import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { AddIcon } from 'tdesign-icons-react';
import { Loading, MessagePlugin } from 'tdesign-react';
import { updateOnboardingStep } from '../../../helpers/onboarding-helpers';
import { useCustomInstance } from '../../../agent-flow-cs/api/customInstance';

// 后端 /api/v1/rules 已从 OpenAPI spec 中移除，本地保留类型和请求函数
interface AgentRuleResponse {
  id: string;
  owner_user_id: string;
  rule_type: 'safety_boundary' | 'handoff_policy';
  name: string;
  content: string;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface AgentRuleCreateRequest {
  rule_type: 'safety_boundary' | 'handoff_policy';
  name: string;
  content: string;
  enabled?: boolean;
  priority?: number;
}

interface AgentRuleUpdateRequest {
  rule_type?: 'safety_boundary' | 'handoff_policy' | null;
  name?: string | null;
  content?: string | null;
  enabled?: boolean | null;
  priority?: number | null;
}

const RULES_BASE = '/api/v1/rules';

const createRuleApiV1RulesPost = async (
  body: AgentRuleCreateRequest,
  options?: RequestInit,
) =>
  useCustomInstance<{
    data: AgentRuleResponse;
    status: number;
    headers: Headers;
  }>(`${RULES_BASE}`, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(body),
  });

const updateRuleApiV1RulesRuleIdPatch = async (
  ruleId: string,
  body: AgentRuleUpdateRequest,
  options?: RequestInit,
) =>
  useCustomInstance<{
    data: AgentRuleResponse;
    status: number;
    headers: Headers;
  }>(`${RULES_BASE}/${ruleId}`, {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(body),
  });

const deleteRuleApiV1RulesRuleIdDelete = async (
  ruleId: string,
  options?: RequestInit,
) =>
  useCustomInstance<{
    data: undefined;
    status: number;
    headers: Headers;
  }>(`${RULES_BASE}/${ruleId}`, {
    ...options,
    method: 'DELETE',
  });

const PAGE_SIZE = 20;

const messages = defineMessages({
  placeholder: {
    id: 'ruleListEditor.placeholder',
    defaultMessage: '请输入内容',
  },
  confirm: {
    id: 'ruleListEditor.confirm',
    defaultMessage: '确认',
  },
  delete: {
    id: 'ruleListEditor.delete',
    defaultMessage: '删除',
  },
  loading: {
    id: 'ruleListEditor.loading',
    defaultMessage: '加载中...',
  },
  loadingMore: {
    id: 'ruleListEditor.loadingMore',
    defaultMessage: '加载更多中...',
  },
  empty: {
    id: 'ruleListEditor.empty',
    defaultMessage: '暂无内容，点击下方按钮添加',
  },
  saveSuccess: {
    id: 'ruleListEditor.saveSuccess',
    defaultMessage: '保存成功',
  },
  deleteSuccess: {
    id: 'ruleListEditor.deleteSuccess',
    defaultMessage: '删除成功',
  },
  contentRequired: {
    id: 'ruleListEditor.contentRequired',
    defaultMessage: '请输入规则内容',
  },
});

type RuleType = 'safety_boundary' | 'handoff_policy';

type RuleListResponse = {
  data:
    | AgentRuleResponse[]
    | {
        items?: AgentRuleResponse[] | null;
        limit?: number;
        offset?: number;
        total?: number;
      };
  headers: Headers;
  status: 200;
};

interface EditableRule {
  content: string;
  id?: string;
  isDraft: boolean;
  isSaving: boolean;
  localId: string;
  name: string;
  savedContent: string;
}

interface RuleListEditorProps {
  addLabel: string;
  namePrefix: string;
  ruleType: RuleType;
}

const digitToChinese = [
  '零',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
];

const fromChineseNumber = (value: string): number | null => {
  if (!value) {
    return null;
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  if (value === '十') {
    return 10;
  }

  if (value.startsWith('十')) {
    const ones = digitToChinese.indexOf(value.slice(1));
    return ones > 0 ? 10 + ones : null;
  }

  const [tensPart, onesPart = ''] = value.split('十');
  const tens = digitToChinese.indexOf(tensPart);

  if (tens <= 0) {
    return null;
  }

  if (!onesPart) {
    return tens * 10;
  }

  const ones = digitToChinese.indexOf(onesPart);
  return ones >= 0 ? tens * 10 + ones : null;
};

const extractSequence = (name: string, prefix: string): number | null => {
  if (!name.startsWith(prefix)) {
    return null;
  }

  return fromChineseNumber(name.slice(prefix.length));
};

const getNextAvailableSequence = (
  items: EditableRule[],
  prefix: string,
): number => {
  const used = new Set<number>();

  for (const item of items) {
    const sequence = extractSequence(item.name, prefix);

    if (sequence && sequence > 0) {
      used.add(sequence);
    }
  }

  let candidate = 1;

  while (used.has(candidate)) {
    candidate += 1;
  }

  return candidate;
};

const mapRuleResponse = (rule: AgentRuleResponse): EditableRule => ({
  content: rule.content,
  id: rule.id,
  isDraft: false,
  isSaving: false,
  localId: rule.id,
  name: rule.name,
  savedContent: rule.content,
});

const normalizeRulesPayload = (
  payload: RuleListResponse['data'],
): AgentRuleResponse[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

const listRulesByType = async (
  ruleType: RuleType,
  offset: number,
  limit: number,
): Promise<RuleListResponse> => {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    rule_type: ruleType,
  });

  return useCustomInstance<RuleListResponse>(
    `${RULES_BASE}?${searchParams.toString()}`,
    {
      method: 'GET',
    },
  );
};

const RuleListEditor = ({
  addLabel,
  namePrefix,
  ruleType,
}: RuleListEditorProps): ReactElement => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [rules, setRules] = useState<EditableRule[]>([]);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextSequence, setNextSequence] = useState(1);
  const [persistedCount, setPersistedCount] = useState(0);

  const loadRules = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const response = await listRulesByType(ruleType, offset, PAGE_SIZE);
        const rawRules = normalizeRulesPayload(response.data);
        const fetchedRules = rawRules.map(rule => mapRuleResponse(rule));

        setRules(previous =>
          append ? [...previous, ...fetchedRules] : fetchedRules,
        );
        setPersistedCount(offset + fetchedRules.length);
        setHasMore(fetchedRules.length === PAGE_SIZE);
      } catch (error) {
        setHasMore(false);
        MessagePlugin.error(
          error instanceof Error ? error.message : 'Failed to load rules',
        );
      } finally {
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    },
    [ruleType],
  );

  useEffect(() => {
    setRules([]);
    setPersistedCount(0);
    setHasMore(true);
    loadRules(0, false).catch(() => {});
  }, [loadRules]);

  useEffect(() => {
    setNextSequence(getNextAvailableSequence(rules, namePrefix));
  }, [namePrefix, rules]);

  useEffect(() => {
    if (!activeRuleId) {
      return () => {};
    }

    const handlePointerDown = (event: PointerEvent) => {
      const activeContainer = itemRefs.current[activeRuleId];

      if (activeContainer && !activeContainer.contains(event.target as Node)) {
        setRules(previous =>
          previous
            .map(rule => {
              if (rule.localId !== activeRuleId) {
                return rule;
              }

              if (rule.isDraft) {
                return null;
              }

              return {
                ...rule,
                content: rule.savedContent,
                isSaving: false,
              };
            })
            .filter((rule): rule is EditableRule => rule !== null),
        );
        setActiveRuleId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [activeRuleId]);

  useEffect(() => {
    const scrollHost = containerRef.current?.parentElement;

    if (!scrollHost) {
      return () => {};
    }

    const handleScroll = () => {
      if (isInitialLoading || isLoadingMore || !hasMore) {
        return;
      }

      const nearBottom =
        scrollHost.scrollTop + scrollHost.clientHeight >=
        scrollHost.scrollHeight - 120;

      if (nearBottom) {
        loadRules(persistedCount, true).catch(() => {});
      }
    };

    handleScroll();
    scrollHost.addEventListener('scroll', handleScroll);
    return () => {
      scrollHost.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, isInitialLoading, isLoadingMore, loadRules, persistedCount]);

  const handleAddRule = useCallback(() => {
    const localId = `draft-${Date.now()}-${nextSequence}`;
    const name = `${namePrefix}${nextSequence}`;

    setRules(previous => [
      ...previous,
      {
        content: '',
        isDraft: true,
        isSaving: false,
        localId,
        name,
        savedContent: '',
      },
    ]);
    setActiveRuleId(localId);
  }, [namePrefix, nextSequence]);

  const handleRuleChange = useCallback((localId: string, content: string) => {
    setRules(previous =>
      previous.map(rule =>
        rule.localId === localId ? { ...rule, content } : rule,
      ),
    );
  }, []);

  const handleDeleteRule = useCallback(
    async (rule: EditableRule) => {
      if (rule.isDraft || !rule.id) {
        setRules(previous =>
          previous.filter(item => item.localId !== rule.localId),
        );
        return;
      }

      try {
        await deleteRuleApiV1RulesRuleIdDelete(rule.id);
        setRules(previous =>
          previous.filter(item => item.localId !== rule.localId),
        );
        setPersistedCount(previous => Math.max(previous - 1, 0));
        MessagePlugin.success(intl.formatMessage(messages.deleteSuccess));
      } catch (error) {
        MessagePlugin.error(
          error instanceof Error ? error.message : 'Failed to delete rule',
        );
      }
    },
    [intl],
  );

  const handleConfirmRule = useCallback(
    async (rule: EditableRule) => {
      const trimmedContent = rule.content.trim();

      if (!trimmedContent) {
        MessagePlugin.warning(intl.formatMessage(messages.contentRequired));
        return;
      }

      setRules(previous =>
        previous.map(item =>
          item.localId === rule.localId ? { ...item, isSaving: true } : item,
        ),
      );

      try {
        if (rule.isDraft) {
          const response = await createRuleApiV1RulesPost({
            content: trimmedContent,
            enabled: true,
            name: rule.name,
            priority: 0,
            rule_type: ruleType,
          });

          if (response.status === 201) {
            const savedRule = mapRuleResponse(response.data);
            setRules(previous =>
              previous.map(item =>
                item.localId === rule.localId ? savedRule : item,
              ),
            );
            setPersistedCount(previous => previous + 1);

            // Mark onboarding step 3 (set alert rules) as completed
            updateOnboardingStep(3, true);
            window.dispatchEvent(new Event('onboarding-step-updated'));
          }
        } else if (rule.id) {
          const response = await updateRuleApiV1RulesRuleIdPatch(rule.id, {
            content: trimmedContent,
            name: rule.name,
            rule_type: ruleType,
          });

          if (response.status === 200) {
            const savedRule = mapRuleResponse(response.data);
            setRules(previous =>
              previous.map(item =>
                item.localId === rule.localId ? savedRule : item,
              ),
            );
          }
        }

        setActiveRuleId(null);
        MessagePlugin.success(intl.formatMessage(messages.saveSuccess));
      } catch (error) {
        setRules(previous =>
          previous.map(item =>
            item.localId === rule.localId ? { ...item, isSaving: false } : item,
          ),
        );
        MessagePlugin.error(
          error instanceof Error ? error.message : 'Failed to save rule',
        );
      }
    },
    [intl, ruleType],
  );

  return (
    <div ref={containerRef}>
      <div className="flex flex-col gap-y-[20px]">
        {rules.map(rule => {
          const isActive = activeRuleId === rule.localId;

          return (
            <div
              key={rule.localId}
              ref={node => {
                itemRefs.current[rule.localId] = node;
              }}
              className="flex min-h-[52px] items-center"
            >
              <div className="flex min-w-[88px] flex-shrink-0 items-center gap-[8px]">
                <div className="h-[18px] w-[4px] flex-shrink-0 rounded-[2px] bg-brand" />
                <span className="min-w-[76px] text-right text-[15px] font-medium leading-[22px] text-primary">
                  {rule.name}
                </span>
              </div>

              <div className="ml-[16px] flex-1">
                <div
                  className={`flex h-[44px] items-center rounded-[8px] bg-container transition-all duration-200 ${
                    isActive
                      ? 'border-[1.5px] border-brand shadow-[0_0_0_3px_rgba(37,99,235,0.08)]'
                      : 'border border-line'
                  }`}
                >
                  <input
                    type="text"
                    value={rule.content}
                    onChange={event =>
                      handleRuleChange(rule.localId, event.target.value)
                    }
                    placeholder={intl.formatMessage(messages.placeholder)}
                    onFocus={() => setActiveRuleId(rule.localId)}
                    className="h-full flex-1 rounded-[8px] border-none bg-transparent px-[16px] text-[15px] font-normal text-primary outline-none placeholder:text-placeholder"
                    style={{ lineHeight: '44px' }}
                  />
                  <div className="flex items-center pr-[12px]">
                    {isActive ? (
                      <button
                        type="button"
                        disabled={rule.isSaving}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => {
                          handleConfirmRule(rule).catch(() => {});
                        }}
                        className="flex h-[28px] min-w-[56px] flex-shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-none bg-brand px-[12px] text-[13px] font-medium text-text-anti disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {intl.formatMessage(messages.confirm)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteRule(rule).catch(() => {});
                        }}
                        className="flex h-[28px] min-w-[56px] flex-shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-solid border-line px-[12px] text-[13px] font-medium text-secondary transition-colors duration-200 hover:border-error hover:text-error"
                      >
                        {intl.formatMessage(messages.delete)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isInitialLoading ? (
        <div className="flex min-h-[160px] items-center justify-center text-[14px] text-secondary">
          <Loading loading text={intl.formatMessage(messages.loading)} />
        </div>
      ) : rules.length === 0 ? (
        <div className="ml-[104px] mt-[24px] rounded-[8px] border border-dashed border-line bg-container px-[20px] py-[24px] text-[14px] text-secondary">
          {intl.formatMessage(messages.empty)}
        </div>
      ) : null}

      {isLoadingMore ? (
        <div className="ml-[104px] mt-[16px] text-[14px] text-secondary">
          {intl.formatMessage(messages.loadingMore)}
        </div>
      ) : null}

      <div
        className="ml-[104px] mt-[28px]"
        style={{ width: 'calc(100% - 104px)' }}
      >
        <button
          type="button"
          onClick={handleAddRule}
          className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border-[1.5px] border-dashed border-brand bg-transparent transition-colors duration-200 hover:bg-brand-light"
        >
          <AddIcon size="18px" className="text-brand" />
          <span className="text-[15px] font-medium text-brand">{addLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default RuleListEditor;
