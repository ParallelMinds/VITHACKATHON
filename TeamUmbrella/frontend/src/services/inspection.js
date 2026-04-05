import api from './api';

/**
 * Inspection Service
 * Handles cargo inspection, AI analysis, and report generation
 */

/**
 * Upload cargo image for inspection
 * @param {File} imageFile - The cargo scan image file
 * @param {string} manifestText - Optional cargo manifest text
 * @returns {Promise<{detections: Array, case_id: string, risk_score: number}>}
 */
export async function inspectCargo(imageFile, manifestText = '') {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (manifestText && manifestText.trim()) {
      formData.append('manifest', manifestText);
    }

    const response = await api.post('/api/inspect', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minute timeout for large files
    });

    return response.data;
  } catch (error) {
    if (error.code === 'ERR_NETWORK' || !error.response) {
      throw new Error('Unable to connect to the server. Please ensure the backend is running at http://localhost:8000');
    }
    const message = error.response?.data?.detail || error.response?.data?.message || 'Cargo inspection failed';
    throw new Error(message);
  }
}

/**
 * Run AI analysis on detected objects
 * @param {Array} detections - Array of detected objects from inspection
 * @param {string} manifestText - Optional cargo manifest text for comparison
 * @returns {Promise<{analysis: string}>}
 */
export async function analyzeWithAI(detections, manifestText = '') {
  try {
    // Transform detections to match backend expected format
    const formattedDetections = detections.map(d => ({
      class_name: d.class_name || d.class || 'unknown',
      confidence: typeof d.confidence === 'number' ? d.confidence : 0
    }));

    // Backend expects {detected_objects, manifest} not {detections, manifest}
    const response = await api.post('/api/ai/analyze', {
      detected_objects: formattedDetections,
      manifest: manifestText,
    });

    // The backend returns {analysis: string}
    return response.data;
  } catch (error) {
    // Extract error message properly from 422 response
    let message = 'AI analysis failed';
    if (error.response?.status === 422) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Validation errors array
        message = detail.map(d => `${d.loc?.join('.')}: ${d.msg}`).join('; ');
      } else if (typeof detail === 'string') {
        message = detail;
      } else if (detail?.msg) {
        message = `${detail.loc?.join('.')}: ${detail.msg}`;
      }
    } else if (error.response?.data?.detail) {
      message = String(error.response.data.detail);
    } else if (error.response?.data?.message) {
      message = String(error.response.data.message);
    } else if (error.message) {
      message = error.message;
    }
    throw new Error(message);
  }
}

/**
 * Complete inspection workflow (upload + analyze)
 * @param {File} imageFile - The cargo scan image file
 * @param {string} manifestText - Optional cargo manifest text
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<object>} Complete inspection result
 */
export async function completeInspection(imageFile, manifestText = '', onProgress = null) {
  try {
    // Step 1: Upload and get detections
    if (onProgress) onProgress('Uploading cargo scan...', 10);
    const inspectionResult = await inspectCargo(imageFile, manifestText);
    
    if (onProgress) onProgress('Running AI detection...', 40);
    const detections = inspectionResult.detections || [];
    
    // Step 2: Run AI analysis
    if (onProgress) onProgress('Analyzing with AI...', 60);
    const analysisResult = await analyzeWithAI(detections, manifestText);
    
    if (onProgress) onProgress('Generating report...', 90);
    
    // Combine results
    const fullResult = {
      ...inspectionResult,
      ...analysisResult,
      completed_at: new Date().toISOString(),
    };
    
    if (onProgress) onProgress('Complete!', 100);
    
    return fullResult;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch inspection history
 * @param {number} limit - Maximum number of inspections to fetch
 * @returns {Promise<Array>}
 */
export async function getInspectionHistory(limit = 50) {
  try {
    const response = await api.get('/api/inspections/history', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to load inspection history';
    throw new Error(message);
  }
}

/**
 * Fetch single inspection by ID
 * @param {string} inspectionId - Inspection ID
 * @returns {Promise<object>}
 */
export async function getInspectionById(inspectionId) {
  try {
    const response = await api.get(`/api/inspections/${inspectionId}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to load inspection';
    throw new Error(message);
  }
}

/**
 * Generate report from inspection data
 * @param {string} caseId - Inspection case ID
 * @returns {Promise<{report_id: string, download_url: string, report_data: object}>}
 */
export async function generateReport(caseId) {
  try {
    const response = await api.post('/report/generate', { case_id: caseId });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Report generation failed';
    throw new Error(message);
  }
}

/**
 * Download report as PDF
 * @param {string} reportId - Report ID
 * @returns {Promise<Blob>}
 */
export async function downloadReport(reportId) {
  try {
    const response = await api.get(`/api/reports/${reportId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Download failed';
    throw new Error(message);
  }
}

/**
 * Fetch all reports
 * @param {number} limit - Maximum number of reports to fetch
 * @returns {Promise<Array>}
 */
export async function getReports(limit = 50) {
  try {
    const response = await api.get('/api/reports', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to load reports';
    throw new Error(message);
  }
}

/**
 * Fetch single report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<object>}
 */
export async function getReportById(reportId) {
  try {
    const response = await api.get(`/api/reports/${reportId}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to load report';
    throw new Error(message);
  }
}

export default {
  inspectCargo,
  analyzeWithAI,
  completeInspection,
  getInspectionHistory,
  getInspectionById,
  generateReport,
  downloadReport,
  getReports,
  getReportById,
};
