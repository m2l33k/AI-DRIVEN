import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription, interval, startWith } from 'rxjs';
import { PageHeader } from '../shared/ui/page-header';
import { AuthService } from '../core/auth.service';
import { MessagesService, Conversation, Message, DirectoryUser } from '../core/messages.service';

const POLL_MS = 8000;

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeader],
  template: `
    <hw-page-header title="Messages" subtitle="Direct messages between platform users">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    @if (error()) { <div class="hw-card banner-err">{{ error() }}</div> }

    <div class="hw-card chat">
      <!-- Conversations -->
      <aside class="list">
        <div class="new">
          <div class="search">
            <svg class="si" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
            <input [value]="search()" (input)="search.set($any($event.target).value)"
                   (focus)="searchOpen.set(true)" (blur)="closeSearchSoon()"
                   (keyup.enter)="pickFirst()" placeholder="Search a user to message…" autocomplete="off" />
            @if (searchOpen() && matches().length) {
              <div class="dropdown">
                @for (u of matches(); track u.username) {
                  <button class="opt" type="button" (mousedown)="pick(u.username)">
                    <span class="avatar sm">{{ initial(u.username) }}</span>
                    <span class="ou"><strong>{{ u.name }}</strong><small>{{ u.username }}</small></span>
                  </button>
                }
              </div>
            }
          </div>
        </div>
        <div class="convos">
          @for (c of conversations(); track c.peer) {
            <button class="convo" [class.active]="selectedPeer() === c.peer" (click)="open(c.peer)">
              <span class="avatar">{{ initial(c.peer) }}</span>
              <span class="meta">
                <span class="top"><span class="peer">{{ c.peer }}</span><span class="time">{{ c.lastAt | date:'MMM d, HH:mm' }}</span></span>
                <span class="preview">{{ c.lastFromMe ? 'You: ' : '' }}{{ c.lastMessage }}</span>
              </span>
              @if (c.unread > 0) { <span class="badge">{{ c.unread }}</span> }
            </button>
          } @empty { <p class="empty">No conversations yet. Message a user above to start one.</p> }
        </div>
      </aside>

      <!-- Thread -->
      <section class="thread">
        @if (selectedPeer(); as peer) {
          <div class="thread-head"><span class="avatar sm">{{ initial(peer) }}</span><strong>{{ peer }}</strong></div>
          <div class="bubbles" #scroll>
            @for (m of thread(); track m.id) {
              <div class="row" [class.me]="m.mine">
                <div class="bubble" [class.mine]="m.mine">
                  <span class="text">{{ m.content }}</span>
                  <span class="at">{{ m.sentAt | date:'HH:mm' }}</span>
                </div>
              </div>
            } @empty { <p class="empty">No messages yet — say hello 👋</p> }
          </div>
          <form class="compose" (ngSubmit)="send()">
            <input [(ngModel)]="draft" name="draft" placeholder="Type a message…" autocomplete="off" />
            <button class="hw-btn hw-btn--primary" type="submit" [disabled]="!draft.trim() || sending()">Send</button>
          </form>
        } @else {
          <div class="pick"><p>Select a conversation, or message a new user to begin.</p></div>
        }
      </section>
    </div>
  `,
  styles: [`
    .banner-err { padding: 12px 16px; margin-bottom: 16px; background: rgba(245,63,63,.1); color: var(--hw-danger); font-size: 13px; }
    .chat { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 220px); min-height: 420px; overflow: hidden; padding: 0; }
    .list { border-right: 1px solid var(--hw-border); display: flex; flex-direction: column; min-width: 0; }
    .new { padding: 14px; border-bottom: 1px solid var(--hw-border); }
    .search { position: relative; }
    .search .si { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; fill: none; stroke: var(--hw-text-3); stroke-width: 2; stroke-linecap: round; pointer-events: none; }
    .search input { width: 100%; box-sizing: border-box; padding: 9px 10px 9px 32px; border: 1px solid var(--hw-border); border-radius: 8px; font-size: 13px; }
    .search input:focus { border-color: var(--hw-info); outline: none; }
    .dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20; background: #fff; border: 1px solid var(--hw-border); border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.12); overflow: hidden; max-height: 320px; overflow-y: auto; }
    .opt { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 0; background: transparent; cursor: pointer; text-align: left; }
    .opt:hover { background: var(--hw-bg); }
    .ou { display: flex; flex-direction: column; min-width: 0; }
    .ou strong { font-size: 13px; color: var(--hw-text); }
    .ou small { font-size: 11px; color: var(--hw-text-3); font-family: monospace; }
    .convos { overflow-y: auto; flex: 1; }
    .convo { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 0; background: transparent; border-bottom: 1px solid var(--hw-border); cursor: pointer; text-align: left; }
    .convo:hover { background: var(--hw-bg); }
    .convo.active { background: rgba(52,145,250,.08); }
    .avatar { width: 38px; height: 38px; border-radius: 50%; flex: none; display: grid; place-items: center; font-weight: 700; font-size: 14px; color: #fff; background: linear-gradient(135deg, #3491fa, #722ed1); }
    .avatar.sm { width: 30px; height: 30px; font-size: 12px; }
    .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .top { display: flex; justify-content: space-between; gap: 8px; }
    .peer { font-weight: 600; font-size: 13px; color: var(--hw-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .time { font-size: 11px; color: var(--hw-text-3); white-space: nowrap; }
    .preview { font-size: 12px; color: var(--hw-text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .badge { background: var(--hw-danger); color: #fff; font-size: 11px; font-weight: 700; min-width: 18px; text-align: center; padding: 1px 6px; border-radius: 10px; flex: none; }
    .empty { padding: 22px 16px; color: var(--hw-text-3); font-size: 13px; text-align: center; }
    .thread { display: flex; flex-direction: column; min-width: 0; }
    .thread-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--hw-border); font-size: 14px; }
    .bubbles { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; background: var(--hw-bg); }
    .row { display: flex; }
    .row.me { justify-content: flex-end; }
    .bubble { max-width: 68%; padding: 9px 13px; border-radius: 14px; background: #fff; border: 1px solid var(--hw-border); font-size: 13px; color: var(--hw-text-2); display: flex; flex-direction: column; gap: 3px; }
    .bubble.mine { background: var(--hw-info); border-color: var(--hw-info); color: #fff; }
    .bubble .at { font-size: 10px; opacity: .7; align-self: flex-end; }
    .compose { display: flex; gap: 10px; padding: 14px 16px; border-top: 1px solid var(--hw-border); }
    .compose input { flex: 1; padding: 10px 12px; border: 1px solid var(--hw-border); border-radius: 10px; font-size: 13px; }
    .pick { flex: 1; display: grid; place-items: center; color: var(--hw-text-3); font-size: 13px; }
    @media (max-width: 800px) { .chat { grid-template-columns: 1fr; height: auto; } .thread { min-height: 360px; } }
  `],
})
export class Messages implements OnInit, OnDestroy {
  private api = inject(MessagesService);
  private auth = inject(AuthService);
  private sub?: Subscription;

  conversations = signal<Conversation[]>([]);
  thread = signal<Message[]>([]);
  selectedPeer = signal<string | null>(null);
  directory = signal<DirectoryUser[]>([]);
  search = signal('');
  searchOpen = signal(false);
  error = signal<string | null>(null);
  sending = signal(false);
  draft = '';

  private me = this.auth.user()?.username ?? '';

  /** Directory filtered by the search box (excludes me), capped for a tidy dropdown. */
  matches = computed(() => {
    const q = this.search().toLowerCase().trim();
    const list = this.directory().filter((u) => u.username !== this.me);
    const filtered = q
      ? list.filter((u) => u.username.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q))
      : list;
    return filtered.slice(0, 8);
  });

  ngOnInit() {
    this.load();
    this.loadUsers();
    // Light polling so new messages + unread counts stay fresh.
    this.sub = interval(POLL_MS).pipe(startWith(0)).subscribe(() => {
      this.loadConversations();
      const peer = this.selectedPeer();
      if (peer) { this.loadThread(peer); }
      this.api.refreshUnread();
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  load() { this.error.set(null); this.loadConversations(); this.api.refreshUnread(); }

  private loadConversations() {
    this.api.conversations().subscribe({
      next: (c) => this.conversations.set(c),
      error: (e) => this.fail(e),
    });
  }

  private loadUsers() {
    // Directory for the recipient search — readable by ANY authenticated user (/api/users/directory).
    this.api.directory().subscribe({
      next: (list) => this.directory.set(list),
      error: () => this.directory.set([]),
    });
  }

  open(peer: string) {
    this.selectedPeer.set(peer);
    this.loadThread(peer); // backend marks the thread read on GET
  }

  /** Select a user from the search dropdown and open (or start) the conversation. */
  pick(username: string) {
    if (!username || username === this.me) return;
    this.search.set('');
    this.searchOpen.set(false);
    this.open(username);
  }

  pickFirst() {
    const first = this.matches()[0]?.username ?? this.search().trim();
    if (first) { this.pick(first); }
  }

  /** Delay closing so a dropdown click (mousedown) registers before blur. */
  closeSearchSoon() {
    setTimeout(() => this.searchOpen.set(false), 150);
  }

  private loadThread(peer: string) {
    this.api.thread(peer).subscribe({
      next: (t) => {
        this.thread.set(t);
        // opening marks read → refresh counts
        this.loadConversations();
        this.api.refreshUnread();
      },
      error: (e) => this.fail(e),
    });
  }

  send() {
    const peer = this.selectedPeer();
    const content = this.draft.trim();
    if (!peer || !content || this.sending()) return;
    this.sending.set(true);
    this.api.send(peer, content).subscribe({
      next: (m) => {
        this.thread.update((t) => [...t, m]);
        this.draft = '';
        this.sending.set(false);
        this.loadConversations();
      },
      error: (e) => { this.fail(e); this.sending.set(false); },
    });
  }

  initial(name: string): string { return (name || '?').charAt(0).toUpperCase(); }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 401
      ? 'Session expired — please sign in again.'
      : (err.error?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
