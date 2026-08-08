import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUserRequest, UserSummary } from './models';

const API = '/api/users';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);

  list(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(API);
  }

  create(req: CreateUserRequest): Observable<{ message: string; username: string; temporaryPassword?: string }> {
    return this.http.post<{ message: string; username: string; temporaryPassword?: string }>(API, req);
  }

  remove(username: string): Observable<unknown> {
    return this.http.delete(`${API}/${encodeURIComponent(username)}`);
  }

  resetPassword(username: string): Observable<{ message: string; temporaryPassword: string }> {
    return this.http.post<{ message: string; temporaryPassword: string }>(
      `${API}/${encodeURIComponent(username)}/reset-password`, {});
  }
}
