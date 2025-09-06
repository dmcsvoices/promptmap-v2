import React from 'react';
import { Alert, Box, LinearProgress } from '@mui/material';
import { CheckCircle, Error, Wifi } from '@mui/icons-material';

interface ConnectionStatusProps {
  connected: boolean;
  loading: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, loading }) => {
  if (loading) {
    return (
      <Box sx={{ px: 3, py: 1 }}>
        <Alert 
          severity="info" 
          icon={<Wifi />}
          sx={{ mb: 0 }}
        >
          Connecting to PromptMap V2 API...
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      </Box>
    );
  }

  if (!connected) {
    return (
      <Box sx={{ px: 3, py: 1 }}>
        <Alert 
          severity="error" 
          icon={<Error />}
          sx={{ mb: 0 }}
        >
          Cannot connect to backend API. Please check if the server is running on port 8000.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3, py: 1 }}>
      <Alert 
        severity="success" 
        icon={<CheckCircle />}
        sx={{ mb: 0 }}
      >
        Connected to PromptMap V2 API
      </Alert>
    </Box>
  );
};

export default ConnectionStatus;