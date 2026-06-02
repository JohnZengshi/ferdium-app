import { observer } from 'mobx-react';
import { Component, type ReactElement, type ReactNode } from 'react';
import withStyles, { type WithStylesProps } from 'react-jss';
import type { Theme } from '../../../themes';
import styles from './styles';

interface IProps extends WithStylesProps<typeof styles> {
  className?: string;
  title?: string;
  theme?: Theme;
  spinnerColor?: string;
  loaded?: boolean;
  children?: ReactNode;
}

@observer
class FullscreenLoader extends Component<IProps> {
  render(): ReactElement {
    return <></>;
  }
}

export default withStyles(styles, { injectTheme: true })(FullscreenLoader);
