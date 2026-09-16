import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, interval, switchMap, startWith, catchError, of, shareReplay } from 'rxjs';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  outcome: 'Allowed' | 'Denied' | 'Error';
  ip: string;
  details: string;
}

export interface AuditStats {
  total: number;
  writeActions: number;
  deniedActions: number;
  activeActors: number;
  perDay: number[];
  dayLabels: string[];
  allowed: number;
  errored: number;
  topActors: { actor: string; role: string; reads: number; writes: number; denied: number }[];
}

const BASE = '/api/audit';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);

  /** Stats polling every 30s */
  readonly stats$: Observable<AuditStats | null> = interval(30_000).pipe(
    startWith(0),
    switchMap(() =>
      this.http.get<AuditStats>(`${BASE}/stats`).pipe(catchError(() => of(null)))
    ),
    shareReplay(1),
  );

  logs(q = '', outcome = '', actor = '', limit = 200): Observable<AuditEntry[]> {
    let params = new HttpParams()
      .set('q', q)
      .set('outcome', outcome)
      .set('actor', actor)
      .set('limit', limit);
    return this.http.get<AuditEntry[]>(`${BASE}/logs`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  append(entry: Partial<AuditEntry>): Observable<AuditEntry> {
    return this.http.post<AuditEntry>(`${BASE}/logs`, entry);
  }
}
