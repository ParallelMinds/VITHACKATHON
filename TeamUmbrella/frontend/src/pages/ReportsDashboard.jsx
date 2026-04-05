import React, { useState, useEffect, useRef } from 'react';
import { getInspectionHistory, downloadReport, getReports } from '../services/inspection';

function RiskBadge({ level }) {
  const normalizedLevel = level?.toUpperCase();

  const styles = {
    RED: { bg: 'bg-[#2d1515]', text: 'text-[#f87171]', border: 'border-[#7f1d1d]' },
    HIGH: { bg: 'bg-[#2d1515]', text: 'text-[#f87171]', border: 'border-[#7f1d1d]' },
    AMBER: { bg: 'bg-[#2d2210]', text: 'text-[#fbbf24]', border: 'border-[#92400e]' },
    MEDIUM: { bg: 'bg-[#2d2210]', text: 'text-[#fbbf24]', border: 'border-[#92400e]' },
    GREEN: { bg: 'bg-[#0f291e]', text: 'text-[#34d399]', border: 'border-[#065f46]' },
    LOW: { bg: 'bg-[#0f291e]', text: 'text-[#34d399]', border: 'border-[#065f46]' },
  };

  const style = styles[normalizedLevel] || styles.LOW;

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${style.bg} ${style.text} border ${style.border}`}>
      {normalizedLevel === 'RED' ? 'HIGH' : normalizedLevel === 'AMBER' ? 'MEDIUM' : normalizedLevel}
    </span>
  );
}

function ReportViewer({ report, onClose }) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-panel border border-border-primary rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border-primary flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Inspection Report</h2>
            <p className="text-xs text-text-muted font-mono mt-1">{report.case_id || report.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-cardAlt rounded transition-colors"
          >
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Report Header */}
          <div className="border border-border-primary rounded-lg p-6 mb-6 bg-bg-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">CARGO INTELLIGENCE REPORT</h3>
                <p className="text-xs text-text-muted">Maritime Security Inspection Document</p>
              </div>
              <RiskBadge level={report.risk_level} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Case ID:</span>
                <span className="text-white font-mono ml-2">{report.case_id || report.id}</span>
              </div>
              <div>
                <span className="text-text-muted">Date:</span>
                <span className="text-white ml-2">{new Date(report.timestamp || report.created_at || report.completed_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-text-muted">Vessel:</span>
                <span className="text-white ml-2">{report.vessel_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-text-muted">Risk Score:</span>
                <span className="text-white font-mono ml-2">{report.risk_score?.toFixed(2) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Detection Findings</h4>
            <div className="border border-border-primary rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-card">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase">Object</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase">Confidence</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase">Risk Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary">
                  {report.detections?.map((detection, idx) => (
                    <tr key={idx} className="hover:bg-bg-cardAlt/50">
                      <td className="px-4 py-3 text-white">{detection.class}</td>
                      <td className="px-4 py-3 text-text-secondary font-mono">{(detection.confidence * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <RiskBadge level={detection.risk_tier || detection.risk_level} />
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-text-muted">No detections recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Analysis */}
          {(report.inspection_report || report.ai_analysis) && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">AI Analysis</h4>
              <div className="border border-border-primary rounded-lg p-4 bg-bg-card">
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {report.inspection_report || report.ai_analysis}
                </p>
              </div>
            </div>
          )}

          {/* Manifest Mismatch */}
          {report.manifest_mismatch?.detected && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Manifest Discrepancy</h4>
              <div className="border border-red-900 rounded-lg p-4 bg-[#2d1515]">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-alert-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm text-alert-red font-medium">Declared cargo does not match detected items</p>
                    <p className="text-xs text-gray-400 mt-2">
                      <span className="text-text-muted">Declared:</span> {report.manifest_mismatch.declared_categories?.join(', ') || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400">
                      <span className="text-text-muted">Detected:</span> {report.manifest_mismatch.detected_categories?.join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Recommendations</h4>
            <div className="border border-border-primary rounded-lg p-4 bg-bg-card">
              <ul className="space-y-2 text-sm text-text-secondary">
                {report.risk_level?.toUpperCase() === 'RED' || report.risk_level?.toUpperCase() === 'HIGH' ? (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-alert-red">●</span>
                      <span>Immediate physical inspection required</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-alert-red">●</span>
                      <span>Notify port security and customs authorities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-alert-red">●</span>
                      <span>Detain vessel pending further investigation</span>
                    </li>
                  </>
                ) : report.risk_level?.toUpperCase() === 'AMBER' || report.risk_level?.toUpperCase() === 'MEDIUM' ? (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-alert-amber">●</span>
                      <span>Secondary screening recommended</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-alert-amber">●</span>
                      <span>Verify cargo manifest with shipping documents</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-alert-green">●</span>
                      <span>Standard processing approved</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-alert-green">●</span>
                      <span>No additional inspection required</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-primary flex items-center justify-between">
          <div className="text-xs text-text-muted">
            Generated: {new Date().toLocaleString()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-bg-cardAlt border border-border-primary text-text-secondary text-sm rounded hover:text-white transition-colors"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-accent-primary hover:bg-accent-dark text-white text-sm rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsDashboard() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const hasLoadedOnce = useRef(false);

  const loadReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try to fetch from inspection history endpoint first
      let data;
      try {
        data = await getInspectionHistory(50);
      } catch (err) {
        // Fallback to reports endpoint
        data = await getReports(50);
      }
      const reportsArray = Array.isArray(data) ? data : [];
      setReports(reportsArray);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error('Failed to load reports:', err);
      // Only show error on first load
      if (!hasLoadedOnce.current) {
        const errorMsg = err.code === 'ERR_NETWORK'
          ? 'Unable to connect to the server. Please ensure the backend is running.'
          : err.message || 'Failed to load reports';
        setError(errorMsg);
      }
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDownload = async (reportId) => {
    try {
      const blob = await downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Downloading report...');
    }
  };

  const getFilteredReports = () => {
    if (filter === 'ALL') return reports;
    return reports.filter(r => {
      const level = r.risk_level?.toUpperCase();
      return level === filter ||
             (filter === 'HIGH' && level === 'RED') ||
             (filter === 'MEDIUM' && level === 'AMBER');
    });
  };

  const filteredReports = getFilteredReports();

  return (
    <div className="flex h-full bg-bg-secondary">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wider">Inspection Reports</h1>
              <p className="text-sm text-text-muted mt-1">View and manage cargo inspection reports</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-bg-card border border-border-primary rounded">
                <span className="text-xs text-text-muted">Total Reports:</span>
                <span className="text-white font-mono ml-2">{reports.length}</span>
              </div>
              <button
                onClick={loadReports}
                className="px-4 py-2 bg-bg-cardAlt border border-border-primary text-text-secondary text-sm rounded hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                    : 'bg-bg-card text-text-muted border border-border-primary hover:border-border-secondary'
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-text-muted">Loading reports...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-alert-red mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-alert-red mb-2">Connection Error</p>
                <p className="text-xs text-text-muted mb-4">{error}</p>
                <button
                  onClick={loadReports}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-dark text-white text-sm rounded transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-text-muted">No inspection reports available.</p>
              </div>
            </div>
          ) : (
            <div className="border border-border-primary rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-bg-card">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Case ID</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Vessel</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Risk Level</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Risk Score</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary">
                  {filteredReports.map((report) => (
                    <tr
                      key={report.id || report.case_id}
                      className="hover:bg-bg-cardAlt/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedReport(report)}
                    >
                      <td className="px-4 py-4">
                        <span className="text-sm font-mono text-accent-primary">{report.case_id || report.id}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-white">{report.vessel_name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-text-secondary">
                          {new Date(report.timestamp || report.created_at || report.completed_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <RiskBadge level={report.risk_level} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-mono text-white">{report.risk_score?.toFixed(1) || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(report.id || report.case_id);
                            }}
                            className="p-2 hover:bg-bg-cardAlt rounded transition-colors"
                            title="Download"
                          >
                            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReport(report);
                            }}
                            className="p-2 hover:bg-bg-cardAlt rounded transition-colors"
                            title="View"
                          >
                            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
