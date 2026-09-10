import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = '/api/roaming';

export type Direction = 'INBOUND' | 'OUTBOUND';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RoamingEvent {
  id: string; timestamp: string; direction: Direction; partnerPlmn: string; country: string;
  subscribers: number; signalingErrors: number; newDeviceRatio: number; impossibleTravel: boolean;
  dataVolumeGb: number; avgLatencyMs: number; throughputMbps: number; droppedSessionRatio: number;
  revenueEur: number; costEur: number; riskScore: number; riskLevel: RiskLevel;
}
export interface VolumePoint { label: string; subscribers: number; }
export interface RoamingSummary {
  totalEvents: number; totalSubscribers: number; inboundCount: number; outboundCount: number;
  byRiskLevel: Record<string, number>; highRiskCount: number; volumeSeries: VolumePoint[];
}
export interface PartnerSummary {
  partnerPlmn: string; country: string; events: number; subscribers: number;
  avgRiskScore: number; peakRiskLevel: RiskLevel; highRiskCount: number;
}
export interface LiveMonitor {
  windowMinutes: number; activeEvents: number; activeSubscribers: number; eventsPerMinute: number;
  avgRiskScore: number; highRiskCount: number; windowRevenueEur: number; recent: RoamingEvent[];
}
export interface Anomaly {
  id: string; timestamp: string; direction: Direction; partnerPlmn: string; country: string;
  riskScore: number; riskLevel: RiskLevel; anomalyScore: number; baselineDeviation: number;
  severity: string; reasons: string[];
}
export interface ForecastPoint { hour: string; subscribers: number; predicted: boolean; }
export interface Forecast {
  method: string; trendPerHour: number; history: ForecastPoint[]; forecast: ForecastPoint[];
}
export interface Experience {
  partnerPlmn: string; country: string; events: number; avgLatencyMs: number; throughputMbps: number;
  dropRatePct: number; experienceScore: number; rating: string;
}
export interface Qos {
  avgLatencyMs: number; throughputMbps: number; dropRatePct: number; qosScore: number;
  worstPartners: Experience[];
}
export interface Optimization {
  partnerPlmn: string; country: string; events: number; subscribers: number; revenueEur: number;
  costEur: number; marginEur: number; marginPct: number; avgRiskScore: number; experienceScore: number;
  action: string; recommendation: string;
}
export interface PartnerRevenue { partnerPlmn: string; country: string; revenueEur: number; marginEur: number; }
export interface Revenue {
  totalRevenueEur: number; totalCostEur: number; marginEur: number; marginPct: number;
  revenuePerSubscriberEur: number; inboundRevenueEur: number; outboundRevenueEur: number;
  topPartners: PartnerRevenue[];
}
export interface CsvAnalysis {
  fileName: string; rowsParsed: number; rowsSkipped: number; columns: string[];
  summary: RoamingSummary; anomalies: Anomaly[]; forecast: Forecast;
}
export interface SimulationResult {
  generated: number; windowMinutes: number; monitor: LiveMonitor; sample: RoamingEvent[];
}
export interface EventFilter { direction?: Direction | ''; partnerPlmn?: string; riskLevel?: RiskLevel | ''; }

// --- Performance Assurance Engine (§5.2) -----------------------------------
export type KpiWindow = 'FIVE_MIN' | 'HOUR' | 'DAY' | 'MONTH';
export interface KpiSet {
  partner: string; window: KpiWindow; windowStart: string; windowEnd: string;
  registrationSuccessRate: number; asr: number; ner: number; acdSeconds: number;
  sessionSetupSuccessRate: number; avgLatencyMs: number; latencyP50Ms: number;
  latencyP95Ms: number; latencyP99Ms: number; dropRatePct: number; throughputMbps: number;
  attachAttempts: number; voiceAttempts: number; sessionAttempts: number;
}
export interface KpiTimeseries { partner: string; window: KpiWindow; points: KpiSet[]; }
export interface Agreement {
  partnerOperatorId: string; partnerName: string; ir21Ref: string;
  regSuccessMinPct: number; asrMinPct: number; sessionSuccessMinPct: number;
  latencyP95MaxMs: number; dropRateMaxPct: number; throughputMinMbps: number;
  rollingPerformanceScore: number; consecutiveBreaches: number; tier: string;
}
export interface SlaEvaluation {
  partner: string; kpis: KpiSet; breaches: string[]; breached: boolean;
  consecutiveBreaches: number; alarm: boolean; rollingScore: number; tier: string;
}
export interface SyntheticTestResult {
  partner: string; transactionType: string; sessionType: string; success: boolean;
  latencyMs: number; executedAt: string; detail: string;
}

/** Typed client for every roaming-analysis endpoint (all require roaming-events:read). */
@Injectable({ providedIn: 'root' })
export class RoamingService {
  private http = inject(HttpClient);

  summary(): Observable<RoamingSummary> { return this.http.get<RoamingSummary>(`${API}/summary`); }
  partners(): Observable<PartnerSummary[]> { return this.http.get<PartnerSummary[]>(`${API}/partners`); }
  anomalies(): Observable<Anomaly[]> { return this.http.get<Anomaly[]>(`${API}/anomalies`); }
  experience(): Observable<Experience[]> { return this.http.get<Experience[]>(`${API}/experience`); }
  qos(): Observable<Qos> { return this.http.get<Qos>(`${API}/qos`); }
  optimization(): Observable<Optimization[]> { return this.http.get<Optimization[]>(`${API}/optimization`); }
  revenue(): Observable<Revenue> { return this.http.get<Revenue>(`${API}/revenue`); }

  live(windowMinutes = 60): Observable<LiveMonitor> {
    return this.http.get<LiveMonitor>(`${API}/live`, { params: new HttpParams().set('windowMinutes', windowMinutes) });
  }
  forecast(hoursAhead = 6): Observable<Forecast> {
    return this.http.get<Forecast>(`${API}/forecast`, { params: new HttpParams().set('hoursAhead', hoursAhead) });
  }

  events(filter: EventFilter = {}): Observable<RoamingEvent[]> {
    let params = new HttpParams();
    if (filter.direction) params = params.set('direction', filter.direction);
    if (filter.partnerPlmn) params = params.set('partnerPlmn', filter.partnerPlmn);
    if (filter.riskLevel) params = params.set('riskLevel', filter.riskLevel);
    return this.http.get<RoamingEvent[]>(`${API}/events`, { params });
  }
  event(id: string): Observable<RoamingEvent> {
    return this.http.get<RoamingEvent>(`${API}/events/${encodeURIComponent(id)}`);
  }

  uploadCsv(file: File, hoursAhead = 6): Observable<CsvAnalysis> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CsvAnalysis>(`${API}/upload`, form, { params: new HttpParams().set('hoursAhead', hoursAhead) });
  }
  simulate(count = 20, minutesSpread = 60, windowMinutes = 60): Observable<SimulationResult> {
    const params = new HttpParams().set('count', count).set('minutesSpread', minutesSpread).set('windowMinutes', windowMinutes);
    return this.http.post<SimulationResult>(`${API}/simulate`, null, { params });
  }

  // --- Performance Assurance Engine (§5.2) ---------------------------------
  kpis(window: KpiWindow = 'DAY', partner?: string): Observable<KpiSet> {
    let params = new HttpParams().set('window', window);
    if (partner) params = params.set('partner', partner);
    return this.http.get<KpiSet>(`${API}/kpis`, { params });
  }
  kpisTimeseries(window: KpiWindow = 'DAY', count = 12, partner?: string): Observable<KpiTimeseries> {
    let params = new HttpParams().set('window', window).set('count', count);
    if (partner) params = params.set('partner', partner);
    return this.http.get<KpiTimeseries>(`${API}/kpis/timeseries`, { params });
  }
  agreements(): Observable<Agreement[]> { return this.http.get<Agreement[]>(`${API}/agreements`); }
  sla(window: KpiWindow = 'DAY'): Observable<SlaEvaluation[]> {
    return this.http.get<SlaEvaluation[]>(`${API}/sla`, { params: new HttpParams().set('window', window) });
  }
  runTestCalls(): Observable<SyntheticTestResult[]> {
    return this.http.post<SyntheticTestResult[]>(`${API}/test-calls/run`, null);
  }
}
