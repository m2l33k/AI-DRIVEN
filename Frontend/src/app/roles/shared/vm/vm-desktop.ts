import {
  Component, ElementRef, HostListener, inject, OnInit, signal, computed, OnDestroy
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VmService, MongoColInfo } from './vm.service';

type Phase = 'login' | 'boot' | 'desktop';

const BLISS_URL = 'https://wallpaperaccess.com/full/3263236.jpg';

@Component({
  selector: 'app-vm-desktop',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `

<!-- ════════════ LOGIN SCREEN ════════════ -->
@if (phase() === 'login') {
<div class="xp-login">

  <!-- Header bar -->
  <div class="login-header">
    <div class="login-brand">
      <svg class="xp-flag" viewBox="0 0 44 44">
        <path d="M2,3 C8,2 14,3 20,9 C14,14 8,16 2,15 Z" fill="#dc3220"/>
        <path d="M22,9 C28,3 36,2 42,3 L42,15 C36,16 28,14 22,9 Z" fill="#22a430"/>
        <path d="M2,19 C8,20 14,22 20,27 C14,32 8,32 2,30 Z" fill="#2525dc"/>
        <path d="M22,27 C28,22 36,20 42,19 L42,30 C36,32 28,32 22,27 Z" fill="#f8c020"/>
      </svg>
      <div class="login-brand-text">
        <span class="brand-win">Windows</span>
        <span class="brand-xp">XP</span>
        <span class="brand-ed">Professional</span>
      </div>
    </div>
  </div>

  <!-- Welcome body -->
  <div class="login-body">
    <div class="login-prompt">To begin, click your user name</div>
    <div class="login-divider"></div>

    <!-- User cards -->
    <div class="login-users">
      @for (u of loginUsers; track u.name) {
        <button class="user-card" (click)="startBoot(u.name)">
          <div class="user-avatar" [style.background]="u.color">
            <svg viewBox="0 0 40 40" width="38" height="38">
              <circle cx="20" cy="14" r="8" fill="rgba(255,255,255,.85)"/>
              <ellipse cx="20" cy="34" rx="13" ry="8" fill="rgba(255,255,255,.85)"/>
            </svg>
          </div>
          <div class="user-info">
            <span class="user-name">{{ u.name }}</span>
            <span class="user-role">{{ u.role }}</span>
          </div>
        </button>
      }
    </div>
  </div>

  <!-- Footer bar -->
  <div class="login-footer">
    <button class="login-power">
      <svg viewBox="0 0 24 24" width="18" height="18"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" fill="white"/></svg>
      Turn Off Computer
    </button>
    <span class="login-copy">Copyright © Microsoft Corporation</span>
  </div>

</div>
}

<!-- ════════════ BOOT SCREEN ════════════ -->
@if (phase() === 'boot') {
<div class="xp-boot">
  <div class="boot-center">
    <div class="boot-flag-row">
      <svg class="boot-flag" viewBox="0 0 44 44">
        <path d="M2,3 C8,2 14,3 20,9 C14,14 8,16 2,15 Z" fill="#dc3220"/>
        <path d="M22,9 C28,3 36,2 42,3 L42,15 C36,16 28,14 22,9 Z" fill="#22a430"/>
        <path d="M2,19 C8,20 14,22 20,27 C14,32 8,32 2,30 Z" fill="#2525dc"/>
        <path d="M22,27 C28,22 36,20 42,19 L42,30 C36,32 28,32 22,27 Z" fill="#f8c020"/>
      </svg>
      <div class="boot-title">
        <span class="boot-win">Windows</span>
        <span class="boot-xp">XP</span>
      </div>
    </div>
    <div class="boot-edition">Professional</div>
    <div class="boot-bar-wrap">
      <div class="boot-bar">
        <div class="boot-bar-inner" [style.width.%]="bootPct()"></div>
      </div>
    </div>
    <div class="boot-user">{{ bootUser() }}</div>
  </div>
  <div class="boot-copy">Copyright © Microsoft Corporation</div>
</div>
}

<!-- ════════════ DESKTOP ════════════ -->
@if (phase() === 'desktop') {
<div class="xp-desktop"
     [style.backgroundImage]="blissStyle"
     (click)="startMenu.set(false)"
     (dblclick)="onDesktopDbl($event)">

  <!-- Desktop icons -->
  <div class="desk-icons">
    <div class="desk-icon" (dblclick)="openWin('hls'); $event.stopPropagation()">
      <div class="di-img di-computer">
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="4" y="6" width="40" height="28" rx="3" fill="#1a4fa0" stroke="#0a2870" stroke-width="1.5"/>
          <rect x="6" y="8" width="36" height="24" rx="1.5" fill="#ddeeff"/>
          <rect x="14" y="36" width="20" height="3" fill="#1a4fa0"/>
          <rect x="10" y="39" width="28" height="3" rx="1" fill="#2a5fc0"/>
          <text x="24" y="24" text-anchor="middle" font-size="13" font-weight="900"
                fill="#cc0000" font-family="Arial">H</text>
        </svg>
      </div>
      <span>Huawei HLS</span>
    </div>

    <div class="desk-icon">
      <div class="di-img">
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="8" y="12" width="22" height="28" rx="2" fill="#e8d080" stroke="#b8a040"/>
          <rect x="12" y="8" width="28" height="24" rx="2" fill="#f0e090" stroke="#c8b050"/>
          <path d="M14 16h18M14 20h18M14 24h12" stroke="#c0a000" stroke-width="1.5"/>
        </svg>
      </div>
      <span>My Documents</span>
    </div>

    <div class="desk-icon">
      <div class="di-img">
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="6" y="28" width="36" height="14" rx="2" fill="#e0d8d0" stroke="#a0988f"/>
          <path d="M18 24l3-12h6l3 12H18z" fill="#c8c0b8" stroke="#a0988f"/>
          <circle cx="24" cy="34" r="4" fill="#888"/>
        </svg>
      </div>
      <span>Recycle Bin</span>
    </div>

    <div class="desk-icon" (dblclick)="openWin('mongo'); $event.stopPropagation()">
      <div class="di-img">
        <svg viewBox="0 0 48 48" fill="none">
          <ellipse cx="24" cy="30" rx="16" ry="9" fill="#4a7fc1"/>
          <ellipse cx="24" cy="22" rx="16" ry="9" fill="#5a8fd1"/>
          <ellipse cx="24" cy="14" rx="16" ry="9" fill="#6a9fe8"/>
          <text x="24" y="18" text-anchor="middle" font-size="7" font-weight="bold"
                fill="white" font-family="Arial">MongoDB</text>
        </svg>
      </div>
      <span>MongoDB</span>
    </div>
  </div>

  <!-- ── Huawei HLS Window ── -->
  @if (wins.hls !== 'closed') {
    <div class="xp-window" [class.minimized]="wins.hls === 'minimized'"
         [style.left.px]="winX()" [style.top.px]="winY()"
         [style.width.px]="winW()" [style.height.px]="winH()"
         [style.zIndex]="activeWin === 'hls' ? 10 : 5"
         (mousedown)="activeWin = 'hls'">

      <!-- Title bar -->
      <div class="win-titlebar" [class.inactive]="activeWin !== 'hls'"
           (mousedown)="startDrag($event)">
        <div class="wtl">
          <span class="win-icon-h">H</span>
          <span class="win-title">Huawei HLS — MongoDB Console</span>
        </div>
        <div class="win-btns">
          <button class="wb wb-min" (mousedown)="$event.stopPropagation()" (click)="wins.hls='minimized'">─</button>
          <button class="wb wb-max" (mousedown)="$event.stopPropagation()" (click)="toggleMax()">□</button>
          <button class="wb wb-cls" (mousedown)="$event.stopPropagation()" (click)="wins.hls='closed'">✕</button>
        </div>
      </div>

      <!-- Menubar -->
      <div class="win-menubar">
        @for (m of ['File','Edit','View','Tools','Help']; track m) {
          <span class="mi">{{ m }}</span>
        }
      </div>

      @if (wins.hls === 'open') {
        <!-- Toolbar -->
        <div class="win-toolbar">
          <span class="tl-lbl">Server:</span><span class="tl-val mono">mongodb://localhost:27017</span>
          <div class="tl-div"></div>
          <span class="tl-lbl">DB:</span><span class="tl-val mono">{{ selDb() || '—' }}</span>
          <div class="tl-div"></div>
          <span class="tl-lbl">Col:</span><span class="tl-val mono">{{ selCol() || '—' }}</span>
          <div class="tl-sp"></div>
          @if (selCol()) {
            <button class="tl-btn" (click)="insertMode.update(v=>!v)">+ Insert</button>
            <button class="tl-btn" (click)="loadDocs()">⟳</button>
          }
        </div>

        <!-- Body -->
        <div class="win-body">

          <!-- Left tree -->
          <div class="win-tree">
            <div class="tr-head">
              <svg viewBox="0 0 16 16" width="13"><ellipse cx="8" cy="9" rx="6" ry="4" fill="#4a7fc1"/><ellipse cx="8" cy="6" rx="6" ry="4" fill="#6a9fe8"/></svg>
              Databases
              <button class="tr-ref" (click)="loadDbs()">⟳</button>
            </div>
            @if (ldgDbs()) { <div class="tr-msg">Loading…</div> }
            @else {
              @for (db of dbs(); track db.name) {
                <div class="tr-db" [class.sel]="selDb()===db.name" (click)="selectDb(db.name)">
                  <svg width="12" height="12" viewBox="0 0 12 12"><ellipse cx="6" cy="7" rx="5" ry="3" fill="#4a7fc1"/><ellipse cx="6" cy="5" rx="5" ry="3" fill="#7ab0f0"/></svg>
                  <span>{{ db.name }}</span>
                  <span class="tr-ch">{{ selDb()===db.name ? '▾' : '▸' }}</span>
                </div>
                @if (selDb()===db.name) {
                  @if (ldgCols()) { <div class="tr-col tr-msg">Loading…</div> }
                  @else {
                    @for (c of cols(); track c.name) {
                      <div class="tr-col" [class.sel]="selCol()===c.name" (click)="selectCol(c.name)">
                        <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="2" width="8" height="7" rx="1" fill="#5a90e0"/></svg>
                        <span>{{ c.name }}</span>
                        <span class="col-n">{{ c.count }}</span>
                      </div>
                    }
                    @empty { <div class="tr-col tr-msg">Empty</div> }
                  }
                }
              }
              @empty {
                @if (mongoErr()) {
                  <div class="tr-msg tr-err" title="{{ mongoErr() }}">⚠ {{ mongoErr() }}</div>
                } @else {
                  <div class="tr-msg">No databases</div>
                }
              }
            }
          </div>

          <!-- Right content -->
          <div class="win-cnt">
            @if (!selCol()) {
              <div class="no-sel">
                <svg viewBox="0 0 64 64" width="60"><ellipse cx="32" cy="38" rx="22" ry="14" fill="#c0d8f8"/><ellipse cx="32" cy="28" rx="22" ry="14" fill="#d0e4fc"/><ellipse cx="32" cy="18" rx="22" ry="14" fill="#e0eeff"/></svg>
                <p>Select a collection</p>
              </div>
            } @else {

              <!-- Filter bar -->
              <div class="flt-bar">
                <span class="flt-lbl">Filter:</span>
                <input class="flt-in" [(ngModel)]="filterTxt" placeholder='{"key":"val"}'
                       (keydown.enter)="applyFilter()"/>
                <button class="fb" (click)="applyFilter()">Find</button>
                <button class="fb" (click)="clearFilter()">×</button>
                <span class="flt-cnt">{{ totDocs() }} docs</span>
              </div>

              <!-- Insert panel -->
              @if (insertMode()) {
                <div class="ins-panel">
                  <b>Insert JSON</b>
                  <textarea class="ins-ta" [(ngModel)]="insertJson" placeholder='{"field":"value"}'></textarea>
                  @if (insErr()) { <div class="ins-err">{{ insErr() }}</div> }
                  <div class="ins-acts">
                    <button class="fb fb-g" (click)="doInsert()">Insert</button>
                    <button class="fb" (click)="insertMode.set(false)">Cancel</button>
                  </div>
                </div>
              }

              <!-- Doc list -->
              @if (ldgDocs()) {
                <div class="doc-loading"><div class="spin"></div> Loading…</div>
              } @else {
                <div class="doc-list">
                  @for (d of docs(); track $index) {
                    <div class="doc-card" [class.exp]="expIdx()===  $index">
                      <div class="dc-hdr" (click)="expIdx.set(expIdx()===$index?-1:$index)">
                        <span class="dc-ch">{{ expIdx()===$index?'▾':'▸' }}</span>
                        <span class="dc-id mono">{{ docId(d) }}</span>
                        <button class="dc-del" (click)="delDoc($index,$event)">✕</button>
                      </div>
                      @if (expIdx()===$index) {
                        <pre class="dc-json">{{ prettyJson(d) }}</pre>
                      }
                    </div>
                  }
                  @empty { <div class="no-doc">No documents match the filter.</div> }
                </div>
                @if (totDocs() > pgSize) {
                  <div class="pgn">
                    <button class="pgb" [disabled]="pg()===0" (click)="prevPg()">‹ Prev</button>
                    <span>{{ pg()+1 }} / {{ totPgs() }}</span>
                    <button class="pgb" [disabled]="pg()>=totPgs()-1" (click)="nextPg()">Next ›</button>
                  </div>
                }
              }
            }
          </div>

        </div><!-- /win-body -->

        <!-- Status bar -->
        <div class="win-sb">
          <span>{{ selDb() || 'No database' }}{{ selCol() ? ' › ' + selCol() : '' }}</span>
          <span class="sb-sep">|</span>
          <span [class.sb-ok]="mongoOk()" [class.sb-err]="!mongoOk()">
            ● MongoDB {{ mongoOk() ? 'Connected' : 'Offline' }}
          </span>
          <span class="sb-sep">|</span>
          <span>{{ docs().length }} / {{ totDocs() }}</span>
        </div>
      }

    </div>
  }
  <!-- /HLS window -->

  <!-- ── Taskbar ── -->
  <div class="xp-taskbar" [class.tb-in]="tbVisible()">

    <!-- Start button -->
    <button class="xp-start" (click)="startMenu.update(v=>!v); $event.stopPropagation()">
      <svg class="start-flag" viewBox="0 0 22 22">
        <path d="M1,1.5 C4,1 7,1.5 10,4.5 C7,7 4,8 1,7.5 Z" fill="#dc3220"/>
        <path d="M11,4.5 C14,1 18,1 21,1.5 L21,7.5 C18,8 14,7 11,4.5 Z" fill="#22a430"/>
        <path d="M1,9.5 C4,10 7,11 10,13.5 C7,16 4,16 1,14.5 Z" fill="#2525dc"/>
        <path d="M11,13.5 C14,11 18,10 21,9.5 L21,14.5 C18,16 14,16 11,13.5 Z" fill="#f8c020"/>
      </svg>
      <span>start</span>
    </button>

    <div class="tb-div"></div>

    <!-- Task buttons -->
    @if (wins.hls !== 'closed') {
      <button class="tb-task" [class.tb-active]="wins.hls==='open'"
              (click)="wins.hls = wins.hls==='minimized' ? 'open' : 'minimized'">
        <span class="tbt-h">H</span> Huawei HLS
      </button>
    }

    <!-- System tray -->
    <div class="sys-tray">
      <span class="tray-dot" [class.td-ok]="mongoOk()">●</span>
      <span class="tray-time">{{ now | date:'HH:mm' }}</span>
      <button class="exit-vm" title="Exit VM" (click)="exitVm()">✕ Exit</button>
    </div>

  </div><!-- /taskbar -->

  <!-- Start menu popup -->
  @if (startMenu()) {
    <div class="start-popup" (click)="$event.stopPropagation()">
      <div class="sp-user">
        <div class="sp-av">{{ bootUser().charAt(0) }}</div>
        <span>{{ bootUser() }}</span>
      </div>
      <div class="sp-cols">
        <div class="sp-left">
          <div class="sp-pin" (click)="openWin('hls'); startMenu.set(false)">
            <span class="sp-icon-h">H</span> Huawei HLS
          </div>
          <div class="sp-pin" (click)="openWin('hls'); startMenu.set(false)">
            <svg viewBox="0 0 20 20" width="16"><ellipse cx="10" cy="13" rx="8" ry="5" fill="#4a7fc1"/><ellipse cx="10" cy="9" rx="8" ry="5" fill="#6a9fe8"/></svg>
            MongoDB Browser
          </div>
        </div>
        <div class="sp-right">
          <div class="sp-item">My Documents</div>
          <div class="sp-item">My Computer</div>
          <hr class="sp-hr"/>
          <div class="sp-item sp-red" (click)="phase.set('login'); startMenu.set(false)">Log Off…</div>
          <div class="sp-item sp-red" (click)="exitVm()">Shut Down…</div>
        </div>
      </div>
    </div>
  }

</div>
}
  `,
  styles: [`
    :host {
      position: absolute;
      inset: 0;
      display: block;
      overflow: hidden;
    }

    /* ═══════════════════════ LOGIN ═══════════════════════ */
    .xp-login {
      position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden;
      background: radial-gradient(ellipse 120% 100% at 50% 50%, #0d2a80 0%, #071a60 60%, #040e40 100%);
      font-family: 'Tahoma', 'Segoe UI', sans-serif;
    }

    /* Header */
    .login-header {
      background: linear-gradient(180deg, #1a40a0 0%, #0e2878 100%);
      padding: 18px 32px; border-bottom: 2px solid #0a1e60;
      box-shadow: 0 3px 12px rgba(0,0,0,.5);
    }
    .login-brand { display: flex; align-items: center; gap: 16px; }
    .xp-flag { width: 48px; height: 48px; filter: drop-shadow(0 2px 6px rgba(0,0,0,.4)); }
    .login-brand-text { display: flex; flex-direction: column; }
    .brand-win { font-size: 28px; font-weight: 300; color: white; letter-spacing: 1px; font-style: italic; }
    .brand-xp  { font-size: 28px; font-weight: 700; color: white; letter-spacing: 2px; font-style: italic; line-height: .9; }
    .brand-ed  { font-size: 13px; color: #9ab8f0; letter-spacing: 3px; text-transform: uppercase; }

    /* Body */
    .login-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
    .login-prompt { color: #9ab8f8; font-size: 15px; font-weight: 600; text-align: center; }
    .login-divider { width: 500px; max-width: 90vw; height: 1px;
      background: linear-gradient(90deg, transparent, #3a60c8, transparent); }

    /* Users */
    .login-users { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
    .user-card {
      display: flex; align-items: center; gap: 14px; padding: 14px 22px;
      background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15);
      border-radius: 8px; cursor: pointer; transition: background .2s, transform .1s;
      color: white;
    }
    .user-card:hover { background: rgba(255,255,255,.18); transform: scale(1.03); }
    .user-avatar { width: 48px; height: 48px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .user-info { text-align: left; }
    .user-name { display: block; font-size: 16px; font-weight: 700; color: white; }
    .user-role { display: block; font-size: 12px; color: #9ab8f0; }

    /* Footer */
    .login-footer {
      background: linear-gradient(180deg, #0e2878 0%, #071860 100%);
      padding: 12px 32px; border-top: 2px solid #0a1e60;
      display: flex; align-items: center; justify-content: space-between;
    }
    .login-power {
      display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.2); border-radius: 5px; padding: 6px 14px;
      color: white; font-size: 13px; cursor: pointer;
    }
    .login-power:hover { background: rgba(255,255,255,.2); }
    .login-copy { color: #6080c0; font-size: 11px; }

    /* ═══════════════════════ BOOT ═══════════════════════ */
    .xp-boot {
      position: absolute; inset: 0; background: #000; overflow: hidden;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Tahoma', sans-serif;
    }
    .boot-center { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .boot-flag-row { display: flex; align-items: center; gap: 18px; }
    .boot-flag { width: 56px; height: 56px; }
    .boot-title { display: flex; flex-direction: column; }
    .boot-win { font-size: 36px; font-weight: 300; color: white; letter-spacing: 2px; font-style: italic; }
    .boot-xp  { font-size: 36px; font-weight: 800; color: white; letter-spacing: 3px; font-style: italic; line-height: .85; }
    .boot-edition { color: #6a90d0; font-size: 13px; letter-spacing: 4px; text-transform: uppercase;
      align-self: flex-end; margin-top: -10px; }
    .boot-bar-wrap { margin-top: 30px; }
    .boot-bar {
      width: 280px; height: 14px; background: #1a1a1a; border-radius: 7px;
      overflow: hidden; border: 1px solid #333;
    }
    .boot-bar-inner {
      height: 100%; border-radius: 7px;
      background: linear-gradient(90deg, #1860e0, #4090ff);
      transition: width .15s linear;
      box-shadow: 0 0 10px rgba(64,144,255,.6);
    }
    .boot-user { color: #7090c0; font-size: 13px; margin-top: 10px; }
    .boot-copy { position: absolute; bottom: 20px; color: #333; font-size: 11px; }

    /* ═══════════════════════ DESKTOP ═══════════════════════ */
    .xp-desktop {
      position: absolute; inset: 0 0 30px 0;
      background-size: cover; background-position: center;
      /* Fallback bliss gradient */
      background-color: #1e6aac;
    }
    :host .xp-desktop {
      background-image: url('https://wallpaperaccess.com/full/3263236.jpg'),
        radial-gradient(ellipse 140% 55% at 52% 102%, #3a7a18 0%, #56a020 25%, #7ac840 40%, transparent 65%),
        linear-gradient(180deg, #1a5c9a 0%, #3080c8 25%, #58a8e0 55%, #90ccf0 75%, #b8e0f8 88%);
    }

    /* Desktop icons */
    .desk-icons { position: absolute; top: 16px; left: 16px; display: flex; flex-direction: column; gap: 10px; }
    .desk-icon {
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      width: 72px; padding: 5px; border-radius: 4px; cursor: pointer;
    }
    .desk-icon:hover { background: rgba(30,100,200,.35); outline: 1px dotted rgba(255,255,255,.6); }
    .di-img { width: 48px; height: 48px; }
    .desk-icon span { font-size: 11px; color: white; text-shadow: 1px 1px 3px #000,0 0 6px #000;
      text-align: center; line-height: 1.2; }

    /* ═══════════════════════ XP WINDOW ═══════════════════════ */
    .xp-window {
      position: absolute; display: flex; flex-direction: column;
      border-radius: 8px 8px 4px 4px;
      box-shadow: 3px 3px 16px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.12);
      border: 2px solid #0a3898;
      background: #ece9d8; min-width: 480px; min-height: 260px;
    }
    .xp-window.minimized { display: none; }

    /* Title bar */
    .win-titlebar {
      background: linear-gradient(180deg,
        #5a8bdf 0%, #346ac4 6%, #1f5dc0 14%,
        #1a56bc 48%, #144fb6 52%, #0e48af 58%, #0a3ea5 100%);
      border-radius: 6px 6px 0 0; padding: 3px 5px;
      display: flex; align-items: center; justify-content: space-between;
      cursor: move; height: 28px; flex: none;
    }
    .win-titlebar.inactive {
      background: linear-gradient(180deg, #8a9ec0 0%, #607090 100%);
    }
    .wtl { display: flex; align-items: center; gap: 6px; }
    .win-icon-h {
      width: 18px; height: 18px; border-radius: 3px;
      background: linear-gradient(135deg, #e00 0%, #800 100%);
      color: white; font-size: 11px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
    }
    .win-title { color: white; font-size: 12px; font-weight: 700;
      text-shadow: 1px 1px 2px rgba(0,0,0,.6); }
    .win-btns { display: flex; gap: 2px; }
    .wb {
      width: 21px; height: 21px; border-radius: 3px; border: 1px solid rgba(0,0,0,.35);
      cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
      color: white; box-shadow: 0 1px 2px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.3);
    }
    .wb-min, .wb-max { background: linear-gradient(180deg, #5090d8 0%, #2060c0 100%); }
    .wb-cls { background: linear-gradient(180deg, #e84030 0%, #b02010 100%); }
    .wb:hover { filter: brightness(1.2); }
    .win-menubar {
      background: #ece9d8; border-bottom: 1px solid #aca899; height: 20px;
      display: flex; align-items: center; padding: 0 4px; flex: none;
    }
    .mi { font-size: 12px; padding: 0 8px; height: 100%;
      display: flex; align-items: center; cursor: pointer; font-family: Tahoma, sans-serif; }
    .mi:hover { background: #316ac5; color: white; }

    /* Toolbar */
    .win-toolbar {
      background: #d4d0c8; border-bottom: 1px solid #aca899;
      display: flex; align-items: center; gap: 6px; padding: 2px 8px;
      font-size: 11px; flex: none; height: 24px; font-family: Tahoma, sans-serif;
    }
    .tl-lbl { color: #555; font-weight: 600; }
    .tl-val { color: #000; }
    .mono    { font-family: 'Consolas', monospace; }
    .tl-div  { width: 1px; height: 14px; background: #aca899; }
    .tl-sp   { flex: 1; }
    .tl-btn  {
      padding: 1px 8px; font-size: 11px; border: 1px solid #7a7a7a;
      background: linear-gradient(180deg, #f0ece0 0%, #ddd8cc 100%);
      border-radius: 2px; cursor: pointer; font-family: Tahoma, sans-serif;
    }
    .tl-btn:hover { background: #e8e4d8; }

    /* Body + tree */
    .win-body { display: flex; flex: 1; overflow: hidden; }
    .win-tree {
      width: 185px; flex: none; background: white;
      border-right: 1px solid #aca899; overflow-y: auto; font-size: 12px;
      font-family: Tahoma, sans-serif;
    }
    .tr-head {
      background: #d4d0c8; padding: 4px 8px; font-weight: 700; font-size: 11px;
      display: flex; align-items: center; gap: 4px; border-bottom: 1px solid #aca899;
      position: sticky; top: 0;
    }
    .tr-ref { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 12px; }
    .tr-db {
      padding: 4px 8px; cursor: pointer; display: flex; align-items: center; gap: 5px;
      border-bottom: 1px solid #f2eeea;
    }
    .tr-db:hover, .tr-db.sel { background: #316ac5; color: white; }
    .tr-ch { margin-left: auto; font-size: 9px; }
    .tr-col {
      padding: 3px 6px 3px 20px; cursor: pointer; display: flex; align-items: center; gap: 4px;
      font-size: 11px; border-bottom: 1px solid #f5f2ef;
    }
    .tr-col:hover, .tr-col.sel { background: #4a88d8; color: white; }
    .col-n { margin-left: auto; font-size: 10px; opacity: .7; }
    .tr-msg { padding: 6px 8px; font-size: 11px; color: #888; }
    .tr-err { color: #c00; font-size: 10px; word-break: break-all; }

    /* Content */
    .win-cnt { flex: 1; display: flex; flex-direction: column; overflow: hidden; font-family: Tahoma, sans-serif; }
    .no-sel { display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; gap: 10px; color: #888; font-size: 13px; }

    /* Filter */
    .flt-bar {
      display: flex; align-items: center; gap: 5px; padding: 4px 8px;
      background: #f5f3ef; border-bottom: 1px solid #ddd8cc; font-size: 11px; flex: none;
    }
    .flt-lbl { color: #666; font-weight: 600; }
    .flt-in {
      flex: 1; border: 1px solid #7a96c8; border-radius: 2px;
      padding: 2px 5px; font-size: 11px; font-family: Consolas, monospace;
    }
    .fb {
      padding: 1px 9px; font-size: 11px; border: 1px solid #888;
      background: linear-gradient(180deg, #f0ece0 0%, #ddd8cc 100%);
      border-radius: 2px; cursor: pointer; font-family: Tahoma, sans-serif;
    }
    .fb:hover { background: #e0dcd0; }
    .fb-g { background: linear-gradient(180deg, #68c030 0%, #38880c 100%); color: white; border-color: #288000; }
    .flt-cnt { margin-left: auto; font-size: 11px; color: #666; }

    /* Insert */
    .ins-panel { background: #fffde8; border-bottom: 1px solid #ddd090; padding: 6px 10px; flex: none; font-size: 12px; }
    .ins-ta { width: 100%; height: 70px; font-family: Consolas, monospace; font-size: 11px;
      border: 1px solid #c8c048; border-radius: 2px; padding: 4px; resize: vertical; }
    .ins-err { color: #c00; font-size: 11px; }
    .ins-acts { display: flex; gap: 6px; margin-top: 5px; }

    /* Docs */
    .doc-loading { display: flex; align-items: center; gap: 8px; padding: 20px; font-size: 13px; color: #666; }
    .spin { width: 16px; height: 16px; border: 2px solid #ddd; border-top-color: #316ac5;
      border-radius: 50%; animation: spin .7s linear infinite; flex: none; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .doc-list { flex: 1; overflow-y: auto; padding: 3px; font-size: 12px; }
    .doc-card { border: 1px solid #d8d4cc; border-radius: 2px; margin-bottom: 2px; background: white; }
    .doc-card.exp { border-color: #316ac5; }
    .dc-hdr { display: flex; align-items: center; gap: 6px; padding: 4px 8px;
      cursor: pointer; background: #f5f3ef; font-family: Tahoma, sans-serif; }
    .dc-hdr:hover { background: #eae8e0; }
    .doc-card.exp .dc-hdr { background: #dce8fc; }
    .dc-ch { font-size: 9px; width: 10px; }
    .dc-id { flex: 1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dc-del { padding: 0 5px; font-size: 11px; border: 1px solid #e08080; background: #fce8e8;
      color: #a00; border-radius: 2px; cursor: pointer; }
    .dc-json { margin: 0; padding: 6px 12px; font-size: 11px; font-family: Consolas, monospace;
      color: #1a3060; background: #f4f8ff; border-top: 1px solid #d0e0f8;
      white-space: pre-wrap; word-break: break-all; max-height: 280px; overflow-y: auto; }
    .no-doc { padding: 24px; text-align: center; color: #888; font-size: 13px; }

    /* Pagination */
    .pgn { display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 5px; border-top: 1px solid #ddd; background: #f5f3ef; flex: none; font-size: 12px;
      font-family: Tahoma, sans-serif; }
    .pgb { padding: 1px 10px; font-size: 11px; border: 1px solid #888;
      background: linear-gradient(180deg, #f0ece0 0%, #ddd8cc 100%); border-radius: 2px; cursor: pointer; }
    .pgb:disabled { opacity: .4; cursor: default; }

    /* Status bar */
    .win-sb {
      background: #d4d0c8; border-top: 1px solid #aca899; padding: 2px 8px;
      display: flex; align-items: center; gap: 6px; font-size: 11px; color: #444;
      flex: none; height: 18px; font-family: Tahoma, sans-serif;
    }
    .sb-sep  { color: #aca899; }
    .sb-ok   { color: #168820; }
    .sb-err  { color: #cc2020; }

    /* ═══════════════════════ TASKBAR ═══════════════════════ */
    .xp-taskbar {
      position: absolute; bottom: 0; left: 0; right: 0; height: 30px;
      background: linear-gradient(180deg, #3d80d4 0%, #1e60cc 48%, #1858c4 52%, #1452bc 100%);
      border-top: 1px solid #0a3898;
      display: flex; align-items: center; gap: 3px; padding: 0 2px; z-index: 100;
      transform: translateY(100%); transition: transform .5s ease;
      font-family: Tahoma, sans-serif;
    }
    .xp-taskbar.tb-in { transform: translateY(0); }

    .xp-start {
      height: 26px; padding: 0 12px 0 8px; border-radius: 0 13px 13px 0;
      background: linear-gradient(180deg, #5ec030 0%, #3a9810 48%, #308808 52%, #287000 100%);
      border: 1px solid #186000; color: white; font-size: 14px; font-weight: 800;
      font-style: italic; text-transform: lowercase; letter-spacing: .5px;
      cursor: pointer; display: flex; align-items: center; gap: 5px;
      box-shadow: 1px 0 8px rgba(0,80,0,.4), inset 0 1px 0 rgba(255,255,255,.25);
    }
    .xp-start:hover { filter: brightness(1.1); }
    .start-flag { width: 18px; height: 18px; }

    .tb-div { width: 1px; height: 20px; background: rgba(255,255,255,.2); margin: 0 2px; }

    .tb-task {
      height: 24px; padding: 0 10px; border-radius: 3px; font-size: 11px; cursor: pointer;
      background: rgba(0,0,0,.22); border: 1px solid rgba(255,255,255,.18); color: white;
      display: flex; align-items: center; gap: 5px; max-width: 160px;
      white-space: nowrap; overflow: hidden;
    }
    .tb-task.tb-active { background: rgba(0,0,0,.4); box-shadow: inset 1px 1px 3px rgba(0,0,0,.5); }
    .tb-task:hover { background: rgba(255,255,255,.15); }
    .tbt-h { width: 14px; height: 14px; border-radius: 2px;
      background: linear-gradient(135deg,#d00,#800); color: white; font-size: 9px;
      font-weight: 900; display: flex; align-items: center; justify-content: center; flex: none; }

    .sys-tray {
      margin-left: auto; display: flex; align-items: center; gap: 8px;
      background: linear-gradient(180deg, #1050b8 0%, #0a3fa8 100%);
      padding: 0 10px; height: 100%; border-left: 1px solid rgba(255,255,255,.12);
    }
    .tray-dot { font-size: 13px; color: #666; }
    .td-ok  { color: #60e040; }
    .tray-time { color: white; font-size: 11px; font-weight: 600; }
    .exit-vm {
      font-size: 10px; padding: 1px 7px; border-radius: 2px; cursor: pointer;
      background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); color: #ccc;
    }
    .exit-vm:hover { background: rgba(200,40,40,.4); color: white; }

    /* Start menu */
    .start-popup {
      position: absolute; bottom: 30px; left: 0; width: 380px; z-index: 300;
      background: white; border: 2px solid #0a3898;
      box-shadow: 4px -4px 16px rgba(0,0,0,.5); border-radius: 8px 8px 0 0;
      overflow: hidden; font-family: Tahoma, sans-serif;
    }
    .sp-user {
      background: linear-gradient(90deg, #1e60cc, #4a90e0); padding: 12px 14px;
      display: flex; align-items: center; gap: 10px; color: white; font-weight: 700; font-size: 14px;
    }
    .sp-av {
      width: 34px; height: 34px; border-radius: 50%; background: #f0d080; color: #333;
      display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px;
    }
    .sp-cols { display: flex; }
    .sp-left { width: 55%; border-right: 1px solid #ddd; padding: 8px 0; }
    .sp-right { width: 45%; background: #e8e0f0; padding: 8px 0; }
    .sp-pin, .sp-item {
      padding: 7px 14px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px;
    }
    .sp-pin:hover, .sp-item:hover { background: #316ac5; color: white; }
    .sp-icon-h {
      width: 16px; height: 16px; border-radius: 2px; background: linear-gradient(135deg,#d00,#800);
      color: white; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center;
    }
    .sp-hr { margin: 4px 0; border: none; border-top: 1px solid #bbb; }
    .sp-red { color: #800 !important; }
    .sp-red:hover { background: #316ac5 !important; color: white !important; }
  `],
})
export class VmDesktop implements OnInit, OnDestroy {
  private svc = inject(VmService);

  readonly blissStyle = `url('${BLISS_URL}'), radial-gradient(ellipse 140% 55% at 52% 102%, #3a7a18 0%, #56a020 25%, transparent 65%), linear-gradient(180deg, #1a5c9a 0%, #4a90e0 40%, #90ccf0 75%)`;

  // ── phases ───────────────────────────────────────────────────────────────────
  phase    = signal<Phase>('login');
  bootPct  = signal(0);
  bootUser = signal('Operator');
  tbVisible = signal(false);
  startMenu = signal(false);
  now       = new Date();
  private _clock?: ReturnType<typeof setInterval>;

  loginUsers = [
    { name: 'Operator',  role: 'Network Operator', color: 'linear-gradient(135deg,#1e60c8,#4a90e8)' },
    { name: 'Admin',     role: 'Platform Admin',    color: 'linear-gradient(135deg,#c81e30,#e85050)' },
  ];

  startBoot(user: string) {
    this.bootUser.set(user);
    this.phase.set('boot');
    this.bootPct.set(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 8 + 3;
      if (p >= 100) { p = 100; clearInterval(iv);
        setTimeout(() => { this.phase.set('desktop'); setTimeout(() => this.tbVisible.set(true), 600); }, 400); }
      this.bootPct.set(p);
    }, 80);
  }

  exitVm() { this.phase.set('login'); this.tbVisible.set(false); this.startMenu.set(false); }

  // ── window state ─────────────────────────────────────────────────────────────
  private hostEl = inject(ElementRef<HTMLElement>);

  wins = { hls: 'closed' as 'open' | 'minimized' | 'closed' };
  activeWin = 'hls';
  winX = signal(60); winY = signal(30); winW = signal(800); winH = signal(480);
  private _drag = false; private _dx = 0; private _dy = 0;
  private _prev = { x: 60, y: 30, w: 800, h: 480 };
  private _max   = false;

  /** Available area: host width × (host height − 30px taskbar). */
  private get deskArea(): { w: number; h: number } {
    const r = this.hostEl.nativeElement.getBoundingClientRect();
    return { w: r.width, h: r.height - 30 };
  }

  openWin(_id: string) {
    const { w, h } = this.deskArea;
    const ww = Math.min(860, Math.max(480, w - 40));
    const wh = Math.min(530, Math.max(300, h - 50));
    const wx = Math.max(0, Math.floor((w - ww) / 2));
    this.winX.set(wx); this.winY.set(20);
    this.winW.set(ww);  this.winH.set(wh);
    this._prev = { x: wx, y: 20, w: ww, h: wh };
    this.wins.hls = 'open'; this.activeWin = 'hls';
  }

  startDrag(e: MouseEvent) {
    if (this._max) return;
    this._drag = true; this._dx = e.clientX - this.winX(); this._dy = e.clientY - this.winY();
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(e: MouseEvent) {
    if (!this._drag) return;
    const { w, h } = this.deskArea;
    this.winX.set(Math.max(0, Math.min(w - this.winW(), e.clientX - this._dx)));
    this.winY.set(Math.max(0, Math.min(h - 40,          e.clientY - this._dy)));
  }

  @HostListener('document:mouseup') onUp() { this._drag = false; }

  toggleMax() {
    if (this._max) {
      this.winX.set(this._prev.x); this.winY.set(this._prev.y);
      this.winW.set(this._prev.w); this.winH.set(this._prev.h);
    } else {
      this._prev = { x: this.winX(), y: this.winY(), w: this.winW(), h: this.winH() };
      const { w, h } = this.deskArea;
      this.winX.set(0); this.winY.set(0); this.winW.set(w); this.winH.set(h);
    }
    this._max = !this._max;
  }

  onDesktopDbl(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.desk-icon')) this.startMenu.set(false);
  }

  // ── MongoDB state ─────────────────────────────────────────────────────────────
  dbs      = signal<{ name: string }[]>([]);
  cols     = signal<MongoColInfo[]>([]);
  docs     = signal<string[]>([]);
  selDb    = signal('');
  selCol   = signal('');
  totDocs  = signal(0);
  pg       = signal(0);
  pgSize   = 20;
  filterTxt = '';
  ldgDbs   = signal(false);
  ldgCols  = signal(false);
  ldgDocs  = signal(false);
  mongoOk  = signal(false);
  mongoErr = signal('');
  expIdx   = signal(-1);
  insertMode = signal(false);
  insertJson = '';
  insErr   = signal('');

  totPgs = computed(() => Math.max(1, Math.ceil(this.totDocs() / this.pgSize)));

  ngOnInit() {
    this.loadDbs();
    this._clock = setInterval(() => this.now = new Date(), 30_000);
  }
  ngOnDestroy() { if (this._clock) clearInterval(this._clock); }

  loadDbs() {
    this.ldgDbs.set(true);
    this.mongoErr.set('');
    this.svc.listDbs().subscribe({
      next: d  => { this.dbs.set(d); this.mongoOk.set(true); this.ldgDbs.set(false); },
      error: (e: { status?: number; message?: string }) => {
        this.mongoOk.set(false);
        this.ldgDbs.set(false);
        this.mongoErr.set(`API error ${e.status ?? ''}: ${e.message ?? 'check console'}`);
      },
    });
  }

  selectDb(name: string) {
    if (this.selDb() === name) { this.selDb.set(''); this.cols.set([]); return; }
    this.selDb.set(name); this.selCol.set(''); this.docs.set([]);
    this.ldgCols.set(true);
    this.svc.listCollections(name).subscribe({
      next: c  => { this.cols.set(c); this.ldgCols.set(false); },
      error: () => this.ldgCols.set(false),
    });
  }

  selectCol(name: string) {
    this.selCol.set(name); this.pg.set(0); this.filterTxt = ''; this.expIdx.set(-1); this.loadDocs();
  }

  loadDocs() {
    const db = this.selDb(), col = this.selCol();
    if (!db || !col) return;
    this.ldgDocs.set(true);
    this.svc.browse(db, col, this.filterTxt, this.pgSize, this.pg() * this.pgSize).subscribe({
      next: r  => { this.docs.set(r.documents); this.totDocs.set(r.total); this.ldgDocs.set(false); },
      error: () => this.ldgDocs.set(false),
    });
  }

  applyFilter() { this.pg.set(0); this.loadDocs(); }
  clearFilter() { this.filterTxt = ''; this.pg.set(0); this.loadDocs(); }
  prevPg()      { this.pg.update(p => Math.max(0, p - 1)); this.loadDocs(); }
  nextPg()      { this.pg.update(p => Math.min(this.totPgs() - 1, p + 1)); this.loadDocs(); }

  doInsert() {
    this.insErr.set('');
    try { JSON.parse(this.insertJson); } catch { this.insErr.set('Invalid JSON'); return; }
    this.svc.insert(this.selDb(), this.selCol(), this.insertJson).subscribe({
      next: () => { this.insertMode.set(false); this.insertJson = ''; this.loadDocs(); },
      error: e  => this.insErr.set(e.error?.error ?? 'Insert failed'),
    });
  }

  delDoc(i: number, e: MouseEvent) {
    e.stopPropagation();
    const id = this.docId(this.docs()[i]);
    if (!id || !confirm(`Delete document ${id}?`)) return;
    this.svc.delete(this.selDb(), this.selCol(), id).subscribe({ next: () => this.loadDocs() });
  }

  docId(raw: string): string {
    try {
      const d = JSON.parse(raw);
      if (!d._id) return '(no _id)';
      if (typeof d._id === 'string') return d._id;
      if (d._id.$oid)  return d._id.$oid;
      return JSON.stringify(d._id);
    } catch { return '?'; }
  }

  prettyJson(raw: string): string {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  }
}
