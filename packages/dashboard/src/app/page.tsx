'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Database,
  AlertCircle
} from 'lucide-react';
import type { PrintJob } from '../types/job';

export default function DashboardPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'desktop'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'queued' | 'sending' | 'sent' | 'failed'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSourceStatus, setDataSourceStatus] = useState<string>('No data source connected yet');

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        if (data.status === 'unconnected') {
          setDataSourceStatus('No data source connected yet');
        } else {
          setDataSourceStatus('Connected');
        }
        setLastSyncTime(data.lastSyncTime || Date.now());
      }
    } catch {
      setDataSourceStatus('No data source connected yet');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchJobs]);

  const filteredJobs = jobs
    .filter((job) => {
      if (deviceFilter !== 'all' && job.deviceId !== deviceFilter) return false;
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      return sortOrder === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
    });

  const getStatusBadge = (status: PrintJob['status']) => {
    switch (status) {
      case 'queued':
        return (
          <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> Queued
          </span>
        );
      case 'sending':
        return (
          <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Send size={12} /> Sending
          </span>
        );
      case 'sent':
        return (
          <span style={{ backgroundColor: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Sent
          </span>
        );
      case 'failed':
        return (
          <span style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} /> Failed
          </span>
        );
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0B0F19', padding: '32px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1100px', minHeight: '680px', overflow: 'hidden' }}>
        
        {/* Header Bar */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
              <Monitor size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                  Print Fleet Monitor
                </h1>
                <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #C7D2FE' }}>
                  Next.js App Router
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                Central telemetry & audit view for Bluetooth thermal printer jobs
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '6px 14px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <Database size={14} color="#4F46E5" />
              <span>Data Source: <strong>{dataSourceStatus}</strong></span>
            </div>

            <button
              onClick={() => fetchJobs()}
              disabled={isLoading}
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Informational Callout */}
        <div style={{ padding: '10px 28px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400E' }}>
          <AlertCircle size={15} color="#D97706" />
          <span>Notice: Running against placeholder data source until shared Turso database connection is added. The table schema and UI components are fully wired and deployment-ready.</span>
        </div>

        {/* Filter and Control Bar */}
        <div style={{ padding: '14px 28px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>
              <Filter size={15} /> Device:
            </div>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value as any)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', color: '#111827', outline: 'none', backgroundColor: '#F9FAFB' }}
            >
              <option value="all">All Devices ({jobs.length})</option>
              <option value="mobile">Mobile App ({jobs.filter((j) => j.deviceId === 'mobile').length})</option>
              <option value="desktop">Desktop App ({jobs.filter((j) => j.deviceId === 'desktop').length})</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#4B5563', marginLeft: '8px' }}>
              Status:
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', color: '#111827', outline: 'none', backgroundColor: '#F9FAFB' }}
            >
              <option value="all">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
              Auto-refresh (5s)
            </label>
          </div>
        </div>

        {/* Main Table */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 700 }}>
                <th style={{ padding: '12px 24px' }}>Job ID</th>
                <th style={{ padding: '12px 16px' }}>Device</th>
                <th style={{ padding: '12px 16px' }}>Payload</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Attempts</th>
                <th style={{ padding: '12px 24px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Database size={36} color="#9CA3AF" />
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
                        No data source connected yet
                      </div>
                      <p style={{ maxWidth: '420px', fontSize: '13px', color: '#6B7280' }}>
                        The dashboard schema and table are configured and running. When Turso or another database is configured, jobs will populate here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '14px 24px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#6B7280' }}>
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
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1F2937' }}>
                      {job.payload.split('\n')[0]}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {getStatusBadge(job.status)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#4B5563', fontWeight: 600 }}>
                      {job.attempts} / {job.maxAttempts}
                    </td>
                    <td style={{ padding: '14px 24px', color: '#6B7280', fontSize: '12px' }}>
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div style={{ padding: '14px 28px', backgroundColor: '#FAFAFA', borderTop: '1px solid #E5E7EB', fontSize: '12px', color: '#6B7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Showing {filteredJobs.length} of {jobs.length} total print jobs</span>
          <span>Last sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Pending'}</span>
        </div>
      </div>
    </main>
  );
}
