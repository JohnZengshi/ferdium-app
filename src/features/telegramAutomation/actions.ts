import PropTypes from 'prop-types';
import { createActionsFromDefinitions } from '../../actions/lib/actions';

export interface TelegramAutomationActionsType {
  beginBinding: (payload: { name: string; proxy?: object | null }) => void;
  closeBinding: () => void;
}

export const telegramAutomationActions =
  createActionsFromDefinitions<TelegramAutomationActionsType>(
    {
      beginBinding: {
        name: PropTypes.string.isRequired,
        proxy: PropTypes.object,
      },
      closeBinding: {},
    },
    PropTypes.checkPropTypes,
  );
