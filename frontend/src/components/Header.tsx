import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';

const Header: React.FC = () => {
  return (
    <AppBar 
      position="static" 
      sx={{ 
        background: 'linear-gradient(45deg, #0a0a0a 0%, #1a0a2e 50%, #16213e 100%)',
        boxShadow: '0 4px 20px rgba(255, 0, 255, 0.3)',
        borderBottom: '2px solid #ff00ff',
        zIndex: 1200
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon sx={{ 
            color: '#00ffff', 
            fontSize: 32,
            filter: 'drop-shadow(0 0 10px #00ffff)'
          }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              color: '#ffffff',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textShadow: '0 0 10px #ff00ff',
              fontFamily: '"Orbitron", monospace'
            }}
          >
            Prompt Scanner
          </Typography>
          <Chip 
            label="System Prompt Auditor" 
            size="small" 
            sx={{ 
              ml: 1,
              bgcolor: 'rgba(255, 0, 255, 0.2)',
              color: '#ff00ff',
              border: '1px solid #ff00ff',
              fontWeight: 600,
              textShadow: '0 0 5px #ff00ff'
            }}
          />
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#00ffff',
            fontWeight: 500,
            textShadow: '0 0 5px #00ffff',
            fontFamily: '"Orbitron", monospace'
          }}
        >
          Neural Prompt Analysis & Security Audit
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;