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

// Synthwave Theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff00ff', // Hot pink/magenta
      dark: '#cc00cc',
      light: '#ff66ff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00ffff', // Cyan
      dark: '#00cccc',
      light: '#66ffff',
      contrastText: '#000000',
    },
    background: {
      default: '#0a0a0a', // Deep black
      paper: '#1a0a2e', // Dark purple-ish
    },
    text: {
      primary: '#ffffff',
      secondary: '#00ffff',
    },
    error: {
      main: '#ff0040',
      light: '#ff6690',
      dark: '#cc0030',
    },
    warning: {
      main: '#ffff00',
      light: '#ffff66',
      dark: '#cccc00',
    },
    success: {
      main: '#00ff40',
      light: '#66ff90',
      dark: '#00cc30',
    },
    info: {
      main: '#00ffff',
      light: '#66ffff',
      dark: '#00cccc',
    },
  },
  typography: {
    fontFamily: '"Orbitron", "Roboto Mono", monospace',
    h1: {
      fontWeight: 700,
      textShadow: '0 0 20px #ff00ff',
      color: '#ffffff',
    },
    h2: {
      fontWeight: 700,
      textShadow: '0 0 15px #ff00ff',
      color: '#ffffff',
    },
    h3: {
      fontWeight: 600,
      textShadow: '0 0 10px #ff00ff',
      color: '#ffffff',
    },
    h4: {
      fontWeight: 600,
      textShadow: '0 0 8px #ff00ff',
      color: '#ffffff',
    },
    h5: {
      fontWeight: 600,
      textShadow: '0 0 5px #ff00ff',
      color: '#ffffff',
    },
    h6: {
      fontWeight: 600,
      textShadow: '0 0 5px #ff00ff',
      color: '#ffffff',
    },
    body1: {
      color: '#ffffff',
    },
    body2: {
      color: '#00ffff',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        
        body {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 25%, #16213e 50%, #0f3460 75%, #0a0a0a 100%);
          background-attachment: fixed;
          min-height: 100vh;
        }
        
        /* Synthwave grid overlay */
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(rgba(255, 0, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 0, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          z-index: -1;
        }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #1a0a2e, #16213e)',
          border: '1px solid #ff00ff',
          boxShadow: '0 8px 32px rgba(255, 0, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          '&:hover': {
            boxShadow: '0 12px 48px rgba(255, 0, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          fontFamily: '"Orbitron", monospace',
          boxShadow: '0 4px 15px rgba(255, 0, 255, 0.4)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(255, 0, 255, 0.6)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #ff00ff, #ff66ff)',
          color: '#000000',
          '&:hover': {
            background: 'linear-gradient(45deg, #ff66ff, #ff99ff)',
          },
        },
        outlined: {
          borderColor: '#00ffff',
          color: '#00ffff',
          '&:hover': {
            borderColor: '#66ffff',
            backgroundColor: 'rgba(0, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#00ffff',
            },
            '&:hover fieldset': {
              borderColor: '#66ffff',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ff00ff',
              boxShadow: '0 0 10px rgba(255, 0, 255, 0.5)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#00ffff',
            '&.Mui-focused': {
              color: '#ff00ff',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Orbitron", monospace',
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 0, 255, 0.3)',
          color: '#ffffff',
        },
        head: {
          backgroundColor: 'rgba(255, 0, 255, 0.1)',
          color: '#ff00ff',
          fontWeight: 700,
          fontFamily: '"Orbitron", monospace',
        },
      },
    },
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
              background: 'transparent',
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