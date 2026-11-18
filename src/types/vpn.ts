export type NavSection = 'overview' | 'locations' | 'speed' | 'upgrade' | 'settings';

export type PlanTier = 'free' | 'pro' | 'max';

export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  tagline: string;
  monthlyPriceUsd: number;
  yearlyMonthlyPriceUsd: number;
  deviceLimit: number;
  bandwidthLabel: string;
  serverAccessLabel: string;
  features: string[];
  highlighted?: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export type ServerRegion = 'Americas' | 'Europe' | 'Asia Pacific' | 'Middle East';

export type VpnProtocolId = 'wireguard' | 'openvpn-udp' | 'openvpn-tcp' | 'ikev2';

export interface VpnServer {
  id: string;
  country: string;
  city: string;
  code: string;
  region: ServerRegion;
  lat: number;
  lon: number;
  baseLatencyMs: number;
  loadPercent: number;
  virtualIp: string;
  ipv6Prefix: string;
  hostname: string;
  supportsStreaming: boolean;
  supportsP2P: boolean;
  supportsDoubleHop: boolean;
  tierCapacityGbps: number;
}

export interface OriginNode {
  city: string;
  country: string;
  code: string;
  lat: number;
  lon: number;
  ispIp: string;
}

export interface ProtocolOption {
  id: VpnProtocolId;
  name: string;
  cipher: string;
  port: string;
  speedRating: number;
  stealthRating: number;
  batteryRating: number;
  summary: string;
}

export interface DnsProvider {
  id: string;
  name: string;
  primaryIp: string;
  secondaryIp: string;
  dohEndpoint: string;
  description: string;
}

export interface ShieldLogEntry {
  id: string;
  timestamp: string;
  domain: string;
  category: 'Tracker' | 'Ad Network' | 'Telemetry' | 'Malware' | 'Custom Rule';
  action: 'Blocked' | 'Allowed';
  nodeCode: string;
}

export interface SplitTunnelRule {
  id: string;
  target: string;
  type: 'Domain' | 'Application';
  mode: 'Bypass VPN' | 'Force Tunnel';
  enabled: boolean;
}

export interface SpeedTestRun {
  id: string;
  timestamp: string;
  serverLabel: string;
  protocol: string;
  pingMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  tunnelActive: boolean;
}

export interface ThroughputSample {
  timeLabel: string;
  downloadMbps: number;
  uploadMbps: number;
}

export interface VpnPreferences {
  killSwitch: boolean;
  adTrackerShield: boolean;
  doubleHop: boolean;
  autoConnectUntrusted: boolean;
  protocol: VpnProtocolId;
  dnsId: string;
  customDnsIp: string;
  theme: 'dark' | 'light';
}
