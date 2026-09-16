import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, startWith, catchError, of, shareReplay } from 'rxjs';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AnomalyEvent {
  id: string;
  type: string;
  severity: Severity;
  targetNf: string;
  metric: string;
  observedRate: number;
  threshold: number;
  zScore: number;
  message: string;
  timestamp: string;
}

const BASE = '/api/anomaly';

@Injectable({ providedIn: 'root' })
export class AnomalyService {
  private http = inject(HttpClient);

  /** Polls every 5 s — Bearer token added automatically via authInterceptor. */
  readonly events$: Observable<AnomalyEvent[]> = interval(5000).pipe(
    startWith(0),
    switchMap(() =>
      this.http.get<AnomalyEvent[]>(`${BASE}/events`).pipe(catchError(() => of([])))
    ),
    shareReplay(1),
  );

  inject(event: Partial<AnomalyEvent>): Observable<AnomalyEvent> {
    return this.http.post<AnomalyEvent>(`${BASE}/inject`, event);
  }

  clearAll(): Observable<void> {
    return this.http.delete<void>(`${BASE}/events`);
  }
}
