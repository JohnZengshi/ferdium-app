/**
 * DigitalHumanForm — 数字人创建/编辑表单
 *
 * 支持：
 * - 创建新数字人
 * - 编辑已有数字人（暂未实现API）
 * - 表单校验
 */

import { observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import {
  Dialog,
  Form,
  type FormInstanceFunctions,
  type FormRule,
  Input,
  MessagePlugin,
  Select,
  Textarea,
} from 'tdesign-react';
import type {
  DigitalHumanCreateRequest,
  AppApiSchemasDigitalHumanResponse,
} from '../../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import type DigitalHumanStore from '../../../stores/DigitalHumanStore';

const messages = defineMessages({
  validationNameRequired: {
    id: 'digitalHumanForm.validation.nameRequired',
    defaultMessage: '请输入数字人名称',
  },
  validationNameLength: {
    id: 'digitalHumanForm.validation.nameLength',
    defaultMessage: '名称长度为1-64字符',
  },
  validationPersonaPromptMax: {
    id: 'digitalHumanForm.validation.personaPromptMax',
    defaultMessage: '人设描述最多2000字符',
  },
  validationKnowledgeCollectionMax: {
    id: 'digitalHumanForm.validation.knowledgeCollectionMax',
    defaultMessage: '知识库集合名称最多128字符',
  },
  toastCreateSuccess: {
    id: 'digitalHumanForm.toast.createSuccess',
    defaultMessage: '创建成功',
  },
  toastCreateFailed: {
    id: 'digitalHumanForm.toast.createFailed',
    defaultMessage: '创建失败',
  },
  headerEdit: {
    id: 'digitalHumanForm.header.edit',
    defaultMessage: '编辑数字人',
  },
  headerCreate: {
    id: 'digitalHumanForm.header.create',
    defaultMessage: '创建数字人',
  },
  btnSave: {
    id: 'digitalHumanForm.btn.save',
    defaultMessage: '保存',
  },
  btnCreate: {
    id: 'digitalHumanForm.btn.create',
    defaultMessage: '创建',
  },
  labelName: {
    id: 'digitalHumanForm.label.name',
    defaultMessage: '数字人名称',
  },
  placeholderName: {
    id: 'digitalHumanForm.placeholder.name',
    defaultMessage: '请输入数字人名称',
  },
  labelAccountHandle: {
    id: 'digitalHumanForm.label.accountHandle',
    defaultMessage: '账号句柄',
  },
  placeholderAccountHandle: {
    id: 'digitalHumanForm.placeholder.accountHandle',
    defaultMessage: '例如：@customer_service',
  },
  labelPlatform: {
    id: 'digitalHumanForm.label.platform',
    defaultMessage: '平台',
  },
  labelAvatarUrl: {
    id: 'digitalHumanForm.label.avatarUrl',
    defaultMessage: '头像URL',
  },
  labelPersonaPrompt: {
    id: 'digitalHumanForm.label.personaPrompt',
    defaultMessage: '人设描述',
  },
  placeholderPersonaPrompt: {
    id: 'digitalHumanForm.placeholder.personaPrompt',
    defaultMessage: '用自然语言描述数字人的性格、语气、专业领域...',
  },
  labelKnowledgeCollection: {
    id: 'digitalHumanForm.label.knowledgeCollection',
    defaultMessage: '知识库集合',
  },
  placeholderKnowledgeCollection: {
    id: 'digitalHumanForm.placeholder.knowledgeCollection',
    defaultMessage: '关联的Milvus集合名称',
  },
  labelVoice: {
    id: 'digitalHumanForm.label.voice',
    defaultMessage: '语音配置',
  },
  placeholderVoice: {
    id: 'digitalHumanForm.placeholder.voice',
    defaultMessage: '语音合成配置（可选）',
  },
  labelStatus: {
    id: 'digitalHumanForm.label.status',
    defaultMessage: '状态',
  },
  selectOptionActive: {
    id: 'digitalHumanForm.selectOption.active',
    defaultMessage: '活跃',
  },
  selectOptionInactive: {
    id: 'digitalHumanForm.selectOption.inactive',
    defaultMessage: '未激活',
  },
});

interface DigitalHumanFormProps {
  visible: boolean;
  digitalHuman?: AppApiSchemasDigitalHumanResponse | null;
  store: DigitalHumanStore;
  onClose: () => void;
  onSuccess: () => void;
}

interface DigitalHumanFormState {
  submitting: boolean;
  formData: DigitalHumanCreateRequest;
}

@observer
class DigitalHumanForm extends Component<
  DigitalHumanFormProps & WrappedComponentProps,
  DigitalHumanFormState
> {
  formRef: FormInstanceFunctions | null = null;

  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
      formData: {
        name: '',
        avatar_url: undefined,
        voice: undefined,
        account_handle: undefined,
        platform: 'whatsapp',
        persona_config: undefined,
        persona_prompt: undefined,
        knowledge_collection: undefined,
        default_provider: 'openai',
        status: 'active',
      },
    };
  }

  componentDidMount(): void {
    if (this.props.digitalHuman) {
      // 编辑模式：预填充数据
      this.setState({
        formData: {
          name: this.props.digitalHuman.name,
          avatar_url: this.props.digitalHuman.avatar_url || undefined,
          voice: this.props.digitalHuman.voice || undefined,
          account_handle: this.props.digitalHuman.account_handle || undefined,
          platform: this.props.digitalHuman.platform || 'whatsapp',
          persona_config: this.props.digitalHuman.persona_config,
          persona_prompt: this.props.digitalHuman.persona_prompt || undefined,
          knowledge_collection:
            this.props.digitalHuman.knowledge_collection || undefined,
          default_provider:
            this.props.digitalHuman.default_provider || 'openai',
          status: this.props.digitalHuman.status || 'active',
        },
      });
    }
  }

  get rules(): Record<string, FormRule[]> {
    const { intl } = this.props;
    return {
      name: [
        {
          required: true,
          message: intl.formatMessage(messages.validationNameRequired),
          type: 'error',
        },
        {
          min: 1,
          max: 64,
          message: intl.formatMessage(messages.validationNameLength),
          type: 'warning',
        },
      ],
      persona_prompt: [
        {
          max: 2000,
          message: intl.formatMessage(messages.validationPersonaPromptMax),
          type: 'warning',
        },
      ],
      knowledge_collection: [
        {
          max: 128,
          message: intl.formatMessage(
            messages.validationKnowledgeCollectionMax,
          ),
          type: 'warning',
        },
      ],
    };
  }

  handleSubmit = async (): Promise<void> => {
    const valid = await this.formRef?.validate();
    if (!valid) {
      return;
    }

    this.setState({ submitting: true });

    try {
      await this.props.store.createDigitalHuman(this.state.formData);
      MessagePlugin.success(
        this.props.intl.formatMessage(messages.toastCreateSuccess),
      );
      this.props.onSuccess();
      this.props.onClose();
    } catch (error) {
      MessagePlugin.error(
        error instanceof Error
          ? error.message
          : this.props.intl.formatMessage(messages.toastCreateFailed),
      );
    } finally {
      this.setState({ submitting: false });
    }
  };

  handleFieldChange = (
    field: keyof DigitalHumanCreateRequest,
    value: any,
  ): void => {
    this.setState(prev => ({
      formData: {
        ...prev.formData,
        [field]: value,
      },
    }));
  };

  render(): ReactElement {
    const { visible, digitalHuman, onClose, intl } = this.props;
    const { submitting, formData } = this.state;
    const isEditMode = !!digitalHuman;

    return (
      <Dialog
        visible={visible}
        header={intl.formatMessage(
          isEditMode ? messages.headerEdit : messages.headerCreate,
        )}
        width="600px"
        confirmBtn={{
          content: intl.formatMessage(
            isEditMode ? messages.btnSave : messages.btnCreate,
          ),
          loading: submitting,
        }}
        onConfirm={this.handleSubmit}
        onClose={onClose}
      >
        <Form
          ref={ref => {
            this.formRef = ref;
          }}
          rules={this.rules}
          labelWidth="120px"
          colon
        >
          <Form.FormItem
            label={intl.formatMessage(messages.labelName)}
            name="name"
          >
            <Input
              value={formData.name}
              placeholder={intl.formatMessage(messages.placeholderName)}
              onChange={value => this.handleFieldChange('name', value)}
            />
          </Form.FormItem>

          <Form.FormItem
            label={intl.formatMessage(messages.labelAccountHandle)}
            name="account_handle"
          >
            <Input
              value={formData.account_handle || ''}
              placeholder={intl.formatMessage(
                messages.placeholderAccountHandle,
              )}
              onChange={value =>
                this.handleFieldChange('account_handle', value)
              }
            />
          </Form.FormItem>

          <Form.FormItem
            label={intl.formatMessage(messages.labelPlatform)}
            name="platform"
          >
            <Select
              value={formData.platform || 'whatsapp'}
              options={[
                { label: 'WhatsApp', value: 'whatsapp' },
                { label: 'Telegram', value: 'telegram' },
                { label: 'WeChat', value: 'wechat' },
              ]}
              onChange={value => this.handleFieldChange('platform', value)}
            />
          </Form.FormItem>

          <Form.FormItem
            label={intl.formatMessage(messages.labelAvatarUrl)}
            name="avatar_url"
          >
            <Input
              value={formData.avatar_url || ''}
              placeholder="https://..."
              onChange={value => this.handleFieldChange('avatar_url', value)}
            />
          </Form.FormItem>

          <Form.FormItem label="LLM Provider" name="default_provider">
            <Select
              value={formData.default_provider || 'openai'}
              options={[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Claude', value: 'claude' },
                { label: 'Gemini', value: 'gemini' },
                { label: 'DeepSeek', value: 'deepseek' },
              ]}
              onChange={value =>
                this.handleFieldChange('default_provider', value)
              }
            />
          </Form.FormItem>

          <Form.FormItem
            label={intl.formatMessage(messages.labelPersonaPrompt)}
            name="persona_prompt"
          >
            <Textarea
              value={formData.persona_prompt || ''}
              placeholder={intl.formatMessage(
                messages.placeholderPersonaPrompt,
              )}
              rows={4}
              maxlength={2000}
              onChange={value =>
                this.handleFieldChange('persona_prompt', value)
              }
            />
          </Form.FormItem>

          <Form.FormItem
            label={intl.formatMessage(messages.labelKnowledgeCollection)}
            name="knowledge_collection"
          >
            <Input
              value={formData.knowledge_collection || ''}
              placeholder={intl.formatMessage(
                messages.placeholderKnowledgeCollection,
              )}
              onChange={value =>
                this.handleFieldChange('knowledge_collection', value)
              }
            />
          </Form.FormItem>

          <Form.FormItem
            label={intl.formatMessage(messages.labelVoice)}
            name="voice"
          >
            <Input
              value={formData.voice || ''}
              placeholder={intl.formatMessage(messages.placeholderVoice)}
              onChange={value => this.handleFieldChange('voice', value)}
            />
          </Form.FormItem>

          <Form.FormItem
            label={intl.formatMessage(messages.labelStatus)}
            name="status"
          >
            <Select
              value={formData.status || 'active'}
              options={[
                {
                  label: intl.formatMessage(messages.selectOptionActive),
                  value: 'active',
                },
                {
                  label: intl.formatMessage(messages.selectOptionInactive),
                  value: 'inactive',
                },
              ]}
              onChange={value => this.handleFieldChange('status', value)}
            />
          </Form.FormItem>
        </Form>
      </Dialog>
    );
  }
}

export default injectIntl(DigitalHumanForm);
