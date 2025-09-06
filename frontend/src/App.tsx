import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Box, Container, Snackbar, Alert } from '@mui/material';

// Components
import Header from './components/Header.tsx';
import Sidebar from './components/Sidebar.tsx';
import ConnectionStatus from './components/ConnectionStatus.tsx';

// Pages
import Dashboard from './pages/Dashboard.tsx';
import Sessions from './pages/Sessions.tsx';
import Prompts from './pages/Prompts.tsx';
import Tests from './pages/Tests.tsx';
import Results from './pages/Results.tsx';
import Settings from './pages/Settings.tsx';

// Services
import { apiService } from './services/api.ts';

// Types
interface AppState {
  connected: boolean;
  loading: boolean;
  error: string | null;
}

// Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#7c3aed',
    },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
});

function App() {
  const [state, setState] = useState<AppState>({
    connected: false,
    loading: true,
    error: null,
  });

  // Test API connection on startup
  useEffect(() => {
    const testConnection = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // Test backend connection
        const response = await apiService.testConnection();
        
        setState(prev => ({
          ...prev,
          connected: true,
          loading: false,
        }));
        
        console.log('✅ Connected to PromptMap V2 API:', response);
      } catch (error) {
        console.error('❌ Failed to connect to API:', error);
        setState(prev => ({
          ...prev,
          connected: false,
          loading: false,
          error: 'Failed to connect to backend API',
        }));
      }
    };

    testConnection();
  }, []);

  const handleCloseError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              minHeight: '100vh',
              backgroundColor: '#f8fafc',
            }}
          >
            {/* Header */}
            <Header />
            
            {/* Connection Status */}
            <ConnectionStatus 
              connected={state.connected}
              loading={state.loading}
            />
            
            {/* Page Content */}
            <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/prompts" element={<Prompts />} />
                <Route path="/tests" element={<Tests />} />
                <Route path="/results" element={<Results />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Container>
          </Box>
        </Box>
        
        {/* Error Snackbar */}
        <Snackbar 
          open={!!state.error}
          autoHideDuration={6000}
          onClose={handleCloseError}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {state.error}
          </Alert>
        </Snackbar>
      </Router>
    </ThemeProvider>
  );
}

export default App;