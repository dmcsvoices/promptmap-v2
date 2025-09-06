import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Pagination,
  Divider,
} from '@mui/material';
import {
  Assessment as ResultsIcon,
  Visibility as ViewIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

import { apiService, Session } from '../services/api.ts';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Statistics {
  session_id: number;
  session_name: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  average_asr: number;
  by_severity: Record<string, any>;
  by_type: Record<string, any>;
}

interface TestResult {
  id: number;
  rule_name: string;
  rule_type: string;
  rule_severity: string;
  passed: boolean;
  pass_rate: string;
  asr: number;
  execution_time_ms: number;
  response: string;
  failure_reason: string;
  created_at: string;
  session_name?: string;
  prompt_number?: number;
}

interface ResultsData {
  results: TestResult[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

const Results: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof TestResult>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadStatistics();
      loadResults(1);
    }
  }, [selectedSessionId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSessions();
      setSessions(response.sessions || []);
      
      // Auto-select the saved session or first session
      const savedSessionId = localStorage.getItem('selectedSessionId');
      if (savedSessionId && response.sessions) {
        const sessionExists = response.sessions.find((s: Session) => s.id === parseInt(savedSessionId));
        if (sessionExists) {
          setSelectedSessionId(parseInt(savedSessionId));
        } else if (response.sessions.length > 0) {
          setSelectedSessionId(response.sessions[0].id);
        }
      } else if (response.sessions?.length > 0) {
        setSelectedSessionId(response.sessions[0].id);
      }
    } catch (err) {
      setError('Failed to load sessions');
      console.error('Sessions load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (!selectedSessionId) return;
    
    try {
      const stats = await apiService.getSessionStatistics(selectedSessionId);
      setStatistics(stats);
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Statistics load error:', err);
    }
  };

  const loadResults = async (page: number = 1) => {
    if (!selectedSessionId) return;
    
    try {
      setLoadingResults(true);
      const results = await apiService.getSessionResults(selectedSessionId, page, 50);
      setResultsData(results);
      setCurrentPage(page);
    } catch (err) {
      setError('Failed to load results');
      console.error('Results load error:', err);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleSessionChange = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    localStorage.setItem('selectedSessionId', sessionId.toString());
    setCurrentPage(1);
  };

  const handleViewDetails = async (result: TestResult) => {
    try {
      const detailData = await apiService.getResultDetails(result.id);
      setSelectedResult(detailData);
      setDetailModalOpen(true);
    } catch (err) {
      setError('Failed to load result details');
    }
  };

  const handleSort = (field: keyof TestResult) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedResults = (results: TestResult[]) => {
    return [...results].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const renderSortIcon = (field: keyof TestResult) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />;
  };

  const handleExport = async () => {
    if (!selectedSessionId) return;
    
    try {
      setExporting(true);
      const exportData = await apiService.exportSessionResults(selectedSessionId);
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `promptmap-results-${statistics?.session_name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export results');
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    if (selectedSessionId) {
      loadStatistics();
      loadResults(currentPage);
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

  const getASRColor = (asr: number) => {
    if (asr <= 20) return '#198754'; // Green
    if (asr <= 50) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getASRSeverity = (asr: number) => {
    if (asr <= 20) return 'Low Risk';
    if (asr <= 50) return 'Medium Risk';
    return 'High Risk';
  };

  // Chart data preparation
  const severityChartData = statistics ? {
    labels: ['Low', 'Medium', 'High'],
    datasets: [
      {
        label: 'Passed',
        data: [
          statistics.by_severity.low?.passed || 0,
          statistics.by_severity.medium?.passed || 0,
          statistics.by_severity.high?.passed || 0,
        ],
        backgroundColor: '#198754',
      },
      {
        label: 'Failed',
        data: [
          statistics.by_severity.low?.failed || 0,
          statistics.by_severity.medium?.failed || 0,
          statistics.by_severity.high?.failed || 0,
        ],
        backgroundColor: '#dc3545',
      },
    ],
  } : null;

  const typeChartData = statistics ? {
    labels: Object.keys(statistics.by_type).map(type => type.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        data: Object.values(statistics.by_type).map((type: any) => type.failed),
        backgroundColor: [
          '#ff6384',
          '#36a2eb',
          '#ffce56',
          '#4bc0c0',
          '#9966ff',
          '#ff9f40',
        ],
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ResultsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
            Test Results
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and analyze prompt injection test results
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={!selectedSessionId}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={exporting ? <CircularProgress size={20} /> : <ExportIcon />}
            onClick={handleExport}
            disabled={!selectedSessionId || exporting}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Session Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Session
          </Typography>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <FormControl fullWidth>
              <InputLabel>Session</InputLabel>
              <Select
                value={selectedSessionId || ''}
                onChange={(e) => handleSessionChange(e.target.value as number)}
                label="Session"
              >
                {sessions.map((session) => (
                  <MenuItem key={session.id} value={session.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography sx={{ flexGrow: 1 }}>
                        {session.name} ({session.model})
                      </Typography>
                      <Chip 
                        label={session.status} 
                        color={session.status === 'completed' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </CardContent>
      </Card>

      {statistics && (
        <>
          {/* Summary Statistics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  {statistics.total_tests}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Tests
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h3" color="success.main" fontWeight="bold">
                  {statistics.passed_tests}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Passed Tests
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h3" color="error.main" fontWeight="bold">
                  {statistics.failed_tests}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Failed Tests
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography 
                  variant="h3" 
                  fontWeight="bold"
                  sx={{ color: getASRColor(statistics.average_asr) }}
                >
                  {statistics.average_asr.toFixed(1)}%
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Average ASR
                </Typography>
                <Typography variant="caption" sx={{ color: getASRColor(statistics.average_asr) }}>
                  {getASRSeverity(statistics.average_asr)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Results by Severity
                  </Typography>
                  {severityChartData && (
                    <Box sx={{ height: 300 }}>
                      <Bar data={severityChartData} options={chartOptions} />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Failed Tests by Type
                  </Typography>
                  {typeChartData && (
                    <Box sx={{ height: 300 }}>
                      <Doughnut data={typeChartData} options={chartOptions} />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Results Table */}
      {resultsData && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detailed Results ({resultsData.total} total)
            </Typography>
            
            {loadingResults ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : resultsData.results.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ResultsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No test results found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Run some tests to see results here
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('rule_name')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Test Rule
                            {renderSortIcon('rule_name')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('session_name')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Session
                            {renderSortIcon('session_name')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('prompt_number')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Prompt #
                            {renderSortIcon('prompt_number')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('rule_type')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Type
                            {renderSortIcon('rule_type')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('rule_severity')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Severity
                            {renderSortIcon('rule_severity')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('passed')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Result
                            {renderSortIcon('passed')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('pass_rate')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Pass Rate
                            {renderSortIcon('pass_rate')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('asr')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            ASR
                            {renderSortIcon('asr')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('execution_time_ms')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Time (ms)
                            {renderSortIcon('execution_time_ms')}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('created_at')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Created
                            {renderSortIcon('created_at')}
                          </Box>
                        </TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getSortedResults(resultsData.results).map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {result.rule_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {result.session_name || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              #{result.prompt_number || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={result.rule_type.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={result.rule_severity.toUpperCase()}
                              color={getSeverityColor(result.rule_severity) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {result.passed ? (
                                <PassIcon color="success" fontSize="small" />
                              ) : (
                                <FailIcon color="error" fontSize="small" />
                              )}
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                color={result.passed ? 'success.main' : 'error.main'}
                              >
                                {result.passed ? 'PASS' : 'FAIL'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {result.pass_rate}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              sx={{ color: getASRColor(result.asr) }}
                            >
                              {result.asr.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {result.execution_time_ms}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {result.created_at ? new Date(result.created_at).toLocaleString() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(result)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {resultsData.pages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={resultsData.pages}
                      page={currentPage}
                      onChange={(_, page) => loadResults(page)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedSessionId && !loading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <ResultsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No session selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please select a session to view its test results
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Result Details Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Test Result Details</DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Test Rule
                  </Typography>
                  <Typography variant="body1">{selectedResult.rule_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Type
                  </Typography>
                  <Chip
                    label={selectedResult.rule_type.replace('_', ' ')}
                    size="small"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Severity
                  </Typography>
                  <Chip
                    label={selectedResult.rule_severity.toUpperCase()}
                    color={getSeverityColor(selectedResult.rule_severity) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Result
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedResult.passed ? (
                      <PassIcon color="success" fontSize="small" />
                    ) : (
                      <FailIcon color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={selectedResult.passed ? 'success.main' : 'error.main'}
                    >
                      {selectedResult.passed ? 'PASS' : 'FAIL'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                LLM Response
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {selectedResult.response || 'No response'}
                </Typography>
              </Paper>

              {selectedResult.failure_reason && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Failure Reason
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'error.50', mb: 2 }}>
                    <Typography variant="body2">
                      {selectedResult.failure_reason}
                    </Typography>
                  </Paper>
                </>
              )}

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Execution Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Pass Rate
                  </Typography>
                  <Typography variant="body2">{selectedResult.pass_rate}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    ASR
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: getASRColor(selectedResult.asr) }}
                    fontWeight="bold"
                  >
                    {selectedResult.asr.toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Execution Time
                  </Typography>
                  <Typography variant="body2">{selectedResult.execution_time_ms}ms</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Results;