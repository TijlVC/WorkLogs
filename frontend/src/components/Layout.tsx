import React from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ flexDirection: { xs: 'column', sm: 'row' }, py: { xs: 1, sm: 0 } }}>
          <Typography variant="h6" component="div" sx={{ 
            flexGrow: 1,
            textAlign: { xs: 'center', sm: 'left' }
          }}>
            Werklogboek - Tijl Van Caneghem
          </Typography>
          {isAuthenticated && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 2 },
              width: { xs: '100%', sm: 'auto' }
            }}>
              <Typography variant="body1">
                {user?.name}
              </Typography>
              <Button 
                color="inherit" 
                onClick={handleLogout}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Uitloggen
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          {children}
        </Box>
      </Container>
    </>
  );
};

export default Layout; 