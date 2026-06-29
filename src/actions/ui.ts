import PropTypes from 'prop-types';
import type { ActionDefinitions } from './lib/actions';

export default <ActionDefinitions>{
  openSettings: {
    path: PropTypes.string,
  },
  openDownloads: {
    path: PropTypes.string,
  },
  closeSettings: {},
  openSettingsModal: {},
  closeSettingsModal: {},
  toggleServiceUpdatedInfoBar: {
    visible: PropTypes.bool,
  },
};
