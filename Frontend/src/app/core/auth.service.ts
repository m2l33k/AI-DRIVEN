import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CurrentUser, LoginResponse } from './models';

const API = '/api/auth';
const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

/** Maps a realm role to its console home route. Order = precedence when a user has several. */
const ROLE_HOME: Array<[string, string]> = [
  ['PLATFORM_ADMIN', '/admin'],
  ['NETWORK_OPERATOR', '/operator'],
  ['SECURITY_ANALYST', '/security'],
  ['AUDITOR', '/audit'],
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  /** Reset token handed to the first-login page after a PASSWORD_CHANGE_REQUIRED login. */
  readonly firstLoginToken = signal<string | null>(null);

  readonly user = signal<CurrentUser | null>(this.decode(this.token()));
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly roles = computed(() => this.user()?.roles ?? []);

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  /** Route the current user should land on based on their highest-precedence role. */
  homeRoute(): string {
    const roles = this.roles();
    for (const [role, route] of ROLE_HOME) {
      if (roles.includes(role)) return route;
    }
    return '/login';
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API}/login`, { email: username, password }).pipe(
      tap((res) => {
        if (res.status === 'SUCCESS' && res.accessToken) {
          this.storeSession(res.accessToken, res.refreshToken);
        } else if (res.status === 'PASSWORD_CHANGE_REQUIRED') {
          this.firstLoginToken.set(res.firstLoginToken ?? null);
        }
      }),
    );
  }

  firstLoginChangePassword(firstLoginToken: string, newPassword: string): Observable<unknown> {
    return this.http.post(`${API}/first-login/change-password`, { firstLoginToken, newPassword });
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.http.post(`${API}/forgot-password`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<{ resetToken: string }> {
    return this.http.post<{ resetToken: string }>(`${API}/verify-otp`, { email, otp });
  }

  resetPassword(resetToken: string, newPassword: string): Observable<unknown> {
    return this.http.post(`${API}/reset-password`, { resetToken, newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http.put(`${API}/password`, { currentPassword, newPassword });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.user.set(null);
  }

  private storeSession(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    this.user.set(this.decode(accessToken));
  }

  /** Decode the JWT payload into the current user (roles from realm_access). No verification — the API enforces that. */
  private decode(token: string | null): CurrentUser | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      );
      if (payload.exp && Date.now() >= payload.exp * 1000) return null;
      return {
        username: payload.preferred_username ?? '',
        name: payload.name ?? payload.preferred_username ?? '',
        email: payload.email ?? '',
        roles: payload.realm_access?.roles?.map((r: string) => r.toUpperCase()) ?? [],
      };
    } catch {
      return null;
    }
  }
}
