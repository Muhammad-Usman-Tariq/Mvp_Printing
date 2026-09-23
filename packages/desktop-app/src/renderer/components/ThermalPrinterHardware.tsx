import React from 'react';
import {
  Printer
} from 'lucide-react';
import { ConnectionState } from '@printer-mvp/print-core';
import { PrintedReceipt } from '../services/printer-runtime';

interface ThermalPrinterHardwareProps {
  connectionState: ConnectionState;
  printedReceipts: PrintedReceipt[];
}

export const ThermalPrinterHardware: React.FC<ThermalPrinterHardwareProps> = ({
  connectionState,
  printedReceipts
}) => {
  const isPrinting = connectionState === 'PRINTING';
  const isConnected = connectionState === 'CONNECTED' || connectionState === 'PRINTING';

  return (
    <div style={{ backgroundColor: '#0B0F19', width: '360px', borderRadius: '20px', padding: '20px', border: '1px solid #1E293B', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Printer Header / Brand */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8' }}>
            <Printer size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC' }}>POS-5802BT</h3>
            <p style={{ fontSize: '10px', color: '#64748B' }}>58mm Thermal ESC/POS • SPP/BLE</p>
          </div>
        </div>

        {/* Hardware Status LEDs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#020617', padding: '6px 10px', borderRadius: '10px', border: '1px solid #1E293B' }}>
          {/* Power LED */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ fontSize: '8px', color: '#64748B', fontWeight: 700 }}>PWR</span>
          </div>

          {/* BT LED */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#38BDF8' : '#334155',
              boxShadow: isConnected ? '0 0 8px #38BDF8' : 'none'
            }} className={isConnected ? 'animate-pulse-glow' : ''} />
            <span style={{ fontSize: '8px', color: '#64748B', fontWeight: 700 }}>BT</span>
          </div>

          {/* Activity / Error LED */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isPrinting ? '#F59E0B' : connectionState === 'DISCONNECTED' ? '#EF4444' : '#334155',
              boxShadow: isPrinting ? '0 0 8px #F59E0B' : connectionState === 'DISCONNECTED' ? '0 0 8px #EF4444' : 'none'
            }} className={isPrinting ? 'animate-pulse-glow' : ''} />
            <span style={{ fontSize: '8px', color: '#64748B', fontWeight: 700 }}>STATUS</span>
          </div>
        </div>
      </div>

      {/* Printer Paper Output Chamber */}
      <div style={{
        backgroundColor: '#05070E',
        borderRadius: '14px',
        padding: '16px',
        minHeight: '260px',
        maxHeight: '440px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: '1px solid #1E293B',
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)'
      }}>
        {/* Paper Ejection Slot */}
        <div style={{
          height: '6px',
          backgroundColor: '#0F172A',
          borderRadius: '3px',
          width: '85%',
          margin: '0 auto 12px',
          border: '1px solid #334155',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)'
        }} />

        {/* Paper Roll Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {printedReceipts.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#475569',
              fontSize: '12px',
              textAlign: 'center',
              fontFamily: 'monospace'
            }}>
              <span style={{ opacity: 0.5 }}>[READY TO PRINT]</span>
              <span style={{ fontSize: '11px', marginTop: '6px', color: '#334155' }}>
                Type on Mobile or Desktop<br />to emit thermal receipt tape
              </span>
            </div>
          ) : (
            printedReceipts.map((rcpt) => (
              <div key={rcpt.id} className="receipt-paper receipt-slide-down" style={{
                borderRadius: '4px',
                padding: '12px 14px',
                color: '#1E293B',
                fontSize: '11px',
                lineHeight: 1.4
              }}>
                <div style={{ borderBottom: '1px dashed #94A3B8', paddingBottom: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
                  <span>DEV: {rcpt.deviceId.toUpperCase()}</span>
                  <span>{new Date(rcpt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#0F172A', fontWeight: 600 }}>
                  {rcpt.rawText}
                </div>
                <div className="receipt-tear-edge" style={{ marginTop: '6px' }} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
