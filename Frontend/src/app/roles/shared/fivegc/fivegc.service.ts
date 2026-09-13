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

@Injectable({ providedIn: 'root' })
export class FiveGcService {
  private http = inject(HttpClient);
  private base = '/api/5gc';

  nfStatus(): Observable<NfStatus[]> {
    return this.http.get<NfStatus[]>(`${this.base}/nf-status`).pipe(
      catchError(() => of([]))
    );
  }

  subscribers(): Observable<Subscriber[]> {
    return this.http.get<Subscriber[]>(`${this.base}/subscribers`).pipe(
      catchError(() => of([]))
    );
  }

  ueContexts(): Observable<UeContext[]> {
    return this.http.get<UeContext[]>(`${this.base}/ue-contexts`).pipe(
      catchError(() => of([]))
    );
  }
}
