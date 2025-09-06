import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Radio,
  RadioGroup,
  IconButton,
  Divider,
} from '@mui/material';
import { Add as AddIcon, PlaylistPlay, Edit as EditIcon, CheckCircle as SelectIcon } from '@mui/icons-material';
import { apiService, Session } from '../services/api.ts';

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Session selection and editing
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Session>>({});
  
  // Session creation dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    model_type: 'ollama',
    iterations: 5,
    severities: ['low', 'medium', 'high'] as string[],
    notes: ''
  });

  // Session updating state
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSessions();
    // Restore selected session from localStorage
    const savedSessionId = localStorage.getItem('selectedSessionId');
    if (savedSessionId) {
      setSelectedSessionId(parseInt(savedSessionId));
    }
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getSessions();
      setSessions(response.sessions);
    } catch (err) {
      setError('Failed to load sessions');
      console.error('Sessions load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const response = await apiService.fetchModelsFromEndpoint();
      setAvailableModels(response.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleCreateSession = async () => {
    if (!formData.name.trim() || !formData.model) {
      setError('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      await apiService.createSession({
        name: formData.name.trim(),
        model: formData.model,
        model_type: formData.model_type,
        iterations: formData.iterations,
        severities: formData.severities,
        notes: formData.notes.trim() || undefined
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        model: '',
        model_type: 'ollama',
        iterations: 5,
        severities: ['low', 'medium', 'high'],
        notes: ''
      });
      setCreateDialogOpen(false);
      
      // Reload sessions
      await loadSessions();
    } catch (error: any) {
      setError(`Failed to create session: ${error.response?.data?.detail || error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const openCreateDialog = async () => {
    setCreateDialogOpen(true);
    await loadModels();
  };

  const handleSelectSession = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    // Store in localStorage so Tests tab can access it
    localStorage.setItem('selectedSessionId', sessionId.toString());
  };

  const handleEditSession = (session: Session) => {
    setEditingSessionId(session.id);
    setEditFormData({
      name: session.name,
      model: session.model,
      model_type: session.model_type,
      iterations: session.iterations,
      severities: session.severities,
      notes: session.notes
    });
  };

  const handleSaveSession = async () => {
    if (!editingSessionId || !editFormData.name?.trim()) {
      setError('Please provide a valid session name');
      return;
    }

    setUpdating(true);
    try {
      await apiService.updateSession(editingSessionId, {
        name: editFormData.name.trim(),
        model: editFormData.model,
        model_type: editFormData.model_type,
        iterations: editFormData.iterations,
        severities: editFormData.severities,
        notes: editFormData.notes?.trim() || undefined
      });

      setEditingSessionId(null);
      setEditFormData({});
      await loadSessions();
    } catch (error: any) {
      setError(`Failed to update session: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditFormData({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PlaylistPlay sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
            Test Sessions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and monitor your prompt injection test sessions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Create Session
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
            <Typography>Loading sessions...</Typography>
          ) : sessions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PlaylistPlay sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No sessions found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first test session to get started with prompt injection testing
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
              >
                Create First Session
              </Button>
            </Box>
          ) : (
            <List>
              {sessions.map((session) => (
                <ListItem key={session.id} divider>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    {/* Selection Radio Button */}
                    <Radio
                      checked={selectedSessionId === session.id}
                      onChange={() => handleSelectSession(session.id)}
                      value={session.id}
                      sx={{ alignSelf: 'flex-start', mt: 1 }}
                    />
                    
                    {/* Session Content */}
                    <Box sx={{ flexGrow: 1 }}>
                      {editingSessionId === session.id ? (
                        // Edit Mode
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                          <TextField
                            label="Session Name"
                            value={editFormData.name || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            size="small"
                            fullWidth
                          />
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                              label="Model"
                              value={editFormData.model || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                              size="small"
                              sx={{ flex: 1 }}
                            />
                            <TextField
                              label="Iterations"
                              type="number"
                              value={editFormData.iterations || 5}
                              onChange={(e) => setEditFormData({ ...editFormData, iterations: parseInt(e.target.value) || 5 })}
                              size="small"
                              sx={{ width: '120px' }}
                            />
                          </Box>
                          <TextField
                            label="Notes"
                            value={editFormData.notes || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                            multiline
                            rows={2}
                            size="small"
                            fullWidth
                          />
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              onClick={handleCancelEdit}
                              disabled={updating}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={handleSaveSession}
                              disabled={updating || !editFormData.name?.trim()}
                              startIcon={updating ? <CircularProgress size={16} /> : null}
                            >
                              {updating ? 'Saving...' : 'Save'}
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        // Display Mode
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="h6">{session.name}</Typography>
                              <Chip 
                                label={session.status} 
                                color={getStatusColor(session.status) as any}
                                size="small"
                              />
                              {selectedSessionId === session.id && (
                                <Chip 
                                  label="Selected" 
                                  color="primary"
                                  size="small"
                                  icon={<SelectIcon />}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Model: {session.model_type} - {session.model} | 
                                Iterations: {session.iterations} |
                                Tests: {session.total_tests} |
                                ASR: {session.overall_asr}%
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Created: {new Date(session.created_at).toLocaleDateString()}
                              </Typography>
                              {session.notes && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  Notes: {session.notes}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      )}
                    </Box>
                    
                    {/* Edit Button */}
                    {editingSessionId !== session.id && (
                      <IconButton 
                        onClick={() => handleEditSession(session)}
                        sx={{ alignSelf: 'flex-start', mt: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Session Creation Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Session</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Session Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              sx={{ mb: 2 }}
              placeholder="e.g., GPT-4 Security Test"
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Model *</InputLabel>
              <Select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                label="Model"
                required
              >
                {availableModels.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Iterations"
              type="number"
              value={formData.iterations}
              onChange={(e) => setFormData({ ...formData, iterations: parseInt(e.target.value) || 5 })}
              fullWidth
              inputProps={{ min: 1, max: 50 }}
              sx={{ mb: 2 }}
              helperText="Number of test iterations to run"
            />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Test Severities
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['low', 'medium', 'high'].map((severity) => (
                  <FormControlLabel
                    key={severity}
                    control={
                      <Checkbox
                        checked={formData.severities.includes(severity)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ 
                              ...formData, 
                              severities: [...formData.severities, severity] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              severities: formData.severities.filter(s => s !== severity) 
                            });
                          }
                        }}
                      />
                    }
                    label={severity.charAt(0).toUpperCase() + severity.slice(1)}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Additional notes about this test session..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSession}
            variant="contained"
            disabled={creating || !formData.name.trim() || !formData.model || formData.severities.length === 0}
            startIcon={creating ? <CircularProgress size={20} /> : null}
          >
            {creating ? 'Creating...' : 'Create Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sessions;