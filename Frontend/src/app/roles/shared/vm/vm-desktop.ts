import {
  Component, ElementRef, HostListener, inject, OnInit, signal, computed, OnDestroy
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VmService, MongoColInfo } from './vm.service';

type Phase = 'off' | 'starting' | 'login' | 'boot' | 'desktop';

const BLISS_URL  = 'https://wallpaperaccess.com/full/3263236.jpg';
const CORRECT_PW = 'admin';
const XP_LOGO    = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/windows-xp.png';

@Component({
  selector: 'app-vm-desktop',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `

<!-- ══════════════════════════════════════════════════════════
     VM MANAGER — Powered Off  (XP.css window chrome)
══════════════════════════════════════════════════════════════ -->
@if (phase() === 'off') {
<div class="vmm-page">
  <div class="xp-win vmm-win">

    <!-- XP Luna title bar -->
    <div class="xp-tb vmm-draggable">
      <div class="xp-tb-left">
        <img [src]="xpLogo" class="xp-tb-ico" alt="">
        <span class="xp-tb-text">Virtual Machine Manager</span>
      </div>
      <div class="xp-tb-ctrl">
        <button class="xwb xwb-min" title="Minimize">
          <svg viewBox="0 0 8 2" width="8"><rect width="8" height="2" fill="currentColor"/></svg>
        </button>
        <button class="xwb xwb-max" title="Maximize">
          <svg viewBox="0 0 9 9" width="9"><rect x=".5" y=".5" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
        </button>
        <button class="xwb xwb-cls" title="Close">
          <svg viewBox="0 0 9 9" width="9"><line x1=".5" y1=".5" x2="8.5" y2="8.5" stroke="currentColor" stroke-width="1.5"/><line x1="8.5" y1=".5" x2=".5" y2="8.5" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>

    <!-- Menu bar -->
    <div class="xp-menubar">
      @for(m of vmmMenus; track m){ <span class="xp-mi">{{m}}</span> }
    </div>

    <!-- Toolbar -->
    <div class="xp-toolbar">
      <button class="xp-tl-btn">
        <svg viewBox="0 0 14 14" width="13" style="margin-right:3px"><rect x="1" y="1" width="5" height="5" rx=".8" fill="#316ac5"/><rect x="8" y="1" width="5" height="5" rx=".8" fill="#316ac5"/><rect x="1" y="8" width="5" height="5" rx=".8" fill="#316ac5"/><line x1="10.5" y1="8" x2="10.5" y2="13" stroke="#316ac5" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="10.5" x2="13" y2="10.5" stroke="#316ac5" stroke-width="1.5" stroke-linecap="round"/></svg>New
      </button>
      <button class="xp-tl-btn">
        <svg viewBox="0 0 14 14" width="13" style="margin-right:3px"><circle cx="7" cy="7" r="5" fill="none" stroke="#666" stroke-width="1.3"/><path d="M7 4v1.5M7 8.5V10M4 7h1.5M8.5 7H10" stroke="#666" stroke-width="1.3" stroke-linecap="round"/></svg>Settings
      </button>
      <div class="xp-tl-sep"></div>
      <button class="xp-tl-btn xp-tl-start" (click)="powerOn()">
        <svg viewBox="0 0 12 12" width="12" style="margin-right:3px"><path d="M3 2l7 4-7 4V2z" fill="white"/></svg>Start
      </button>
    </div>

    <!-- Body: split pane -->
    <div class="vmm-body">
      <!-- Left: VM list -->
      <div class="vmm-vlist">
        <div class="vmm-vitem vmm-sel" (click)="powerOn()">
          <img [src]="xpLogo" class="vmm-vico" alt="">
          <div class="vmm-vinfo">
            <span class="vmm-vname">Windows XP Professional</span>
            <span class="vmm-vstate">● Powered Off</span>
          </div>
        </div>
      </div>

      <!-- Right: Detail panel -->
      <div class="vmm-vdetail">

        <!-- VM header -->
        <div class="vmm-dh">
          <img [src]="xpLogo" class="vmm-dico" alt="">
          <div class="vmm-dh-info">
            <div class="vmm-dname">Windows XP Professional</div>
            <span class="vmm-dstate">Powered Off</span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="vmm-acts">
          <button class="xp-btn xp-btn-start" (click)="powerOn()">▶ Start</button>
          <button class="xp-btn">⚙ Settings</button>
          <button class="xp-btn">🗑 Discard</button>
        </div>

        <div class="vmm-div"></div>

        <!-- Spec fieldsets -->
        <fieldset class="xp-field">
          <legend>General</legend>
          <table class="vmm-stbl">
            <tr><td>Name:</td><td>Windows XP Professional</td></tr>
            <tr><td>Operating System:</td><td>Windows XP (32-bit)</td></tr>
          </table>
        </fieldset>

        <fieldset class="xp-field">
          <legend>System</legend>
          <table class="vmm-stbl">
            <tr><td>Base Memory:</td><td>512 MB</td></tr>
            <tr><td>Processors:</td><td>1</td></tr>
            <tr><td>Boot Order:</td><td>Floppy, DVD, Hard Disk</td></tr>
          </table>
        </fieldset>

        <fieldset class="xp-field">
          <legend>Display</legend>
          <table class="vmm-stbl">
            <tr><td>Video Memory:</td><td>64 MB</td></tr>
            <tr><td>Monitor Count:</td><td>1</td></tr>
          </table>
        </fieldset>

        <fieldset class="xp-field">
          <legend>Storage</legend>
          <table class="vmm-stbl">
            <tr><td>Controller: IDE</td><td>WindowsXP.vdi (10 GB)</td></tr>
          </table>
        </fieldset>

      </div>
    </div>

    <!-- XP status bar -->
    <div class="xp-sbar">
      <span class="xp-sbf">Powered Off</span>
      <span class="xp-sbf">Windows XP Professional (32-bit)</span>
    </div>
  </div>
</div>
}

<!-- ══════════════════════════════════════════════════════════
     STARTING  (brief POST / hardware init screen)
══════════════════════════════════════════════════════════════ -->
@if (phase() === 'starting') {
<div class="vm-host-bg">
  <div class="vm-win" [class.vm-win-max]="vmMax()"
       [style.left.px]="vmX()" [style.top.px]="vmY()"
       [style.width.px]="vmW()" [style.height.px]="vmH()"
       style="animation: vmAppear .25s ease">
    <div class="vm-tb">
      <div class="vm-tb-left">
        <img [src]="xpLogo" class="vm-tb-ico" alt="">
        <span class="vm-tb-title">Windows XP Professional <span class="vm-state-tag">[Starting]</span> — Oracle VM VirtualBox</span>
      </div>
      <div class="vm-tb-btns">
        <button class="vm-btn vm-btn-cls" (click)="phase.set('off')">
          <svg viewBox="0 0 10 10" width="9"><line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/><line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>
    <div class="vm-menubar">@for(m of vbMenus;track m){<span class="vm-mi">{{m}}</span>}</div>
    <div class="vm-xp-area">
      <div class="bios-screen">
        <pre class="bios-text">{{ biosLines }}</pre>
        <div class="bios-cursor">_</div>
      </div>
    </div>
    <div class="vm-statusbar">
      <div class="vm-sb-left"><span class="vm-sb-chip starting">● Starting</span><span class="vm-sb-info">Windows XP Professional (32-bit)</span></div>
      <div class="vm-sb-right"><span class="vm-sb-res">{{vmW()}}×{{vmH()}} px</span></div>
    </div>
  </div>
</div>
}

<!-- ══════════════════════════════════════════════════════════
     LOGIN / BOOT / DESKTOP  — all inside same VM window
══════════════════════════════════════════════════════════════ -->
@if (phase() === 'login' || phase() === 'boot' || phase() === 'desktop') {
<div class="vm-host-bg">
  <div class="vm-win" [class.vm-win-max]="vmMax()"
       [style.left.px]="vmX()" [style.top.px]="vmY()"
       [style.width.px]="vmW()" [style.height.px]="vmH()">

    <!-- VirtualBox-style title bar -->
    <div class="vm-tb" (mousedown)="startVmDrag($event)">
      <div class="vm-tb-left">
        <img [src]="xpLogo" class="vm-tb-ico" alt="">
        <span class="vm-tb-title">
          Windows XP Professional
          @if (phase()==='login' || phase()==='boot') { <span class="vm-state-tag">[Starting]</span> }
          @if (phase()==='desktop') { <span class="vm-state-tag running">[Running]</span> }
          &nbsp;— Oracle VM VirtualBox
        </span>
      </div>
      <div class="vm-tb-btns">
        <button class="vm-btn" title="Minimise" (mousedown)="$event.stopPropagation()" (click)="phase.set('off')">
          <svg viewBox="0 0 10 2" width="9"><rect width="10" height="2" fill="rgba(255,255,255,.8)"/></svg>
        </button>
        <button class="vm-btn" title="Maximise" (mousedown)="$event.stopPropagation()" (click)="toggleVmMax()">
          <svg viewBox="0 0 10 10" width="9"><rect x="1" y="1" width="8" height="8" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/></svg>
        </button>
        <button class="vm-btn vm-btn-cls" title="Close" (mousedown)="$event.stopPropagation()" (click)="phase.set('off')">
          <svg viewBox="0 0 10 10" width="9"><line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/><line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>

    <!-- VirtualBox menu bar -->
    <div class="vm-menubar">
      @for (m of vbMenus; track m) { <span class="vm-mi">{{ m }}</span> }
    </div>

    <!-- XP content -->
    <div class="vm-xp-area">

      <!-- LOGIN — authentic XP Welcome Screen -->
      @if (phase() === 'login') {
        <div class="xl-screen">
          <div class="xl-topbar">
            <div class="xl-topbar-logo">
              <img [src]="xpLogo" class="xl-tb-flag" alt="Windows XP"/>
              <div class="xl-topbar-text">
                <span class="xl-tb-windows">Windows</span>
                <span class="xl-tb-divider"> </span>
                <span class="xl-tb-xp">XP</span>
                <span class="xl-tb-ed">Professional</span>
              </div>
            </div>
          </div>
          <div class="xl-main">
            <div class="xl-left">
              <div class="xl-brand">
                <img [src]="xpLogo" class="xl-flag" alt="Windows XP"/>
                <div class="xl-brand-text">
                  <span class="xl-windows">Windows</span>
                  <span class="xl-xp">XP</span>
                  <span class="xl-edition">Professional</span>
                </div>
              </div>
              <div class="xl-tagline">
                @if (!selUser()) { To begin, click your user name }
                @else { Welcome }
              </div>
            </div>
            <div class="xl-sep"></div>
            <div class="xl-right">
              @if (!selUser()) {
                <div class="xl-tiles">
                  @for (u of loginUsers; track u.name) {
                    <button class="xl-tile" [class.xl-tile-sel]="pickingUser()===u.name" (click)="pickUser(u.name)">
                      <div class="xl-pic" [style.background]="u.bg">
                        @if (u.name === 'Admin') {
                          <svg viewBox="0 0 40 40" width="36"><path d="M20 4 L34 10 L34 22 Q34 32 20 38 Q6 32 6 22 L6 10 Z" fill="rgba(255,255,255,.85)"/><path d="M14 20 L18 24 L26 16" stroke="rgba(0,0,80,.6)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        } @else {
                          <svg viewBox="0 0 40 40" width="36"><circle cx="20" cy="15" r="9" fill="rgba(255,255,255,.85)"/><ellipse cx="20" cy="32" rx="13" ry="8" fill="rgba(255,255,255,.85)"/></svg>
                        }
                      </div>
                      <div class="xl-tile-info">
                        <span class="xl-tile-name">{{ u.name }}</span>
                        <span class="xl-tile-role">{{ u.role }}</span>
                      </div>
                    </button>
                  }
                </div>
              } @else {
                <div class="xl-pwarea">
                  <div class="xl-sel-tile">
                    <div class="xl-pic xl-pic-lg" [style.background]="userBg()">
                      @if (selUser() === 'Admin') {
                        <svg viewBox="0 0 40 40" width="42"><path d="M20 4 L34 10 L34 22 Q34 32 20 38 Q6 32 6 22 L6 10 Z" fill="rgba(255,255,255,.85)"/><path d="M14 20 L18 24 L26 16" stroke="rgba(0,0,80,.6)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      } @else {
                        <svg viewBox="0 0 40 40" width="42"><circle cx="20" cy="15" r="9" fill="rgba(255,255,255,.85)"/><ellipse cx="20" cy="32" rx="13" ry="8" fill="rgba(255,255,255,.85)"/></svg>
                      }
                    </div>
                    <span class="xl-sel-name">{{ selUser() }}</span>
                  </div>
                  <p class="xl-pw-label">Type your password</p>
                  <div class="xl-pw-row">
                    <input class="xl-pw-input" type="password" [(ngModel)]="pwInput"
                           [class.xl-pw-shake]="pwErr()"
                           (keydown.enter)="submitPw()" autofocus/>
                    <button class="xl-pw-arrow" (click)="submitPw()" title="Log On">
                      <svg viewBox="0 0 16 16" width="12"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="xl-pw-help" title="Password hint">?</button>
                  </div>
                  @if (pwErr()) {
                    <p class="xl-pw-err">
                      <svg viewBox="0 0 10 10" width="9"><circle cx="5" cy="5" r="4.5" fill="#e04040"/><line x1="5" y1="2.5" x2="5" y2="5.5" stroke="white" stroke-width="1.2"/><circle cx="5" cy="7.2" r=".6" fill="white"/></svg>
                      {{ pwErr() }}
                    </p>
                  }
                  <button class="xl-back-link" (click)="selUser.set(''); pwErr.set(''); pickingUser.set('')">← Back to user list</button>
                </div>
              }
            </div>
          </div>
          <div class="xl-bottombar">
            <button class="xl-turnoff" (click)="phase.set('off')">
              <span class="xl-to-dot">●</span> Turn off computer
            </button>
            <p class="xl-after-logon">After you log on, you can add or change accounts.<br>Just go to Control Panel and click User Accounts.</p>
          </div>
        </div>
      }

      <!-- BOOT -->
      @if (phase() === 'boot') {
        <div class="xp-boot">
          <div class="boot-center">
            <div class="boot-flag-row">
              <img [src]="xpLogo" class="boot-flag" alt="Windows XP"/>
              <div class="boot-title-block">
                <span class="boot-win">Windows</span>
                <span class="boot-xp">XP</span>
              </div>
            </div>
            <div class="boot-edition">Professional</div>
            <div class="boot-bar-wrap">
              <div class="boot-bar"><div class="boot-bar-inner" [style.width.%]="bootPct()"></div></div>
            </div>
            <div class="boot-user">Loading profile for <b>{{ selUser() }}</b>…</div>
          </div>
          <div class="boot-copy">Copyright © Microsoft Corporation</div>
        </div>
      }

      <!-- DESKTOP -->
      @if (phase() === 'desktop') {
        <div class="xp-desktop"
             [style.backgroundImage]="blissStyle"
             (click)="startMenu.set(false)"
             (dblclick)="onDesktopDbl($event)">

          <!-- Desktop icons -->
          <div class="desk-icons">
            <div class="desk-icon">
              <div class="di-img"><svg viewBox="0 0 48 48"><rect x="4" y="5" width="40" height="28" rx="3" fill="#1a4fa8"/><rect x="6" y="7" width="36" height="24" rx="1" fill="#c8e4ff"/><rect x="10" y="14" width="10" height="8" rx="1" fill="#4a90d8"/><rect x="22" y="14" width="10" height="3" rx="1" fill="#6ab0f0"/><rect x="22" y="19" width="7" height="3" rx="1" fill="#6ab0f0"/><rect x="18" y="33" width="12" height="4" fill="#1a4fa8"/><rect x="13" y="37" width="22" height="3" rx="1.5" fill="#2a5fc8"/><g transform="translate(32,9)"><rect x="0" y="0" width="5" height="4" rx=".5" fill="#e83820"/><rect x="5.5" y="0" width="5" height="4" rx=".5" fill="#22b830"/><rect x="0" y="4.5" width="5" height="4" rx=".5" fill="#2030e8"/><rect x="5.5" y="4.5" width="5" height="4" rx=".5" fill="#ffc820"/></g></svg></div>
              <span>My Computer</span>
            </div>
            <div class="desk-icon">
              <div class="di-img"><svg viewBox="0 0 48 48"><path d="M6 16 Q6 12 10 12 L20 12 Q22 12 23 14 L42 14 Q44 14 44 16 L44 38 Q44 40 42 40 L8 40 Q6 40 6 38 Z" fill="#f0c840"/><path d="M6 18 L42 18 L42 38 Q42 40 40 40 L8 40 Q6 40 6 38 Z" fill="#f8d848"/></svg></div>
              <span>My Documents</span>
            </div>
            <div class="desk-icon">
              <div class="di-img"><svg viewBox="0 0 48 48"><path d="M10 16 L38 16 L35 42 Q35 44 33 44 L15 44 Q13 44 13 42 Z" fill="#90a8c8"/><rect x="8" y="13" width="32" height="4" rx="2" fill="#a0b8d0"/><rect x="19" y="9" width="10" height="4" rx="1.5" fill="#a0b8d0"/></svg></div>
              <span>Recycle Bin</span>
            </div>
            <div class="desk-icon" (dblclick)="openHls(); $event.stopPropagation()">
              <div class="di-img"><svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="26" rx="3" fill="#2a2a2a"/><rect x="6" y="10" width="36" height="22" rx="1" fill="url(#hlsS)"/><defs><linearGradient id="hlsS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a2040"/><stop offset="100%" stop-color="#061428"/></linearGradient></defs><rect x="9" y="14" width="18" height="1.5" rx=".75" fill="#00d060" opacity=".8"/><rect x="9" y="17" width="12" height="1.5" rx=".75" fill="#00d060" opacity=".6"/><rect x="9" y="20" width="20" height="1.5" rx=".75" fill="#00d060" opacity=".7"/><rect x="9" y="23" width="8" height="1.5" rx=".75" fill="#00d060" opacity=".5"/><g transform="translate(32,12) scale(.7)"><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#e00020" transform="rotate(0 8 8)"/><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#e00020" transform="rotate(60 8 8)"/><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#e00020" transform="rotate(120 8 8)"/></g><rect x="19" y="34" width="10" height="3" fill="#2a2a2a"/><rect x="14" y="37" width="20" height="3" rx="1.5" fill="#3a3a3a"/></svg></div>
              <span>Huawei HLS</span>
            </div>
            <div class="desk-icon" (dblclick)="openHls(); $event.stopPropagation()">
              <div class="di-img"><svg viewBox="0 0 48 48"><path d="M24 4 C24 4 36 14 36 26 C36 34 30 40 24 44 C18 40 12 34 12 26 C12 14 24 4 24 4 Z" fill="url(#mG)"/><defs><linearGradient id="mG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ea94b"/><stop offset="100%" stop-color="#2e7d32"/></linearGradient></defs><text x="24" y="30" text-anchor="middle" font-size="11" font-weight="900" fill="white" font-family="Arial">M</text></svg></div>
              <span>MongoDB</span>
            </div>
          </div>

          <!-- HLS Window — XP.css-style chrome -->
          @if (hlsState !== 'closed') {
            <div class="xp-win hls-win" [class.minimized]="hlsState==='minimized'"
                 [style.left.px]="hlsX()" [style.top.px]="hlsY()"
                 [style.width.px]="hlsW()" [style.height.px]="hlsH()">

              <!-- XP Luna title bar -->
              <div class="xp-tb hls-tb" (mousedown)="startHlsDrag($event)">
                <div class="xp-tb-left">
                  <svg class="xp-tb-ico" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#0a1628"/><g transform="translate(2,1.5) scale(.7)"><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#e00020" transform="rotate(0 8 8)"/><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#e00020" transform="rotate(60 8 8)"/><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#e00020" transform="rotate(120 8 8)"/><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#c00018" transform="rotate(180 8 8)"/><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#c00018" transform="rotate(240 8 8)"/><ellipse cx="8" cy="4" rx="2.5" ry="4" fill="#c00018" transform="rotate(300 8 8)"/></g></svg>
                  <span class="xp-tb-text">Huawei HLS — MongoDB Explorer</span>
                </div>
                <div class="xp-tb-ctrl">
                  <button class="xwb xwb-min" (mousedown)="$event.stopPropagation()" (click)="hlsState='minimized'">
                    <svg viewBox="0 0 8 2" width="8"><rect width="8" height="2" fill="currentColor"/></svg>
                  </button>
                  <button class="xwb xwb-max" (mousedown)="$event.stopPropagation()" (click)="toggleHlsMax()">
                    <svg viewBox="0 0 9 9" width="9"><rect x=".5" y=".5" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
                  </button>
                  <button class="xwb xwb-cls" (mousedown)="$event.stopPropagation()" (click)="hlsState='closed'">
                    <svg viewBox="0 0 9 9" width="9"><line x1=".5" y1=".5" x2="8.5" y2="8.5" stroke="currentColor" stroke-width="1.5"/><line x1="8.5" y1=".5" x2=".5" y2="8.5" stroke="currentColor" stroke-width="1.5"/></svg>
                  </button>
                </div>
              </div>

              <div class="win-menubar">@for (m of menuItems; track m){<span class="mi">{{m}}</span>}</div>

              @if (hlsState==='open') {
                <div class="win-toolbar">
                  <button class="tl-icon-btn" title="Refresh" (click)="loadDbs()"><svg viewBox="0 0 16 16" width="13"><path d="M2 8a6 6 0 0 1 10-4.5L14 2v4h-4l1.5-1.5A4 4 0 1 0 12 12" stroke="#4a8ad8" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></button>
                  <button class="tl-icon-btn" [disabled]="!selCol()" title="Insert" (click)="insertMode.update(v=>!v)"><svg viewBox="0 0 16 16" width="13"><rect x="2" y="3" width="9" height="11" rx="1" fill="none" stroke="#666" stroke-width="1.4"/><line x1="11" y1="8" x2="14" y2="8" stroke="#22a850" stroke-width="1.5"/><line x1="12.5" y1="6.5" x2="12.5" y2="9.5" stroke="#22a850" stroke-width="1.5"/></svg></button>
                  <div class="tb-sep"></div>
                  <div class="tb-addr">
                    <span class="tl-lbl">mongodb://localhost:27017</span>
                    @if(selDb()){<span class="tl-sep">/</span><span class="tl-blue mono">{{selDb()}}</span>}
                    @if(selCol()){<span class="tl-sep">/</span><span class="tl-green mono">{{selCol()}}</span>}
                  </div>
                  <div class="tb-status-dot" [class.ok]="mongoOk()"></div>
                </div>

                <div class="win-body">
                  <div class="win-tree">
                    <div class="tr-head">
                      <svg viewBox="0 0 14 14" width="12"><ellipse cx="7" cy="10" rx="5" ry="2.5" fill="#4a7fc1"/><rect x="2" y="6" width="10" height="4" fill="#4a7fc1"/><ellipse cx="7" cy="6" rx="5" ry="2.5" fill="#5a8fd1"/><rect x="2" y="3" width="10" height="3" fill="#5a8fd1"/><ellipse cx="7" cy="3" rx="5" ry="2.5" fill="#7ab0f0"/></svg>
                      Databases
                      <button class="tr-ref" (click)="loadDbs()"><svg viewBox="0 0 12 12" width="10"><path d="M1.5 6a4.5 4.5 0 0 1 7.8-3L10.5 1.5v3h-3l1.2-1.2A3 3 0 1 0 9 9" stroke="#666" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg></button>
                    </div>
                    @if(ldgDbs()){<div class="tr-msg"><div class="spin-s"></div> Loading…</div>}
                    @else {
                      @for(db of dbs(); track db.name){
                        <div class="tr-db" [class.sel]="selDb()===db.name" (click)="selectDb(db.name)">
                          <svg width="12" height="12" viewBox="0 0 12 12"><ellipse cx="6" cy="9" rx="4" ry="2" fill="#4a7fc1"/><rect x="2" y="5" width="8" height="4" fill="#4a7fc1"/><ellipse cx="6" cy="5" rx="4" ry="2" fill="#7ab0f0"/></svg>
                          <span class="tr-db-name">{{db.name}}</span>
                          <span class="tr-ch">{{selDb()===db.name?'▾':'▸'}}</span>
                        </div>
                        @if(selDb()===db.name){
                          @if(ldgCols()){<div class="tr-col tr-msg"><div class="spin-s"></div></div>}
                          @else {
                            @for(c of cols(); track c.name){
                              <div class="tr-col" [class.sel]="selCol()===c.name" (click)="selectCol(c.name)">
                                <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="1" width="9" height="9" rx="1" fill="#5a90e0"/><line x1="1" y1="4" x2="10" y2="4" stroke="white" stroke-width=".8"/><line x1="1" y1="7" x2="10" y2="7" stroke="white" stroke-width=".8"/><line x1="4.5" y1="1" x2="4.5" y2="10" stroke="white" stroke-width=".8"/></svg>
                                <span>{{c.name}}</span><span class="col-n">{{c.count}}</span>
                              </div>
                            }
                            @empty{<div class="tr-col tr-msg">Empty</div>}
                          }
                        }
                      }
                      @empty{<div class="tr-msg tr-err">{{mongoErr()||'No databases'}}</div>}
                    }
                  </div>
                  <div class="win-cnt">
                    @if(!selCol()){
                      <div class="no-sel"><svg viewBox="0 0 80 64" width="56"><ellipse cx="40" cy="50" rx="24" ry="10" fill="#d0e4f8"/><rect x="16" y="28" width="48" height="22" fill="#d0e4f8"/><ellipse cx="40" cy="28" rx="24" ry="10" fill="#e0eeff"/></svg><p>Select a collection</p></div>
                    } @else {
                      <div class="flt-bar">
                        <input class="flt-in" [(ngModel)]="filterTxt" placeholder='{"key":"value"}' (keydown.enter)="applyFilter()"/>
                        <button class="fb fb-find" (click)="applyFilter()">Find</button>
                        <button class="fb" (click)="clearFilter()">✕</button>
                        <span class="flt-cnt">{{totDocs()}} doc{{totDocs()!==1?'s':''}}</span>
                      </div>
                      @if(insertMode()){
                        <div class="ins-panel">
                          <textarea class="ins-ta" [(ngModel)]="insertJson" placeholder='{ "field": "value" }'></textarea>
                          @if(insErr()){<div class="ins-err">⚠ {{insErr()}}</div>}
                          <div class="ins-acts">
                            <button class="fb fb-g" (click)="doInsert()">Insert</button>
                            <button class="fb" (click)="insertMode.set(false)">Cancel</button>
                          </div>
                        </div>
                      }
                      @if(ldgDocs()){<div class="doc-loading"><div class="spin"></div> Loading…</div>}
                      @else{
                        <div class="doc-list">
                          @for(d of docs(); track $index){
                            <div class="doc-card" [class.exp]="expIdx()===$index">
                              <div class="dc-hdr" (click)="expIdx.set(expIdx()===$index?-1:$index)">
                                <span class="dc-ch">{{expIdx()===$index?'▾':'▸'}}</span>
                                <span class="dc-id mono">{{docId(d)}}</span>
                                <button class="dc-del" (click)="delDoc($index,$event)">✕</button>
                              </div>
                              @if(expIdx()===$index){<pre class="dc-json">{{prettyJson(d)}}</pre>}
                            </div>
                          }
                          @empty{<div class="no-doc">No documents.</div>}
                        </div>
                        @if(totDocs()>pgSize){
                          <div class="pgn">
                            <button class="pgb" [disabled]="pg()===0" (click)="prevPg()">‹ Prev</button>
                            <span class="pg-info">{{pg()+1}} / {{totPgs()}}</span>
                            <button class="pgb" [disabled]="pg()>=totPgs()-1" (click)="nextPg()">Next ›</button>
                          </div>
                        }
                      }
                    }
                  </div>
                </div>

                <!-- XP status bar -->
                <div class="xp-sbar hls-sb">
                  <span class="xp-sbf">{{selDb()||'No database'}}{{selCol()?' › '+selCol():''}}</span>
                  <span class="xp-sbf hls-conn" [class.conn-ok]="mongoOk()">
                    <svg viewBox="0 0 8 8" width="7"><circle cx="4" cy="4" r="3.5" [attr.fill]="mongoOk()?'#22a850':'#cc2020'"/></svg>
                    MongoDB {{mongoOk()?'Connected':'Offline'}}
                  </span>
                </div>
              }
            </div>
          }

          <!-- Taskbar -->
          <div class="xp-taskbar" [class.tb-in]="tbIn()">
            <button class="xp-start" (click)="startMenu.update(v=>!v);$event.stopPropagation()">
              <img [src]="xpLogo" class="start-flag" alt=""/>
              <span>start</span>
            </button>
            <div class="tb-div"></div>
            @if(hlsState!=='closed'){
              <button class="tb-task" [class.tb-active]="hlsState==='open'"
                      (click)="hlsState=hlsState==='minimized'?'open':'minimized'">
                Huawei HLS
              </button>
            }
            <div class="sys-tray">
              <svg viewBox="0 0 14 14" width="12"><path d="M2 5h2l3-3v10l-3-3H2z" fill="rgba(255,255,255,.7)"/><path d="M9 4.5a3 3 0 0 1 0 5" stroke="rgba(255,255,255,.7)" stroke-width="1.2" fill="none"/></svg>
              <span class="tray-time">{{now | date:'HH:mm'}}</span>
              <button class="exit-vm" (click)="phase.set('off')" title="Power off">⏻</button>
            </div>
          </div>

          @if(startMenu()){
            <div class="start-popup" (click)="$event.stopPropagation()">
              <div class="sp-user">
                <div class="sp-av"><svg viewBox="0 0 40 40" width="30"><circle cx="20" cy="14" r="9" fill="rgba(255,255,255,.9)"/><ellipse cx="20" cy="32" rx="14" ry="8" fill="rgba(255,255,255,.9)"/></svg></div>
                <span>{{selUser()}}</span>
              </div>
              <div class="sp-cols">
                <div class="sp-left">
                  <div class="sp-pin" (click)="openHls(); startMenu.set(false)">
                    <svg class="sp-pin-ico" viewBox="0 0 20 20"><rect width="20" height="20" rx="3" fill="#0a1628"/></svg>
                    <div class="sp-pin-text"><span>Huawei HLS</span><small>MongoDB Explorer</small></div>
                  </div>
                </div>
                <div class="sp-right">
                  <div class="sp-item sp-red" (click)="phase.set('login');selUser.set('');startMenu.set(false)">Log Off…</div>
                  <div class="sp-item sp-red" (click)="phase.set('off');startMenu.set(false)">Shut Down…</div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div><!-- /vm-xp-area -->

    <!-- VirtualBox status bar -->
    <div class="vm-statusbar">
      <div class="vm-sb-left">
        @if (phase()==='desktop') {
          <span class="vm-sb-chip running">● Running</span>
        } @else {
          <span class="vm-sb-chip starting">● Starting</span>
        }
        <span class="vm-sb-info">Windows XP Professional (32-bit)</span>
      </div>
      <div class="vm-sb-right">
        <svg viewBox="0 0 14 14" width="11"><rect x="1" y="4" width="5" height="4" rx=".8" fill="rgba(255,255,255,.5)"/><rect x="8" y="4" width="5" height="4" rx=".8" fill="rgba(255,255,255,.5)"/><line x1="6" y1="6" x2="8" y2="6" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/></svg>
        <svg viewBox="0 0 14 14" width="11"><path d="M2 5h2l3-3v10l-3-3H2z" fill="rgba(255,255,255,.5)"/></svg>
        <svg viewBox="0 0 14 14" width="11"><ellipse cx="7" cy="10" rx="5" ry="2" fill="rgba(255,255,255,.5)"/><rect x="2" y="5" width="10" height="5" fill="rgba(255,255,255,.5)"/><ellipse cx="7" cy="5" rx="5" ry="2" fill="rgba(255,255,255,.6)"/></svg>
        <span class="vm-sb-res">{{vmW()}}×{{vmH()}} px</span>
      </div>
    </div>

  </div><!-- /vm-win -->
</div><!-- /vm-host-bg -->
}
  `,
  styles: [`
    :host { position: absolute; inset: 0; display: block; overflow: hidden; font-family: -apple-system, 'Segoe UI', sans-serif; }

    /* ══════════════════════════════════════════════════════════
       XP WINDOW CHROME — shared by VM Manager + HLS window
    ══════════════════════════════════════════════════════════ */
    .xp-win {
      display: flex; flex-direction: column; overflow: hidden;
      background: #ece9d8;
      border: 2px solid #003bda;
      box-shadow:
        inset 1px 1px #166aee,
        inset -1px -1px #001ea0,
        0 6px 24px rgba(0,0,0,.45);
    }

    /* Luna blue title bar */
    .xp-tb {
      height: 26px; flex: none;
      background: linear-gradient(180deg,
        #0997ff 0%, #0053ee 8%, #0050ee 40%,
        #0066ff 88%, #0066ff 93%,
        #005bff 95%, #003dd7 96%, #003dd7 100%);
      padding: 3px 3px 3px 6px;
      display: flex; align-items: center; justify-content: space-between;
      user-select: none;
    }
    .xp-tb-left { display: flex; align-items: center; gap: 5px; overflow: hidden; flex: 1; }
    .xp-tb-ico { width: 15px; height: 15px; object-fit: contain; flex: none; }
    .xp-tb-text {
      font-family: Tahoma, 'MS Sans Serif', sans-serif;
      font-size: 11px; font-weight: bold; color: white;
      text-shadow: 1px 1px 2px rgba(0,0,0,.5);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .xp-tb-ctrl { display: flex; gap: 2px; flex: none; margin-left: 4px; }

    /* XP window control buttons */
    .xwb {
      width: 21px; height: 20px; padding: 0;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(0,0,0,.3);
      cursor: pointer;
    }
    .xwb-min, .xwb-max {
      background: linear-gradient(180deg, #6090e0 0%, #1c64c8 50%, #1050b8 100%);
      color: rgba(255,255,255,.9);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.3), inset -1px 0 rgba(0,0,0,.2);
    }
    .xwb-min:hover, .xwb-max:hover { filter: brightness(1.2); }
    .xwb-cls {
      background: linear-gradient(180deg, #f05040 0%, #d02010 50%, #b81808 100%);
      color: white;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.3), inset -1px 0 rgba(0,0,0,.2);
    }
    .xwb-cls:hover { filter: brightness(1.2); }
    .xwb:active { filter: brightness(.85); }

    /* XP menu bar */
    .xp-menubar {
      background: #ece9d8; border-bottom: 1px solid #aca899;
      height: 22px; flex: none; display: flex; align-items: center;
      font-family: Tahoma, sans-serif; font-size: 11px; padding: 0 4px;
    }
    .xp-mi {
      padding: 2px 8px; cursor: default;
      display: flex; align-items: center; height: 100%;
    }
    .xp-mi:hover { background: #316ac5; color: white; }

    /* XP toolbar */
    .xp-toolbar {
      background: linear-gradient(180deg, #ece9d8 0%, #d8d4cc 100%);
      border-bottom: 1px solid #aca899;
      height: 28px; flex: none;
      display: flex; align-items: center; gap: 2px; padding: 0 4px;
    }
    .xp-tl-btn {
      height: 22px; padding: 0 8px;
      background: linear-gradient(180deg, #f4f0e4, #ddd8cc);
      border: 1px solid #9a8888;
      font-size: 11px; font-family: Tahoma, sans-serif;
      cursor: pointer; display: flex; align-items: center;
      border-radius: 2px; white-space: nowrap;
    }
    .xp-tl-btn:hover { background: linear-gradient(180deg, #cce0f8, #a8c8f0); border-color: #316ac5; }
    .xp-tl-btn:active { background: linear-gradient(180deg, #a8c8f0, #cce0f8); }
    .xp-tl-start {
      background: linear-gradient(180deg, #9ad048, #58a008);
      color: white; border-color: #2a7800; font-weight: 600;
    }
    .xp-tl-start:hover { background: linear-gradient(180deg, #b0e060, #70b820); border-color: #1a6000; }
    .xp-tl-sep { width: 1px; height: 18px; background: #aca899; margin: 0 3px; }

    /* XP status bar */
    .xp-sbar {
      flex: none;
      background: #ece9d8; border-top: 1px solid #aca899;
      display: flex; gap: 1px;
      font-family: Tahoma, sans-serif; font-size: 11px;
    }
    .xp-sbf {
      flex: 1; padding: 2px 6px; height: 18px;
      display: flex; align-items: center;
      box-shadow: inset -1px -1px white, inset 1px 1px #848284;
    }

    /* XP buttons (detail panel actions) */
    .xp-btn {
      padding: 3px 14px; min-height: 23px; min-width: 72px;
      background: linear-gradient(180deg, #f4f0e4, #ddd8cc);
      border: 1px solid #9a8888;
      font-size: 11px; font-family: Tahoma, sans-serif;
      cursor: pointer; border-radius: 2px;
      box-shadow: inset 1px 1px rgba(255,255,255,.8), inset -1px -1px rgba(0,0,0,.1);
    }
    .xp-btn:hover { background: linear-gradient(180deg, #cce0f8, #a8c8f0); border-color: #316ac5; }
    .xp-btn:active { background: linear-gradient(180deg, #a8c8f0, #cce0f8); }
    .xp-btn-start {
      background: linear-gradient(180deg, #9ad048, #58a008);
      color: white; border-color: #2a7800; font-weight: 600;
      box-shadow: inset 1px 1px rgba(255,255,255,.4), 0 2px 6px rgba(40,120,0,.35);
    }
    .xp-btn-start:hover { background: linear-gradient(180deg, #b0e060, #70b820); }

    /* XP fieldsets */
    .xp-field {
      border: 2px groove #c0bdb8;
      padding: 5px 8px; margin: 0;
      font-family: Tahoma, sans-serif; font-size: 11px;
    }
    .xp-field legend {
      font-size: 11px; font-weight: bold; padding: 0 4px;
      font-family: Tahoma, sans-serif;
    }

    /* ══ VM MANAGER (off state) ══ */
    .vmm-page {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      background: radial-gradient(ellipse 100% 80% at 50% 40%, #e8d4d8 0%, #d8d0d8 40%, #c8c8d8 100%);
    }
    .vmm-win {
      width: 100%; max-width: 840px;
      max-height: calc(100% - 20px);
    }

    /* Split body */
    .vmm-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }

    /* VM list sidebar */
    .vmm-vlist {
      width: 210px; flex: none;
      background: white; border-right: 2px solid #aca899;
      overflow-y: auto; padding: 2px;
    }
    .vmm-vitem {
      display: flex; align-items: center; gap: 8px; padding: 6px 8px;
      cursor: default; font-family: Tahoma, sans-serif;
    }
    .vmm-sel { background: #316ac5; color: white; }
    .vmm-vico { width: 24px; height: 24px; object-fit: contain; flex: none; }
    .vmm-vname {
      font-size: 11px; font-weight: 600; display: block; line-height: 1.3;
    }
    .vmm-vstate {
      font-size: 10px; display: block; color: #888;
    }
    .vmm-sel .vmm-vstate { color: rgba(255,255,255,.75); }

    /* Detail panel */
    .vmm-vdetail {
      flex: 1; overflow-y: auto; padding: 10px 12px;
      background: #ece9d8;
      display: flex; flex-direction: column; gap: 8px;
    }

    .vmm-dh {
      display: flex; align-items: center; gap: 12px;
      padding-bottom: 8px; border-bottom: 1px solid #aca899;
    }
    .vmm-dico { width: 48px; height: 48px; object-fit: contain; }
    .vmm-dname {
      font-size: 14px; font-weight: bold; color: #000080;
      font-family: Tahoma, sans-serif;
    }
    .vmm-dstate { font-size: 11px; color: #666; font-family: Tahoma, sans-serif; }

    .vmm-acts { display: flex; gap: 5px; flex-wrap: wrap; }

    .vmm-div { height: 1px; background: #aca899; margin: 0; }

    .vmm-stbl {
      width: 100%; border-collapse: collapse;
      font-family: Tahoma, sans-serif; font-size: 11px;
    }
    .vmm-stbl td { padding: 2px 4px; vertical-align: top; }
    .vmm-stbl td:first-child { color: #444; width: 130px; white-space: nowrap; }

    /* ══ VM HOST BG ══ */
    .vm-host-bg {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 120% 80% at 50% 50%, #1e2030 0%, #12141c 100%);
    }

    /* ══ VM OUTER WINDOW (VirtualBox-style dark chrome) ══ */
    .vm-win {
      position: absolute; display: flex; flex-direction: column;
      border-radius: 8px 8px 6px 6px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.08);
    }
    @keyframes vmAppear { from { transform: scale(.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .vm-win-max { inset: 0 !important; width: 100% !important; height: 100% !important; border-radius: 0; }

    /* VirtualBox title bar */
    .vm-tb {
      background: linear-gradient(180deg, #3c3c4e 0%, #28282e 100%);
      height: 28px; flex: none; padding: 0 6px 0 8px;
      display: flex; align-items: center; justify-content: space-between;
      cursor: move; user-select: none; border-bottom: 1px solid #1a1a20;
    }
    .vm-tb-left { display: flex; align-items: center; gap: 7px; overflow: hidden; }
    .vm-tb-ico { width: 14px; height: 14px; object-fit: contain; flex: none; }
    .vm-tb-title { color: #c8c8d8; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vm-state-tag { color: #909098; font-size: 10px; margin-left: 2px; }
    .vm-state-tag.running { color: #50c878; }
    .vm-tb-btns { display: flex; gap: 4px; flex: none; margin-left: 8px; }
    .vm-btn {
      width: 20px; height: 20px; border-radius: 4px; border: 1px solid rgba(255,255,255,.1);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,.07);
    }
    .vm-btn:hover { background: rgba(255,255,255,.18); border-color: rgba(255,255,255,.25); }
    .vm-btn-cls:hover { background: #c0302a; border-color: #e04040; }

    /* VirtualBox menu bar */
    .vm-menubar {
      background: #2c2c38; border-bottom: 1px solid #1a1a20;
      height: 22px; display: flex; align-items: center; padding: 0 4px; flex: none;
    }
    .vm-mi { font-size: 11px; padding: 0 9px; height: 100%; display: flex; align-items: center; cursor: pointer; color: #b0b0c0; }
    .vm-mi:hover { background: rgba(255,255,255,.1); color: white; border-radius: 3px; }

    /* XP content area */
    .vm-xp-area { flex: 1; position: relative; overflow: hidden; }

    /* BIOS screen */
    .bios-screen { position: absolute; inset: 0; background: #000; padding: 14px 18px; }
    .bios-text { color: #c8c8c8; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.5; margin: 0; white-space: pre; }
    .bios-cursor { color: #c8c8c8; font-family: monospace; font-size: 11px; animation: blink .8s step-end infinite; display: inline; }
    @keyframes blink { 50% { opacity: 0; } }

    /* VirtualBox status bar */
    .vm-statusbar {
      height: 22px; flex: none;
      background: linear-gradient(180deg, #2e2e3a 0%, #22222c 100%);
      border-top: 1px solid #1a1a20;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 10px; font-size: 10px; color: #8888a0;
    }
    .vm-sb-left { display: flex; align-items: center; gap: 10px; }
    .vm-sb-chip { font-size: 10px; padding: 1px 7px; border-radius: 10px; font-weight: 600; }
    .vm-sb-chip.running { color: #50c878; background: rgba(80,200,120,.12); }
    .vm-sb-chip.starting { color: #f0c060; background: rgba(240,192,96,.12); }
    .vm-sb-info { font-size: 10px; }
    .vm-sb-right { display: flex; align-items: center; gap: 8px; }
    .vm-sb-res { font-size: 9px; color: #6868a0; font-family: monospace; }

    /* ══ XP AUTHENTIC WELCOME SCREEN ══ */
    .xl-screen {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      background:
        radial-gradient(ellipse 70% 80% at 68% 48%, #3a74c8 0%, transparent 65%),
        linear-gradient(160deg, #1c3c7c 0%, #1a3a80 30%, #152e6e 60%, #0f2258 100%);
      font-family: Tahoma, 'MS Sans Serif', sans-serif;
    }
    .xl-topbar {
      height: 38px; flex: none;
      background: linear-gradient(180deg, #1a3878 0%, #112460 100%);
      border-bottom: 2px solid rgba(255,255,255,.12);
      display: flex; align-items: center; padding: 0 18px;
    }
    .xl-topbar-logo { display: flex; align-items: center; gap: 10px; }
    .xl-tb-flag { width: 28px; height: 28px; object-fit: contain; }
    .xl-topbar-text { display: flex; align-items: baseline; gap: 0; line-height: 1; }
    .xl-tb-windows { font-size: 16px; font-weight: 400; color: white; font-style: italic; letter-spacing: .5px; }
    .xl-tb-divider  { width: 1px; height: 16px; background: rgba(255,255,255,.4); margin: 0 7px; align-self: center; }
    .xl-tb-xp  { font-size: 16px; font-weight: 700; color: white; font-style: italic; letter-spacing: 1px; }
    .xl-tb-ed  { font-size: 9px; color: rgba(255,255,255,.6); letter-spacing: 2px; margin-left: 6px; text-transform: uppercase; }
    .xl-main { flex: 1; display: flex; min-height: 0; }
    .xl-left {
      width: 38%; flex: none; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 14px; padding: 16px 24px;
    }
    .xl-brand { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .xl-flag  { width: 90px; height: 90px; object-fit: contain; filter: drop-shadow(2px 4px 10px rgba(0,0,0,.55)); }
    .xl-brand-text { text-align: center; }
    .xl-windows { display: block; font-size: 22px; font-weight: 300; color: white; font-style: italic; line-height: 1.1; }
    .xl-xp      { display: block; font-size: 22px; font-weight: 800; color: white; font-style: italic; letter-spacing: 4px; line-height: 1; }
    .xl-edition { display: block; font-size: 10px; color: rgba(255,255,255,.65); letter-spacing: 4px; text-transform: uppercase; margin-top: 3px; }
    .xl-tagline { color: rgba(255,255,255,.75); font-size: 12px; text-align: center; max-width: 160px; line-height: 1.4; }
    .xl-sep {
      width: 2px; flex: none;
      background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,.3) 20%, rgba(255,255,255,.5) 50%, rgba(255,255,255,.3) 80%, transparent 100%);
      box-shadow: 0 0 8px rgba(100,160,255,.5);
    }
    .xl-right { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px 20px; }
    .xl-tiles { display: flex; flex-direction: column; gap: 4px; width: 100%; max-width: 280px; }
    .xl-tile {
      display: flex; align-items: center; gap: 12px; padding: 8px 12px;
      background: transparent; border: none; cursor: pointer; border-radius: 4px;
      color: white; width: 100%; text-align: left; transition: background .12s;
    }
    .xl-tile:hover { background: rgba(255,255,255,.15); }
    .xl-tile-sel { background: rgba(255,255,255,.28) !important; outline: 1px solid rgba(255,255,255,.5); pointer-events: none; }
    .xl-pic {
      width: 48px; height: 48px; border-radius: 4px; flex: none;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid rgba(255,255,255,.4); box-shadow: 0 2px 8px rgba(0,0,0,.4);
    }
    .xl-pic-lg { width: 58px; height: 58px; border-radius: 6px; }
    .xl-tile-info { display: flex; flex-direction: column; gap: 1px; }
    .xl-tile-name { font-size: 13px; font-weight: 700; color: white; }
    .xl-tile-role { font-size: 10px; color: rgba(255,255,255,.6); }
    .xl-pwarea { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 280px; }
    .xl-sel-tile { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
    .xl-sel-name { font-size: 14px; font-weight: 700; color: white; }
    .xl-pw-label { color: rgba(255,255,255,.8); font-size: 11px; margin: 0; }
    .xl-pw-row { display: flex; align-items: center; gap: 4px; }
    .xl-pw-input {
      width: 148px; height: 22px; padding: 2px 6px;
      background: white; border: 1px solid #7a9ad0; border-radius: 2px;
      font-size: 13px; color: #000; font-family: 'Courier New', monospace; outline: none;
    }
    .xl-pw-input:focus { border-color: #3060c0; box-shadow: 0 0 0 1px #3060c0; }
    .xl-pw-input.xl-pw-shake { animation: xpShake .3s ease; }
    @keyframes xpShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
    .xl-pw-arrow {
      width: 26px; height: 22px; border-radius: 3px; cursor: pointer; border: 1px solid #006830;
      background: linear-gradient(180deg, #28c060 0%, #009838 50%, #007830 100%);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,.4);
    }
    .xl-pw-arrow:hover { filter: brightness(1.15); }
    .xl-pw-help {
      width: 22px; height: 22px; border-radius: 3px; cursor: pointer;
      background: linear-gradient(180deg, #4888e8 0%, #1a5ccc 100%);
      border: 1px solid #1040a0; color: white; font-size: 11px; font-weight: 700;
      box-shadow: 0 1px 3px rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center;
    }
    .xl-pw-err { color: #ffb0b0; font-size: 10px; display: flex; align-items: center; gap: 4px; margin: 0; }
    .xl-back-link {
      background: none; border: none; color: rgba(255,255,255,.55); font-size: 10px;
      cursor: pointer; text-decoration: underline; text-align: left; padding: 0; margin-top: 2px;
    }
    .xl-back-link:hover { color: white; }
    .xl-bottombar {
      height: 40px; flex: none;
      background: linear-gradient(180deg, #112460 0%, #0a1840 100%);
      border-top: 2px solid rgba(255,255,255,.12);
      display: flex; align-items: center; justify-content: space-between; padding: 0 18px;
    }
    .xl-turnoff {
      display: flex; align-items: center; gap: 6px; padding: 4px 12px;
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.2);
      border-radius: 3px; color: white; font-size: 11px; cursor: pointer; transition: background .12s;
    }
    .xl-turnoff:hover { background: rgba(255,255,255,.15); }
    .xl-to-dot { color: #e04040; font-size: 14px; line-height: 1; }
    .xl-after-logon { color: rgba(255,255,255,.5); font-size: 9px; text-align: right; line-height: 1.4; margin: 0; max-width: 200px; }

    /* BOOT */
    .xp-boot { position: absolute; inset: 0; background: black; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .boot-center { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .boot-flag-row { display: flex; align-items: center; gap: 14px; }
    .boot-flag { width: 48px; height: 48px; object-fit: contain; }
    .boot-title-block { display: flex; flex-direction: column; }
    .boot-win { font-size: 32px; font-weight: 300; color: white; font-style: italic; }
    .boot-xp  { font-size: 32px; font-weight: 800; color: white; font-style: italic; letter-spacing: 2px; line-height: .85; }
    .boot-edition { color: #5a88d0; font-size: 11px; letter-spacing: 5px; text-transform: uppercase; align-self: flex-end; }
    .boot-bar-wrap { margin-top: 16px; }
    .boot-bar { width: 220px; height: 11px; background: #1a1a1a; border-radius: 6px; overflow: hidden; border: 1px solid #2a2a2a; }
    .boot-bar-inner { height: 100%; background: linear-gradient(90deg,#1060e0,#40a0ff); border-radius: 6px; transition: width .1s linear; box-shadow: 0 0 8px rgba(64,160,255,.7); }
    .boot-user { color: #6888c0; font-size: 11px; }
    .boot-user b { color: #90b0e8; }
    .boot-copy { position: absolute; bottom: 12px; color: #2a2a2a; font-size: 10px; }

    /* DESKTOP */
    .xp-desktop { position: absolute; inset: 0 0 28px 0; background: #1e6aac center/cover no-repeat; }
    .desk-icons { position: absolute; top: 8px; left: 8px; display: flex; flex-direction: column; gap: 3px; }
    .desk-icon { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 64px; padding: 4px 2px; border-radius: 3px; cursor: default; user-select: none; }
    .desk-icon:hover { background: rgba(30,100,220,.4); outline: 1px dotted rgba(255,255,255,.7); }
    .di-img { width: 38px; height: 38px; pointer-events: none; }
    .desk-icon span { font-size: 10px; color: white; text-shadow: 1px 1px 3px rgba(0,0,0,.9); text-align: center; line-height: 1.2; max-width: 62px; word-break: break-word; font-family: Tahoma,sans-serif; }

    /* HLS Window */
    .hls-win { position: absolute; min-width: 320px; min-height: 200px; }
    .hls-win.minimized { display: none; }
    .hls-tb { cursor: move; }
    .hls-sb { height: auto; }
    .hls-conn { flex: none; }
    .conn-ok { color: #168820; }

    /* HLS menu bar */
    .win-menubar { background: #ece9d8; border-bottom: 1px solid #aca899; height: 20px; display: flex; align-items: center; padding: 0 2px; flex: none; }
    .mi { font-size: 11px; padding: 0 7px; height: 100%; display: flex; align-items: center; cursor: pointer; font-family: Tahoma,sans-serif; }
    .mi:hover { background: #316ac5; color: white; }

    /* HLS toolbar */
    .win-toolbar { background: linear-gradient(180deg,#dcd8ce,#ccc8bc); border-bottom: 1px solid #aca899; height: 24px; display: flex; align-items: center; gap: 2px; padding: 0 5px; flex: none; }
    .tl-icon-btn { width: 20px; height: 18px; display: flex; align-items: center; justify-content: center; background: none; border: 1px solid transparent; border-radius: 2px; cursor: pointer; }
    .tl-icon-btn:hover { background: rgba(255,255,255,.6); border-color: #8080c8; }
    .tl-icon-btn[disabled] { opacity: .4; cursor: default; }
    .tb-sep { width: 1px; height: 14px; background: #aca899; margin: 0 3px; }
    .tb-addr { flex: 1; display: flex; align-items: center; gap: 3px; margin: 0 5px; background: white; border: 1px solid #7a96c8; border-radius: 2px; padding: 1px 5px; height: 17px; font-size: 10px; overflow: hidden; }
    .tl-lbl { color: #555; white-space: nowrap; }
    .tl-sep { color: #aaa; }
    .tl-blue { color: #1a60d0; }
    .tl-green { color: #1a8030; }
    .mono { font-family: Consolas,monospace; }
    .tb-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #cc2020; border: 1px solid rgba(0,0,0,.3); flex: none; }
    .tb-status-dot.ok { background: #22a850; }

    /* HLS body */
    .win-body { display: flex; flex: 1; overflow: hidden; }
    .win-tree { width: 160px; flex: none; background: white; border-right: 1px solid #aca899; overflow-y: auto; font-size: 11px; font-family: Tahoma,sans-serif; }
    .tr-head { background: linear-gradient(180deg,#e4e0d8,#d4d0c8); padding: 4px 7px; font-weight: 700; font-size: 10px; display: flex; align-items: center; gap: 4px; border-bottom: 1px solid #aca899; position: sticky; top: 0; text-transform: uppercase; color: #333; }
    .tr-ref { margin-left: auto; background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 1px; border-radius: 2px; }
    .tr-ref:hover { background: rgba(0,0,0,.1); }
    .tr-db { padding: 4px 7px; cursor: pointer; display: flex; align-items: center; gap: 5px; border-bottom: 1px solid #f0ece4; font-size: 11px; }
    .tr-db:hover,.tr-db.sel { background: #316ac5; color: white; }
    .tr-db-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tr-ch { font-size: 8px; opacity: .7; }
    .tr-col { padding: 3px 7px 3px 19px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 10px; border-bottom: 1px solid #f5f2ee; }
    .tr-col:hover,.tr-col.sel { background: #4a88d8; color: white; }
    .col-n { margin-left: auto; font-size: 9px; opacity: .65; }
    .tr-msg { padding: 5px 8px; font-size: 10px; color: #888; display: flex; align-items: center; gap: 4px; }
    .tr-err { color: #b00; }
    .spin-s { width: 9px; height: 9px; border: 1.5px solid #ccc; border-top-color: #316ac5; border-radius: 50%; animation: spin .7s linear infinite; flex: none; }
    .win-cnt { flex: 1; display: flex; flex-direction: column; overflow: hidden; font-size: 11px; font-family: Tahoma,sans-serif; }
    .no-sel { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: #888; font-size: 11px; }
    .flt-bar { display: flex; align-items: center; gap: 4px; padding: 3px 6px; background: #f2efe8; border-bottom: 1px solid #d8d4cc; flex: none; }
    .flt-in { flex: 1; border: 1px solid #7a96c8; border-radius: 2px; padding: 2px 4px; font-size: 10px; font-family: Consolas,monospace; }
    .flt-in:focus { outline: none; border-color: #316ac5; }
    .fb { padding: 2px 6px; font-size: 10px; border: 1px solid #8a8a8a; background: linear-gradient(180deg,#f4f0e4,#ddd8cc); border-radius: 2px; cursor: pointer; }
    .fb-find { background: linear-gradient(180deg,#e8f0fc,#c0d4f0); border-color: #6a90d0; }
    .fb-g { background: linear-gradient(180deg,#70c438,#3a8c0c); color: white; border-color: #288000; }
    .flt-cnt { margin-left: auto; color: #666; font-size: 10px; white-space: nowrap; }
    .ins-panel { background: #fefae8; border-bottom: 1px solid #ddd890; padding: 4px 7px; flex: none; }
    .ins-ta { width: 100%; height: 55px; font-family: Consolas,monospace; font-size: 10px; border: 1px solid #c8c048; border-radius: 2px; padding: 3px; resize: none; }
    .ins-err { color: #c00; font-size: 10px; margin-top: 2px; }
    .ins-acts { display: flex; gap: 4px; margin-top: 3px; }
    .doc-loading { display: flex; align-items: center; gap: 7px; padding: 14px; font-size: 11px; color: #666; }
    .spin { width: 13px; height: 13px; border: 2px solid #d8d4cc; border-top-color: #316ac5; border-radius: 50%; animation: spin .7s linear infinite; flex: none; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .doc-list { flex: 1; overflow-y: auto; padding: 2px 3px; }
    .doc-card { border: 1px solid #d8d4cc; border-radius: 2px; margin-bottom: 2px; background: white; }
    .doc-card.exp { border-color: #316ac5; }
    .dc-hdr { display: flex; align-items: center; gap: 5px; padding: 4px 6px; cursor: pointer; background: #f5f2ea; }
    .dc-hdr:hover { background: #ebe7de; }
    .doc-card.exp .dc-hdr { background: #dce8fc; }
    .dc-ch { font-size: 8px; width: 8px; color: #666; }
    .dc-id { flex: 1; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1a1a4a; }
    .dc-del { padding: 0 4px; font-size: 9px; border: 1px solid #e09090; background: linear-gradient(180deg,#fce8e8,#f0d0d0); border-radius: 2px; cursor: pointer; }
    .dc-json { margin: 0; padding: 5px 9px; font-size: 10px; font-family: Consolas,monospace; color: #1a3060; background: #f0f6ff; border-top: 1px solid #d0e0f8; white-space: pre-wrap; word-break: break-all; max-height: 160px; overflow-y: auto; line-height: 1.4; }
    .no-doc { padding: 18px; text-align: center; color: #888; font-size: 11px; }
    .pgn { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 4px; border-top: 1px solid #d8d4cc; background: #f2efe8; flex: none; font-size: 11px; }
    .pg-info { color: #555; }
    .pgb { padding: 2px 7px; font-size: 10px; border: 1px solid #8a8a8a; background: linear-gradient(180deg,#f4f0e4,#ddd8cc); border-radius: 2px; cursor: pointer; }
    .pgb:disabled { opacity: .38; cursor: default; }

    /* TASKBAR */
    .xp-taskbar { position: absolute; bottom: 0; left: 0; right: 0; height: 28px; background: linear-gradient(180deg,#4a90e0,#1a60d0 54%,#1458c8 100%); border-top: 2px solid #0a3898; display: flex; align-items: center; gap: 2px; padding: 0 2px; z-index: 200; transform: translateY(100%); transition: transform .5s cubic-bezier(.22,.68,0,1.2); font-family: Tahoma,sans-serif; }
    .xp-taskbar.tb-in { transform: translateY(0); }
    .xp-start { height: 24px; padding: 0 11px 0 6px; border-radius: 0 12px 12px 0; background: linear-gradient(180deg,#68d038,#309008 54%,#287800 100%); border: 1px solid #1a6800; border-left: none; color: white; font-size: 13px; font-weight: 800; font-style: italic; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: inset 0 1px 0 rgba(255,255,255,.3); }
    .xp-start:hover { filter: brightness(1.1); }
    .start-flag { width: 15px; height: 15px; object-fit: contain; }
    .tb-div { width: 1px; height: 17px; background: rgba(255,255,255,.18); margin: 0 2px; }
    .tb-task { height: 22px; padding: 0 7px; border-radius: 2px; font-size: 10px; cursor: pointer; background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.16); color: white; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
    .tb-task.tb-active { background: rgba(0,0,0,.4); }
    .sys-tray { margin-left: auto; display: flex; align-items: center; gap: 6px; background: linear-gradient(180deg,#1258c0,#0c48b0); padding: 0 8px; height: 100%; border-left: 1px solid rgba(255,255,255,.1); }
    .tray-time { color: white; font-size: 10px; font-weight: 600; }
    .exit-vm { font-size: 11px; padding: 1px 5px; border-radius: 2px; cursor: pointer; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); color: #bbb; }
    .exit-vm:hover { background: rgba(200,30,30,.5); color: white; }

    /* START MENU */
    .start-popup { position: absolute; bottom: 28px; left: 0; width: 310px; z-index: 500; background: white; border: 2px solid #0a3898; box-shadow: 4px -4px 16px rgba(0,0,0,.5); border-radius: 6px 6px 0 0; overflow: hidden; font-size: 12px; font-family: Tahoma,sans-serif; }
    .sp-user { background: linear-gradient(90deg,#1a68d8,#4a98f0); padding: 9px 12px; display: flex; align-items: center; gap: 9px; color: white; font-weight: 700; font-size: 13px; }
    .sp-av { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#f0d880,#e8b030); display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,.5); }
    .sp-cols { display: flex; }
    .sp-left { width: 55%; border-right: 1px solid #e0ddd8; padding: 5px 0; }
    .sp-right { width: 45%; background: #e8e0f0; padding: 5px 0; }
    .sp-pin { display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer; }
    .sp-pin:hover { background: #316ac5; color: white; }
    .sp-pin-ico { width: 18px; height: 18px; border-radius: 2px; flex: none; }
    .sp-pin-text span { font-size: 12px; font-weight: 600; display: block; }
    .sp-pin-text small { font-size: 10px; color: #888; }
    .sp-pin:hover .sp-pin-text small { color: rgba(255,255,255,.75); }
    .sp-item { padding: 6px 12px; font-size: 12px; cursor: pointer; color: #222; }
    .sp-item:hover { background: #316ac5; color: white; }
    .sp-red { color: #880000 !important; }
  `],
})
export class VmDesktop implements OnInit, OnDestroy {
  private svc    = inject(VmService);
  private hostEl = inject(ElementRef<HTMLElement>);

  readonly blissStyle = `url('${BLISS_URL}'), linear-gradient(180deg,#1a5c9a 0%,#4a90e0 40%,#90ccf0 75%)`;
  readonly xpLogo    = XP_LOGO;
  menuItems = ['File', 'Edit', 'View', 'Query', 'Tools', 'Help'];
  vbMenus   = ['Machine', 'View', 'Input', 'Devices', 'Help'];
  vmmMenus  = ['File', 'Machine', 'View', 'Help'];

  biosLines = `Phoenix BIOS v4.0  Copyright 1985-2004 Phoenix Technologies Ltd.

CPU: Intel Pentium 4 1.80GHz
Memory test: 524288K OK

Detecting Primary Master ... VBOX HARDDISK
Detecting Primary Slave  ... None
Detecting Secondary Master ... VBOX CD-ROM
Detecting Secondary Slave  ... None

Press DEL to enter SETUP

Booting from Hard Disk...`;

  phase    = signal<Phase>('off');
  bootPct  = signal(0);
  tbIn     = signal(false);
  startMenu = signal(false);
  now      = new Date();
  private _clock?: ReturnType<typeof setInterval>;

  loginUsers = [
    { name: 'Operator', role: 'Network Operator', bg: 'linear-gradient(135deg,#1e60c8,#4a90e8)' },
    { name: 'Admin',    role: 'Platform Admin',    bg: 'linear-gradient(135deg,#b81824,#e04848)' },
  ];
  selUser     = signal('');
  pickingUser = signal('');
  pwInput  = '';
  pwErr    = signal('');
  userBg   = computed(() => this.loginUsers.find(u => u.name === this.selUser())?.bg ?? '');

  vmX = signal(0); vmY = signal(0); vmW = signal(0); vmH = signal(0);
  vmMax = signal(false);
  private _vmPrev = { x: 0, y: 0, w: 0, h: 0 };
  private _dragging: 'vm' | 'hls' | null = null;
  private _dx = 0; private _dy = 0;

  hlsState: 'open' | 'minimized' | 'closed' = 'closed';
  hlsX = signal(50); hlsY = signal(30); hlsW = signal(520); hlsH = signal(340);
  private _hlsPrev = { x: 50, y: 30, w: 520, h: 340 };
  private _hlsMax  = false;

  dbs = signal<{name:string}[]>([]); cols = signal<MongoColInfo[]>([]);
  docs = signal<string[]>([]); selDb = signal(''); selCol = signal('');
  totDocs = signal(0); pg = signal(0); pgSize = 20; filterTxt = '';
  ldgDbs = signal(false); ldgCols = signal(false); ldgDocs = signal(false);
  mongoOk = signal(false); mongoErr = signal(''); expIdx = signal(-1);
  insertMode = signal(false); insertJson = ''; insErr = signal('');
  totPgs = computed(() => Math.max(1, Math.ceil(this.totDocs() / this.pgSize)));

  ngOnInit() {
    this.loadDbs();
    this._clock = setInterval(() => this.now = new Date(), 30_000);
  }

  ngOnDestroy() {
    if (this._clock) clearInterval(this._clock);
  }

  powerOn() {
    const el = this.hostEl.nativeElement;
    const W = el.clientWidth, H = el.clientHeight;
    const ww = Math.min(800, Math.max(480, W - 80));
    const wh = Math.min(540, Math.max(360, H - 60));
    const wx = Math.round((W - ww) / 2);
    const wy = Math.round((H - wh) / 2);
    this.vmX.set(wx); this.vmY.set(wy); this.vmW.set(ww); this.vmH.set(wh);
    this._vmPrev = { x: wx, y: wy, w: ww, h: wh };
    this.vmMax.set(false);
    this.phase.set('starting');
    setTimeout(() => { this.selUser.set(''); this.pwInput = ''; this.pwErr.set(''); this.phase.set('login'); }, 1800);
  }

  pickUser(name: string) {
    if (this.pickingUser()) return;
    this.pickingUser.set(name);
    this.pwInput = ''; this.pwErr.set('');
    setTimeout(() => { this.selUser.set(name); this.pickingUser.set(''); }, 550);
  }

  submitPw() {
    if (this.pwInput === CORRECT_PW) {
      this.pwErr.set(''); this.startBoot();
    } else {
      this.pwErr.set('Incorrect password. Please try again.'); this.pwInput = '';
    }
  }

  private startBoot() {
    this.phase.set('boot'); this.bootPct.set(0); this.tbIn.set(false);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 9 + 3;
      if (p >= 100) {
        p = 100; clearInterval(iv);
        setTimeout(() => { this.phase.set('desktop'); setTimeout(() => this.tbIn.set(true), 600); }, 400);
      }
      this.bootPct.set(p);
    }, 80);
  }

  startVmDrag(e: MouseEvent) {
    if (this.vmMax()) return;
    this._dragging = 'vm'; this._dx = e.clientX - this.vmX(); this._dy = e.clientY - this.vmY();
  }

  toggleVmMax() {
    const el = this.hostEl.nativeElement;
    if (this.vmMax()) {
      this.vmX.set(this._vmPrev.x); this.vmY.set(this._vmPrev.y);
      this.vmW.set(this._vmPrev.w); this.vmH.set(this._vmPrev.h); this.vmMax.set(false);
    } else {
      this._vmPrev = { x: this.vmX(), y: this.vmY(), w: this.vmW(), h: this.vmH() };
      this.vmX.set(0); this.vmY.set(0); this.vmW.set(el.clientWidth); this.vmH.set(el.clientHeight);
      this.vmMax.set(true);
    }
  }

  startHlsDrag(e: MouseEvent) {
    if (this._hlsMax) return;
    this._dragging = 'hls'; this._dx = e.clientX - this.hlsX(); this._dy = e.clientY - this.hlsY();
  }

  openHls() {
    const dw = this.vmW(), dh = this.vmH() - 28 - 28 - 22;
    const ww = Math.min(520, Math.max(360, dw - 100));
    const wh = Math.min(340, Math.max(220, dh - 80));
    const wx = Math.max(80, Math.round((dw - ww) / 2));
    const wy = Math.max(18, Math.round((dh - wh) / 2));
    this.hlsX.set(wx); this.hlsY.set(wy); this.hlsW.set(ww); this.hlsH.set(wh);
    this._hlsPrev = { x: wx, y: wy, w: ww, h: wh }; this.hlsState = 'open';
  }

  toggleHlsMax() {
    const dw = this.vmW(), dh = this.vmH() - 28 - 28 - 22;
    if (this._hlsMax) {
      this.hlsX.set(this._hlsPrev.x); this.hlsY.set(this._hlsPrev.y);
      this.hlsW.set(this._hlsPrev.w); this.hlsH.set(this._hlsPrev.h);
    } else {
      this._hlsPrev = { x: this.hlsX(), y: this.hlsY(), w: this.hlsW(), h: this.hlsH() };
      this.hlsX.set(0); this.hlsY.set(0); this.hlsW.set(dw); this.hlsH.set(dh);
    }
    this._hlsMax = !this._hlsMax;
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(e: MouseEvent) {
    if (!this._dragging) return;
    if (this._dragging === 'vm' && !this.vmMax()) {
      const el = this.hostEl.nativeElement;
      this.vmX.set(Math.max(0, Math.min(el.clientWidth  - this.vmW(), e.clientX - this._dx)));
      this.vmY.set(Math.max(0, Math.min(el.clientHeight - this.vmH(), e.clientY - this._dy)));
    }
    if (this._dragging === 'hls' && !this._hlsMax) {
      const dw = this.vmW(), dh = this.vmH() - 28 - 28 - 22;
      this.hlsX.set(Math.max(0, Math.min(dw - this.hlsW(), e.clientX - this._dx)));
      this.hlsY.set(Math.max(0, Math.min(dh - 40,          e.clientY - this._dy)));
    }
  }
  @HostListener('document:mouseup') onUp() { this._dragging = null; }

  onDesktopDbl(e: MouseEvent) { if (!(e.target as HTMLElement).closest('.desk-icon')) this.startMenu.set(false); }

  loadDbs() {
    this.ldgDbs.set(true); this.mongoErr.set('');
    this.svc.listDbs().subscribe({
      next: d  => { this.dbs.set(d); this.mongoOk.set(true); this.ldgDbs.set(false); },
      error: (e: {status?:number;message?:string}) => { this.mongoOk.set(false); this.ldgDbs.set(false); this.mongoErr.set(`HTTP ${e.status??'?'}: ${e.message??'check gateway'}`); },
    });
  }
  selectDb(name: string) {
    if (this.selDb()===name){this.selDb.set('');this.cols.set([]);return;}
    this.selDb.set(name);this.selCol.set('');this.docs.set([]);this.ldgCols.set(true);
    this.svc.listCollections(name).subscribe({next:c=>{this.cols.set(c);this.ldgCols.set(false);},error:()=>this.ldgCols.set(false)});
  }
  selectCol(name: string){this.selCol.set(name);this.pg.set(0);this.filterTxt='';this.expIdx.set(-1);this.loadDocs();}
  loadDocs(){
    const db=this.selDb(),col=this.selCol();if(!db||!col)return;
    this.ldgDocs.set(true);
    this.svc.browse(db,col,this.filterTxt,this.pgSize,this.pg()*this.pgSize).subscribe({next:r=>{this.docs.set(r.documents);this.totDocs.set(r.total);this.ldgDocs.set(false);},error:()=>this.ldgDocs.set(false)});
  }
  applyFilter(){this.pg.set(0);this.loadDocs();}
  clearFilter(){this.filterTxt='';this.pg.set(0);this.loadDocs();}
  prevPg(){this.pg.update(p=>Math.max(0,p-1));this.loadDocs();}
  nextPg(){this.pg.update(p=>Math.min(this.totPgs()-1,p+1));this.loadDocs();}
  doInsert(){
    this.insErr.set('');
    try{JSON.parse(this.insertJson);}catch{this.insErr.set('Invalid JSON');return;}
    this.svc.insert(this.selDb(),this.selCol(),this.insertJson).subscribe({next:()=>{this.insertMode.set(false);this.insertJson='';this.loadDocs();},error:e=>this.insErr.set(e.error?.error??'Insert failed')});
  }
  delDoc(i:number,e:MouseEvent){
    e.stopPropagation();const id=this.docId(this.docs()[i]);
    if(!id||!confirm(`Delete "${id}"?`))return;
    this.svc.delete(this.selDb(),this.selCol(),id).subscribe({next:()=>this.loadDocs()});
  }
  docId(raw:string):string{try{const d=JSON.parse(raw);if(!d._id)return '(no _id)';if(typeof d._id==='string')return d._id;if(d._id.$oid)return d._id.$oid;return JSON.stringify(d._id);}catch{return '?';}}
  prettyJson(raw:string):string{try{return JSON.stringify(JSON.parse(raw),null,2);}catch{return raw;}}
}
