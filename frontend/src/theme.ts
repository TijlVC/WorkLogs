import { createTheme } from '@mui/material/styles';
import { nlNL } from '@mui/material/locale';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
}, nlNL);

export default theme; 