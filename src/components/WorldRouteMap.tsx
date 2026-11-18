import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, Map as MapIcon, RotateCcw } from 'lucide-react';
import {
  generateWorldLandDots,
  GLOBAL_ORIGIN_PRESETS,
  MAP_HEIGHT,
  MAP_WIDTH,
  projectGeo,
  WORLD_CONTINENT_POLYGONS,
} from '../data/vpnData';
import { ConnectionStatus, OriginNode, VpnServer } from '../types/vpn';
import { CountryFlag } from './CountryFlag';

interface WorldRouteMapProps {
  originNode: OriginNode;
  isAutoOrigin?: boolean;
  servers: VpnServer[];
  selectedServer: VpnServer;
  status: ConnectionStatus;
  onSelectServer: (server: VpnServer) => void;
  onSelectOrigin?: (origin: OriginNode | 'auto') => void;
}

const DEG2RAD = Math.PI / 180;

function latLonToVec3(lat: number, lon: number): [number, number, number] {
  const phi = lat * DEG2RAD;
  const theta = lon * DEG2RAD;
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.sin(theta), Math.sin(phi), cosPhi * Math.cos(theta)];
}

function rotateVec3(
  v: [number, number, number],
  yawRad: number,
  pitchRad: number
): [number, number, number] {
  const [x, y, z] = v;
  const cy = Math.cos(yawRad);
  const sy = Math.sin(yawRad);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const y1 = y;

  const cp = Math.cos(pitchRad);
  const sp = Math.sin(pitchRad);
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  return [x1, y2, z2];
}

function slerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 0.001) return a;
  const sinOmega = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / sinOmega;
  const s1 = Math.sin(t * omega) / sinOmega;
  return [
    a[0] * s0 + b[0] * s1,
    a[1] * s0 + b[1] * s1,
    a[2] * s0 + b[2] * s1,
  ];
}

function subdividePolygon(coords: Array<[number, number]>, maxStep = 3.2): Array<[number, number, number]> {
  const result: Array<[number, number, number]> = [];
  for (let i = 0; i < coords.length; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[(i + 1) % coords.length];
    const dist = Math.hypot(lat2 - lat1, lon2 - lon1);
    const steps = Math.max(1, Math.ceil(dist / maxStep));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      result.push(latLonToVec3(lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t));
    }
  }
  return result;
}

function buildCurvePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  liftFactor = 0.24
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - Math.min(125, dist * liftFactor);
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

// Deterministic subtle starfield for deep-space backdrop behind the 3D Earth
const STARS = Array.from({ length: 72 }, (_, idx) => ({
  xFrac: ((idx * 73 + 19) % 997) / 997,
  yFrac: ((idx * 137 + 41) % 991) / 991,
  r: 0.6 + ((idx * 29) % 10) * 0.08,
  alpha: 0.15 + ((idx * 47) % 10) * 0.04,
}));

export const WorldRouteMap: React.FC<WorldRouteMapProps> = ({
  originNode,
  isAutoOrigin = true,
  servers,
  selectedServer,
  status,
  onSelectServer,
  onSelectOrigin,
}) => {
  const [viewMode, setViewMode] = useState<'globe' | 'flat'>('globe');
  const [hoveredServer, setHoveredServer] = useState<VpnServer | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rotRef = useRef({
    yaw: -((originNode.lon + selectedServer.lon) / 2) * DEG2RAD,
    pitch: 0.44,
    targetYaw: -((originNode.lon + selectedServer.lon) / 2) * DEG2RAD,
    targetPitch: 0.44,
    dragging: false,
    lastX: 0,
    lastY: 0,
    dragDistance: 0,
    autoFocus: true,
  });

  const landDots = useMemo(() => generateWorldLandDots(), []);
  const landVecs = useMemo(
    () => landDots.map((d) => latLonToVec3(d.lat, d.lon)),
    [landDots]
  );

  // Smoothly subdivided 3D continent polygons for solid filled 3D Earth rendering
  const continentMeshes3D = useMemo(
    () => WORLD_CONTINENT_POLYGONS.map((poly) => subdividePolygon(poly.coords, 3.0)),
    []
  );

  const flatContinentPaths = useMemo(() => {
    return WORLD_CONTINENT_POLYGONS.map((poly) => {
      const d = poly.coords
        .map(([lat, lon], idx) => {
          const { x, y } = projectGeo(lat, lon);
          return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
      return { name: poly.name, d: `${d} Z` };
    });
  }, []);

  useEffect(() => {
    const midLon = (originNode.lon + selectedServer.lon) / 2;
    const midLat = (originNode.lat + selectedServer.lat) / 2;
    const diffLon = Math.abs(originNode.lon - selectedServer.lon);
    const focusLon = diffLon > 180 ? selectedServer.lon : midLon;
    rotRef.current.targetYaw = -focusLon * DEG2RAD;
    rotRef.current.targetPitch = Math.max(-0.85, Math.min(0.95, midLat * DEG2RAD * 0.85));
    rotRef.current.autoFocus = true;
  }, [originNode.lat, originNode.lon, selectedServer.id, selectedServer.lat, selectedServer.lon]);

  useEffect(() => {
    if (viewMode !== 'globe') return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderFrame = (timeMs: number) => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(360, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark');
      const rot = rotRef.current;

      if (!rot.dragging) {
        if (rot.autoFocus) {
          rot.yaw += (rot.targetYaw - rot.yaw) * 0.08;
          rot.pitch += (rot.targetPitch - rot.pitch) * 0.08;
          if (
            Math.abs(rot.targetYaw - rot.yaw) < 0.002 &&
            Math.abs(rot.targetPitch - rot.pitch) < 0.002
          ) {
            rot.autoFocus = false;
          }
        } else if (!prefersReducedMotion && status !== 'connected') {
          rot.yaw += 0.00075;
        }
      }

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.44;

      // Subtle starfield in dark mode
      if (isDark) {
        for (const s of STARS) {
          ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
          ctx.beginPath();
          ctx.arc(s.xFrac * width, s.yFrac * height, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Outer atmospheric scattering bloom
      const haloGrad = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.32);
      if (isDark) {
        haloGrad.addColorStop(
          0,
          status === 'connected' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(14, 165, 233, 0.22)'
        );
        haloGrad.addColorStop(0.55, 'rgba(14, 165, 233, 0.06)');
        haloGrad.addColorStop(1, 'rgba(6, 10, 20, 0)');
      } else {
        haloGrad.addColorStop(0, 'rgba(14, 165, 233, 0.16)');
        haloGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
      }
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.32, 0, Math.PI * 2);
      ctx.fill();

      // Tilted orbital satellite trajectory ring
      ctx.save();
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(51, 65, 85, 0.16)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * 1.17, radius * 0.34, -0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Ocean Sphere Gradient
      const oceanGrad = ctx.createRadialGradient(
        cx - radius * 0.36,
        cy - radius * 0.34,
        radius * 0.06,
        cx,
        cy,
        radius
      );
      if (isDark) {
        oceanGrad.addColorStop(0, '#1B3A66');
        oceanGrad.addColorStop(0.52, '#0B1B36');
        oceanGrad.addColorStop(1, '#040A17');
      } else {
        oceanGrad.addColorStop(0, '#FFFFFF');
        oceanGrad.addColorStop(0.65, '#DCE8F5');
        oceanGrad.addColorStop(1, '#B8CDE3');
      }
      ctx.fillStyle = oceanGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Clip interior elements cleanly to the Earth sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Graticule meridians
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.09)' : 'rgba(51, 65, 85, 0.09)';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 6) {
          const v = rotateVec3(latLonToVec3(lat, lon), rot.yaw, rot.pitch);
          if (v[2] > 0) {
            const sx = cx + v[0] * radius;
            const sy = cy - v[1] * radius;
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -84; lat <= 84; lat += 6) {
          const v = rotateVec3(latLonToVec3(lat, lon), rot.yaw, rot.pitch);
          if (v[2] > 0) {
            const sx = cx + v[0] * radius;
            const sy = cy - v[1] * radius;
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Solid shaded 3D continents with luminous coastlines
      const landGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      if (isDark) {
        landGrad.addColorStop(0, '#1E3A5F');
        landGrad.addColorStop(0.55, '#173152');
        landGrad.addColorStop(1, '#10243E');
      } else {
        landGrad.addColorStop(0, '#8FA8C2');
        landGrad.addColorStop(1, '#6E8AA8');
      }

      for (const mesh of continentMeshes3D) {
        let anyFront = false;
        const projected: Array<[number, number]> = [];
        for (const vec of mesh) {
          const v = rotateVec3(vec, rot.yaw, rot.pitch);
          if (v[2] >= 0) {
            anyFront = true;
            projected.push([cx + v[0] * radius, cy - v[1] * radius]);
          } else {
            const len = Math.hypot(v[0], v[1]) || 1;
            projected.push([cx + (v[0] / len) * radius, cy - (v[1] / len) * radius]);
          }
        }
        if (!anyFront) continue;

        ctx.beginPath();
        for (let i = 0; i < projected.length; i++) {
          if (i === 0) ctx.moveTo(projected[i][0], projected[i][1]);
          else ctx.lineTo(projected[i][0], projected[i][1]);
        }
        ctx.closePath();
        ctx.fillStyle = landGrad;
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // Subtle topographic surface dots on front-facing land
      for (let i = 0; i < landVecs.length; i += 2) {
        const v = rotateVec3(landVecs[i], rot.yaw, rot.pitch);
        if (v[2] > 0.12) {
          const sx = cx + v[0] * radius;
          const sy = cy - v[1] * radius;
          ctx.fillStyle = isDark
            ? `rgba(125, 211, 252, ${(0.18 + 0.25 * v[2]).toFixed(2)})`
            : `rgba(255, 255, 255, ${(0.25 + 0.25 * v[2]).toFixed(2)})`;
          ctx.fillRect(sx - 0.7, sy - 0.7, 1.4, 1.4);
        }
      }

      // Inner Fresnel shadow & atmospheric rim inside sphere
      const rimGrad = ctx.createRadialGradient(
        cx - radius * 0.28,
        cy - radius * 0.28,
        radius * 0.55,
        cx,
        cy,
        radius
      );
      rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
      rimGrad.addColorStop(0.84, isDark ? 'rgba(14, 165, 233, 0.08)' : 'rgba(15, 23, 42, 0.05)');
      rimGrad.addColorStop(
        1,
        status === 'connected'
          ? 'rgba(16, 185, 129, 0.42)'
          : isDark
            ? 'rgba(56, 189, 248, 0.36)'
            : 'rgba(15, 23, 42, 0.22)'
      );
      ctx.fillStyle = rimGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      ctx.restore(); // End sphere clip

      // Crisp Globe Outer Rim
      ctx.strokeStyle =
        status === 'connected'
          ? 'rgba(16, 185, 129, 0.5)'
          : isDark
            ? 'rgba(56, 189, 248, 0.38)'
            : 'rgba(100, 116, 139, 0.42)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 3D Elevated Spherical Tunnel Arc (drawn outside clip so it arches cleanly over the Earth!)
      const va = latLonToVec3(originNode.lat, originNode.lon);
      const vb = latLonToVec3(selectedServer.lat, selectedServer.lon);
      const steps = 64;
      const pts: Array<{ x: number; y: number; z: number }> = [];
      const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
      const angle = Math.acos(dot);
      const lift = Math.min(0.32, 0.1 + angle * 0.13);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = slerpVec3(va, vb, t);
        const alt = 1 + Math.sin(Math.PI * t) * lift;
        const r = rotateVec3([p[0] * alt, p[1] * alt, p[2] * alt], rot.yaw, rot.pitch);
        pts.push({ x: cx + r[0] * radius, y: cy - r[1] * radius, z: r[2] });
      }

      ctx.save();
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].z > -0.15) {
          if (!started) {
            ctx.moveTo(pts[i].x, pts[i].y);
            started = true;
          } else {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
        } else {
          started = false;
        }
      }
      ctx.strokeStyle =
        status === 'connected'
          ? 'rgba(16, 185, 129, 0.38)'
          : status === 'connecting'
            ? 'rgba(245, 158, 11, 0.36)'
            : 'rgba(56, 189, 248, 0.24)';
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.strokeStyle =
        status === 'connected'
          ? '#10B981'
          : status === 'connecting'
            ? '#F59E0B'
            : '#38BDF8';
      ctx.lineWidth = status === 'connected' ? 2.6 : 1.75;
      if (status === 'disconnected') ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.restore();

      if ((status === 'connected' || status === 'connecting') && !prefersReducedMotion) {
        const speed = status === 'connected' ? 0.00058 : 0.00088;
        const phase = (timeMs * speed) % 1;
        for (let k = 0; k < 3; k++) {
          const pT = (phase + k * 0.333) % 1;
          const idx = Math.min(pts.length - 1, Math.floor(pT * (pts.length - 1)));
          const pt = pts[idx];
          if (pt && pt.z > -0.1) {
            ctx.fillStyle = status === 'connected' ? '#A7F3D0' : '#FDE68A';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Origin Marker
      const origV = rotateVec3(latLonToVec3(originNode.lat, originNode.lon), rot.yaw, rot.pitch);
      if (origV[2] > 0) {
        const ox = cx + origV[0] * radius;
        const oy = cy - origV[1] * radius;
        ctx.fillStyle = 'rgba(14, 165, 233, 0.28)';
        ctx.beginPath();
        ctx.arc(ox, oy, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0EA5E9';
        ctx.strokeStyle = isDark ? '#040A17' : '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 11px "DM Sans", sans-serif';
        ctx.fillStyle = isDark ? '#BAE6FD' : '#0369A1';
        ctx.fillText(originNode.city, ox + 10, oy + 4);
      }

      // Server Nodes
      servers.forEach((srv) => {
        const sv = rotateVec3(latLonToVec3(srv.lat, srv.lon), rot.yaw, rot.pitch);
        if (sv[2] <= 0.02) return;

        const sx = cx + sv[0] * radius;
        const sy = cy - sv[1] * radius;
        const isSel = srv.id === selectedServer.id;
        const isHov = hoveredServer?.id === srv.id;

        if (isSel || isHov) {
          ctx.fillStyle =
            isSel && status === 'connected'
              ? 'rgba(16, 185, 129, 0.32)'
              : isSel && status === 'connecting'
                ? 'rgba(245, 158, 11, 0.30)'
                : 'rgba(56, 189, 248, 0.28)';
          ctx.beginPath();
          ctx.arc(sx, sy, isSel ? 14 : 10, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = isSel
          ? status === 'connected'
            ? '#10B981'
            : status === 'connecting'
              ? '#F59E0B'
              : '#38BDF8'
          : isHov
            ? '#FFFFFF'
            : isDark
              ? '#E2E8F0'
              : '#1E293B';

        ctx.strokeStyle = isDark ? '#040A17' : '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, isSel || isHov ? 5.2 : 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isSel || isHov) {
          ctx.font = '600 11px "DM Sans", sans-serif';
          ctx.fillStyle = isDark ? '#FFFFFF' : '#0F172A';
          ctx.fillText(srv.city, sx + 10, sy - 6);
        }
      });

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [viewMode, landVecs, continentMeshes3D, originNode, servers, selectedServer, status, hoveredServer]);

  const findServerAtPointer = (clientX: number, clientY: number): VpnServer | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.44;
    const rot = rotRef.current;

    let closest: VpnServer | null = null;
    let bestDist = 18;
    for (const srv of servers) {
      const sv = rotateVec3(latLonToVec3(srv.lat, srv.lon), rot.yaw, rot.pitch);
      if (sv[2] <= 0.02) continue;
      const sx = cx + sv[0] * radius;
      const sy = cy - sv[1] * radius;
      const d = Math.hypot(px - sx, py - sy);
      if (d < bestDist) {
        bestDist = d;
        closest = srv;
      }
    }
    return closest;
  };

  const flatLandPoints = useMemo(() => landDots.map((d) => projectGeo(d.lat, d.lon)), [landDots]);
  const originPos = useMemo(
    () => projectGeo(originNode.lat, originNode.lon),
    [originNode.lat, originNode.lon]
  );
  const exitPos = useMemo(
    () => projectGeo(selectedServer.lat, selectedServer.lon),
    [selectedServer.lat, selectedServer.lon]
  );
  const tunnelArc = useMemo(() => buildCurvePath(originPos, exitPos, 0.25), [originPos, exitPos]);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="flex flex-col min-w-0 h-full">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90">
        <div className="flex flex-wrap items-center gap-2 min-w-0 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100">
          {onSelectOrigin ? (
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <CountryFlag code={originNode.code} className="w-4 h-3" />
              <select
                aria-label="Starting region"
                value={isAutoOrigin ? '__auto__' : originNode.city}
                onChange={(e) => {
                  if (e.target.value === '__auto__') {
                    onSelectOrigin('auto');
                  } else {
                    const match = GLOBAL_ORIGIN_PRESETS.find((p) => p.city === e.target.value);
                    if (match) onSelectOrigin(match);
                  }
                }}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="__auto__">Auto ({originNode.city})</option>
                {GLOBAL_ORIGIN_PRESETS.map((preset) => (
                  <option key={`${preset.code}-${preset.city}`} value={preset.city}>
                    {preset.city}, {preset.code}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="truncate">{originNode.city}</span>
          )}
          <span className="text-slate-400" aria-hidden="true">→</span>
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <CountryFlag code={selectedServer.code} className="w-5 h-3.5" />
            <span className="truncate">
              {selectedServer.city}, {selectedServer.country}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('globe')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'globe'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            3D Globe
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flat')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'flat'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            World Map
          </button>
        </div>
      </div>

      {/* Immersive Earth Stage */}
      <div className="relative flex-1 bg-gradient-to-b from-sky-50 via-slate-100 to-slate-200/70 dark:from-[#040914] dark:via-[#060E1F] dark:to-[#081327] overflow-hidden select-none">
        {viewMode === 'globe' ? (
          <div
            ref={containerRef}
            className="relative w-full h-[420px] sm:h-[470px] lg:h-[510px] cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              rotRef.current.dragging = true;
              rotRef.current.autoFocus = false;
              rotRef.current.lastX = e.clientX;
              rotRef.current.lastY = e.clientY;
              rotRef.current.dragDistance = 0;
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (rotRef.current.dragging) {
                const dx = e.clientX - rotRef.current.lastX;
                const dy = e.clientY - rotRef.current.lastY;
                rotRef.current.dragDistance += Math.hypot(dx, dy);
                rotRef.current.yaw += dx * 0.0055;
                rotRef.current.pitch = Math.max(
                  -1.2,
                  Math.min(1.2, rotRef.current.pitch + dy * 0.0055)
                );
                rotRef.current.lastX = e.clientX;
                rotRef.current.lastY = e.clientY;
              } else {
                setHoveredServer(findServerAtPointer(e.clientX, e.clientY));
              }
            }}
            onPointerUp={(e) => {
              const wasClick = rotRef.current.dragDistance < 6;
              rotRef.current.dragging = false;
              if (wasClick) {
                const hit = findServerAtPointer(e.clientX, e.clientY);
                if (hit) onSelectServer(hit);
              }
            }}
            onPointerLeave={() => {
              rotRef.current.dragging = false;
              setHoveredServer(null);
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              aria-label="Interactive 3D VPN Routing Globe"
            />

            <button
              type="button"
              onClick={() => {
                const midLon = (originNode.lon + selectedServer.lon) / 2;
                const midLat = (originNode.lat + selectedServer.lat) / 2;
                const diffLon = Math.abs(originNode.lon - selectedServer.lon);
                const focusLon = diffLon > 180 ? selectedServer.lon : midLon;
                rotRef.current.targetYaw = -focusLon * DEG2RAD;
                rotRef.current.targetPitch = Math.max(-0.85, Math.min(0.95, midLat * DEG2RAD * 0.85));
                rotRef.current.autoFocus = true;
              }}
              aria-label="Re-center globe on active route"
              className="absolute right-4 top-4 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer backdrop-blur-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Center
            </button>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="w-full h-[420px] sm:h-[470px] lg:h-[510px] block"
            role="img"
            aria-label="Interactive illuminated vector world VPN map"
          >
            <defs>
              <radialGradient id="oceanBloom" cx="50%" cy="46%" r="60%">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#040914" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="tunnelGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="tunnelGradIdle" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.45" />
              </linearGradient>
            </defs>

            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#oceanBloom)" />

            {[166.7, 333.3, 500, 666.7, 833.3].map((x) => (
              <line
                key={`gx-${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={MAP_HEIGHT}
                className="stroke-slate-300/60 dark:stroke-slate-800/65"
                strokeWidth="0.75"
              />
            ))}
            {[83.3, 166.7, 250, 333.3, 416.7].map((y) => (
              <line
                key={`gy-${y}`}
                x1={0}
                y1={y}
                x2={MAP_WIDTH}
                y2={y}
                className="stroke-slate-300/60 dark:stroke-slate-800/65"
                strokeWidth="0.75"
                strokeDasharray={y === 250 ? '4 4' : undefined}
              />
            ))}

            <g>
              {flatContinentPaths.map((continent) => (
                <path
                  key={continent.name}
                  d={continent.d}
                  className="fill-slate-300/80 stroke-white/80 dark:fill-[#162C4D] dark:stroke-[#2E5485]"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              ))}
            </g>

            <g opacity="0.55">
              {flatLandPoints
                .filter((_, idx) => idx % 2 === 0)
                .map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="0.95"
                    className="fill-slate-500/45 dark:fill-sky-400/50"
                  />
                ))}
            </g>

            <g>
              <path
                d={tunnelArc}
                fill="none"
                stroke={isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#38BDF8'}
                strokeOpacity={isConnected ? 0.25 : 0.16}
                strokeWidth={isConnected ? 7 : 4}
                strokeLinecap="round"
              />
              <path
                d={tunnelArc}
                fill="none"
                stroke={
                  isConnected
                    ? 'url(#tunnelGradActive)'
                    : isConnecting
                      ? '#F59E0B'
                      : 'url(#tunnelGradIdle)'
                }
                strokeWidth={isConnected ? 2.6 : 1.75}
                strokeDasharray={isConnected ? undefined : '5 5'}
                strokeLinecap="round"
              />
              {(isConnected || isConnecting) && (
                <path
                  d={tunnelArc}
                  fill="none"
                  stroke={isConnected ? '#A7F3D0' : '#FDE68A'}
                  strokeWidth="2.4"
                  strokeDasharray="6 18"
                  strokeLinecap="round"
                  className="animate-tunnel-flow"
                />
              )}
            </g>

            <g transform={`translate(${originPos.x}, ${originPos.y})`}>
              <circle r="11" className="fill-sky-500/20 stroke-sky-400/60" strokeWidth="1" />
              <circle
                r="4.2"
                className="fill-sky-500 stroke-white dark:stroke-slate-950"
                strokeWidth="1.6"
              />
              <text
                x="12"
                y="4"
                className="fill-slate-800 dark:fill-sky-200 text-[10.5px] font-semibold"
              >
                {originNode.city}
              </text>
            </g>

            {servers.map((server) => {
              const pos = projectGeo(server.lat, server.lon);
              const isSelected = server.id === selectedServer.id;
              const isHovered = hoveredServer?.id === server.id;

              return (
                <g
                  key={server.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectServer(server)}
                  onMouseEnter={() => setHoveredServer(server)}
                  onMouseLeave={() => setHoveredServer(null)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${server.city}, ${server.country}`}
                >
                  <circle r="15" fill="transparent" />
                  {(isSelected || isHovered) && (
                    <circle
                      r={isSelected ? '13' : '10'}
                      className={
                        isSelected && isConnected
                          ? 'fill-emerald-500/25 stroke-emerald-400/70'
                          : isSelected && isConnecting
                            ? 'fill-amber-500/25 stroke-amber-400/70'
                            : 'fill-sky-500/22 stroke-sky-400/70'
                      }
                      strokeWidth="1.3"
                    />
                  )}
                  <circle
                    r={isSelected || isHovered ? '5.2' : '3.8'}
                    className={
                      isSelected
                        ? isConnected
                          ? 'fill-emerald-400 stroke-white dark:stroke-slate-950'
                          : isConnecting
                            ? 'fill-amber-400 stroke-white dark:stroke-slate-950'
                            : 'fill-sky-400 stroke-white dark:stroke-slate-950'
                        : 'fill-slate-700 dark:fill-slate-200 stroke-white dark:stroke-slate-950'
                    }
                    strokeWidth="1.5"
                  />
                  {(isSelected || isHovered) && (
                    <text
                      x="11"
                      y="-7"
                      className="fill-slate-900 dark:fill-white text-[11px] font-semibold"
                    >
                      {server.city}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Interactive Node Hover Card */}
        {hoveredServer && (
          <div className="pointer-events-none absolute left-4 bottom-4 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3.5 py-2.5 text-xs shadow-md backdrop-blur-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <CountryFlag code={hoveredServer.code} className="w-5 h-3.5" />
              <span>
                {hoveredServer.city}, {hoveredServer.country}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-1">
              <span>{hoveredServer.baseLatencyMs} ms</span>
              <span aria-hidden="true">·</span>
              <span>Click to switch</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
