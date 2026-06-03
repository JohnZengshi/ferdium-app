import { mdiDelete, mdiPlusCircle } from '@mdi/js';
import { inject, observer } from 'mobx-react';
import { useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { Button, Input, type TabValue, Tabs } from 'tdesign-react';
import type { StoresProps } from '../../@types/ferdium-components.types';
import Icon from '../ui/icon';
import SandboxTransferList from './SandboxTransferList';

const { TabPanel } = Tabs;

const debug = require('../../preload-safe-debug')('Ferdium:Settings');

const messages = defineMessages({
  addCustomSandbox: {
    id: 'sandbox.addCustomSandbox',
    defaultMessage: 'Add a custom sandbox',
  },
});

interface IProps extends StoresProps {}

function SandboxServiceTabs(props: IProps) {
  const [value, setValue] = useState(0);

  const intl = useIntl();

  const { stores, actions } = props;

  const { sandboxServices } = stores.app;
  const { addSandboxService, editSandboxService, deleteSandboxService } =
    actions.app;

  const handleChange = (newValue: TabValue) => {
    debug('handleChange', newValue);
    setValue(newValue as number);
  };

  const handleAddTab = () => {
    addSandboxService();
    setValue(sandboxServices.length - 1);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
      }}
    >
      <Button
        variant="outline"
        icon={<Icon icon={mdiPlusCircle} />}
        onClick={handleAddTab}
        style={{
          width: 'fit-content',
          display: 'flex',
          margin: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {intl.formatMessage(messages.addCustomSandbox)}
      </Button>

      <div
        style={{
          flexGrow: 1,
          display: sandboxServices.length === 0 ? 'none' : 'flex',
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          placement="left"
          style={{
            borderRight: '1px solid var(--td-component-border, #dcdcdc)',
            minWidth: '20%',
            maxWidth: '20%',
          }}
        >
          {sandboxServices?.map((tab, index) => (
            <TabPanel
              key={`${tab.id}-tabpanel`}
              value={index}
              label={tab.name}
              destroyOnHide={false}
            >
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Input
                    name={`text-${tab.id}`}
                    value={tab.name}
                    onChange={value => {
                      editSandboxService({ id: tab.id, name: value });
                    }}
                    style={{ flexGrow: 1 }}
                  />
                  <Button
                    icon={<Icon icon={mdiDelete} />}
                    shape="square"
                    variant="text"
                    theme="danger"
                    onClick={() => {
                      deleteSandboxService({ id: tab.id });
                      setValue(value ? value - 1 : 0);
                    }}
                  />
                </div>
                <SandboxTransferList
                  value={value}
                  actions={actions}
                  stores={stores}
                />
              </div>
            </TabPanel>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

export default inject('stores', 'actions')(observer(SandboxServiceTabs));
