/**
 * API service for PromptMap V2
 * Handles all backend communication
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types
interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

interface HealthCheck {
  status: string;
  service: string;
  version: string;
  database: string;
}

interface Session {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  model: string;
  model_type: string;
  iterations: number;
  severities: string[];
  status: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  overall_asr: number;
  notes?: string;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:12001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<any> {
    const response = await this.client.get('/');
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheck> {
    const response = await this.client.get<HealthCheck>('/health');
    return response.data;
  }

  /**
   * Test database connection
   */
  async testDatabase(): Promise<any> {
    const response = await this.client.get('/api/test-db');
    return response.data;
  }

  /**
   * Sessions API
   */
  async getSessions(): Promise<{ sessions: Session[]; total: number }> {
    const response = await this.client.get('/api/sessions/');
    return response.data;
  }

  async testSessionsAPI(): Promise<any> {
    const response = await this.client.get('/api/sessions/test');
    return response.data;
  }

  async createSession(sessionData: {
    name: string;
    model: string;
    model_type: string;
    iterations?: number;
    severities?: string[];
    notes?: string;
  }): Promise<any> {
    const response = await this.client.post('/api/sessions/', sessionData);
    return response.data;
  }

  async updateSession(sessionId: number, sessionData: {
    name?: string;
    model?: string;
    model_type?: string;
    iterations?: number;
    severities?: string[];
    notes?: string;
  }): Promise<any> {
    const response = await this.client.put(`/api/sessions/${sessionId}`, sessionData);
    return response.data;
  }

  /**
   * System Prompts API
   */
  async getSessionPrompts(sessionId: number): Promise<any> {
    const response = await this.client.get(`/api/prompts/session/${sessionId}`);
    return response.data;
  }

  async createPrompt(promptData: {
    session_id: number;
    content: string;
  }): Promise<any> {
    const response = await this.client.post('/api/prompts/', promptData);
    return response.data;
  }

  async updatePrompt(promptId: number, content: string): Promise<any> {
    const response = await this.client.put(`/api/prompts/${promptId}`, { content });
    return response.data;
  }

  async deletePrompt(promptId: number): Promise<any> {
    const response = await this.client.delete(`/api/prompts/${promptId}`);
    return response.data;
  }

  /**
   * Tests API  
   */
  async getTestRules(): Promise<any> {
    const response = await this.client.get('/api/tests/rules');
    return response.data;
  }

  async testTestsAPI(): Promise<any> {
    const response = await this.client.get('/api/tests/test');
    return response.data;
  }

  async runTests(sessionId: number, testRuleIds: number[]): Promise<any> {
    const response = await this.client.post('/api/tests/run', {
      session_id: sessionId,
      test_rule_ids: testRuleIds
    });
    return response.data;
  }

  /**
   * Results API
   */
  async getSessionStatistics(sessionId: number): Promise<any> {
    const response = await this.client.get(`/api/results/sessions/${sessionId}/statistics`);
    return response.data;
  }

  async getSessionResults(sessionId: number, page: number = 1, perPage: number = 50): Promise<any> {
    const response = await this.client.get(`/api/results/sessions/${sessionId}/results`, {
      params: { page, per_page: perPage }
    });
    return response.data;
  }

  async getResultDetails(resultId: number): Promise<any> {
    const response = await this.client.get(`/api/results/results/${resultId}`);
    return response.data;
  }

  async exportSessionResults(sessionId: number): Promise<any> {
    const response = await this.client.get(`/api/results/sessions/${sessionId}/export`);
    return response.data;
  }

  async testResultsAPI(): Promise<any> {
    const response = await this.client.get('/api/results/test');
    return response.data;
  }

  /**
   * Models API
   */
  async getModelsByType(modelType: string): Promise<any> {
    const response = await this.client.get(`/api/models/${modelType}`);
    return response.data;
  }

  async testModelsAPI(): Promise<any> {
    const response = await this.client.get('/api/models/test');
    return response.data;
  }

  /**
   * Config API
   */
  async getConfig(): Promise<any> {
    const response = await this.client.get('/api/config/');
    return response.data;
  }

  async getDefaults(): Promise<any> {
    const response = await this.client.get('/api/config/defaults');
    return response.data;
  }

  async testConfigAPI(): Promise<any> {
    const response = await this.client.get('/api/config/test');
    return response.data;
  }

  async setTestSettings(config: {
    test_timeout: number;
  }): Promise<any> {
    const response = await this.client.post('/api/config/test-settings', config);
    return response.data;
  }

  async getTestSettings(): Promise<{
    test_timeout: number;
    configured: boolean;
  }> {
    const response = await this.client.get('/api/config/test-settings');
    return response.data;
  }

  /**
   * OpenAI-Compliant Endpoint Configuration
   */
  async setOpenAIEndpoint(config: {
    base_url: string;
    api_key?: string;
    timeout?: number;
  }): Promise<any> {
    const response = await this.client.post('/api/config/openai-endpoint', config);
    return response.data;
  }

  async getOpenAIEndpoint(): Promise<{
    base_url: string;
    api_key?: string;
    timeout: number;
    configured: boolean;
  }> {
    const response = await this.client.get('/api/config/openai-endpoint');
    return response.data;
  }

  async fetchModelsFromEndpoint(): Promise<{
    models: Array<{
      id: string;
      object: string;
      created?: number;
      owned_by?: string;
    }>;
    total: number;
    endpoint: string;
  }> {
    console.log('🔄 Fetching models from /api/config/models...');
    const response = await this.client.get('/api/config/models');
    console.log('✅ Models API Response:', response.data);
    return response.data;
  }

  async testEndpointConnectivity(baseUrl: string, timeout: number = 10): Promise<{
    success: boolean;
    message: string;
    models_found?: number;
    endpoint?: string;
    response_time_ms?: number;
  }> {
    const response = await this.client.post('/api/config/test-endpoint', {
      base_url: baseUrl,
      timeout: timeout
    });
    return response.data;
  }

  // Text Classifier Configuration
  async setClassifierEndpoint(config: {
    base_url: string;
    api_key?: string;
    model: string;
    timeout: number;
    enabled: boolean;
  }): Promise<any> {
    const response = await this.client.post('/api/config/classifier-endpoint', config);
    return response.data;
  }

  async getClassifierEndpoint(): Promise<{
    base_url: string;
    model: string;
    timeout: number;
    enabled: boolean;
    configured: boolean;
  }> {
    const response = await this.client.get('/api/config/classifier-endpoint');
    return response.data;
  }
}

export const apiService = new ApiService();
export type { Session, HealthCheck };