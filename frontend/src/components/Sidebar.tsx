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
  BugReport as TestsIcon,
  Assessment as ResultsIcon,
  Settings as SettingsIcon,
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
          bgcolor: '#1e293b',
          color: 'white',
          borderRight: 'none',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 1,
            }}
          >
            <Box sx={{ fontSize: '24px' }}>🛡️</Box>
          </Box>
        </Box>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      
      <List sx={{ px: 2, pt: 2 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: '8px',
                  bgcolor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.7)',
                  '&:hover': {
                    bgcolor: isActive 
                      ? 'rgba(59, 130, 246, 0.15)' 
                      : 'rgba(255,255,255,0.05)',
                    color: isActive ? '#3b82f6' : 'white',
                  },
                  py: 1.5,
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
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.875rem',
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