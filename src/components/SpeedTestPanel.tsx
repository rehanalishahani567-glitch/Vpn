import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Gauge, Play } from 'lucide-react';
import { ConnectionStatus, VpnServer } from '../types/vpn';
import { CountryFlag } from './CountryFlag';

interface SpeedTestPanelProps {
  status: ConnectionStatus;
  selectedServer: VpnServer;
}

type ProbePhase = 'idle' | 'ping' | 'download' | 'upload' | 'complete';

export const SpeedTestPanel: React.FC<SpeedTestPanelProps> = ({
  status,
  selectedServer,
}) => {
  const [phase, setPhase] = useState<ProbePhase>('idle');
  const [liveMbps, setLiveMbps] = useState<number>(0);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [downloadMbps, setDownloadMbps] = useState<number | null>(null);
  const [uploadMbps, setUploadMbps] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runRealSpeedTest = async () => {
    setErrorMsg(null);
    setPhase('ping');
    setLiveMbps(0);
    setPingMs(null);
    setDownloadMbps(null);
    setUploadMbps(null);

    try {
      const rtts: number[] = [];
      for (let i = 0; i < 4; i++) {
        const t0 = performance.now();
        const res = await fetch(`/api/ping?i=${i}&t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Ping endpoint unavailable');
        await res.json();
        rtts.push(performance.now() - t0);
      }
      setPingMs(Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length));

      setPhase('download');
      const dlStart = performance.now();
      let totalDlBytes = 0;
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`/api/speed-probe?chunk=${i}&t=${Date.now()}`, {
          cache: 'no-store',
        });
        const buf = await res.arrayBuffer();
        totalDlBytes += buf.byteLength;
        const elapsedSec = Math.max((performance.now() - dlStart) / 1000, 0.02);
        const currentMbps = Number((((totalDlBytes * 8) / 1_000_000) / elapsedSec).toFixed(1));
        setLiveMbps(Math.min(currentMbps, 1000));
      }
      const dlSec = Math.max((performance.now() - dlStart) / 1000, 0.02);
      const finalDl = Number((((totalDlBytes * 8) / 1_000_000) / dlSec).toFixed(1));
      setDownloadMbps(finalDl);

      setPhase('upload');
      const uploadChunk = new Uint8Array(512 * 1024);
      const ulStart = performance.now();
      let totalUlBytes = 0;
      for (let i = 0; i < 2; i++) {
        const res = await fetch('/api/speed-probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: uploadChunk,
        });
        if (res.ok) {
          const data = await res.json();
          totalUlBytes += data.receivedBytes || uploadChunk.byteLength;
        }
        const elapsedSec = Math.max((performance.now() - ulStart) / 1000, 0.02);
        const currentUl = Number((((totalUlBytes * 8) / 1_000_000) / elapsedSec).toFixed(1));
        setLiveMbps(Math.min(currentUl, 1000));
      }
      const ulSec = Math.max((performance.now() - ulStart) / 1000, 0.02);
      const finalUl = Number((((totalUlBytes * 8) / 1_000_000) / ulSec).toFixed(1));
      setUploadMbps(finalUl);

      setLiveMbps(finalDl);
      setPhase('complete');
    } catch {
      setErrorMsg('Unable to reach speed test server.');
      setPhase('idle');
    }
  };

  const maxGauge = 500;
  const clamped = Math.min(liveMbps, maxGauge);
  const ratio = clamped / maxGauge;
  const radius = 94;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 240 / 360;
  const totalArcLength = circumference * arcFraction;
  const activeLength = totalArcLength * ratio;
  const needleAngleDeg = 150 + ratio * 240;
  const needleRad = (needleAngleDeg * Math.PI) / 180;
  const needleX = 130 + Math.cos(needleRad) * 82;
  const needleY = 126 + Math.sin(needleRad) * 82;
  const isRunning = phase === 'ping' || phase === 'download' || phase === 'upload';

  const scaleLabels = [0, 125, 250, 375, 500];

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto border border-slate-200 dark:border-slate-800/90 rounded-2xl bg-white dark:bg-[#0F1725] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800/90">
        <div className="flex items-center gap-3">
          {status === 'connected' && <CountryFlag code={selectedServer.code} className="w-7 h-5" />}
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Connection Speed Test
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {status === 'connected'
                ? `Testing route via ${selectedServer.city}, ${selectedServer.country}`
                : 'Testing direct connection speed'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runRealSpeedTest}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isRunning ? `Testing ${phase}...` : 'Start Speed Test'}
        </button>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
        {/* Radial Speedometer Dial */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-[260px] h-[230px] flex items-center justify-center">
            <svg viewBox="0 0 260 230" className="w-full h-full" role="img" aria-label="Speed gauge">
              <defs>
                <linearGradient id="speedArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>

              <circle
                cx="130"
                cy="126"
                r="109"
                fill="none"
                className="stroke-slate-200/80 dark:stroke-slate-800/80"
                strokeWidth="1"
                strokeDasharray="2 4"
              />

              <circle
                cx="130"
                cy="126"
                r={radius}
                fill="none"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${totalArcLength} ${circumference}`}
                transform="rotate(150 130 126)"
              />

              <circle
                cx="130"
                cy="126"
                r={radius}
                fill="none"
                stroke={phase === 'upload' ? '#0EA5E9' : 'url(#speedArcGrad)'}
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${activeLength} ${circumference}`}
                transform="rotate(150 130 126)"
                className="transition-all duration-200"
              />

              {Array.from({ length: 25 }, (_, idx) => {
                const t = idx / 24;
                const angleDeg = 150 + t * 240;
                const rad = (angleDeg * Math.PI) / 180;
                const major = idx % 6 === 0;
                const rIn = major ? 71 : 75;
                const rOut = 81;
                return (
                  <line
                    key={idx}
                    x1={130 + Math.cos(rad) * rIn}
                    y1={126 + Math.sin(rad) * rIn}
                    x2={130 + Math.cos(rad) * rOut}
                    y2={126 + Math.sin(rad) * rOut}
                    className={
                      t <= ratio
                        ? 'stroke-emerald-500'
                        : 'stroke-slate-300 dark:stroke-slate-700'
                    }
                    strokeWidth={major ? '1.6' : '1'}
                    strokeLinecap="round"
                  />
                );
              })}

              {scaleLabels.map((val, idx) => {
                const t = idx / (scaleLabels.length - 1);
                const rad = ((150 + t * 240) * Math.PI) / 180;
                const lx = 130 + Math.cos(rad) * 58;
                const ly = 126 + Math.sin(rad) * 58;
                return (
                  <text
                    key={val}
                    x={lx}
                    y={ly + 3}
                    textAnchor="middle"
                    className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
                  >
                    {val}
                  </text>
                );
              })}

              <circle
                cx={needleX}
                cy={needleY}
                r="4"
                className={
                  phase === 'upload'
                    ? 'fill-sky-400 stroke-white dark:stroke-slate-950'
                    : 'fill-emerald-400 stroke-white dark:stroke-slate-950'
                }
                strokeWidth="1.5"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pt-5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {phase === 'idle'
                  ? 'Ready'
                  : phase === 'ping'
                    ? 'Measuring Ping'
                    : phase === 'download'
                      ? 'Download'
                      : phase === 'upload'
                        ? 'Upload'
                        : 'Result'}
              </span>
              <span className="font-mono text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                {liveMbps.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Mbps</span>
            </div>
          </div>
        </div>

        {/* Clean 3-Metric Readout */}
        <div className="lg:col-span-6 space-y-6 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800/90 pt-6 lg:pt-0 lg:pl-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ArrowDown className="w-4 h-4 text-emerald-500" />
              Download Speed
            </div>
            <div className="font-mono text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {downloadMbps !== null ? `${downloadMbps.toFixed(1)} Mbps` : '—'}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ArrowUp className="w-4 h-4 text-sky-500" />
              Upload Speed
            </div>
            <div className="font-mono text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {uploadMbps !== null ? `${uploadMbps.toFixed(1)} Mbps` : '—'}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Gauge className="w-4 h-4 text-slate-400" />
              Ping Latency
            </div>
            <div className="font-mono text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {pingMs !== null ? `${pingMs} ms` : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
