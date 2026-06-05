import { observer } from 'mobx-react';
import type { ReactElement } from 'react';
import { ThemeProvider } from 'react-jss';

import AppLoader from '../ui/AppLoader';

interface IProps {
  theme: any;
}

const AppLoading = ({ theme }: IProps): ReactElement => (
  <ThemeProvider theme={theme}>
    <AppLoader theme={theme} />
  </ThemeProvider>
);

export default observer(AppLoading);
