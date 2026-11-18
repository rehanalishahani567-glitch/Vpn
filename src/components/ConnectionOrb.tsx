import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Power, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ConnectionStatus, PlanTier, VpnProtocolId, VpnServer } from '../types/vpn';
import { CountryFlag } from './CountryFlag';

interface ConnectionOrbProps {
  status: ConnectionStatus;
  handshakeStep: string;
  selectedServer: VpnServer;
  protocol: VpnProtocolId;
  activePlan: PlanTier;
  durationFormatted: string;
  detectedIp: string;
  downloadMbps: number;
  uploadMbps: number;
  onToggleConnection: () => void;
  onOpenUpgrade: () => void;
}

export const ConnectionOrb: React.FC<ConnectionOrbProps> = ({
  status,
  handshakeStep,
  selectedServer,
  protocol,
  activePlan,
  durationFormatted,
  detectedIp,
  downloadMbps,
  uploadMbps,
  onToggleConnection,
  onOpenUpgrade,
}) => {
  const dialCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const statusHeadline = isConnected
    ? 'Protected'
    : isConnecting
      ? 'Connecting'
      : 'Not Connected';

  const protocolLabel = protocol === 'wireguard' ? 'WireGuard' : 'OpenVPN';

  useEffect(() => {
    const canvas = dialCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const size = 224;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const renderDial = (t: number) => {
      const isDark = document.documentElement.classList.contains('dark');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const angleBase = prefersReducedMotion ? 0 : t * 0.0008;

      const halo = ctx.createRadialGradient(cx, cy, 46, cx, cy, 110);
      if (isConnected) {
        halo.addColorStop(0, 'rgba(16, 185, 129, 0.30)');
        halo.addColorStop(0.65, 'rgba(14, 165, 233, 0.10)');
        halo.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else if (isConnecting) {
        halo.addColorStop(0, 'rgba(245, 158, 11, 0.30)');
        halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
      } else {
        halo.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(14, 165, 233, 0.10)');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
      }
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, 110, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 48; i++) {
        const a = (i * Math.PI * 2) / 48;
        const major = i % 4 === 0;
        const r1 = major ? 95 : 98;
        const r2 = 103;
        ctx.strokeStyle = isConnected
          ? major
            ? 'rgba(16, 185, 129, 0.75)'
            : 'rgba(16, 185, 129, 0.3)'
          : isConnecting
            ? 'rgba(245, 158, 11, 0.6)'
            : isDark
              ? 'rgba(56, 189, 248, 0.35)'
              : 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = major ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }

      const segCount = 4;
      for (let s = 0; s < segCount; s++) {
        const start = angleBase * (isConnecting ? 3.4 : 0.75) + (s * Math.PI * 2) / segCount;
        const span = Math.PI * 0.36;
        ctx.strokeStyle = isConnected
          ? '#10B981'
          : isConnecting
            ? '#F59E0B'
            : '#0EA5E9';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, 86, start, start + span);
        ctx.stroke();
      }

      ctx.strokeStyle = isConnected
        ? 'rgba(56, 189, 248, 0.65)'
        : isConnecting
          ? 'rgba(245, 158, 11, 0.5)'
          : isDark
            ? 'rgba(56, 189, 248, 0.32)'
            : 'rgba(14, 165, 233, 0.4)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.arc(cx, cy, 76, -angleBase * 1.4, -angleBase * 1.4 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      rafId = window.requestAnimationFrame(renderDial);
    };

    rafId = window.requestAnimationFrame(renderDial);
    return () => window.cancelAnimationFrame(rafId);
  }, [isConnected, isConnecting]);

  return (
    <div className="flex flex-col justify-between h-full p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : isConnecting ? (
              <Shield className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-sky-500 shrink-0" />
            )}
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {statusHeadline}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isConnected
              ? `${protocolLabel} · ${selectedServer.city}, ${selectedServer.country}`
              : isConnecting
                ? handshakeStep
                : 'Tap Connect to secure your connection'}
          </p>
        </div>

        <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
          {isConnected ? durationFormatted : '00:00:00'}
        </span>
      </div>

      {/* Tactile Power Core Button */}
      <div className="my-4 flex flex-col items-center justify-center">
        <div className="relative w-[224px] h-[224px] flex items-center justify-center">
          <canvas
            ref={dialCanvasRef}
            className="absolute inset-0 w-[224px] h-[224px] pointer-events-none"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={onToggleConnection}
            aria-label={isConnected ? 'Disconnect VPN' : 'Connect VPN'}
            className={`group relative w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 ${
              isConnected
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_0_32px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:to-emerald-600 focus-visible:outline-emerald-500'
                : isConnecting
                  ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-white shadow-[0_0_28px_rgba(245,158,11,0.35)] focus-visible:outline-amber-500'
                  : 'bg-gradient-to-b from-slate-800 to-slate-950 dark:from-[#16243D] dark:to-[#0A111F] text-white border border-sky-500/40 shadow-[0_0_26px_rgba(14,165,233,0.18)] hover:border-emerald-400/70 hover:shadow-[0_0_32px_rgba(16,185,129,0.28)] focus-visible:outline-sky-500'
            }`}
          >
            <span className="absolute inset-1.5 rounded-full border border-white/15 pointer-events-none" />
            <Power className="w-9 h-9 transition-transform duration-200 group-hover:scale-105" />
            <span className="mt-2 text-xs font-semibold tracking-wide">
              {isConnected ? 'Disconnect' : isConnecting ? 'Connecting' : 'Connect'}
            </span>
          </button>
        </div>
      </div>

      {/* Essential Identity & Speed Readout */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/90 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">Location</span>
          <span className="inline-flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
            <CountryFlag code={selectedServer.code} className="w-4 h-3" />
            {selectedServer.city}, {selectedServer.country}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">IP Address</span>
          <span className="font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
            {isConnected ? selectedServer.virtualIp : detectedIp}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">Live Speed</span>
          <span className="inline-flex items-center gap-3 font-mono text-slate-800 dark:text-slate-200 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-emerald-500" />
              {downloadMbps.toFixed(1)} Mbps
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-sky-500" />
              {uploadMbps.toFixed(1)} Mbps
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">Plan</span>
          <div className="inline-flex items-center gap-2">
            <span
              className={`font-medium ${
                activePlan === 'free'
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {activePlan === 'max'
                ? 'Meridian Max'
                : activePlan === 'pro'
                  ? 'Meridian Pro'
                  : 'Free'}
            </span>
            {activePlan === 'free' && (
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
