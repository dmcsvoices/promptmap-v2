import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import { RocketLaunch as RocketIcon } from '@mui/icons-material';

const Header: React.FC = () => {
  return (
    <AppBar 
      position="static" 
      sx={{ 
        bgcolor: 'white', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 1200
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RocketIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              color: 'text.primary',
              fontWeight: 600,
              letterSpacing: '-0.025em'
            }}
          >
            PromptMap V2
          </Typography>
          <Chip 
            label="Beta" 
            size="small" 
            color="secondary" 
            sx={{ ml: 1 }}
          />
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            fontWeight: 500
          }}
        >
          Advanced Prompt Injection Testing
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;