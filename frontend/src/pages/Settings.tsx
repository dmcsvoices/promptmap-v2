import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Alert, 
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Divider,
  Grid,
  Chip,
  Switch
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  CloudQueue as CloudIcon
} from '@mui/icons-material';
import { apiService } from '../services/api.ts';

interface Model {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

interface EndpointConfig {
  base_url: string;
  api_key?: string;
  timeout: number;
  configured: boolean;
}

const Settings: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState('http://172.27.0.67:11434/v1');
  const [apiKey, setApiKey] = useState('');
  const [timeout, setTimeout] = useState(30);
  const [selectedModel, setSelectedModel] = useState('');
  
  // Test settings
  const [testTimeout, setTestTimeout] = useState(120); // 2 minutes default
  
  // Classifier settings
  const [classifierBaseUrl, setClassifierBaseUrl] = useState('');
  const [classifierApiKey, setClassifierApiKey] = useState('');
  const [classifierModel, setClassifierModel] = useState('');
  const [classifierTimeout, setClassifierTimeout] = useState(30);
  const [classifierEnabled, setClassifierEnabled] = useState(false);
  
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  
  const [connectionStatus, setConnectionStatus] = useState<{
    success?: boolean;
    message?: string;
    models_found?: number;
    response_time_ms?: number;
  }>({});

  // Load existing configuration on component mount
  useEffect(() => {
    loadConfiguration();
    loadTestSettings();
    loadClassifierSettings();
    // Don't auto-load models on mount, wait for user action
  }, []);

  const loadConfiguration = async () => {
    try {
      const config: EndpointConfig = await apiService.getOpenAIEndpoint();
      setBaseUrl(config.base_url);
      setApiKey(config.api_key || '');
      setTimeout(config.timeout);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const loadTestSettings = async () => {
    try {
      const settings = await apiService.getTestSettings();
      setTestTimeout(settings.test_timeout);
    } catch (error) {
      console.error('Failed to load test settings:', error);
    }
  };

  const loadModels = async () => {
    if (loadingModels) return;
    
    console.log('Loading models...');
    setLoadingModels(true);
    setModels([]); // Clear existing models
    
    try {
      console.log('Calling fetchModelsFromEndpoint...');
      const response = await apiService.fetchModelsFromEndpoint();
      console.log('Models response:', response);
      
      if (response && response.models && Array.isArray(response.models)) {
        setModels(response.models);
        setSnackbar({
          open: true,
          message: `Loaded ${response.models.length} models from ${response.endpoint}`,
          severity: 'success'
        });
      } else {
        console.error('Invalid response format:', response);
        setSnackbar({
          open: true,
          message: 'Invalid response format from models endpoint',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('Failed to load models:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load models from endpoint';
      console.error('Error details:', errorMessage);
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoadingModels(false);
    }
  };

  const testConnection = async () => {
    if (!baseUrl.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a base URL',
        severity: 'warning'
      });
      return;
    }

    setTestingConnection(true);
    try {
      const result = await apiService.testEndpointConnectivity(baseUrl, timeout);
      setConnectionStatus(result);
      
      setSnackbar({
        open: true,
        message: result.success ? result.message : result.message,
        severity: result.success ? 'success' : 'error'
      });
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setSnackbar({
        open: true,
        message: 'Connection test failed',
        severity: 'error'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const saveConfiguration = async () => {
    if (!baseUrl.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a base URL',
        severity: 'warning'
      });
      return;
    }

    setLoading(true);
    try {
      await apiService.setOpenAIEndpoint({
        base_url: baseUrl,
        api_key: apiKey || undefined,
        timeout: timeout
      });

      setSnackbar({
        open: true,
        message: 'Configuration saved successfully',
        severity: 'success'
      });

      // Reload models after saving configuration
      await loadModels();
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Failed to save configuration',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTestSettings = async () => {
    setLoading(true);
    try {
      await apiService.setTestSettings({
        test_timeout: testTimeout
      });

      setSnackbar({
        open: true,
        message: 'Test settings saved successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Failed to save test settings:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Failed to save test settings',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClassifierSettings = async () => {
    try {
      const config = await apiService.getClassifierEndpoint();
      setClassifierBaseUrl(config.base_url);
      setClassifierModel(config.model);
      setClassifierTimeout(config.timeout);
      setClassifierEnabled(config.enabled);
    } catch (error) {
      console.error('Failed to load classifier settings:', error);
    }
  };

  const saveClassifierSettings = async () => {
    setLoading(true);
    try {
      await apiService.setClassifierEndpoint({
        base_url: classifierBaseUrl,
        api_key: classifierApiKey || undefined,
        model: classifierModel,
        timeout: classifierTimeout,
        enabled: classifierEnabled
      });

      setSnackbar({
        open: true,
        message: 'Text classifier settings saved successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Failed to save classifier settings:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Failed to save classifier settings',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure OpenAI-compliant endpoint and model settings
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* OpenAI-Compliant Endpoint Configuration */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">
                  OpenAI-Compliant Endpoint
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Base URL"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    fullWidth
                    placeholder="http://172.27.0.67:11434/v1"
                    helperText="The base URL for your OpenAI-compliant endpoint"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="API Key (Optional)"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    fullWidth
                    placeholder="sk-..."
                    helperText="Optional API key if required by endpoint"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Timeout (seconds)"
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
                    fullWidth
                    inputProps={{ min: 5, max: 120 }}
                    helperText="Request timeout for API calls"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      onClick={testConnection}
                      disabled={testingConnection}
                      startIcon={testingConnection ? <CircularProgress size={20} /> : <CheckIcon />}
                    >
                      Test Connection
                    </Button>
                    
                    <Button
                      variant="contained"
                      onClick={saveConfiguration}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : undefined}
                    >
                      Save Configuration
                    </Button>
                    
                    {connectionStatus.success !== undefined && (
                      <Chip
                        icon={connectionStatus.success ? <CheckIcon /> : <ErrorIcon />}
                        label={connectionStatus.success ? 
                          `Connected (${connectionStatus.models_found} models, ${Math.round(connectionStatus.response_time_ms || 0)}ms)` : 
                          'Connection Failed'
                        }
                        color={connectionStatus.success ? 'success' : 'error'}
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Model Selection */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Available Models
                </Typography>
                <Button
                  size="small"
                  onClick={loadModels}
                  disabled={loadingModels}
                  startIcon={loadingModels ? <CircularProgress size={16} /> : <RefreshIcon />}
                >
                  Refresh
                </Button>
              </Box>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Model</InputLabel>
                <Select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  label="Select Model"
                  disabled={models.length === 0}
                >
                  {models.length === 0 ? (
                    <MenuItem value="" disabled>
                      No models available - Save configuration and refresh
                    </MenuItem>
                  ) : (
                    models.map((model) => (
                      <MenuItem key={model.id} value={model.id}>
                        {model.id}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              
              <Typography variant="body2" color="text.secondary">
                {models.length > 0 
                  ? `${models.length} models available`
                  : 'No models loaded. Save configuration and refresh to load models.'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Test Execution Settings */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Execution Settings
              </Typography>
              
              <TextField
                label="Test Timeout (seconds)"
                type="number"
                value={testTimeout}
                onChange={(e) => setTestTimeout(parseInt(e.target.value) || 120)}
                fullWidth
                inputProps={{ min: 30, max: 600 }}
                helperText="Timeout for individual test execution (default: 2 minutes)"
                sx={{ mb: 2 }}
              />
              
              <Button
                variant="contained"
                onClick={saveTestSettings}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
                fullWidth
              >
                Save Test Settings
              </Button>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Allows time for model loading and response generation
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Text Classifier Settings */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Text Classifier (AI-Powered Evaluation)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure a separate LLM endpoint for more accurate evaluation of test results using AI classification.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Classifier Base URL"
                    value={classifierBaseUrl}
                    onChange={(e) => setClassifierBaseUrl(e.target.value)}
                    fullWidth
                    placeholder="http://localhost:11434/v1"
                    helperText="OpenAI-compatible endpoint for the classifier model"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="API Key (Optional)"
                    type="password"
                    value={classifierApiKey}
                    onChange={(e) => setClassifierApiKey(e.target.value)}
                    fullWidth
                    placeholder="sk-..."
                    helperText="Optional API key for classifier endpoint"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Model Name"
                    value={classifierModel}
                    onChange={(e) => setClassifierModel(e.target.value)}
                    fullWidth
                    placeholder="gpt-4o-mini"
                    helperText="Model to use for classification"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Timeout (seconds)"
                    type="number"
                    value={classifierTimeout}
                    onChange={(e) => setClassifierTimeout(parseInt(e.target.value) || 30)}
                    fullWidth
                    inputProps={{ min: 5, max: 120 }}
                    helperText="Request timeout for classifier"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl component="fieldset">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Enable AI Classification
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Switch
                        checked={classifierEnabled}
                        onChange={(e) => setClassifierEnabled(e.target.checked)}
                        color="primary"
                      />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {classifierEnabled ? 'Enabled' : 'Disabled'}
                      </Typography>
                    </Box>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={saveClassifierSettings}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : undefined}
                  >
                    Save Classifier Settings
                  </Button>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Uses hybrid evaluation combining rule-based and AI classification for improved accuracy
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Backend: FastAPI running on port 12001<br />
                • Database: PostgreSQL with pgvector extension<br />
                • Frontend: React running on port 3000<br />
                • Models Endpoint: {baseUrl}/models<br />
                • Completions Endpoint: {baseUrl}/completions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;