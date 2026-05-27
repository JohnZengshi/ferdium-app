import PropTypes from 'prop-types';
import { createActionsFromDefinitions } from '../../actions/lib/actions';

export interface WhatsAppAutomationActionsType {
  setServiceWebview: (serviceId: string) => void;
  checkSessionStatus: (serviceId: string) => void;
  handleHostMessage: (action: string, data: object) => void;
  handleClientMessage: (
    channel: string,
    message: { action: string; data: object },
  ) => void;
  injectQrModal: (serviceId: string) => void;
  removeQrModal: (serviceId: string) => void;
}

export const whatsappAutomationActions =
  createActionsFromDefinitions<WhatsAppAutomationActionsType>(
    {
      setServiceWebview: {
        serviceId: PropTypes.string.isRequired,
      },
      checkSessionStatus: {
        serviceId: PropTypes.string.isRequired,
      },
      handleHostMessage: {
        action: PropTypes.string.isRequired,
        data: PropTypes.object,
      },
      handleClientMessage: {
        channel: PropTypes.string.isRequired,
        message: PropTypes.shape({
          action: PropTypes.string.isRequired,
          data: PropTypes.shape({}),
        }),
      },
      injectQrModal: {
        serviceId: PropTypes.string.isRequired,
      },
      removeQrModal: {
        serviceId: PropTypes.string.isRequired,
      },
    },
    PropTypes.checkPropTypes,
  );
