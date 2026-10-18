/**
 * src/services/analyticsService.js
 * 
 * Centralized analytics & audit log service for the Administrator Dashboard.
 * 
 * BACKEND INTEGRATION:
 * Communicates with FastAPI endpoints backed by PostgreSQL analytical aggregations:
 * - GET /api/v1/admin/analytics
 * - GET /api/v1/admin/activity
 * 
 * BACKEND NOTE:
 * All high-level statistics (totals, averages, monthly trends) MUST be calculated
 * on the backend using SQL aggregation queries, never computed by the client
 * from an incomplete paginated dataset.
 */

import { apiRequest } from './apiClient';
import {
  MOCK_ADMIN_METRICS,
  MOCK_COMPLAINT_TRENDS,
  MOCK_CATEGORY_DISTRIBUTION,
  MOCK_ZONE_DISTRIBUTION,
  MOCK_AUDIT_LOGS,
  MOCK_AI_MONITORING_METRICS,
} from '../mocks/adminDashboardMock';

async function getMockAdminAnalyticsData() {
  return {
    metrics: MOCK_ADMIN_METRICS,
    trends: MOCK_COMPLAINT_TRENDS,
    categoryDistribution: MOCK_CATEGORY_DISTRIBUTION,
    zoneDistribution: MOCK_ZONE_DISTRIBUTION,
    auditLogs: MOCK_AUDIT_LOGS,
  };
}

export async function getAdminAnalytics() {
  const res = await apiRequest('/api/v1/admin/analytics');
  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Demonstration analytics (dynamically imported in DEV)
  const mock = await getMockAdminAnalyticsData();
  return {
    success: true,
    data: {
      metrics: mock.metrics,
      trends: mock.trends,
      categoryDistribution: mock.categoryDistribution,
      zoneDistribution: mock.zoneDistribution,
    },
    isMock: true,
    notice: 'Demonstration Data: FastAPI /api/v1/admin/analytics offline.',
  };
}

export async function getAuditActivityLogs() {
  const res = await apiRequest('/api/v1/admin/activity');
  if (res.ok && Array.isArray(res.data)) {
    return { success: true, data: res.data, isMock: false };
  }

  const mock = await getMockAdminAnalyticsData();
  return {
    success: true,
    data: mock.auditLogs,
    isMock: true,
    notice: 'Demonstration Data: FastAPI /api/v1/admin/activity offline.',
  };
}

/**
 * Fetch operational AI monitoring metrics and model performance telemetry.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: GET /api/v1/admin/ai-monitoring
 * Expected response: {
 *   complaintsProcessed: number,
 *   awaitingClassification: number,
 *   processingFailures: number,
 *   avgProcessingTimeMs: number,
 *   humanCorrections: number,
 *   humanOverrideRatePct: number,
 *   serviceAvailabilityPct: number,
 *   modelVersion: string,
 *   lastHealthCheck: string,
 *   recentInferences: Array<{
 *     id: string,
 *     complaintId: string,
 *     categoryPredicted: string,
 *     confidence: number,
 *     latencyMs: number,
 *     status: string,
 *     timestamp: string
 *   }>
 * }
 */
export async function getAdminAiMonitoring() {
  const res = await apiRequest('/api/v1/admin/ai-monitoring');
  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  return {
    success: true,
    data: MOCK_AI_MONITORING_METRICS,
    isMock: true,
    notice: 'Demonstration AI monitoring telemetry (FastAPI /api/v1/admin/ai-monitoring is offline).',
  };
}
