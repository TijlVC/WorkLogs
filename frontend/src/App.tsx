import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { nl } from 'date-fns/locale';
import theme from './theme';
import Login from './components/Login';
import Register from './components/Register';
import WorklogList from './components/WorklogList';
import WorklogForm from './components/WorklogForm';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={nl}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <Layout>
                  <WorklogList />
                </Layout>
              } />
              <Route path="/worklog/new" element={
                <Layout>
                  <WorklogForm />
                </Layout>
              } />
              <Route path="/worklog/edit/:id" element={
                <Layout>
                  <WorklogForm />
                </Layout>
              } />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App; 