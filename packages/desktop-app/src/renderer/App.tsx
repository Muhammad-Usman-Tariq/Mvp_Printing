import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Laptop,
  Monitor,
  LayoutGrid,
  Bluetooth
} from 'lucide-react';
import {
  ConnectionStateMachine,
  PrintQueueService,
  PrintJob,
  ConnectionState,
  Logger
} from '@printer-mvp/print-core';
import {
  WebSimulatedPrinterConnection,
  LocalStorageJobStore,
  PrintedReceipt
} from './services/printer-runtime';
import { MobileApp } from './components/MobileApp';
import { DesktopApp } from './components/DesktopApp';
import { DashboardApp } from './components/DashboardApp';
import { ThermalPrinterHardware } from './components/ThermalPrinterHardware';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'mobile' | 'desktop' | 'dashboard'>('mobile');
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [isConnecting, setIsConnecting] = useState(false);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [printedReceipts, setPrintedReceipts] = useState<PrintedReceipt[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(Date.now() - 25000);

  // References for singleton runtime
  const connectionRef = useRef<WebSimulatedPrinterConnection | null>(null);
  const stateMachineRef = useRef<ConnectionStateMachine | null>(null);
  const storeRef = useRef<LocalStorageJobStore | null>(null);
  const queueServiceRef = useRef<PrintQueueService | null>(null);

  // Initialize service on mount
  useEffect(() => {
    const conn = new WebSimulatedPrinterConnection();
    connectionRef.current = conn;

    const logger: Logger = {
      info: (msg, meta) => {
        const line = `[INFO] ${new Date().toLocaleTimeString()} - ${msg} ${meta ? JSON.stringify(meta) : ''}`;
        setLogs((prev) => [line, ...prev.slice(0, 40)]);
      },
      warn: (msg, meta) => {
        const line = `[WARN] ${new Date().toLocaleTimeString()} - ${msg} ${meta ? JSON.stringify(meta) : ''}`;
        setLogs((prev) => [line, ...prev.slice(0, 40)]);
      },
      error: (msg, meta) => {
        const line = `[ERROR] ${new Date().toLocaleTimeString()} - ${msg} ${meta ? JSON.stringify(meta) : ''}`;
        setLogs((prev) => [line, ...prev.slice(0, 40)]);
      },
      debug: () => {}
    };

    const sm = new ConnectionStateMachine(conn, logger);
    stateMachineRef.current = sm;

    sm.onTransition((event) => {
      setConnectionState(event.to);
    });

    const store = new LocalStorageJobStore();
    storeRef.current = store;

    // Buffer raw bytes per job so chunked writes produce exactly ONE receipt output
    const rawJobBytes: number[] = [];

    conn.onRawWrite = (bytes: Uint8Array) => {
      for (let i = 0; i < bytes.length; i++) {
        rawJobBytes.push(bytes[i]);
      }
    };

    const qs = new PrintQueueService(
      conn,
      sm,
      store,
      {
        maxAttempts: 3,
        baseBackoffMs: 500,
        maxBackoffMs: 3000,
        writeTimeoutMs: 5000,
        onJobStatusChange: async () => {
          const loaded = await store.getAll();
          setJobs([...loaded]);
        },
        onJobComplete: async (completedJob) => {
          const loaded = await store.getAll();
          setJobs([...loaded]);

          if (completedJob.status === 'sent') {
            let printable = '';
            if (rawJobBytes.length > 0) {
              const decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(rawJobBytes));
              printable = decoded.replace(/[\x1b\x1d\x40\x56\x41\x00]/g, '').trim();
            }
            if (!printable) {
              printable = completedJob.payload.trim();
            }

            const receipt: PrintedReceipt = {
              id: 'rcpt-' + completedJob.id,
              jobId: completedJob.id,
              deviceId: completedJob.deviceId,
              rawText: printable,
              timestamp: completedJob.updatedAt || Date.now()
            };
            setPrintedReceipts((prev) => [receipt, ...prev]);
          }
          rawJobBytes.length = 0;
        }
      },
      logger
    );
    queueServiceRef.current = qs;

    // Load initial jobs
    store.getAll().then((loaded) => setJobs(loaded));

    // Call resumeIncomplete() on startup per acceptance criteria
    qs.resumeIncomplete();

    // Auto connect by default
    conn.connect().then(() => sm.transitionTo('CONNECTED', 'Auto-paired on startup'));

    return () => {
      conn.disconnect().catch(() => {});
    };
  }, []);

  const refreshJobs = async () => {
    if (storeRef.current) {
      const all = await storeRef.current.getAll();
      setJobs([...all]);
    }
  };

  const handleConnect = async () => {
    if (!connectionRef.current || !stateMachineRef.current) return;
    setIsConnecting(true);
    try {
      await stateMachineRef.current.transitionTo('CONNECTING', 'User initiated pairing');
      await connectionRef.current.connect();
      await stateMachineRef.current.transitionTo('CONNECTED', 'Bluetooth paired');
    } catch (err) {
      await stateMachineRef.current.transitionTo('DISCONNECTED', String(err));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connectionRef.current || !stateMachineRef.current) return;
    await connectionRef.current.disconnect();
    await stateMachineRef.current.transitionTo('DISCONNECTED', 'User disconnected');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0A0E1A', color: '#F8FAFC' }}>
      {/* Top Header / View Switcher */}
      <header style={{ padding: '16px 28px', backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 0 15px rgba(79, 70, 229, 0.5)' }}>
            <Bluetooth size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                Bluetooth Receipt Printer MVP
              </h1>
              <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#1E293B', color: '#818CF8', padding: '2px 8px', borderRadius: '6px', border: '1px solid #334155' }}>
                ESC/POS Monorepo
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B' }}>
              Local SQLite Queue • Shared print-core • Electron + React Native + Next.js
            </p>
          </div>
        </div>

        {/* View Switcher Tabs: Mobile App / Desktop App / Dashboard */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#020617', padding: '4px', borderRadius: '12px', border: '1px solid #1E293B' }}>
          <button
            onClick={() => setActiveView('mobile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeView === 'mobile' ? '#4F46E5' : 'transparent',
              color: activeView === 'mobile' ? '#FFFFFF' : '#94A3B8'
            }}
          >
            <Smartphone size={15} /> Mobile App
          </button>

          <button
            onClick={() => setActiveView('desktop')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeView === 'desktop' ? '#4F46E5' : 'transparent',
              color: activeView === 'desktop' ? '#FFFFFF' : '#94A3B8'
            }}
          >
            <Laptop size={15} /> Desktop App
          </button>

          <button
            onClick={() => setActiveView('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeView === 'dashboard' ? '#4F46E5' : 'transparent',
              color: activeView === 'dashboard' ? '#FFFFFF' : '#94A3B8'
            }}
          >
            <Monitor size={15} /> Dashboard
          </button>
        </div>
      </header>

      {/* Main Container Area */}
      <main style={{ flex: 1, padding: '28px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto' }}>
        {/* Tab 1: Mobile App + Thermal Printer Simulator */}
        {activeView === 'mobile' && queueServiceRef.current && (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#818CF8', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Smartphone size={14} /> React Native Mobile App (Design System)
              </div>
              <MobileApp
                queueService={queueServiceRef.current}
                connectionState={connectionState}
                jobs={jobs}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                isConnecting={isConnecting}
                lastSyncTime={lastSyncTime}
                onRefreshJobs={refreshJobs}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#34D399', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Bluetooth size={14} /> Live Thermal Hardware Simulator
              </div>
              <ThermalPrinterHardware
                connectionState={connectionState}
                printedReceipts={printedReceipts}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Desktop App + Thermal Printer Simulator */}
        {activeView === 'desktop' && queueServiceRef.current && (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#38BDF8', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Laptop size={14} /> Electron Desktop App (Utilitarian UI)
              </div>
              <DesktopApp
                queueService={queueServiceRef.current}
                connectionState={connectionState}
                jobs={jobs}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onRefreshJobs={refreshJobs}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#34D399', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Bluetooth size={14} /> Live Thermal Hardware Simulator
              </div>
              <ThermalPrinterHardware
                connectionState={connectionState}
                printedReceipts={printedReceipts}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Dashboard */}
        {activeView === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <DashboardApp
              jobs={jobs}
              onRefresh={refreshJobs}
              lastSyncTime={lastSyncTime}
            />
          </div>
        )}
      </main>
    </div>
  );
};
