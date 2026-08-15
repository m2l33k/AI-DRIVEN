import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface AppNotification {
  type: string;
  from: string;
  preview: string;
  at: string;
  read?: boolean;
}

/**
 * Live notifications over a native WebSocket (`/ws/notifications?token=…`, served by
 * messaging-service). Auto-reconnects with a short backoff; exposes `items` + an `unread` count for
 * the topbar bell. No STOMP/SockJS library — plain browser WebSocket.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private auth = inject(AuthService);
  private ws?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private active = false;

  readonly items = signal<AppNotification[]>([]);
  readonly unread = signal(0);

  /** Open the socket (idempotent). Call once the user is authenticated. */
  connect(): void {
    if (this.active) return;
    this.active = true;
    this.open();
  }

  disconnect(): void {
    this.active = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    try { this.ws?.close(); } catch { /* ignore */ }
    this.ws = undefined;
  }

  markAllRead(): void {
    this.unread.set(0);
    this.items.update((a) => a.map((n) => ({ ...n, read: true })));
  }

  private open(): void {
    const token = this.auth.token();
    if (!token || !this.active) return;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws/notifications?token=${encodeURIComponent(token)}`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onmessage = (ev) => {
      try {
        const n = JSON.parse(ev.data) as AppNotification;
        this.items.update((a) => [{ ...n, read: false }, ...a].slice(0, 30));
        this.unread.update((u) => u + 1);
      } catch { /* ignore malformed frames */ }
    };
    socket.onclose = () => {
      this.ws = undefined;
      if (this.active) this.scheduleReconnect();
    };
    socket.onerror = () => { try { socket.close(); } catch { /* ignore */ } };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => { if (this.active) this.open(); }, 5000);
  }
}
