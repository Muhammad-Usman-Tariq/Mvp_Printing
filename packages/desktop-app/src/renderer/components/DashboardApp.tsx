import React, { useState } from 'react';
import {
  Monitor,
  RefreshCw,
  Filter,
  ArrowUpDown,
  Smartphone,
  Laptop,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Database
} from 'lucide-react';
import { PrintJob } from '@printer-mvp/print-core';

interface DashboardAppProps {
  jobs: PrintJob[];
  onRefresh: () => void;
  lastSyncTime: number | null;
}

export const DashboardApp: React.FC<DashboardAppProps> = ({
  jobs,
  onRefresh,
  lastSyncTime
}) => {
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'desktop'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'queued' | 'sending' | 'sent' | 'failed'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filter and sort
  const filteredJobs = jobs.filter((job) => {
    if (deviceFilter !== 'all' && job.deviceId !== deviceFilter) return false;
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => {
    return sortOrder === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
  });

  const getStatusBadge = (status: PrintJob['status']) => {
    switch (status) {
      case 'queued':
        return <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Queued</span>;
      case 'sending':
        return <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Send size={12} /> Sending</span>;
      case 'sent':
        return <span style={{ backgroundColor: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Sent</span>;
      case 'failed':
        return <span style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Failed</span>;
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '980px', height: '720px', overflow: 'hidden' }}>
      {/* Top Navbar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
            <Monitor size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#111827' }}>Print Fleet Monitor (Next.js Dashboard)</h2>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>Read-only central Turso database viewer â€¢ Deployed on Vercel</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '6px 12px', borderRadius: '8px' }}>
            <Database size={14} color="#4F46E5" />
            <span>Turso Cloud Sync: <strong>{lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Connected'}</strong></span>
          </div>

          <button
            onClick={onRefresh}
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>
            <Filter size={16} /> Device:
          </div>
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value as any)}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', color: '#111827', outline: 'none' }}
          >
            <option value="all">All Devices ({jobs.length})</option>
            <option value="mobile">Mobile App ({jobs.filter((j) => j.deviceId === 'mobile').length})</option>
            <option value="desktop">Desktop App ({jobs.filter((j) => j.deviceId === 'desktop').length})</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#4B5563', marginLeft: '12px' }}>
            Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', color: '#111827', outline: 'none' }}
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            style={{ backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <ArrowUpDown size={14} /> Created: {sortOrder.toUpperCase()}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B5563', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (3s)
          </label>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 700 }}>
              <th style={{ padding: '12px 20px' }}>Job ID</th>
              <th style={{ padding: '12px 16px' }}>Source Device</th>
              <th style={{ padding: '12px 16px' }}>Payload Preview</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Attempts</th>
              <th style={{ padding: '12px 16px' }}>Error Details</th>
              <th style={{ padding: '12px 20px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                  No print jobs match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#6B7280' }}>
                    {job.id.substring(0, 8)}...
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#111827' }}>
                      {job.deviceId === 'mobile' ? (
                        <Smartphone size={16} color="#4F46E5" />
                      ) : (
                        <Laptop size={16} color="#059669" />
                      )}
                      {job.deviceId.toUpperCase()}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1F2937' }}>
                    {job.payload.split('\n')[0]}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {getStatusBadge(job.status)}
                  </td>

                  <td style={{ padding: '14px 16px', color: '#4B5563', fontWeight: 600 }}>
                    {job.attempts} / {job.maxAttempts}
                  </td>

                  <td style={{ padding: '14px 16px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: job.lastError ? '#DC2626' : '#9CA3AF', fontSize: '12px' }}>
                    {job.lastError ? `[${job.lastErrorType}] ${job.lastError}` : 'â€”'}
                  </td>

                  <td style={{ padding: '14px 20px', color: '#6B7280', fontSize: '12px' }}>
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div style={{ padding: '12px 24px', backgroundColor: '#FAFAFA', borderTop: '1px solid #E5E7EB', fontSize: '12px', color: '#6B7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Showing {filteredJobs.length} of {jobs.length} total print jobs</span>
        <span>Schema version: <code>print_jobs (v1)</code></span>
      </div>
    </div>
  );
};
