import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  CircularProgress,
} from '@mui/material';
import { BugReport, Add as AddIcon, PlayArrow as RunIcon } from '@mui/icons-material';
import { apiService } from '../services/api.ts';

interface TestRule {
  id: number;
  name: string;
  type: string;
  severity: string;
  prompt: string;
  description?: string;
  enabled: boolean;
}

const Tests: React.FC = () => {
  const [rules, setRules] = useState<TestRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());
  const [runningTests, setRunningTests] = useState(false);

  useEffect(() => {
    loadTestRules();
  }, []);

  const loadTestRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTestRules();
      setRules(response.rules);
    } catch (err) {
      setError('Failed to load test rules');
      console.error('Test rules load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'prompt_stealing': return 'secondary';
      case 'distraction': return 'primary';
      case 'jailbreak': return 'error';
      default: return 'default';
    }
  };

  const handleTestSelection = (testId: number, checked: boolean) => {
    const newSelectedTests = new Set(selectedTests);
    if (checked) {
      newSelectedTests.add(testId);
    } else {
      newSelectedTests.delete(testId);
    }
    setSelectedTests(newSelectedTests);
  };

  const handleSelectAllTests = () => {
    const enabledTestIds = rules.filter(rule => rule.enabled).map(rule => rule.id);
    setSelectedTests(new Set(enabledTestIds));
  };

  const handleSelectNoTests = () => {
    setSelectedTests(new Set());
  };

  const handleRunTests = async () => {
    if (selectedTests.size === 0) {
      setError('Please select at least one test to run');
      return;
    }

    // Check if a session is selected (we'll need to get this from somewhere)
    // For now, we'll show an error message instructing user to select session first
    const selectedSessionId = localStorage.getItem('selectedSessionId');
    if (!selectedSessionId) {
      setError('Please select a session first from the Sessions tab');
      return;
    }
    
    setRunningTests(true);
    setError(null);
    
    try {
      const result = await apiService.runTests(
        parseInt(selectedSessionId),
        Array.from(selectedTests)
      );
      
      // Show success message with results
      const message = `Test run completed successfully!\n\n` +
        `Total Tests: ${result.total_tests}\n` +
        `Passed: ${result.passed_tests}\n` +
        `Failed: ${result.failed_tests}\n` +
        `Attack Success Rate: ${result.overall_asr.toFixed(1)}%`;
      
      alert(message);
      
      // Clear selection after successful run
      setSelectedTests(new Set());
      
    } catch (error: any) {
      setError(`Failed to run tests: ${error.response?.data?.detail || error.message}`);
    } finally {
      setRunningTests(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BugReport sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
            Tests
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage prompt injection test rules and attack patterns
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={true} // Will be enabled when rule creation is implemented
        >
          Create Rule
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {loading ? (
            <Typography>Loading test rules...</Typography>
          ) : rules.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BugReport sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No test rules found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Test rules define the attack patterns used to test prompt injection vulnerabilities
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={true} // Will be enabled when rule creation is implemented
              >
                Create First Rule
              </Button>
            </Box>
          ) : (
            <>
              {/* Test Selection Controls */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Test Selection ({selectedTests.size} of {rules.filter(r => r.enabled).length} selected)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleSelectAllTests}
                      disabled={rules.filter(r => r.enabled).length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleSelectNoTests}
                      disabled={selectedTests.size === 0}
                    >
                      Select None
                    </Button>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Select the tests you want to run. Only enabled tests can be selected.
                </Typography>
              </Box>

              <List>
              {rules.map((rule) => (
                <ListItem key={rule.id} divider>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 2 }}>
                    {/* Selection Checkbox */}
                    <Checkbox
                      checked={selectedTests.has(rule.id)}
                      onChange={(e) => handleTestSelection(rule.id, e.target.checked)}
                      disabled={!rule.enabled}
                      sx={{ mt: 1 }}
                    />
                    
                    {/* Test Content */}
                    <Box sx={{ flexGrow: 1 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" sx={{ 
                              color: rule.enabled ? 'text.primary' : 'text.disabled'
                            }}>
                              {rule.name}
                            </Typography>
                            <Chip 
                              label={rule.severity} 
                              color={getSeverityColor(rule.severity) as any}
                              size="small"
                            />
                            <Chip 
                              label={rule.type.replace('_', ' ')} 
                              color={getTypeColor(rule.type) as any}
                              size="small"
                              variant="outlined"
                            />
                            {!rule.enabled && (
                              <Chip 
                                label="Disabled" 
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ 
                              mb: 1,
                              color: rule.enabled ? 'text.secondary' : 'text.disabled'
                            }}>
                              {rule.description || 'No description'}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontFamily: 'monospace',
                                bgcolor: rule.enabled ? 'grey.100' : 'grey.50',
                                p: 1,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                color: rule.enabled ? 'text.secondary' : 'text.disabled'
                              }}
                            >
                              {rule.prompt.length > 100 ? `${rule.prompt.substring(0, 100)}...` : rule.prompt}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>

              {/* Run Tests Button */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={runningTests ? <CircularProgress size={20} /> : <RunIcon />}
                  onClick={handleRunTests}
                  disabled={runningTests || selectedTests.size === 0}
                  sx={{ minWidth: 200, py: 1.5 }}
                >
                  {runningTests ? 'Running Tests...' : `Run ${selectedTests.size} Selected Tests`}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Tests;