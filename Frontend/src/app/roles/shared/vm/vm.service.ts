import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface MongoDbInfo   { name: string; sizeOnDisk?: number; }
export interface MongoColInfo  { name: string; count: number; }
export interface MongoQueryResult {
  documents: string[];
  total: number;
  skip: number;
  limit: number;
}

const BASE = '/api/vm/mongo';

@Injectable({ providedIn: 'root' })
export class VmService {
  private http = inject(HttpClient);

  listDbs(): Observable<MongoDbInfo[]> {
    return this.http.get<MongoDbInfo[]>(`${BASE}/dbs`);
  }

  listCollections(db: string): Observable<MongoColInfo[]> {
    return this.http.get<MongoColInfo[]>(`${BASE}/${db}/collections`).pipe(catchError(() => of([])));
  }

  browse(db: string, col: string, filter = '', limit = 20, skip = 0): Observable<MongoQueryResult> {
    let params = new HttpParams().set('limit', limit).set('skip', skip);
    if (filter.trim()) params = params.set('filter', filter.trim());
    return this.http.get<MongoQueryResult>(`${BASE}/${db}/${col}/documents`, { params });
  }

  runQuery(db: string, col: string, filter: unknown, limit = 20, skip = 0): Observable<MongoQueryResult> {
    return this.http.post<MongoQueryResult>(`${BASE}/${db}/${col}/query`, { filter, limit, skip });
  }

  insert(db: string, col: string, docJson: string): Observable<{ insertedId: string }> {
    return this.http.post<{ insertedId: string }>(`${BASE}/${db}/${col}`, docJson,
      { headers: { 'Content-Type': 'application/json' } });
  }

  delete(db: string, col: string, id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${db}/${col}/${encodeURIComponent(id)}`);
  }

  stats(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${BASE}/stats`).pipe(catchError(() => of({})));
  }
}
