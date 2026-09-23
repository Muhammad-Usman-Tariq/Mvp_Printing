import React, { useState } from 'react';
import {
  Printer,
  History,
  Settings,
  Bluetooth,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Cloud
} from 'lucide-react';
import {
  ConnectionState,
  PrintJob,
  PrintQueueService
} from '@printer-mvp/print-core';

interface MobileAppProps {
  queueService: PrintQueueService;
  connectionState: ConnectionState;
  jobs: PrintJob[];
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
  lastSyncTime: number | null;
  onRefreshJobs: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({
  queueService,
  connectionState,
  jobs,
  onConnect,
  onDisconnect,
  isConnecting,
  lastSyncTime,
  onRefreshJobs
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'jobs' | 'settings'>('home');
  const [currentScreen, setCurrentScreen] = useState<'home' | 'quick_print' | 'history' | 'settings'>('home');
  const [printText, setPrintText] = useState('Coffee & Bagel\n1x Latte  $4.50\n1x Bagel  $3.25\nTotal:    $7.75\nThank you!');
  const [copies, setCopies] = useState(1);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [lastSubmittedJob, setLastSubmittedJob] = useState<PrintJob | null>(null);

  // Settings state
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [writeTimeout, setWriteTimeout] = useState(5);
  const [settingsSavedBanner, setSettingsSavedBanner] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = queueService.isBusy() || isSubmitting;

  const handlePrintNow = async () => {
    if (!printText.trim() || isBusy || isSubmitting) return;
    setIsSubmitting(true);
    try {
      for (let c = 0; c < copies; c++) {
        const enqueued = await queueService.enqueue(printText, 'mobile', maxAttempts);
        setLastSubmittedJob(enqueued);
      }
      onRefreshJobs();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: PrintJob['status']) => {
    switch (status) {
      case 'queued':
        return <span style={{ backgroundColor: '#E5E7EB', color: '#374151' }} className="px-2.5 py-0.5 rounded-full text-xs font-semibold">Queued</span>;
      case 'sending':
        return <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }} className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Sending</span>;
      case 'sent':
        return <span style={{ backgroundColor: '#DEF7EC', color: '#03543F' }} className="px-2.5 py-0.5 rounded-full text-xs font-semibold">Sent</span>;
      case 'failed':
        return <span style={{ backgroundColor: '#FDE8E8', color: '#9B1C1C' }} className="px-2.5 py-0.5 rounded-full text-xs font-semibold">Failed</span>;
    }
  };

  const getConnectionColor = () => {
    switch (connectionState) {
      case 'CONNECTED': return '#10B981';
      case 'PRINTING': return '#6366F1';
      case 'CONNECTING':
      case 'RECONNECTING': return '#F59E0B';
      case 'DISCONNECTED': return '#9CA3AF';
    }
  };

  return (
    <div style={{ backgroundColor: '#F5F5F7', width: '380px', height: '720px', borderRadius: '44px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)', border: '10px solid #1E293B', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* iOS Dynamic Island / Notch */}
      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '110px', height: '24px', backgroundColor: '#0F172A', borderRadius: '14px', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1E293B', marginRight: '6px' }} />
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0284C7' }} />
      </div>

      {/* Screen Body */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '42px', paddingBottom: '70px', paddingLeft: '20px', paddingRight: '20px' }}>
        {/* ================= SCREEN 1: HOME ================= */}
        {currentScreen === 'home' && (
          <div>
            {/* Header */}
            <div style={{ marginTop: '16px', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                Print smarter, <span style={{ color: '#4F46E5' }}>instantly.</span>
              </h1>
              <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '6px' }}>
                Type a value and print it in one tap.
              </p>
            </div>

            {/* Quick-action cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {/* Quick Print Card */}
              <div
                onClick={() => setCurrentScreen('quick_print')}
                style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s ease' }}
              >
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                  <Printer size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>Quick Print</h3>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Start a new print job</p>
                </div>
                <ChevronRight size={20} color="#9CA3AF" />
              </div>

              {/* Job History Card */}
              <div
                onClick={() => {
                  setCurrentScreen('history');
                  setActiveTab('jobs');
                }}
                style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
              >
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <History size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>Job History</h3>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>View past print jobs ({jobs.length})</p>
                </div>
                <ChevronRight size={20} color="#9CA3AF" />
              </div>
            </div>

            {/* Primary Action Button: Connect Printer */}
            <button
              onClick={connectionState === 'CONNECTED' ? onDisconnect : onConnect}
              disabled={isConnecting}
              style={{
                width: '100%',
                backgroundColor: connectionState === 'CONNECTED' ? '#1E293B' : '#4F46E5',
                color: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                marginBottom: '14px',
                transition: 'all 0.15s ease'
              }}
            >
              {isConnecting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Connecting...
                </>
              ) : connectionState === 'CONNECTED' ? (
                <>
                  <Bluetooth size={18} /> Disconnect Printer
                </>
              ) : (
                <>
                  <Bluetooth size={18} /> Connect Printer <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Secondary row: Printer Status */}
            <div
              onClick={() => setCurrentScreen('settings')}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getConnectionColor() }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Printer Status</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: getConnectionColor() }}>
                  {connectionState}
                </span>
                <ChevronRight size={16} color="#9CA3AF" />
              </div>
            </div>
          </div>
        )}

        {/* ================= SCREEN 2: QUICK PRINT ================= */}
        {currentScreen === 'quick_print' && (
          <div>
            {/* Top Bar with Back and Settings Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button
                onClick={() => setCurrentScreen('home')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#4F46E5', fontSize: '14px', fontWeight: 600, padding: 0 }}
              >
                <ChevronLeft size={20} /> Back
              </button>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>Quick print</h2>
              <button
                onClick={() => setCurrentScreen('settings')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {/* Multiline Text Input Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280' }}>
                  Value to Print
                </label>
                <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                  {printText.length} chars
                </span>
              </div>
              <textarea
                value={printText}
                onChange={(e) => setPrintText(e.target.value)}
                placeholder="Type receipt value, item list, or barcode data..."
                rows={5}
                style={{
                  width: '100%',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  padding: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px',
                  color: '#111827',
                  resize: 'none',
                  outline: 'none',
                  backgroundColor: '#F9FAFB'
                }}
              />
            </div>

            {/* Printer Illustration Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                <Printer size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>ESC/POS Thermal 58mm</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  {connectionState === 'CONNECTED' ? 'Ready to print' : `Status: ${connectionState}`}
                </div>
              </div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getConnectionColor() }} />
            </div>

            {/* Config: Copies Stepper */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Copies</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  disabled={copies <= 1}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: copies > 1 ? 'pointer' : 'not-allowed', color: '#374151' }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827', minWidth: '18px', textAlign: 'center' }}>
                  {copies}
                </span>
                <button
                  onClick={() => setCopies((c) => Math.min(10, c + 1))}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Primary Button: Print Now */}
            <button
              onClick={handlePrintNow}
              disabled={isBusy || !printText.trim()}
              style={{
                width: '100%',
                backgroundColor: isBusy ? '#818CF8' : '#4F46E5',
                color: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: isBusy || !printText.trim() ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {isBusy ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Printing in flight...
                </>
              ) : (
                <>
                  <Printer size={18} /> Print Now
                </>
              )}
            </button>

            {/* Live Job Status Indicator */}
            {lastSubmittedJob && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '12px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Latest Job:</span>
                {getStatusBadge(jobs.find((j) => j.id === lastSubmittedJob.id)?.status || lastSubmittedJob.status)}
              </div>
            )}
          </div>
        )}

        {/* ================= SCREEN 3: JOB HISTORY ================= */}
        {currentScreen === 'history' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button
                onClick={() => {
                  setCurrentScreen('home');
                  setActiveTab('home');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#4F46E5', fontSize: '14px', fontWeight: 600, padding: 0 }}
              >
                <ChevronLeft size={20} /> Back
              </button>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>Job history</h2>
              <button
                onClick={onRefreshJobs}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <History size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>No print jobs yet</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Jobs printed from this mobile device will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {jobs.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const isFailed = job.status === 'failed';

                  return (
                    <div
                      key={job.id}
                      onClick={() => isFailed && setExpandedJobId(isExpanded ? null : job.id)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                        cursor: isFailed ? 'pointer' : 'default',
                        border: isExpanded ? '1px solid #FCA5A5' : '1px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                          {job.payload.split('\n')[0].substring(0, 22) || '(empty)'}
                        </span>
                        {getStatusBadge(job.status)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#9CA3AF' }}>
                        <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                        <span>Attempts: {job.attempts}/{job.maxAttempts}</span>
                      </div>

                      {/* Expandable error detail for failed jobs */}
                      {isExpanded && isFailed && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #FEE2E2', fontSize: '11px', color: '#DC2626' }}>
                          <div style={{ fontWeight: 700 }}>Error Type: {job.lastErrorType ?? 'UNKNOWN'}</div>
                          <div style={{ marginTop: '2px', wordBreak: 'break-word' }}>{job.lastError}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= SCREEN 4: SETTINGS ================= */}
        {currentScreen === 'settings' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button
                onClick={() => {
                  setCurrentScreen('home');
                  setActiveTab('home');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#4F46E5', fontSize: '14px', fontWeight: 600, padding: 0 }}
              >
                <ChevronLeft size={20} /> Back
              </button>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>Settings</h2>
              <div style={{ width: '40px' }} />
            </div>

            {settingsSavedBanner && (
              <div style={{ backgroundColor: '#DEF7EC', color: '#03543F', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> Settings saved successfully
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {/* Bluetooth Device Row */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Bluetooth device</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>ESC/POS-Printer-BT01</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: getConnectionColor() }}>
                  {connectionState}
                </span>
              </div>

              {/* Max Retry Attempts */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Max retry attempts</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Default: 3</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setMaxAttempts((m) => Math.max(1, m - 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                    {maxAttempts}
                  </span>
                  <button
                    onClick={() => setMaxAttempts((m) => Math.min(10, m + 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Write Timeout */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Write timeout</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Default: 5s</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setWriteTimeout((w) => Math.max(2, w - 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                    {writeTimeout}s
                  </span>
                  <button
                    onClick={() => setWriteTimeout((w) => Math.min(30, w + 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Sync Status */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Sync status</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    {lastSyncTime ? `Synced ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Syncing in background (~60s)'}
                  </div>
                </div>
                <Cloud size={18} color="#4F46E5" />
              </div>
            </div>

            {/* Save Settings Button */}
            <button
              onClick={() => {
                setSettingsSavedBanner(true);
                setTimeout(() => setSettingsSavedBanner(false), 2500);
              }}
              style={{
                width: '100%',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
              }}
            >
              Save settings
            </button>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar (3 tabs: Home, Print Jobs, Settings) */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '64px', backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 40, paddingBottom: '6px' }}>
        <button
          onClick={() => {
            setActiveTab('home');
            setCurrentScreen('home');
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'home' && currentScreen === 'home' ? '#4F46E5' : '#9CA3AF' }}
        >
          <Printer size={20} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Home</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('jobs');
            setCurrentScreen('history');
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'jobs' || currentScreen === 'history' ? '#4F46E5' : '#9CA3AF' }}
        >
          <History size={20} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Print Jobs</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('settings');
            setCurrentScreen('settings');
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'settings' || currentScreen === 'settings' ? '#4F46E5' : '#9CA3AF' }}
        >
          <Settings size={20} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Settings</span>
        </button>
      </div>
    </div>
  );
};
