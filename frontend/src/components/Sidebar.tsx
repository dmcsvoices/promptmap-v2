import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PlaylistPlay as SessionsIcon,
  ChatBubble as PromptsIcon,
  Security as TestsIcon,
  Assessment as ResultsIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 280;

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    path: '/sessions',
    label: 'Sessions',
    icon: <SessionsIcon />,
  },
  {
    path: '/prompts',
    label: 'System Prompts',
    icon: <PromptsIcon />,
  },
  {
    path: '/tests',
    label: 'Tests',
    icon: <TestsIcon />,
  },
  {
    path: '/results',
    label: 'Results',
    icon: <ResultsIcon />,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: <SettingsIcon />,
  },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #0a0a0a 0%, #1a0a2e 50%, #16213e 100%)',
          color: 'white',
          borderRight: '2px solid #ff00ff',
          boxShadow: '4px 0 20px rgba(255, 0, 255, 0.3)',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(45deg, #ff00ff, #00ffff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
              border: '2px solid #ffffff',
              boxShadow: '0 0 20px rgba(255, 0, 255, 0.8)',
            }}
          >
            <ShieldIcon sx={{ 
              fontSize: '32px', 
              color: '#000000',
              filter: 'drop-shadow(0 0 5px #ffffff)'
            }} />
          </Box>
        </Box>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255, 0, 255, 0.5)', boxShadow: '0 1px 5px rgba(255, 0, 255, 0.3)' }} />
      
      <List sx={{ px: 2, pt: 2 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: '12px',
                  bgcolor: isActive 
                    ? 'linear-gradient(45deg, rgba(255, 0, 255, 0.3), rgba(0, 255, 255, 0.1))' 
                    : 'transparent',
                  color: isActive ? '#ff00ff' : 'rgba(255,255,255,0.7)',
                  border: isActive ? '1px solid #ff00ff' : '1px solid transparent',
                  boxShadow: isActive ? '0 4px 15px rgba(255, 0, 255, 0.4)' : 'none',
                  fontFamily: '"Orbitron", monospace',
                  '&:hover': {
                    bgcolor: isActive 
                      ? 'linear-gradient(45deg, rgba(255, 0, 255, 0.4), rgba(0, 255, 255, 0.2))' 
                      : 'rgba(255, 0, 255, 0.1)',
                    color: isActive ? '#ff66ff' : '#00ffff',
                    border: '1px solid #00ffff',
                    boxShadow: '0 6px 20px rgba(0, 255, 255, 0.3)',
                    transform: 'translateX(4px)',
                  },
                  py: 1.5,
                  transition: 'all 0.3s ease',
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: 'inherit', 
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.875rem',
                      fontFamily: '"Orbitron", monospace',
                      textShadow: isActive ? '0 0 8px currentColor' : 'none',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;