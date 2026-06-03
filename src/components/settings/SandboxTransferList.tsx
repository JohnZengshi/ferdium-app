import { inject, observer } from 'mobx-react';
import { useCallback, useState } from 'react';
import { Button, Checkbox, Col, Row } from 'tdesign-react';
import type { StoresProps } from '../../@types/ferdium-components.types';

function not(a: readonly string[], b: readonly string[]) {
  return a.filter(value => !b.includes(value));
}

function intersection(a: readonly string[], b: readonly string[]) {
  return a.filter(value => b.includes(value));
}

interface ISandboxTransferListProps extends StoresProps {
  value: number;
}

function SandboxTransferList(props: ISandboxTransferListProps) {
  const { value, actions, stores } = props;

  const { editSandboxService } = actions.app;

  const { sandboxServices } = stores.app;
  const { all: allServices } = stores.services;

  const selectedServices = sandboxServices[value].services;

  // Create a Set to keep track of unique not selected services
  const notSelectedSet = new Set<string>();

  // Loop through all services and check if they are in any sandbox's selected services
  allServices.forEach(service => {
    let isSelected = false;

    sandboxServices.forEach(sandbox => {
      if (sandbox.services.includes(service.id)) {
        isSelected = true;
      }
    });

    // If the service is not selected in any sandbox service, add it to the Set
    if (!isSelected) {
      notSelectedSet.add(service.id);
    }
  });

  // Convert the Set to an array
  const notSelected = [...notSelectedSet];

  const [checked, setChecked] = useState<readonly string[]>([]);
  const handleToggle = (itemValue: string) => () => {
    const currentIndex = checked.indexOf(itemValue);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(itemValue);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  const sandboxId = sandboxServices[value].id;

  const leftChecked = intersection(checked, selectedServices);
  const rightChecked = intersection(checked, notSelected);

  const getServiceInfo = (id: string) => {
    const service = allServices.find(s => s.id === id);
    if (!service) {
      return null;
    }
    return service;
  };

  const customList = (items: readonly string[]) => (
    <div
      style={{
        maxHeight: 300,
        overflow: 'auto',
        border: '1px solid var(--td-component-border, #dcdcdc)',
        borderRadius: 'var(--td-radius-default, 4px)',
      }}
    >
      {items.map((itemValue: string) => {
        const labelId = `transfer-list-item-${itemValue}-label`;

        return (
          <div
            key={`${sandboxId}-${itemValue}-li`}
            role="button"
            onClick={handleToggle(itemValue)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleToggle(itemValue)();
              }
            }}
            tabIndex={0}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            <span style={{ pointerEvents: 'none' }}>
              <Checkbox checked={checked.includes(itemValue)} />
            </span>
            <img
              src={getServiceInfo(itemValue)?.icon}
              alt={getServiceInfo(itemValue)?.name}
              width={15}
              height={15}
              style={{ marginLeft: 8, marginRight: 8, flexShrink: 0 }}
            />
            <span id={labelId}>{getServiceInfo(itemValue)?.name}</span>
          </div>
        );
      })}
    </div>
  );

  const handleAllRight = useCallback(() => {
    editSandboxService({
      id: sandboxId,
      services: [],
    });
    setChecked([]);
  }, [editSandboxService, sandboxId]);

  const handleCheckedRight = useCallback(() => {
    editSandboxService({
      id: sandboxId,
      services: not(selectedServices, leftChecked),
    });
    setChecked(not(checked, leftChecked));
  }, [editSandboxService, sandboxId, selectedServices, leftChecked, checked]);

  const handleCheckedLeft = useCallback(() => {
    editSandboxService({
      id: sandboxId,
      services: [...selectedServices, ...rightChecked],
    });
    setChecked(not(checked, rightChecked));
  }, [editSandboxService, sandboxId, selectedServices, rightChecked, checked]);

  const handleAllLeft = useCallback(() => {
    editSandboxService({
      id: sandboxId,
      services: [...selectedServices, ...notSelected],
    });
    setChecked([]);
  }, [editSandboxService, sandboxId, selectedServices, notSelected]);

  return (
    <Row gutter={16} justify="center" align="middle">
      <Col>{customList(selectedServices)}</Col>
      <Col style={{ flex: '0 0 auto' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Button
            variant="outline"
            size="small"
            onClick={handleAllLeft}
            disabled={notSelected.length === 0}
          >
            ≪
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={handleCheckedLeft}
            disabled={rightChecked.length === 0}
          >
            &lt;
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={handleCheckedRight}
            disabled={leftChecked.length === 0}
          >
            &gt;
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={handleAllRight}
            disabled={selectedServices.length === 0}
          >
            ≫
          </Button>
        </div>
      </Col>
      <Col>{customList(notSelected)}</Col>
    </Row>
  );
}

export default inject('stores', 'actions')(observer(SandboxTransferList));
