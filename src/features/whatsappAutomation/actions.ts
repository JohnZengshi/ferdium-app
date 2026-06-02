import PropTypes from 'prop-types';
import { createActionsFromDefinitions } from '../../actions/lib/actions';

export interface WhatsAppAutomationActionsType {
  setServiceWebview: (payload: { serviceId: string }) => void;
  checkSessionStatus: (payload: { serviceId: string }) => void;
  handleHostMessage: (payload: { action: string; data?: object }) => void;
  handleClientMessage: (payload: {
    channel: string;
    message: { action: string; data: object };
  }) => void;
  injectQrModal: (payload: { serviceId: string }) => void;
  removeQrModal: (payload: { serviceId: string }) => void;
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
