/**
 * DigitalHumanForm — 数字人创建/编辑表单
 *
 * 支持：
 * - 创建新数字人
 * - 编辑已有数字人（暂未实现API）
 * - 表单校验
 */

import { Component, type ReactElement } from 'react';
import { observer } from 'mobx-react';
import {
  Dialog,
  Form,
  Input,
  Select,
  Textarea,
  MessagePlugin,
  type FormInstanceFunctions,
  type FormRule,
} from 'tdesign-react';
import type {
  DigitalHumanCreateRequest,
  DigitalHumanResponse,
} from '../../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import type DigitalHumanStore from '../../../stores/DigitalHumanStore';

interface DigitalHumanFormProps {
  visible: boolean;
  digitalHuman?: DigitalHumanResponse | null;
  store: DigitalHumanStore;
  onClose: () => void;
  onSuccess: () => void;
}

interface DigitalHumanFormState {
  submitting: boolean;
  formData: DigitalHumanCreateRequest;
}

@observer
export default class DigitalHumanForm extends Component<
  DigitalHumanFormProps,
  DigitalHumanFormState
> {
  formRef: FormInstanceFunctions | null = null;

  constructor(props: DigitalHumanFormProps) {
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

  rules: Record<string, FormRule[]> = {
    name: [
      { required: true, message: '请输入数字人名称', type: 'error' },
      { min: 1, max: 64, message: '名称长度为1-64字符', type: 'warning' },
    ],
    persona_prompt: [
      { max: 2000, message: '人设描述最多2000字符', type: 'warning' },
    ],
    knowledge_collection: [
      { max: 128, message: '知识库集合名称最多128字符', type: 'warning' },
    ],
  };

  handleSubmit = async (): Promise<void> => {
    const valid = await this.formRef?.validate();
    if (!valid) {
      return;
    }

    this.setState({ submitting: true });

    try {
      await this.props.store.createDigitalHuman(this.state.formData);
      MessagePlugin.success('创建成功');
      this.props.onSuccess();
      this.props.onClose();
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '创建失败');
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
    const { visible, digitalHuman, onClose } = this.props;
    const { submitting, formData } = this.state;
    const isEditMode = !!digitalHuman;

    return (
      <Dialog
        visible={visible}
        header={isEditMode ? '编辑数字人' : '创建数字人'}
        width="600px"
        confirmBtn={{
          content: isEditMode ? '保存' : '创建',
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
          <Form.FormItem label="数字人名称" name="name">
            <Input
              value={formData.name}
              placeholder="请输入数字人名称"
              onChange={value => this.handleFieldChange('name', value)}
            />
          </Form.FormItem>

          <Form.FormItem label="账号句柄" name="account_handle">
            <Input
              value={formData.account_handle || ''}
              placeholder="例如：@customer_service"
              onChange={value =>
                this.handleFieldChange('account_handle', value)
              }
            />
          </Form.FormItem>

          <Form.FormItem label="平台" name="platform">
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

          <Form.FormItem label="头像URL" name="avatar_url">
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

          <Form.FormItem label="人设描述" name="persona_prompt">
            <Textarea
              value={formData.persona_prompt || ''}
              placeholder="用自然语言描述数字人的性格、语气、专业领域..."
              rows={4}
              maxlength={2000}
              onChange={value =>
                this.handleFieldChange('persona_prompt', value)
              }
            />
          </Form.FormItem>

          <Form.FormItem label="知识库集合" name="knowledge_collection">
            <Input
              value={formData.knowledge_collection || ''}
              placeholder="关联的Milvus集合名称"
              onChange={value =>
                this.handleFieldChange('knowledge_collection', value)
              }
            />
          </Form.FormItem>

          <Form.FormItem label="语音配置" name="voice">
            <Input
              value={formData.voice || ''}
              placeholder="语音合成配置（可选）"
              onChange={value => this.handleFieldChange('voice', value)}
            />
          </Form.FormItem>

          <Form.FormItem label="状态" name="status">
            <Select
              value={formData.status || 'active'}
              options={[
                { label: '活跃', value: 'active' },
                { label: '未激活', value: 'inactive' },
              ]}
              onChange={value => this.handleFieldChange('status', value)}
            />
          </Form.FormItem>
        </Form>
      </Dialog>
    );
  }
}
