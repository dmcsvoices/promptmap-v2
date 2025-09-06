import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  PlayArrow,
  Storage,
  Api,
  BugReport,
  CheckCircle,
  Error,
} from '@mui/icons-material';

import { apiService } from '../services/api.ts';

interface SystemStatus {
  backend: boolean;
  database: boolean;
  sessions: boolean;
  tests: boolean;
  models: boolean;
  config: boolean;
}

const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    backend: false,
    database: false,
    sessions: false,
    tests: false,
    models: false,
    config: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testSystemComponents();
  }, []);

  const testSystemComponents = async () => {
    try {
      setLoading(true);
      setError(null);

      const results = await Promise.allSettled([
        // Test backend
        apiService.testConnection(),
        // Test database
        apiService.testDatabase(),
        // Test sessions API
        apiService.testSessionsAPI(),
        // Test tests API
        apiService.testTestsAPI(),
        // Test models API
        apiService.testModelsAPI(),
        // Test config API
        apiService.testConfigAPI(),
      ]);

      setStatus({
        backend: results[0].status === 'fulfilled',
        database: results[1].status === 'fulfilled',
        sessions: results[2].status === 'fulfilled',
        tests: results[3].status === 'fulfilled',
        models: results[4].status === 'fulfilled',
        config: results[5].status === 'fulfilled',
      });

    } catch (err) {
      setError('Failed to test system components');
      console.error('System test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const allSystemsOperational = Object.values(status).every(s => s);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome to PromptMap V2 - System Status and Overview
      </Typography>

      <Grid container spacing={3}>
        {/* System Status Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Storage sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">System Status</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Chip 
                  label={allSystemsOperational ? 'Operational' : 'Degraded'}
                  color={allSystemsOperational ? 'success' : 'error'}
                  size="small"
                />
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <List dense>
                {[
                  { key: 'backend', label: 'Backend API' },
                  { key: 'database', label: 'PostgreSQL Database' },
                  { key: 'sessions', label: 'Sessions API' },
                  { key: 'tests', label: 'Tests API' },
                  { key: 'models', label: 'Models API' },
                  { key: 'config', label: 'Config API' },
                ].map((item) => (
                  <ListItem key={item.key} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {status[item.key as keyof SystemStatus] ? (
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      ) : (
                        <Error sx={{ color: 'error.main', fontSize: 20 }} />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>

              <Button
                variant="outlined"
                size="small"
                onClick={testSystemComponents}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? 'Testing...' : 'Test System'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PlayArrow sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Quick Actions</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Get started with these common tasks
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  href="/sessions"
                  disabled={!allSystemsOperational}
                >
                  Create New Session
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<BugReport />}
                  href="/tests"
                  disabled={!status.tests}
                >
                  View Test Rules
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Api />}
                  href="/settings"
                  disabled={!status.config}
                >
                  Configure API Keys
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Info Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Version
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    2.0.0 Beta
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Backend
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    FastAPI + PostgreSQL
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Frontend
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    React + Material-UI
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Database
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    PostgreSQL + pgvector
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;