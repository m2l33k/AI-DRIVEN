import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface NfStatus {
  type: string;
  instanceId: string;
  description: string;
  status: string;
  up: boolean;
}

export interface Subscriber {
  plmnID: string;
  ueId: string;
  gpsi?: string;
}

export interface UeContext {
  supi?: string;
  guti?: string;
  accessType?: string;
  [key: string]: unknown;
}

export interface ContainerInfo {
  name: string;
  containerId: string;
  image: string;
  state: string;
  status: string;
  running: boolean;
  created: string;
}

export interface ContainerLogs {
  containerName: string;
  logs: string;
  lines: number;
}

export interface Tenant {
  tenantId?: string;
  tenantName?: string;
  [key: string]: unknown;
}

export interface SubscriberProfile {
  profileName?: string;
  AccessAndMobilitySubscriptionData?: unknown;
  SessionManagementSubscriptionData?: unknown;
  SmfSelectionSubscriptionData?: unknown;
  SmPolicyData?: unknown;
  AmPolicyData?: unknown;
  FlowRules?: unknown[];
  QosFlows?: unknown[];
  ChargingDatas?: unknown[];
  [key: string]: unknown;
}

const BASE = '/api/5gc';

@Injectable({ providedIn: 'root' })
export class FiveGcService {
  private http = inject(HttpClient);

  // ── NF status ────────────────────────────────────────────────────────────────
  nfStatus(): Observable<NfStatus[]> {
    return this.http.get<NfStatus[]>(`${BASE}/nf-status`).pipe(catchError(() => of([])));
  }

  // ── subscribers ───────────────────────────────────────────────────────────────
  subscribers(): Observable<Subscriber[]> {
    return this.http.get<Subscriber[]>(`${BASE}/subscribers`).pipe(catchError(() => of([])));
  }

  createSubscriber(body: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${BASE}/subscribers`, body);
  }

  deleteSubscriber(imsi: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/subscribers/${encodeURIComponent(imsi)}`);
  }

  // ── UE contexts ──────────────────────────────────────────────────────────────
  ueContexts(): Observable<UeContext[]> {
    return this.http.get<UeContext[]>(`${BASE}/ue-contexts`).pipe(catchError(() => of([])));
  }

  // ── tenants ───────────────────────────────────────────────────────────────────
  tenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${BASE}/tenants`).pipe(catchError(() => of([])));
  }

  createTenant(tenantName: string): Observable<Tenant> {
    return this.http.post<Tenant>(`${BASE}/tenants`, { tenantName });
  }

  deleteTenant(tenantId: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/tenants/${encodeURIComponent(tenantId)}`);
  }

  // ── profiles ──────────────────────────────────────────────────────────────────
  profiles(): Observable<SubscriberProfile[]> {
    return this.http.get<SubscriberProfile[]>(`${BASE}/profiles`).pipe(catchError(() => of([])));
  }

  createProfile(name: string, body: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${BASE}/profiles/${encodeURIComponent(name)}`, body);
  }

  deleteProfile(name: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/profiles/${encodeURIComponent(name)}`);
  }

  // ── containers ────────────────────────────────────────────────────────────────
  containers(): Observable<ContainerInfo[]> {
    return this.http.get<ContainerInfo[]>(`${BASE}/containers`).pipe(catchError(() => of([])));
  }

  inspectContainer(name: string): Observable<ContainerInfo> {
    return this.http.get<ContainerInfo>(`${BASE}/containers/${name}`);
  }

  startContainer(name: string): Observable<void> {
    return this.http.post<void>(`${BASE}/containers/${name}/start`, null);
  }

  stopContainer(name: string): Observable<void> {
    return this.http.post<void>(`${BASE}/containers/${name}/stop`, null);
  }

  restartContainer(name: string): Observable<void> {
    return this.http.post<void>(`${BASE}/containers/${name}/restart`, null);
  }

  containerLogs(name: string, tail = 100): Observable<ContainerLogs> {
    return this.http.get<ContainerLogs>(`${BASE}/containers/${name}/logs?tail=${tail}`);
  }
}
