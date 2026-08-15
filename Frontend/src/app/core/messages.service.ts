import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = '/api/messages';

export interface Conversation {
  peer: string;
  lastMessage: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
}

export interface Message {
  id: number;
  sender: string;
  recipient: string;
  content: string;
  sentAt: string;
  read: boolean;
  mine: boolean;
}

export interface DirectoryUser {
  username: string;
  name: string;
}

/** Client for the messaging-service (/api/messages). Exposes a live `unread` count for the nav badge. */
@Injectable({ providedIn: 'root' })
export class MessagesService {
  private http = inject(HttpClient);

  /** Total unread messages for the current user — polled by the shell for the "Messages" badge. */
  readonly unread = signal(0);

  /** Username + display-name directory of all users (any authenticated user may read it). */
  directory(): Observable<DirectoryUser[]> {
    return this.http.get<DirectoryUser[]>('/api/users/directory');
  }

  conversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${API}/conversations`);
  }

  thread(peer: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${API}/conversation/${encodeURIComponent(peer)}`);
  }

  send(recipient: string, content: string): Observable<Message> {
    return this.http.post<Message>(API, { recipient, content });
  }

  markRead(peer: string): Observable<{ marked: number }> {
    return this.http.post<{ marked: number }>(`${API}/conversation/${encodeURIComponent(peer)}/read`, {});
  }

  /** Fetch the unread total and update the signal (best-effort; ignores errors). */
  refreshUnread(): void {
    this.http.get<{ unread: number }>(`${API}/unread-count`).subscribe({
      next: (r) => this.unread.set(r.unread ?? 0),
      error: () => { /* keep last known value */ },
    });
  }
}
