import React, { useState, useEffect } from 'react';
import {
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bluetooth,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PrintJob, toFriendlyErrorMessage } from '@printer-mvp/print-core';

export const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<string>('DISCONNECTED');
  const [printValue, setPrintValue] = useState<string>('');
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'printing' | 'success' | 'error'; message: string } | null>(null);
  const [recentJobs, setRecentJobs] = useState<PrintJob[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Load state and subscribe on mount
  useEffect(() => {
    if (window.printerAPI) {
      window.printerAPI.getState().then((st) => {
        setConnectionState(st);
        if (st === 'DISCONNECTED') {
          window.printerAPI.connect().then(() => {
            window.printerAPI.getState().then(setConnectionState);
          }).catch(() => {});
        }
      });
      window.printerAPI.getRecentJobs().then(setRecentJobs);

      const unsubState = window.printerAPI.onStateChanged((state) => {
        setConnectionState(state);
      });

      const unsubJob = window.printerAPI.onJobStatusChanged((job) => {
        // Refresh job list
        window.printerAPI.getRecentJobs().then(setRecentJobs);

        if (job.status === 'sending') {
          setIsBusy(true);
          setFeedback({ type: 'printing', message: 'Printing…' });
        } else if (job.status === 'sent') {
          setIsBusy(false);
          setFeedback({ type: 'success', message: 'Printed' });
          setPrintValue('');
          setTimeout(() => setFeedback((prev) => (prev?.type === 'success' ? null : prev)), 4000);
        } else if (job.status === 'failed') {
          setIsBusy(false);
          const friendly = toFriendlyErrorMessage(job.lastErrorType, true);
          setFeedback({ type: 'error', message: friendly });
        }
      });

      return () => {
        unsubState();
        unsubJob();
      };
    }
  }, []);

  const handleConnectToggle = async () => {
    if (!window.printerAPI) return;
    if (connectionState === 'CONNECTED') {
      await window.printerAPI.disconnect();
    } else {
      await window.printerAPI.connect();
    }
  };

  const handlePrint = async () => {
    if (!printValue.trim() || isBusy || !window.printerAPI) return;

    setIsBusy(true);
    setFeedback({ type: 'printing', message: 'Printing…' });

    try {
      await window.printerAPI.print(printValue);
    } catch (err) {
      setIsBusy(false);
      setFeedback({ type: 'error', message: "Couldn't print — try again" });
    }
  };

  // Plain-language connection label
  const getFriendlyConnectionText = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return { text: 'Connected', color: '#10B981', dot: '#10B981' };
      case 'CONNECTING':
        return { text: 'Connecting…', color: '#F59E0B', dot: '#F59E0B' };
      case 'RECONNECTING':
        return { text: 'Reconnecting…', color: '#F59E0B', dot: '#F59E0B' };
      case 'PRINTING':
        return { text: 'Printing…', color: '#4F46E5', dot: '#4F46E5' };
      default:
        return { text: 'Not connected', color: '#6B7280', dot: '#9CA3AF' };
    }
  };

  const connInfo = getFriendlyConnectionText();

  // Plain-language status pill
  const renderStatusPill = (status: PrintJob['status']) => {
    switch (status) {
      case 'sent':
        return (
          <span style={{ backgroundColor: '#DEF7EC', color: '#03543F', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
            Printed
          </span>
        );
      case 'sending':
        return (
          <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Loader2 size={10} className="animate-spin" /> Printing…
          </span>
        );
      case 'failed':
        return (
          <span style={{ backgroundColor: '#FDE8E8', color: '#9B1C1C', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
            Failed
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
            Queued
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '580px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Connection Status Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: connInfo.dot }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
            Printer: <span style={{ color: connInfo.color }}>{connInfo.text}</span>
          </span>
        </div>

        <button
          onClick={handleConnectToggle}
          style={{
            backgroundColor: connectionState === 'CONNECTED' ? '#F3F4F6' : '#4F46E5',
            color: connectionState === 'CONNECTED' ? '#374151' : '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {connectionState === 'CONNECTED' ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* Main Print Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>
            Text to print
          </label>
          <textarea
            value={printValue}
            onChange={(e) => setPrintValue(e.target.value)}
            placeholder="Type value to print…"
            rows={5}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              color: '#111827',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <button
          onClick={handlePrint}
          disabled={isBusy || !printValue.trim()}
          style={{
            backgroundColor: isBusy || !printValue.trim() ? '#A5B4FC' : '#4F46E5',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 700,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isBusy || !printValue.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {isBusy ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Printing…
            </>
          ) : (
            <>
              <Printer size={18} /> Print Now
            </>
          )}
        </button>

        {/* Result Feedback Directly Under Button */}
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: feedback.type === 'success' ? '#DEF7EC' : feedback.type === 'error' ? '#FDE8E8' : '#EEF2FF',
              color: feedback.type === 'success' ? '#03543F' : feedback.type === 'error' ? '#9B1C1C' : '#4F46E5'
            }}
          >
            {feedback.type === 'success' && <CheckCircle2 size={16} />}
            {feedback.type === 'error' && <AlertCircle size={16} />}
            {feedback.type === 'printing' && <Loader2 size={16} className="animate-spin" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Recent Jobs Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '14px' }}>
          Recent prints
        </h3>

        {recentJobs.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#9CA3AF', padding: '16px 0', textAlign: 'center' }}>
            No recent prints yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentJobs.map((job) => {
              const isFailed = job.status === 'failed';
              const isExpanded = expandedJobId === job.id;

              return (
                <div
                  key={job.id}
                  onClick={() => isFailed && setExpandedJobId(isExpanded ? null : job.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#F9FAFB',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    cursor: isFailed ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.payload.split('\n')[0] || '(empty)'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderStatusPill(job.status)}
                      {isFailed && (isExpanded ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />)}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Tapping a failed job shows one plain-language line */}
                  {isFailed && isExpanded && (
                    <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed #FECACA' }}>
                      {toFriendlyErrorMessage(job.lastErrorType, true)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
