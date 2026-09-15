import {
  Component, ElementRef, OnInit, ViewChild,
  computed, inject, signal,
} from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { FiveGcService, ContainerInfo, ContainerLogs } from '../../shared/fivegc/fivegc.service';

// ── topology data ─────────────────────────────────────────────────────────────

interface NodeDef {
  id: string; label: string; abbr: string;
  category: 'ue' | 'ran' | 'cn' | 'upf' | 'data' | 'registry';
  container: string; desc: string;
}
interface EdgeDef {
  from: string; to: string; iface: string;
  style: 'radio' | 'ngap' | 'gtp' | 'pfcp' | 'sbi' | 'nudr';
}
interface Zone {
  id: string; label: string; x: number; y: number; w: number; h: number;
  color: string;
}

const NODES: NodeDef[] = [
  { id:'ue',   label:'User Equipment', abbr:'UE',   category:'ue',       container:'free5gc-ue',   desc:'UERANSIM simulated subscriber device' },
  { id:'gnb',  label:'gNodeB',         abbr:'gNB',  category:'ran',      container:'free5gc-gnb',  desc:'UERANSIM simulated 5G base station' },
  { id:'amf',  label:'AMF',            abbr:'AMF',  category:'cn',       container:'free5gc-amf',  desc:'Access & Mobility Management Function' },
  { id:'smf',  label:'SMF',            abbr:'SMF',  category:'cn',       container:'free5gc-smf',  desc:'Session Management Function' },
  { id:'upf',  label:'UPF',            abbr:'UPF',  category:'upf',      container:'free5gc-eupf', desc:'User Plane Function — eUPF (eBPF/XDP)' },
  { id:'ausf', label:'AUSF',           abbr:'AUSF', category:'cn',       container:'free5gc-ausf', desc:'Authentication Server Function' },
  { id:'udm',  label:'UDM',            abbr:'UDM',  category:'cn',       container:'free5gc-udm',  desc:'Unified Data Management' },
  { id:'udr',  label:'UDR',            abbr:'UDR',  category:'data',     container:'free5gc-udr',  desc:'Unified Data Repository' },
  { id:'pcf',  label:'PCF',            abbr:'PCF',  category:'cn',       container:'free5gc-pcf',  desc:'Policy Control Function' },
  { id:'nssf', label:'NSSF',           abbr:'NSSF', category:'cn',       container:'free5gc-nssf', desc:'Network Slice Selection Function' },
  { id:'nrf',  label:'NRF',            abbr:'NRF',  category:'registry', container:'free5gc-nrf',  desc:'Network Repository Function — service registry & OAuth2' },
];

const EDGES: EdgeDef[] = [
  { from:'ue',   to:'gnb',  iface:'Uu',    style:'radio' },
  { from:'gnb',  to:'amf',  iface:'N2',    style:'ngap'  },
  { from:'gnb',  to:'upf',  iface:'N3',    style:'gtp'   },
  { from:'amf',  to:'smf',  iface:'N11',   style:'sbi'   },
  { from:'amf',  to:'ausf', iface:'N12',   style:'sbi'   },
  { from:'amf',  to:'udm',  iface:'N8',    style:'sbi'   },
  { from:'amf',  to:'pcf',  iface:'N15',   style:'sbi'   },
  { from:'amf',  to:'nssf', iface:'N22',   style:'sbi'   },
  { from:'smf',  to:'upf',  iface:'N4',    style:'pfcp'  },
  { from:'smf',  to:'pcf',  iface:'N7',    style:'sbi'   },
  { from:'smf',  to:'udm',  iface:'N10',   style:'sbi'   },
  { from:'ausf', to:'udm',  iface:'N13',   style:'sbi'   },
  { from:'udm',  to:'udr',  iface:'Nudr',  style:'nudr'  },
  { from:'pcf',  to:'udr',  iface:'Nudr',  style:'nudr'  },
  { from:'amf',  to:'nrf',  iface:'Nnrf',  style:'sbi'   },
  { from:'smf',  to:'nrf',  iface:'Nnrf',  style:'sbi'   },
  { from:'ausf', to:'nrf',  iface:'Nnrf',  style:'sbi'   },
  { from:'udm',  to:'nrf',  iface:'Nnrf',  style:'sbi'   },
  { from:'pcf',  to:'nrf',  iface:'Nnrf',  style:'sbi'   },
  { from:'nssf', to:'nrf',  iface:'Nnrf',  style:'sbi'   },
];

const ZONES: Zone[] = [
  { id:'ran',  label:'Radio Access Network', x:20,   y:240, w:330, h:200, color:'#a78bfa' },
  { id:'core', label:'5G Core Control Plane', x:370,  y:80,  w:620, h:530, color:'#38bdf8' },
  { id:'data', label:'Data Layer',            x:860,  y:200, w:220, h:360, color:'#34d399' },
  { id:'upf',  label:'User Plane',            x:775,  y:80,  w:180, h:160, color:'#fb923c' },
  { id:'nrf',  label:'Service Registry',      x:1050, y:210, w:200, h:180, color:'#f472b6' },
];

const NW = 120, NH = 76, CW = 1380, CH = 700;
const STORAGE_KEY = 'fivegc-topo-v3';

const DEFAULTS: Record<string, {x:number;y:number}> = {
  ue:   {x:40,  y:300}, gnb:  {x:200, y:300},
  amf:  {x:400, y:170}, smf:  {x:580, y:170}, upf:  {x:800, y:100},
  ausf: {x:400, y:360}, udm:  {x:580, y:360}, udr:  {x:880, y:260},
  pcf:  {x:580, y:490}, nssf: {x:400, y:490},
  nrf:  {x:1090, y:260},
};

const CAT_COLOR: Record<string, string> = {
  ue:'#a78bfa', ran:'#a78bfa', cn:'#38bdf8', upf:'#fb923c', data:'#34d399', registry:'#f472b6',
};

// ── component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-fivegc-topology',
  standalone: true,
  imports: [PageHeader],
  template: `
<hw-page-header title="5GC Network Topology"
  subtitle="Drag nodes to rearrange · click to inspect · positions auto-saved">
  <button class="hw-btn ghost" (click)="resetLayout()">Reset layout</button>
  <button class="hw-btn" (click)="loadAll()" style="margin-left:8px">↺ Refresh</button>
</hw-page-header>

<div class="outer">

  <!-- canvas -->
  <div class="canvas-scroll" #wrap
       (mousemove)="onMove($event)" (mouseup)="onUp()" (mouseleave)="onUp()">
    <div class="canvas" [style.width.px]="CW" [style.height.px]="CH">

      <!-- dot-grid is CSS background -->

      <svg class="svg-layer" [attr.width]="CW" [attr.height]="CH">
        <defs>
          <!-- glows -->
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-edge" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <!-- arrows -->
          @for (s of edgeStyles; track s.id) {
            <marker [id]="'arr-'+s.id" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" [attr.fill]="s.color" opacity=".7"/>
            </marker>
            <marker [id]="'arr-a-'+s.id" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" [attr.fill]="s.color"/>
            </marker>
          }
        </defs>

        <!-- zone backgrounds -->
        @for (z of ZONES; track z.id) {
          <rect [attr.x]="z.x" [attr.y]="z.y" [attr.width]="z.w" [attr.height]="z.h"
                rx="16" ry="16"
                [attr.fill]="z.color" fill-opacity=".04"
                [attr.stroke]="z.color" stroke-opacity=".18"
                stroke-width="1" stroke-dasharray="6 4"/>
          <text [attr.x]="z.x+12" [attr.y]="z.y+18"
                [attr.fill]="z.color" fill-opacity=".55" font-size="10"
                font-family="monospace" letter-spacing=".08em" text-transform="uppercase">
            {{ z.label }}
          </text>
        }

        <!-- edges -->
        @for (e of renderedEdges(); track e.id) {
          <g>
            <!-- glow track for active edges -->
            @if (e.active) {
              <path [attr.d]="e.path" fill="none"
                    [attr.stroke]="e.color" stroke-opacity=".18"
                    stroke-width="6" stroke-linecap="round"/>
            }
            <path [attr.d]="e.path" fill="none"
                  [class]="'edge edge-'+e.style+(e.active?' active':'')"
                  [attr.stroke]="e.color"
                  [attr.stroke-opacity]="e.active ? 1 : 0.25"
                  [attr.stroke-width]="e.active ? 1.8 : 1.2"
                  [attr.stroke-dasharray]="e.active && e.style!=='sbi' ? '8 4' : (e.style==='sbi'?'none':'5 3')"
                  [attr.marker-end]="'url(#arr-'+(e.active?'a-':'')+e.style+')'"/>
            <!-- label pill -->
            <rect [attr.x]="e.lx-14" [attr.y]="e.ly-8" width="28" height="14" rx="7"
                  [attr.fill]="e.color" fill-opacity=".12"
                  [attr.stroke]="e.color" stroke-opacity=".3" stroke-width=".8"/>
            <text [attr.x]="e.lx" [attr.y]="e.ly+4"
                  text-anchor="middle" [attr.fill]="e.color"
                  [attr.fill-opacity]="e.active ? 0.95 : 0.45"
                  font-size="9" font-family="monospace" font-weight="600">
              {{ e.iface }}
            </text>
          </g>
        }
      </svg>

      <!-- NF nodes -->
      @for (n of allNodes(); track n.id) {
        <div class="node" [class.up]="n.running" [class.sel]="selected()===n.id"
             [style.left.px]="n.x" [style.top.px]="n.y"
             [style.--cat]="catColor(n.category)"
             (mousedown)="onDown($event, n.id)"
             (click)="pick(n.id)">
          @if (n.running) {
            <span class="pulse-ring"></span>
          }
          <div class="node-inner">
            <div class="node-top">
              <span class="dot" [class.up]="n.running"></span>
              <span class="abbr">{{ n.abbr }}</span>
              <span class="badge" [class.up]="n.running">{{ n.running ? 'UP' : 'DOWN' }}</span>
            </div>
            <div class="node-name">{{ n.label }}</div>
          </div>
        </div>
      }

    </div>
  </div>

  <!-- detail panel -->
  <div class="panel" [class.open]="!!selectedNode()">
    @if (selectedNode(); as n) {
      <div class="panel-head" [style.--cat]="catColor(n.category)">
        <div class="ph-left">
          <div class="ph-abbr">{{ n.abbr }}</div>
          <div>
            <div class="ph-label">{{ n.label }}</div>
            <div class="ph-desc">{{ n.desc }}</div>
          </div>
        </div>
        <button class="close" (click)="selected.set(null)">✕</button>
      </div>

      <div class="status-row" [class.up]="n.running">
        <span class="s-dot" [class.up]="n.running"></span>
        <span>{{ n.running ? 'Running' : 'Stopped' }}</span>
        <code class="cname">{{ n.container }}</code>
      </div>

      @if (n.info) {
        <div class="meta-grid">
          <div class="meta-item"><span class="mk">State</span><span class="mv">{{ n.info.state }}</span></div>
          <div class="meta-item"><span class="mk">Status</span><span class="mv small">{{ n.info.status }}</span></div>
          <div class="meta-item"><span class="mk">Image</span><span class="mv small mono">{{ n.info.image }}</span></div>
        </div>
      }

      <div class="logs-header">
        <span>Container Logs</span>
        <button class="mini-btn" (click)="fetchLogs(n.container)">↺ Refresh</button>
      </div>
      @if (loadingLogs()) {
        <div class="logs-empty">Loading…</div>
      } @else if (logs()) {
        <pre class="logs">{{ logs()!.logs }}</pre>
      } @else {
        <div class="logs-empty">No logs available.</div>
      }
    }
  </div>

</div>

<!-- legend bar -->
<div class="legend">
  @for (s of edgeStyles; track s.id) {
    <span class="li">
      <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5"
        [attr.stroke]="s.color" stroke-width="2"
        [attr.stroke-dasharray]="s.dash"/></svg>
      {{ s.label }}
    </span>
  }
  <span class="sep"></span>
  @for (c of catLegend; track c.id) {
    <span class="li">
      <span class="cat-dot" [style.background]="c.color"></span>{{ c.label }}
    </span>
  }
</div>
  `,
  styles: [`
    :host { display:block; padding:0 24px 24px; }

    /* ── outer layout ── */
    .outer { display:flex; gap:16px; align-items:flex-start; }

    /* ── canvas ── */
    .canvas-scroll {
      flex:1; min-width:0; height:640px; overflow:auto;
      border-radius:14px; border:1px solid rgba(255,255,255,.06);
      background:#0d1117;
      /* dot grid */
      background-image:
        radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1px);
      background-size:28px 28px;
      cursor:default; user-select:none; position:relative;
    }
    .canvas-scroll::-webkit-scrollbar { width:6px; height:6px; }
    .canvas-scroll::-webkit-scrollbar-track { background:transparent; }
    .canvas-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:3px; }

    .canvas { position:relative; }

    /* ── svg layer ── */
    .svg-layer { position:absolute; top:0; left:0; pointer-events:none; overflow:visible; }

    /* edge animation */
    @keyframes flow { to { stroke-dashoffset: -24; } }
    .edge.active { animation: flow 1.4s linear infinite; }

    /* ── nodes ── */
    .node {
      position:absolute; width:120px; height:76px;
      border-radius:12px; cursor:grab;
      border:1px solid rgba(var(--cat-rgb, 56,189,248), .3);
      background:rgba(13,17,23,.85);
      box-shadow:0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.05);
      transition:box-shadow .2s, border-color .2s, transform .1s;
      overflow:visible;
    }
    .node:hover { border-color:rgba(var(--cat-rgb,56,189,248),.55); transform:translateY(-1px); }
    .node:active { cursor:grabbing; transform:translateY(0); }
    .node.sel {
      border-color: var(--cat, #38bdf8);
      box-shadow:0 0 0 2px var(--cat,#38bdf8),
                 0 0 24px rgba(56,189,248,.25),
                 0 4px 20px rgba(0,0,0,.5);
    }
    .node.up .node-inner { border-left:3px solid var(--cat,#38bdf8); }

    /* pulse ring for running NFs */
    .pulse-ring {
      position:absolute; inset:-6px; border-radius:16px; pointer-events:none;
      border:1px solid var(--cat,#38bdf8); opacity:0;
      animation:pulse-ring 2.4s ease-out infinite;
    }
    @keyframes pulse-ring {
      0%   { opacity:.5; transform:scale(1);    }
      100% { opacity:0;  transform:scale(1.12); }
    }

    .node-inner { height:100%; padding:10px 12px; display:flex; flex-direction:column; gap:5px; }
    .node-top   { display:flex; align-items:center; gap:5px; }
    .dot  { width:7px; height:7px; border-radius:50%; background:#ef4444; flex-shrink:0; }
    .dot.up { background:#22c55e; box-shadow:0 0 6px rgba(34,197,94,.6); }
    .abbr { font-size:13px; font-weight:700; color:#e2e8f0; flex:1; letter-spacing:.01em; }
    .badge { font-size:9px; font-weight:700; padding:1px 5px; border-radius:4px;
             background:rgba(239,68,68,.15); color:#ef4444; letter-spacing:.06em; }
    .badge.up { background:rgba(34,197,94,.15); color:#22c55e; }
    .node-name { font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .node.down { opacity:.45; }

    /* ── detail panel ── */
    .panel {
      width:0; flex-shrink:0; overflow:hidden;
      transition:width .25s cubic-bezier(.4,0,.2,1);
      border-radius:14px;
      background:#0d1117; border:1px solid rgba(255,255,255,.07);
      display:flex; flex-direction:column; max-height:640px;
    }
    .panel.open { width:310px; }

    .panel-head {
      padding:16px 14px 12px;
      border-bottom:1px solid rgba(255,255,255,.07);
      background:linear-gradient(135deg, rgba(var(--cat-rgb,56,189,248),.08) 0%, transparent 60%);
      display:flex; justify-content:space-between; align-items:flex-start;
    }
    .ph-left  { display:flex; gap:12px; align-items:flex-start; }
    .ph-abbr  {
      width:44px; height:44px; border-radius:10px; flex-shrink:0;
      background:rgba(var(--cat-rgb,56,189,248),.15);
      border:1px solid rgba(var(--cat-rgb,56,189,248),.3);
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:800; color:var(--cat,#38bdf8);
    }
    .ph-label { font-size:15px; font-weight:700; color:#e2e8f0; }
    .ph-desc  { font-size:11px; color:#64748b; margin-top:3px; line-height:1.4; }
    .close { background:none; border:none; cursor:pointer; color:#64748b;
             font-size:18px; padding:0; line-height:1; }
    .close:hover { color:#e2e8f0; }

    .status-row {
      display:flex; align-items:center; gap:8px; padding:10px 14px;
      border-bottom:1px solid rgba(255,255,255,.07);
      font-size:12px; font-weight:600; color:#ef4444;
    }
    .status-row.up { color:#22c55e; }
    .s-dot { width:8px; height:8px; border-radius:50%; background:#ef4444; }
    .s-dot.up { background:#22c55e; box-shadow:0 0 8px rgba(34,197,94,.5); animation:pulse-dot 2s ease infinite; }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.5} }
    .cname { margin-left:auto; font-family:monospace; font-size:10px; color:#475569; font-weight:400; }

    .meta-grid { display:flex; flex-direction:column; gap:0;
                 border-bottom:1px solid rgba(255,255,255,.07); }
    .meta-item { display:flex; justify-content:space-between; align-items:center;
                 padding:6px 14px; border-bottom:1px solid rgba(255,255,255,.04); }
    .meta-item:last-child { border-bottom:none; }
    .mk { font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:.06em; }
    .mv { font-size:11px; color:#94a3b8; }
    .mv.small { font-size:10px; }
    .mv.mono  { font-family:monospace; }

    .logs-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 14px 6px; font-size:10px; font-weight:700;
      text-transform:uppercase; letter-spacing:.08em; color:#475569;
    }
    .mini-btn {
      font-size:11px; padding:3px 8px; border:1px solid rgba(255,255,255,.1);
      background:transparent; border-radius:6px; cursor:pointer; color:#64748b;
    }
    .mini-btn:hover { border-color:#38bdf8; color:#38bdf8; }
    .logs {
      flex:1; overflow-y:auto; margin:0; padding:10px 14px 14px;
      font-size:10.5px; font-family:monospace; line-height:1.6;
      color:#64748b; white-space:pre-wrap; word-break:break-all;
    }
    .logs::-webkit-scrollbar { width:4px; }
    .logs::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px; }
    .logs-empty { padding:20px; text-align:center; color:#475569; font-size:12px; }

    /* ── legend ── */
    .legend {
      display:flex; flex-wrap:wrap; align-items:center; gap:20px;
      margin-top:12px; padding:10px 16px;
      background:#0d1117; border:1px solid rgba(255,255,255,.07);
      border-radius:10px; font-size:11px; color:#64748b;
    }
    .li { display:flex; align-items:center; gap:7px; }
    .sep { flex:1; }
    .cat-dot { display:inline-block; width:10px; height:10px; border-radius:3px; flex-shrink:0; }

    /* ghost button override */
    .hw-btn.ghost {
      background:transparent; border-color:rgba(255,255,255,.15); color:#94a3b8;
    }
    .hw-btn.ghost:hover { border-color:#38bdf8; color:#38bdf8; }
  `],
})
export class FiveGcTopology implements OnInit {

  private api   = inject(FiveGcService);
  @ViewChild('wrap') wrap!: ElementRef<HTMLDivElement>;

  readonly CW = CW; readonly CH = CH; readonly ZONES = ZONES;

  containers  = signal<ContainerInfo[]>([]);
  positions   = signal<Record<string, {x:number;y:number}>>(this.loadSaved());
  selected    = signal<string|null>(null);
  logs        = signal<ContainerLogs|null>(null);
  loadingLogs = signal(false);

  // ── static metadata ──────────────────────────────────────────────────────

  readonly edgeStyles = [
    { id:'radio', color:'#a78bfa', dash:'5 3', label:'Uu (Radio)' },
    { id:'ngap',  color:'#38bdf8', dash:'none', label:'N2 NGAP/SCTP' },
    { id:'gtp',   color:'#fb923c', dash:'none', label:'N3 GTP-U' },
    { id:'pfcp',  color:'#facc15', dash:'8 4',  label:'N4 PFCP' },
    { id:'sbi',   color:'#818cf8', dash:'none', label:'SBI / HTTP2' },
    { id:'nudr',  color:'#34d399', dash:'4 3',  label:'Nudr (Data)' },
  ];

  readonly catLegend = [
    { id:'ue',  color:'#a78bfa', label:'UE' },
    { id:'ran', color:'#a78bfa', label:'RAN' },
    { id:'cn',  color:'#38bdf8', label:'Core NF' },
    { id:'upf', color:'#fb923c', label:'UPF' },
    { id:'data',color:'#34d399', label:'Data layer' },
    { id:'nrf', color:'#f472b6', label:'Registry' },
  ];

  catColor(cat: string) {
    return CAT_COLOR[cat] ?? '#38bdf8';
  }

  // ── computed ──────────────────────────────────────────────────────────────

  allNodes = computed(() => {
    const pos  = this.positions();
    const ctrs = this.containers();
    return NODES.map(d => {
      const p   = pos[d.id] ?? DEFAULTS[d.id] ?? {x:50,y:50};
      const ctr = ctrs.find(c => c.name === d.container);
      return { ...d, x:p.x, y:p.y, running: ctr?.running ?? false, info: ctr ?? null };
    });
  });

  selectedNode = computed(() => {
    const id = this.selected();
    return id ? (this.allNodes().find(n => n.id === id) ?? null) : null;
  });

  renderedEdges = computed(() => {
    const pos  = this.positions();
    const ctrs = this.containers();
    const runSet = new Set(ctrs.filter(c => c.running).map(c => c.name));
    const styleMap = new Map(this.edgeStyles.map(s => [s.id, s.color]));

    return EDGES.map(e => {
      const fp = pos[e.from] ?? DEFAULTS[e.from] ?? {x:0,y:0};
      const tp = pos[e.to]   ?? DEFAULTS[e.to]   ?? {x:0,y:0};
      const x1=fp.x+NW/2, y1=fp.y+NH/2, x2=tp.x+NW/2, y2=tp.y+NH/2;
      const dx=(x2-x1)*.5;
      const path=`M${x1} ${y1} C${x1+dx} ${y1},${x2-dx} ${y2},${x2} ${y2}`;
      const fd = NODES.find(n=>n.id===e.from)!;
      const td = NODES.find(n=>n.id===e.to)!;
      return {
        id:`${e.from}-${e.to}`, path, iface:e.iface, style:e.style,
        color: styleMap.get(e.style) ?? '#818cf8',
        active: runSet.has(fd.container) && runSet.has(td.container),
        lx:(x1+x2)/2, ly:(y1+y2)/2,
      };
    });
  });

  // ── drag ─────────────────────────────────────────────────────────────────

  private dragging: string|null = null;
  private off = {x:0,y:0};

  onDown(e: MouseEvent, id: string) {
    this.dragging = id;
    const n = this.allNodes().find(n=>n.id===id)!;
    const r = this.wrap.nativeElement.getBoundingClientRect();
    this.off = {
      x: e.clientX - r.left + this.wrap.nativeElement.scrollLeft - n.x,
      y: e.clientY - r.top  + this.wrap.nativeElement.scrollTop  - n.y,
    };
    e.preventDefault(); e.stopPropagation();
  }

  onMove(e: MouseEvent) {
    if (!this.dragging) return;
    const r = this.wrap.nativeElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(CW-NW, e.clientX-r.left+this.wrap.nativeElement.scrollLeft-this.off.x));
    const y = Math.max(0, Math.min(CH-NH, e.clientY-r.top +this.wrap.nativeElement.scrollTop -this.off.y));
    this.positions.update(p => ({...p, [this.dragging!]: {x,y}}));
  }

  onUp() {
    if (this.dragging) { this.save(); this.dragging = null; }
  }

  // ── actions ───────────────────────────────────────────────────────────────

  pick(id: string) {
    if (this.dragging) return;
    const same = this.selected() === id;
    this.selected.set(same ? null : id);
    if (!same) {
      const d = NODES.find(n=>n.id===id)!;
      this.fetchLogs(d.container);
    }
  }

  fetchLogs(container: string) {
    this.loadingLogs.set(true); this.logs.set(null);
    this.api.containerLogs(container, 80).subscribe({
      next: v  => { this.logs.set(v); this.loadingLogs.set(false); },
      error: () => this.loadingLogs.set(false),
    });
  }

  loadAll() {
    this.api.containers().subscribe(v => this.containers.set(v));
    const sel = this.selected();
    if (sel) { const d=NODES.find(n=>n.id===sel); if(d) this.fetchLogs(d.container); }
  }

  resetLayout() { this.positions.set({...DEFAULTS}); localStorage.removeItem(STORAGE_KEY); }

  ngOnInit() { this.loadAll(); }

  private loadSaved(): Record<string, {x:number;y:number}> {
    try { const r=localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {...DEFAULTS}; }
    catch { return {...DEFAULTS}; }
  }
  private save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.positions())); }
}
