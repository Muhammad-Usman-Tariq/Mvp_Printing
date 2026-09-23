import React, { useState } from 'react';
import {
  Printer,
  RefreshCw,
  Loader2,
  Bluetooth
} from 'lucide-react';
import {
  ConnectionState,
  PrintJob,
  PrintQueueService
} from '@printer-mvp/print-core';

interface DesktopAppProps {
  queueService: PrintQueueService;
  connectionState: ConnectionState;
  jobs: PrintJob[];
  logs?: string[];
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshJobs: () => void;
  lastSyncTime?: number | null;
}

export const DesktopApp: React.FC<DesktopAppProps> = ({
  queueService,
  connectionState,
  jobs,
  onConnect,
  onDisconnect,
  onRefreshJobs
}) => {
  const [desktopText, setDesktopText] = useState('DESKTOP INVOICE #8842\nCustomer: Acme Corp\nItem: Pro License x1\nTotal: $149.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = queueService.isBusy() || isSubmitting;

  const handlePrint = async () => {
    if (!desktopText.trim() || isBusy || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await queueService.enqueue(desktopText, 'desktop', 3);
      onRefreshJobs();
    } finally {
      setIsSubmitting(false);
    }
  };

  const desktopJobs = jobs.filter((j) => j.deviceId === 'desktop');

  const getConnectionDotColor = () => {
    switch (connectionState) {
      case 'CONNECTED': return '#10B981';
      case 'PRINTING': return '#4F46E5';
      case 'CONNECTING':
      case 'RECONNECTING': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  return (
    <div style={{ backgroundColor: '#F5F5F7', width: '560px', height: '720px', borderRadius: '20px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
      {/* Title Bar */}
      <div style={{ height: '42px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }} />
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Printer size={15} color="#4F46E5" /> ESC/POS Receipt Printer (Electron Desktop)
        </div>
        <div style={{ width: '48px' }} />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
        {/* Card 1: Connection Status Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
              <Bluetooth size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6B7280' }}>
                  PRINTER CONNECTION
                </span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getConnectionDotColor() }} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                {connectionState === 'CONNECTED' ? 'Connected' : connectionState === 'PRINTING' ? 'Printing…' : connectionState === 'CONNECTING' ? 'Connecting…' : 'Not Connected'}
              </div>
            </div>
          </div>

          <button
            onClick={connectionState === 'CONNECTED' ? onDisconnect : onConnect}
            style={{
              backgroundColor: connectionState === 'CONNECTED' ? '#FFFFFF' : '#4F46E5',
              color: connectionState === 'CONNECTED' ? '#374151' : '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            {connectionState === 'CONNECTED' ? 'Disconnect' : 'Connect'}
          </button>
        </div>

        {/* Card 2: Print Form Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>Quick Print</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>Send text payload to thermal receipt printer</p>
            </div>
            <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>{desktopText.length} bytes</span>
          </div>

          <textarea
            value={desktopText}
            onChange={(e) => setDesktopText(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              backgroundColor: '#FAFAFB',
              border: '1px solid #D1D5DB',
              borderRadius: '10px',
              padding: '12px',
              color: '#111827',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              lineHeight: 1.4,
              resize: 'none',
              outline: 'none'
            }}
          />

          <button
            onClick={handlePrint}
            disabled={isBusy || !desktopText.trim()}
            style={{
              backgroundColor: '#4F46E5',
              opacity: isBusy || !desktopText.trim() ? 0.75 : 1,
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: isBusy || !desktopText.trim() ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
            }}
          >
            {isBusy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Printing…
              </>
            ) : (
              <>
                <Printer size={16} /> Print Now
              </>
            )}
          </button>
        </div>

        {/* Card 3: Recent Prints Card */}
        <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Recent Prints</span>
            <button onClick={onRefreshJobs} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
              <RefreshCw size={13} />
            </button>
          </div>

          {desktopJobs.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>
              No desktop print jobs yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              {desktopJobs.slice(0, 10).map((job) => (
                <div key={job.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#111827', fontWeight: 600, fontFamily: 'monospace' }}>
                    {job.payload.split('\n')[0].substring(0, 26)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      backgroundColor: '#DEF7EC',
                      color: '#03543F',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px'
                    }}>
                      Printed
                    </span>
                    <span style={{ color: '#9CA3AF', fontSize: '10px' }}>
                      {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
