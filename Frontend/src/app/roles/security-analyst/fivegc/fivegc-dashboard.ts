import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PageHeader } from '../../../shared/ui/page-header';
import { AuthService } from '../../../core/auth.service';
import {
  FiveGcService, NfStatus, Subscriber, UeContext, ContainerInfo, ContainerLogs, SubscriberProfile, Tenant,
} from '../../shared/fivegc/fivegc.service';

type Tab = 'nf' | 'subscribers' | 'ue-contexts' | 'containers';

interface SliceRow { sst: number; sd: string; dnn: string; sessionAmbrUl: string; sessionAmbrDl: string; qi5: number; isDefault: boolean; }
interface FlowRuleRow { filter: string; precedence: number; snssai: string; dnn: string; qosRef: number; }
interface QosFlowRow { snssai: string; dnn: string; qosRef: number; qi5: number; mbrUL: string; mbrDL: string; gbrUL: string; gbrDL: string; }
interface ChargingRow { method: string; quota: string; unitCost: string; snssai: string; dnn: string; filter: string; qosRef: number | null; }

function defaultSlices(): SliceRow[] {
  return [
    { sst: 1, sd: '010203', dnn: 'internet', sessionAmbrUl: '1000 Mbps', sessionAmbrDl: '1000 Mbps', qi5: 9, isDefault: true },
    { sst: 1, sd: '112233', dnn: 'internet', sessionAmbrUl: '1000 Mbps', sessionAmbrDl: '1000 Mbps', qi5: 8, isDefault: false },
  ];
}
function defaultFlowRules(): FlowRuleRow[] {
  return [
    { filter: '1.1.1.1/32', precedence: 128, snssai: '01010203', dnn: 'internet', qosRef: 1 },
    { filter: '1.1.1.1/32', precedence: 127, snssai: '01112233', dnn: 'internet', qosRef: 2 },
  ];
}
function defaultQosFlows(): QosFlowRow[] {
  return [
    { snssai: '01010203', dnn: 'internet', qosRef: 1, qi5: 8, mbrUL: '208 Mbps', mbrDL: '208 Mbps', gbrUL: '108 Mbps', gbrDL: '108 Mbps' },
    { snssai: '01112233', dnn: 'internet', qosRef: 2, qi5: 7, mbrUL: '407 Mbps', mbrDL: '407 Mbps', gbrUL: '207 Mbps', gbrDL: '207 Mbps' },
  ];
}
function defaultCharging(): ChargingRow[] {
  return [
    { method: 'Offline', quota: '100000', unitCost: '1', snssai: '01010203', dnn: '',        filter: '',            qosRef: null },
    { method: 'Offline', quota: '100000', unitCost: '1', snssai: '01010203', dnn: 'internet', filter: '1.1.1.1/32', qosRef: 1    },
    { method: 'Online',  quota: '100000', unitCost: '1', snssai: '01112233', dnn: '',        filter: '',            qosRef: null },
    { method: 'Online',  quota: '5000',   unitCost: '1', snssai: '01112233', dnn: 'internet', filter: '1.1.1.1/32', qosRef: 2    },
  ];
}

const DEFAULT_SUB_BODY = {
  userNumber: 1,
  plmnID: '20893',
  AuthenticationSubscription: {
    authenticationMethod: '5G_AKA',
    permanentKey: { permanentKeyValue: '8baf473f2f8fd09487cccbd7097c6862', encryptionKey: 0, encryptionAlgorithm: 0 },
    sequenceNumber: '000000000023',
    authenticationManagementField: '8000',
    milenage: { op: { opValue: '', encryptionKey: 0, encryptionAlgorithm: 0 } },
    opc: { opcValue: '8e27b6af0e692e750f32667a3b14605d', encryptionKey: 0, encryptionAlgorithm: 0 },
  },
  AccessAndMobilitySubscriptionData: {
    gpsis: ['msisdn-'],
    subscribedUeAmbr: { uplink: '1 Gbps', downlink: '2 Gbps' },
    nssai: {
      defaultSingleNssais: [{ sst: 1, sd: '010203' }],
      singleNssais: [{ sst: 1, sd: '112233' }],
    },
  },
  SessionManagementSubscriptionData: [
    {
      singleNssai: { sst: 1, sd: '010203' },
      dnnConfigurations: {
        internet: {
          pduSessionTypes: { defaultSessionType: 'IPV4', allowedSessionTypes: ['IPV4'] },
          sscModes: { defaultSscMode: 'SSC_MODE_1', allowedSscModes: ['SSC_MODE_2', 'SSC_MODE_3'] },
          '5gQosProfile': { '5qi': 9, arp: { priorityLevel: 8, preemptCap: '', preemptVuln: '' }, priorityLevel: 8 },
          sessionAmbr: { uplink: '1000 Mbps', downlink: '1000 Mbps' },
          staticIpAddress: [],
        },
      },
    },
    {
      singleNssai: { sst: 1, sd: '112233' },
      dnnConfigurations: {
        internet: {
          pduSessionTypes: { defaultSessionType: 'IPV4', allowedSessionTypes: ['IPV4'] },
          sscModes: { defaultSscMode: 'SSC_MODE_1', allowedSscModes: ['SSC_MODE_2', 'SSC_MODE_3'] },
          '5gQosProfile': { '5qi': 8, arp: { priorityLevel: 8, preemptCap: '', preemptVuln: '' }, priorityLevel: 8 },
          sessionAmbr: { uplink: '1000 Mbps', downlink: '1000 Mbps' },
          staticIpAddress: [],
        },
      },
    },
  ],
  SmfSelectionSubscriptionData: {
    subscribedSnssaiInfos: {
      '01010203': { dnnInfos: [{ dnn: 'internet' }] },
      '01112233': { dnnInfos: [{ dnn: 'internet' }] },
    },
  },
  AmPolicyData: { subscCats: ['free5gc'] },
  SmPolicyData: {
    smPolicySnssaiData: {
      '01010203': { snssai: { sst: 1, sd: '010203' }, smPolicyDnnData: { internet: { dnn: 'internet' } } },
      '01112233': { snssai: { sst: 1, sd: '112233' }, smPolicyDnnData: { internet: { dnn: 'internet' } } },
    },
  },
  FlowRules: [
    { filter: '1.1.1.1/32', precedence: 128, snssai: '01010203', dnn: 'internet', qosRef: 1 },
    { filter: '1.1.1.1/32', precedence: 127, snssai: '01112233', dnn: 'internet', qosRef: 2 },
  ],
  QosFlows: [
    { snssai: '01010203', dnn: 'internet', qosRef: 1, '5qi': 8, mbrUL: '208 Mbps', mbrDL: '208 Mbps', gbrUL: '108 Mbps', gbrDL: '108 Mbps' },
    { snssai: '01112233', dnn: 'internet', qosRef: 2, '5qi': 7, mbrUL: '407 Mbps', mbrDL: '407 Mbps', gbrUL: '207 Mbps', gbrDL: '207 Mbps' },
  ],
  ChargingDatas: [
    { chargingMethod: 'Offline', quota: '100000', unitCost: '1', snssai: '01010203', dnn: '', filter: '' },
    { chargingMethod: 'Offline', quota: '100000', unitCost: '1', snssai: '01010203', dnn: 'internet', filter: '1.1.1.1/32', qosRef: 1 },
    { chargingMethod: 'Online',  quota: '100000', unitCost: '1', snssai: '01112233', dnn: '', filter: '' },
    { chargingMethod: 'Online',  quota: '5000',   unitCost: '1', snssai: '01112233', dnn: 'internet', filter: '1.1.1.1/32', qosRef: 2 },
  ],
};

@Component({
  selector: 'app-fivegc-dashboard',
  standalone: true,
  imports: [PageHeader, FormsModule],
  template: `
    <hw-page-header title="5G Core"
      subtitle="NF health, subscriber management and container lifecycle for free5GC">
      <button class="hw-btn" (click)="refresh()">Refresh</button>
    </hw-page-header>

    <!-- tabs -->
    <div class="tabs">
      <button class="tab" [class.active]="tab()==='nf'"          (click)="setTab('nf')">NF Health</button>
      <button class="tab" [class.active]="tab()==='subscribers'"  (click)="setTab('subscribers')">Subscribers</button>
      <button class="tab" [class.active]="tab()==='ue-contexts'"  (click)="setTab('ue-contexts')">UE Contexts</button>
      <button class="tab" [class.active]="tab()==='containers'"   (click)="setTab('containers')">Infrastructure</button>
    </div>

    <!-- ═══ NF HEALTH ═══ -->
    @if (tab() === 'nf') {
      <div class="summary-row">
        <div class="scard">
          <span class="sval blue">{{ upCount() }}</span>
          <span class="slab">NFs Running</span>
        </div>
        <div class="scard">
          <span class="sval red">{{ downCount() }}</span>
          <span class="slab">NFs Down</span>
        </div>
        <div class="scard">
          <span class="sval">{{ nfs().length }}</span>
          <span class="slab">Total NFs</span>
        </div>
      </div>

      <div class="hw-card panel">
        <div class="panel-head">
          <span class="panel-title">Network Function Health</span>
          <span class="tag">{{ upCount() }}/{{ nfs().length }} running</span>
        </div>
        @if (loadingNf()) {
          <p class="empty">Loading…</p>
        } @else if (nfs().length === 0) {
          <p class="empty">5GC stack unreachable — start the containers or check the service.</p>
        } @else {
          <div class="nf-grid">
            @for (n of nfs(); track n.type) {
              <div class="nf-card" [class.up]="n.up" [class.down]="!n.up">
                <div class="nf-top">
                  <span class="nf-dot"></span>
                  <span class="nf-type">{{ n.type }}</span>
                  <span class="nf-badge">{{ n.status }}</span>
                </div>
                <span class="nf-desc">{{ n.description }}</span>
                <span class="nf-id mono">{{ n.instanceId }}</span>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- ═══ SUBSCRIBERS ═══ -->
    @if (tab() === 'subscribers') {
      <div class="sub-layout">

        <!-- left: subscriber list + add form -->
        <div class="sub-main">
          <div class="hw-card panel">
            <div class="panel-head">
              <span class="panel-title">Provisioned Subscribers (UDR)</span>
              @if (canWrite()) {
                <button class="hw-btn" (click)="showAddForm.set(!showAddForm())">
                  {{ showAddForm() ? 'Cancel' : '+ Add subscriber' }}
                </button>
              } @else {
                <span class="tag">read-only · needs NETWORK_OPERATOR role</span>
              }
            </div>

            @if (canWrite() && showAddForm()) {
              <form class="add-form" (ngSubmit)="createSubscriber()">

                <div class="form-section-title">Profile</div>
                <label class="span2">Subscription Profile
                  <select [(ngModel)]="selectedProfileName" name="profile" (ngModelChange)="applyProfile($event)">
                    <option value="">— use defaults —</option>
                    @for (p of profiles(); track p.profileName) {
                      <option [value]="p.profileName">{{ p.profileName }}</option>
                    }
                  </select>
                </label>

                <div class="form-section-title">Identity</div>
                <label>IMSI <span class="req">*</span>
                  <input [(ngModel)]="newImsi" name="imsi" placeholder="208930000000001" required />
                </label>
                <label>PLMN ID (MCC+MNC)
                  <input [(ngModel)]="newPlmn" name="plmn" placeholder="20893" maxlength="6" />
                </label>

                <div class="form-section-title">Authentication</div>
                <label>Permanent Key (K)
                  <input [(ngModel)]="newKey" name="key" placeholder="8baf473f2f8fd09487cccbd7097c6862" maxlength="32" />
                </label>
                <label>OPc
                  <input [(ngModel)]="newOpc" name="opc" placeholder="8e27b6af0e692e750f32667a3b14605d" maxlength="32" />
                </label>
                <label>Sequence Number
                  <input [(ngModel)]="newSeqNum" name="seqNum" placeholder="000000000023" maxlength="12" />
                </label>
                <label>Auth Mgmt Field (AMF)
                  <input [(ngModel)]="newAmf" name="amf" placeholder="8000" maxlength="4" />
                </label>

                <div class="form-section-title">UE Aggregate Max Bit Rate</div>
                <label>Uplink
                  <input [(ngModel)]="newUlAmbr" name="ulAmbr" placeholder="1 Gbps" />
                </label>
                <label>Downlink
                  <input [(ngModel)]="newDlAmbr" name="dlAmbr" placeholder="2 Gbps" />
                </label>

                <!-- ── Slices ── -->
                <div class="form-section-title">Slices / NSSAI + Session Management</div>
                <div class="array-section span-full">
                  <table class="sub-tbl">
                    <thead><tr>
                      <th>SST</th><th>SD</th><th>DNN</th><th>Session AMBR UL</th><th>Session AMBR DL</th><th>5QI</th><th>Default</th><th></th>
                    </tr></thead>
                    <tbody>
                      @for (s of subSlices; track $index; let i = $index) {
                        <tr>
                          <td><input [(ngModel)]="subSlices[i].sst"           [name]="'sst_s'+i"    type="number" class="sub-in num" /></td>
                          <td><input [(ngModel)]="subSlices[i].sd"            [name]="'sd_s'+i"     placeholder="010203" class="sub-in" /></td>
                          <td><input [(ngModel)]="subSlices[i].dnn"           [name]="'dnn_s'+i"    placeholder="internet" class="sub-in" /></td>
                          <td><input [(ngModel)]="subSlices[i].sessionAmbrUl" [name]="'sUl_s'+i"   placeholder="1000 Mbps" class="sub-in" /></td>
                          <td><input [(ngModel)]="subSlices[i].sessionAmbrDl" [name]="'sDl_s'+i"   placeholder="1000 Mbps" class="sub-in" /></td>
                          <td><input [(ngModel)]="subSlices[i].qi5"           [name]="'qi5_s'+i"    type="number" class="sub-in num" /></td>
                          <td class="ctr"><input type="checkbox" [(ngModel)]="subSlices[i].isDefault" [name]="'def_s'+i" /></td>
                          <td><button type="button" class="mini danger" (click)="removeSlice(i)">✕</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <button type="button" class="mini add-row" (click)="addSlice()">+ Slice</button>
                </div>

                <!-- ── Flow Rules ── -->
                <div class="form-section-title">Flow Rules</div>
                <div class="array-section span-full">
                  <table class="sub-tbl">
                    <thead><tr>
                      <th>Filter</th><th>Precedence</th><th>SNSSAI</th><th>DNN</th><th>QoS Ref</th><th></th>
                    </tr></thead>
                    <tbody>
                      @for (r of subFlowRules; track $index; let i = $index) {
                        <tr>
                          <td><input [(ngModel)]="subFlowRules[i].filter"     [name]="'fr_filter'+i" placeholder="1.1.1.1/32" class="sub-in" /></td>
                          <td><input [(ngModel)]="subFlowRules[i].precedence" [name]="'fr_prec'+i"   type="number" class="sub-in num" /></td>
                          <td><input [(ngModel)]="subFlowRules[i].snssai"     [name]="'fr_sn'+i"     placeholder="01010203" class="sub-in" /></td>
                          <td><input [(ngModel)]="subFlowRules[i].dnn"        [name]="'fr_dnn'+i"    placeholder="internet" class="sub-in" /></td>
                          <td><input [(ngModel)]="subFlowRules[i].qosRef"     [name]="'fr_qr'+i"     type="number" class="sub-in num" /></td>
                          <td><button type="button" class="mini danger" (click)="removeFlowRule(i)">✕</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <button type="button" class="mini add-row" (click)="addFlowRule()">+ Rule</button>
                </div>

                <!-- ── QoS Flows ── -->
                <div class="form-section-title">QoS Flows</div>
                <div class="array-section span-full">
                  <table class="sub-tbl">
                    <thead><tr>
                      <th>SNSSAI</th><th>DNN</th><th>Ref</th><th>5QI</th><th>MBR UL</th><th>MBR DL</th><th>GBR UL</th><th>GBR DL</th><th></th>
                    </tr></thead>
                    <tbody>
                      @for (f of subQosFlows; track $index; let i = $index) {
                        <tr>
                          <td><input [(ngModel)]="subQosFlows[i].snssai" [name]="'qf_sn'+i"    placeholder="01010203" class="sub-in" /></td>
                          <td><input [(ngModel)]="subQosFlows[i].dnn"    [name]="'qf_dnn'+i"   placeholder="internet" class="sub-in" /></td>
                          <td><input [(ngModel)]="subQosFlows[i].qosRef" [name]="'qf_ref'+i"   type="number" class="sub-in num" /></td>
                          <td><input [(ngModel)]="subQosFlows[i].qi5"    [name]="'qf_qi5'+i"   type="number" class="sub-in num" /></td>
                          <td><input [(ngModel)]="subQosFlows[i].mbrUL"  [name]="'qf_mUl'+i"   placeholder="208 Mbps" class="sub-in" /></td>
                          <td><input [(ngModel)]="subQosFlows[i].mbrDL"  [name]="'qf_mDl'+i"   placeholder="208 Mbps" class="sub-in" /></td>
                          <td><input [(ngModel)]="subQosFlows[i].gbrUL"  [name]="'qf_gUl'+i"   placeholder="108 Mbps" class="sub-in" /></td>
                          <td><input [(ngModel)]="subQosFlows[i].gbrDL"  [name]="'qf_gDl'+i"   placeholder="108 Mbps" class="sub-in" /></td>
                          <td><button type="button" class="mini danger" (click)="removeQosFlow(i)">✕</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <button type="button" class="mini add-row" (click)="addQosFlow()">+ Flow</button>
                </div>

                <!-- ── Charging ── -->
                <div class="form-section-title">Charging Data</div>
                <div class="array-section span-full">
                  <table class="sub-tbl">
                    <thead><tr>
                      <th>Method</th><th>Quota</th><th>Unit Cost</th><th>SNSSAI</th><th>DNN</th><th>Filter</th><th>QoS Ref</th><th></th>
                    </tr></thead>
                    <tbody>
                      @for (c of subCharging; track $index; let i = $index) {
                        <tr>
                          <td>
                            <select [(ngModel)]="subCharging[i].method" [name]="'ch_m'+i" class="sub-in">
                              <option>Offline</option><option>Online</option>
                            </select>
                          </td>
                          <td><input [(ngModel)]="subCharging[i].quota"    [name]="'ch_q'+i"    placeholder="100000" class="sub-in" /></td>
                          <td><input [(ngModel)]="subCharging[i].unitCost" [name]="'ch_uc'+i"   placeholder="1" class="sub-in num" /></td>
                          <td><input [(ngModel)]="subCharging[i].snssai"   [name]="'ch_sn'+i"   placeholder="01010203" class="sub-in" /></td>
                          <td><input [(ngModel)]="subCharging[i].dnn"      [name]="'ch_dnn'+i"  placeholder="internet" class="sub-in" /></td>
                          <td><input [(ngModel)]="subCharging[i].filter"   [name]="'ch_f'+i"    placeholder="1.1.1.1/32" class="sub-in" /></td>
                          <td><input [(ngModel)]="subCharging[i].qosRef"   [name]="'ch_qr'+i"   type="number" class="sub-in num" /></td>
                          <td><button type="button" class="mini danger" (click)="removeCharging(i)">✕</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <button type="button" class="mini add-row" (click)="addCharging()">+ Entry</button>
                </div>

                <div class="form-actions">
                  <button class="hw-btn" type="submit" [disabled]="saving() || !newImsi">
                    {{ saving() ? 'Provisioning…' : 'Provision subscriber' }}
                  </button>
                  @if (saveError()) { <span class="inline-err">{{ saveError() }}</span> }
                </div>
              </form>
            }

            @if (loadingSubs()) {
              <p class="empty">Loading…</p>
            } @else {
              <table class="tbl">
                <thead><tr><th>IMSI (SUPI)</th><th>PLMN</th><th>MSISDN (GPSI)</th>
                  @if (canWrite()) { <th class="right">Actions</th> }
                </tr></thead>
                <tbody>
                  @for (s of subscribers(); track s.ueId) {
                    <tr>
                      <td class="mono">{{ s.ueId }}</td>
                      <td class="mono muted">{{ s.plmnID }}</td>
                      <td class="muted">{{ s.gpsi || '—' }}</td>
                      @if (canWrite()) {
                        <td class="right">
                          <button class="mini danger" (click)="deleteSubscriber(s.ueId)">Delete</button>
                        </td>
                      }
                    </tr>
                  } @empty {
                    <tr><td class="empty" [attr.colspan]="canWrite() ? 4 : 3">
                      No subscribers provisioned.
                    </td></tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>

        <!-- right: profiles panel -->
        <div class="sub-side">
          <div class="hw-card panel">
            <div class="panel-head">
              <span class="panel-title">Subscription Profiles</span>
              @if (canWrite()) {
                <button class="hw-btn" (click)="showProfileForm.set(!showProfileForm())">
                  {{ showProfileForm() ? 'Cancel' : '+ New profile' }}
                </button>
              }
            </div>

            @if (canWrite() && showProfileForm()) {
              <form class="profile-form" (ngSubmit)="createProfile()">
                <label>Profile name <span class="req">*</span>
                  <input [(ngModel)]="newProfileName" name="profileName" placeholder="e.g. default" required />
                </label>
                <div class="pf-row">
                  <label>UL AMBR <input [(ngModel)]="newProfileUlAmbr" name="pUl" placeholder="1 Gbps" class="sub-in" /></label>
                  <label>DL AMBR <input [(ngModel)]="newProfileDlAmbr" name="pDl" placeholder="2 Gbps" class="sub-in" /></label>
                </div>

                <div class="pf-section">Slices / Session</div>
                <div class="pf-scroll">
                  <table class="sub-tbl">
                    <thead><tr>
                      <th>SST</th><th>SD</th><th>DNN</th><th>AMBR UL</th><th>AMBR DL</th><th>5QI</th><th>Def</th><th></th>
                    </tr></thead>
                    <tbody>
                      @for (s of profSlices; track $index; let i = $index) {
                        <tr>
                          <td><input [(ngModel)]="profSlices[i].sst"           [name]="'ps_sst'+i"  type="number" class="sub-in num" /></td>
                          <td><input [(ngModel)]="profSlices[i].sd"            [name]="'ps_sd'+i"   placeholder="010203" class="sub-in" /></td>
                          <td><input [(ngModel)]="profSlices[i].dnn"           [name]="'ps_dnn'+i"  placeholder="internet" class="sub-in" /></td>
                          <td><input [(ngModel)]="profSlices[i].sessionAmbrUl" [name]="'ps_ul'+i"   placeholder="1000 Mbps" class="sub-in" /></td>
                          <td><input [(ngModel)]="profSlices[i].sessionAmbrDl" [name]="'ps_dl'+i"   placeholder="1000 Mbps" class="sub-in" /></td>
                          <td><input [(ngModel)]="profSlices[i].qi5"           [name]="'ps_qi5'+i"  type="number" class="sub-in num" /></td>
                          <td class="ctr"><input type="checkbox" [(ngModel)]="profSlices[i].isDefault" [name]="'ps_def'+i" /></td>
                          <td><button type="button" class="mini danger" (click)="removeProfSlice(i)">✕</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <button type="button" class="mini add-row" (click)="addProfSlice()">+ Slice</button>

                <div class="pf-section">Flow Rules</div>
                <div class="pf-scroll">
                  <table class="sub-tbl">
                    <thead><tr><th>Filter</th><th>Prec.</th><th>SNSSAI</th><th>DNN</th><th>Ref</th><th></th></tr></thead>
                    <tbody>
                      @for (r of profFlowRules; track $index; let i = $index) {
                        <tr>
                          <td><input [(ngModel)]="profFlowRules[i].filter"     [name]="'pf_f'+i"   placeholder="1.1.1.1/32" class="sub-in" /></td>
                          <td><input [(ngModel)]="profFlowRules[i].precedence" [name]="'pf_p'+i"   type="number" class="sub-in num" /></td>
                          <td><input [(ngModel)]="profFlowRules[i].snssai"     [name]="'pf_sn'+i"  placeholder="01010203" class="sub-in" /></td>
                          <td><input [(ngModel)]="profFlowRules[i].dnn"        [name]="'pf_dn'+i"  placeholder="internet" class="sub-in" /></td>
                          <td><input [(ngModel)]="profFlowRules[i].qosRef"     [name]="'pf_qr'+i"  type="number" class="sub-in num" /></td>
                          <td><button type="button" class="mini danger" (click)="removeProfFlow(i)">✕</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <button type="button" class="mini add-row" (click)="addProfFlow()">+ Rule</button>

                <div class="pf-section">QoS Flows</div>
                <div class="pf-scroll">
                  <table class="sub-tbl">
                    <thead><tr><th>SNSSAI</th><th>DNN</th><th>Ref</th><th>5QI</th><th>MBR UL</th><th>MBR DL</th><th>GBR UL</th><th>GBR DL</th><th></th></tr></thead>
                    <tbody>
                      @for (f of profQosFlows; track $index; let i = $index) {
                        <tr>
                          <td><input [(ngModel)]="profQosFlows[i].snssai" [name]="'pq_sn'+i"   class="sub-in" /></td>
                          <td><input [(ngModel)]="profQosFlows[i].dnn"    [name]="'pq_dn'+i"   class="sub-in" /></td>
                          <td><input [(ngModel)]="profQosFlows[i].qosRef" [name]="'pq_qr'+i"   type="number" class="sub-in num" /></td>
                          <td><input [(ngModel)]="profQosFlows[i].qi5"    [name]="'pq_qi'+i"   type="number" class="sub-in num" /></td>
                          <td><input [(ngModel)]="profQosFlows[i].mbrUL"  [name]="'pq_mUl'+i"  class="sub-in" /></td>
                          <td><input [(ngModel)]="profQosFlows[i].mbrDL"  [name]="'pq_mDl'+i"  class="sub-in" /></td>
                          <td><input [(ngModel)]="profQosFlows[i].gbrUL"  [name]="'pq_gUl'+i"  class="sub-in" /></td>
                          <td><input [(ngModel)]="profQosFlows[i].gbrDL"  [name]="'pq_gDl'+i"  class="sub-in" /></td>
                          <td><button type="button" class="mini danger" (click)="removeProfQos(i)">✕</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <button type="button" class="mini add-row" (click)="addProfQos()">+ Flow</button>

                <div class="pf-section">Charging Data</div>
                <div class="pf-scroll">
                  <table class="sub-tbl">
                    <thead><tr><th>Method</th><th>Quota</th><th>Cost</th><th>SNSSAI</th><th>DNN</th><th>Filter</th><th>Ref</th><th></th></tr></thead>
                    <tbody>
                      @for (c of profCharging; track $index; let i = $index) {
                        <tr>
                          <td>
                            <select [(ngModel)]="profCharging[i].method" [name]="'pc_m'+i" class="sub-in">
                              <option>Offline</option><option>Online</option>
                            </select>
                          </td>
                          <td><input [(ngModel)]="profCharging[i].quota"    [name]="'pc_q'+i"   class="sub-in" /></td>
                          <td><input [(ngModel)]="profCharging[i].unitCost" [name]="'pc_uc'+i"  class="sub-in num" /></td>
                          <td><input [(ngModel)]="profCharging[i].snssai"   [name]="'pc_sn'+i"  class="sub-in" /></td>
                          <td><input [(ngModel)]="profCharging[i].dnn"      [name]="'pc_dn'+i"  class="sub-in" /></td>
                          <td><input [(ngModel)]="profCharging[i].filter"   [name]="'pc_f'+i"   class="sub-in" /></td>
                          <td><input [(ngModel)]="profCharging[i].qosRef"   [name]="'pc_qr'+i"  type="number" class="sub-in num" /></td>
                          <td><button type="button" class="mini danger" (click)="removeProfCharging(i)">✕</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <button type="button" class="mini add-row" (click)="addProfCharging()">+ Entry</button>

                <div class="form-actions">
                  <button class="hw-btn" type="submit" [disabled]="savingProfile() || !newProfileName">
                    {{ savingProfile() ? 'Saving…' : 'Save profile' }}
                  </button>
                  @if (profileError()) { <span class="inline-err">{{ profileError() }}</span> }
                </div>
              </form>
            }

            @if (loadingProfiles()) {
              <p class="empty">Loading…</p>
            } @else {
              @for (p of profiles(); track p.profileName) {
                <div class="profile-card">
                  <div class="profile-name">{{ p.profileName }}</div>
                  @if (canWrite()) {
                    <button class="mini danger" (click)="deleteProfile(p.profileName!)">Delete</button>
                  }
                </div>
              } @empty {
                <p class="empty">No profiles yet.<br>Create one to pre-fill subscriber forms.</p>
              }
            }
          </div>
        </div>

        <!-- tenants panel -->
        <div class="hw-card panel">
          <div class="panel-head">
            <span class="panel-title">Tenants</span>
            @if (canWrite()) {
              <button class="hw-btn" (click)="showTenantForm.set(!showTenantForm())">
                {{ showTenantForm() ? 'Cancel' : '+ New tenant' }}
              </button>
            }
          </div>

          @if (canWrite() && showTenantForm()) {
            <form class="profile-form" (ngSubmit)="createTenant()">
              <label>Tenant name <span class="req">*</span>
                <input [(ngModel)]="newTenantName" name="tenantName" placeholder="e.g. test1" required />
              </label>
              <div class="form-actions">
                <button class="hw-btn" type="submit" [disabled]="savingTenant() || !newTenantName">
                  {{ savingTenant() ? 'Saving…' : 'Create tenant' }}
                </button>
                @if (tenantError()) { <span class="inline-err">{{ tenantError() }}</span> }
              </div>
            </form>
          }

          @if (loadingTenants()) {
            <p class="empty">Loading…</p>
          } @else {
            @for (t of tenants(); track t.tenantId) {
              <div class="profile-card">
                <div>
                  <div class="profile-name">{{ t.tenantName }}</div>
                  <div class="muted" style="font-size:10px;font-family:monospace">{{ t.tenantId }}</div>
                </div>
                @if (canWrite()) {
                  <button class="mini danger" (click)="deleteTenant(t.tenantId!)">Delete</button>
                }
              </div>
            } @empty {
              <p class="empty">No tenants yet.</p>
            }
          }
        </div>

      </div>
    }

    <!-- ═══ UE CONTEXTS ═══ -->
    @if (tab() === 'ue-contexts') {
      <div class="hw-card panel">
        <div class="panel-head">
          <span class="panel-title">Active UE Contexts</span>
          <span class="tag">{{ ueContexts().length ? ueContexts().length + ' connected' : 'No active sessions' }}</span>
        </div>
        @if (loadingUe()) {
          <p class="empty">Loading…</p>
        } @else {
          <table class="tbl">
            <thead><tr><th>SUPI / IMSI</th><th>Access Type</th><th>GUTI</th></tr></thead>
            <tbody>
              @for (u of ueContexts(); track $index) {
                <tr>
                  <td class="mono">{{ u['supi'] || '—' }}</td>
                  <td class="muted">{{ u['accessType'] || '3GPP' }}</td>
                  <td class="mono muted small">{{ u['guti'] || '—' }}</td>
                </tr>
              } @empty {
                <tr><td class="empty" colspan="3">
                  No UEs registered. Connect UERANSIM or a physical gNB to generate sessions.
                </td></tr>
              }
            </tbody>
          </table>
        }
      </div>
    }

    <!-- ═══ INFRASTRUCTURE / CONTAINERS ═══ -->
    @if (tab() === 'containers') {
      <div class="hw-card panel">
        <div class="panel-head">
          <span class="panel-title">free5GC Containers</span>
          <span class="tag">{{ containers().length }} containers</span>
        </div>

        @if (actionError()) { <div class="banner-err">{{ actionError() }}</div> }

        @if (loadingContainers()) {
          <p class="empty">Loading…</p>
        } @else {
          <table class="tbl">
            <thead>
              <tr>
                <th>Container</th><th>Image</th><th>State</th><th>Status</th>
                @if (canWrite()) { <th class="right">Actions</th> }
                <th class="right">Logs</th>
              </tr>
            </thead>
            <tbody>
              @for (c of containers(); track c.name) {
                <tr>
                  <td class="mono">{{ c.name }}</td>
                  <td class="muted small">{{ c.image }}</td>
                  <td>
                    <span class="state-dot" [class.running]="c.running" [class.stopped]="!c.running"></span>
                    <span class="state-label" [class.running]="c.running">{{ c.state }}</span>
                  </td>
                  <td class="muted small">{{ c.status }}</td>
                  @if (canWrite()) {
                    <td class="right nowrap">
                      @if (!c.running) {
                        <button class="mini ok" [disabled]="busyContainer() === c.name"
                                (click)="startContainer(c.name)">Start</button>
                      } @else {
                        <button class="mini"    [disabled]="busyContainer() === c.name"
                                (click)="restartContainer(c.name)">Restart</button>
                        <button class="mini danger" [disabled]="busyContainer() === c.name"
                                (click)="stopContainer(c.name)">Stop</button>
                      }
                    </td>
                  }
                  <td class="right">
                    <button class="mini" (click)="fetchLogs(c.name)">Logs</button>
                  </td>
                </tr>
              } @empty {
                <tr><td class="empty" [attr.colspan]="canWrite() ? 6 : 5">
                  No free5GC containers found. Run <code>./infra.sh 5gc up</code> to start them.
                </td></tr>
              }
            </tbody>
          </table>
        }
      </div>

      @if (selectedLogs()) {
        <div class="hw-card panel">
          <div class="panel-head">
            <span class="panel-title">Logs — {{ selectedLogs()!.containerName }}</span>
            <div class="log-controls">
              <select [(ngModel)]="logTail" name="tail" (ngModelChange)="fetchLogs(selectedLogs()!.containerName)">
                <option [value]="50">50 lines</option>
                <option [value]="100">100 lines</option>
                <option [value]="200">200 lines</option>
                <option [value]="500">500 lines</option>
              </select>
              <button class="mini" (click)="selectedLogs.set(null)">Close</button>
            </div>
          </div>
          <pre class="log-pre">{{ selectedLogs()!.logs || '(no output)' }}</pre>
        </div>
      }
    }
  `,
  styles: [`
    /* tabs */
    .tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 2px solid var(--hw-border); padding-bottom: 0; }
    .tab { padding: 8px 18px; border: none; background: none; font-size: 13px; font-weight: 500;
           color: var(--hw-text-3); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color .15s; }
    .tab:hover { color: var(--hw-text); }
    .tab.active { color: #00a870; border-bottom-color: #00a870; font-weight: 700; }

    /* summary cards */
    .summary-row { display: flex; gap: 14px; margin-bottom: 16px; }
    .scard { flex: 1; padding: 14px 18px; border-radius: 10px; border: 1px solid var(--hw-border);
             background: var(--hw-bg-2); display: flex; flex-direction: column; gap: 4px; }
    .sval { font-size: 28px; font-weight: 800; color: var(--hw-text); }
    .sval.blue { color: #00a870; }
    .sval.red  { color: var(--hw-danger); }
    .slab { font-size: 12px; color: var(--hw-text-3); }

    /* NF grid */
    .nf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
    .nf-card { padding: 12px 14px; border-radius: 10px; border: 1px solid var(--hw-border);
               display: flex; flex-direction: column; gap: 4px; }
    .nf-card.up   { border-color: rgba(0,168,112,.3); background: rgba(0,168,112,.05); }
    .nf-card.down { border-color: rgba(245,63,63,.25); background: rgba(245,63,63,.04); }
    .nf-top { display: flex; align-items: center; gap: 7px; }
    .nf-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .nf-card.up   .nf-dot { background: var(--hw-success); }
    .nf-card.down .nf-dot { background: var(--hw-danger); }
    .nf-type { font-size: 14px; font-weight: 700; color: var(--hw-text); }
    .nf-badge { margin-left: auto; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
    .nf-card.up   .nf-badge { background: rgba(0,168,112,.15); color: var(--hw-success); }
    .nf-card.down .nf-badge { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .nf-desc { font-size: 11px; color: var(--hw-text-3); }
    .nf-id { font-size: 10px; color: var(--hw-text-3); }

    /* shared panel */
    .panel { padding: 18px 20px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-title { font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }

    /* table */
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px;
              border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 10px 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: none; }
    .right { text-align: right; }
    .nowrap { white-space: nowrap; }
    .mono  { font-family: monospace; }
    .muted { color: var(--hw-text-3); }
    .small { font-size: 12px; }
    .empty { text-align: center; color: var(--hw-text-3); padding: 18px; }

    /* container state */
    .state-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; background: var(--hw-danger); }
    .state-dot.running { background: var(--hw-success); }
    .state-label { font-size: 12px; font-weight: 600; color: var(--hw-danger); }
    .state-label.running { color: var(--hw-success); }

    /* action buttons */
    .mini { font-size: 12px; padding: 4px 10px; margin-left: 6px; border: 1px solid var(--hw-border);
            background: var(--hw-card, #fff); border-radius: 6px; cursor: pointer; color: var(--hw-text-2); }
    .mini:hover { border-color: var(--hw-info); color: var(--hw-info); }
    .mini.danger:hover { border-color: var(--hw-danger); color: var(--hw-danger); }
    .mini.ok { border-color: rgba(0,168,112,.4); color: var(--hw-success); }
    .mini.ok:hover { background: rgba(0,168,112,.08); }
    .mini:disabled { opacity: .45; pointer-events: none; }

    /* add subscriber form */
    .add-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px;
                padding: 18px; background: var(--hw-bg); border-radius: 8px; margin-bottom: 16px; }
    .add-form label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--hw-text-3); }
    .add-form input, .add-form select {
      padding: 8px 10px; border: 1px solid var(--hw-border); border-radius: 6px;
      font-size: 13px; background: var(--hw-card, #fff); color: var(--hw-text); font-family: monospace; }
    .add-form input:focus, .add-form select:focus { outline: none; border-color: #00a870; }
    .req { color: var(--hw-danger); }
    .form-section-title { grid-column: 1 / -1; font-size: 11px; font-weight: 700; text-transform: uppercase;
                          letter-spacing: .06em; color: var(--hw-text-3); padding-top: 6px;
                          border-top: 1px solid var(--hw-border); margin-top: 4px; }
    .form-section-title:first-child { border-top: none; margin-top: 0; padding-top: 0; }
    .form-actions { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; padding-top: 4px; }
    .inline-err { color: var(--hw-danger); font-size: 12px; }
    .banner-err { margin-bottom: 12px; padding: 10px 14px; border-radius: 6px;
                  background: rgba(245,63,63,.1); color: var(--hw-danger); font-size: 12px; }

    /* array table (slices / flow rules / QoS flows / charging) */
    .array-section { overflow-x: auto; margin-bottom: 4px; }
    .sub-tbl { border-collapse: collapse; font-size: 12px; min-width: 100%; }
    .sub-tbl th { color: var(--hw-text-3); font-weight: 500; font-size: 11px; padding: 4px 5px;
                  border-bottom: 1px solid var(--hw-border); text-align: left; white-space: nowrap; }
    .sub-tbl td { padding: 3px 3px; border-bottom: 1px solid var(--hw-border); vertical-align: middle; }
    .sub-tbl tr:last-child td { border-bottom: none; }
    .sub-tbl .ctr { text-align: center; }
    .sub-in { width: 100%; padding: 4px 6px; border: 1px solid var(--hw-border); border-radius: 4px;
              font-size: 11px; background: var(--hw-card, #fff); color: var(--hw-text);
              font-family: monospace; box-sizing: border-box; min-width: 70px; }
    .sub-in.num { min-width: 44px; width: 54px; }
    .sub-in:focus { outline: none; border-color: #00a870; }
    .add-row { margin-top: 6px; font-size: 11px; }

    /* subscriber + profiles two-column layout */
    .sub-layout { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
    .sub-main { min-width: 0; }
    .sub-side  { min-width: 0; }

    /* textarea in add form */
    .add-form textarea { padding: 8px 10px; border: 1px solid var(--hw-border); border-radius: 6px;
                         font-size: 12px; background: var(--hw-card, #fff); color: var(--hw-text);
                         font-family: monospace; resize: vertical; width: 100%; box-sizing: border-box; }
    .add-form textarea:focus { outline: none; border-color: #00a870; }
    .add-form select { padding: 8px 10px; border: 1px solid var(--hw-border); border-radius: 6px;
                       font-size: 13px; background: var(--hw-card, #fff); color: var(--hw-text); }
    .add-form .span-full { grid-column: 1 / -1; }
    .add-form .span2 { grid-column: span 2; }

    /* profile form (inside the side panel) */
    .profile-form { display: flex; flex-direction: column; gap: 8px;
                    padding: 14px; background: var(--hw-bg); border-radius: 8px; margin-bottom: 14px; max-height: 80vh; overflow-y: auto; }
    .profile-form label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--hw-text-3); }
    .profile-form input {
      padding: 7px 9px; border: 1px solid var(--hw-border); border-radius: 6px;
      font-size: 12px; background: var(--hw-card, #fff); color: var(--hw-text); font-family: monospace; width: 100%; box-sizing: border-box; }
    .profile-form input:focus { outline: none; border-color: #00a870; }
    .pf-row { display: flex; gap: 8px; }
    .pf-row label { flex: 1; }
    .pf-section { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
                  color: var(--hw-text-3); padding-top: 6px; border-top: 1px solid var(--hw-border); margin-top: 2px; }
    .pf-scroll { overflow-x: auto; }

    /* profile card in list */
    .profile-card { display: flex; align-items: center; justify-content: space-between;
                    padding: 10px 14px; border-bottom: 1px solid var(--hw-border); }
    .profile-card:last-child { border-bottom: none; }
    .profile-name { font-size: 13px; font-weight: 600; color: var(--hw-text); }

    /* logs */
    .log-controls { display: flex; align-items: center; gap: 8px; }
    .log-controls select { padding: 5px 8px; border: 1px solid var(--hw-border); border-radius: 6px; font-size: 12px; }
    .log-pre { margin: 0; font-family: monospace; font-size: 11px; line-height: 1.6;
               background: var(--hw-bg); padding: 14px; border-radius: 6px; max-height: 400px;
               overflow: auto; white-space: pre-wrap; word-break: break-all;
               color: var(--hw-text-2); border: 1px solid var(--hw-border); }

    @media (max-width: 1100px) { .sub-layout { grid-template-columns: 1fr; } }
    @media (max-width: 900px) { .add-form { grid-template-columns: 1fr 1fr; } .summary-row { flex-wrap: wrap; } }
    @media (max-width: 600px) { .add-form { grid-template-columns: 1fr; } }
  `],
})
export class FiveGcDashboard implements OnInit {
  private api  = inject(FiveGcService);
  private auth = inject(AuthService);

  canWrite = computed(() => this.auth.hasRole('NETWORK_OPERATOR'));

  tab = signal<Tab>('nf');

  // NF status
  nfs        = signal<NfStatus[]>([]);
  loadingNf  = signal(false);
  upCount    = computed(() => this.nfs().filter((n) => n.up).length);
  downCount  = computed(() => this.nfs().filter((n) => !n.up).length);

  // Subscribers
  subscribers   = signal<Subscriber[]>([]);
  loadingSubs   = signal(false);
  showAddForm   = signal(false);
  saving        = signal(false);
  saveError     = signal<string | null>(null);
  newImsi   = '';
  newKey    = '8baf473f2f8fd09487cccbd7097c6862';
  newOpc    = '8e27b6af0e692e750f32667a3b14605d';
  newPlmn   = '20893';
  newSeqNum = '000000000023';
  newAmf    = '8000';
  newUlAmbr = '1 Gbps';
  newDlAmbr = '2 Gbps';
  selectedProfileName = '';

  // subscriber form — structured row arrays
  subSlices    = defaultSlices();
  subFlowRules = defaultFlowRules();
  subQosFlows  = defaultQosFlows();
  subCharging  = defaultCharging();

  // Profiles
  profiles          = signal<SubscriberProfile[]>([]);
  loadingProfiles   = signal(false);
  showProfileForm   = signal(false);
  savingProfile     = signal(false);
  profileError      = signal<string | null>(null);
  newProfileName    = '';
  newProfileUlAmbr  = '1 Gbps';
  newProfileDlAmbr  = '2 Gbps';

  // profile creation form — structured row arrays
  profSlices    = defaultSlices();
  profFlowRules = defaultFlowRules();
  profQosFlows  = defaultQosFlows();
  profCharging  = defaultCharging();

  // Tenants
  tenants         = signal<Tenant[]>([]);
  loadingTenants  = signal(false);
  showTenantForm  = signal(false);
  savingTenant    = signal(false);
  tenantError     = signal<string | null>(null);
  newTenantName   = '';

  // UE contexts
  ueContexts   = signal<UeContext[]>([]);
  loadingUe    = signal(false);

  // Containers
  containers        = signal<ContainerInfo[]>([]);
  loadingContainers = signal(false);
  busyContainer     = signal<string | null>(null);
  actionError       = signal<string | null>(null);
  selectedLogs      = signal<ContainerLogs | null>(null);
  logTail = 100;

  ngOnInit() { this.refresh(); }

  setTab(t: Tab) {
    this.tab.set(t);
    this.loadTab(t);
  }

  refresh() { this.loadTab(this.tab()); }

  private loadTab(t: Tab) {
    if (t === 'nf')          this.loadNf();
    if (t === 'subscribers') { this.loadSubscribers(); this.loadProfiles(); this.loadTenants(); }
    if (t === 'ue-contexts') this.loadUeContexts();
    if (t === 'containers')  this.loadContainers();
  }

  // ── NF status ────────────────────────────────────────────────────────────────

  private loadNf() {
    this.loadingNf.set(true);
    this.api.nfStatus().subscribe({
      next: (v) => { this.nfs.set(v); this.loadingNf.set(false); },
      error: () => this.loadingNf.set(false),
    });
  }

  // ── subscribers ───────────────────────────────────────────────────────────────

  private loadSubscribers() {
    this.loadingSubs.set(true);
    this.api.subscribers().subscribe({
      next: (v) => { this.subscribers.set(v); this.loadingSubs.set(false); },
      error: () => this.loadingSubs.set(false),
    });
  }

  createSubscriber() {
    if (!this.newImsi) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.api.createSubscriber(this.buildSubBody()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showAddForm.set(false);
        this.resetSubForm();
        this.loadSubscribers();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(err.error?.error ?? err.error?.details ?? `Failed (${err.status})`);
      },
    });
  }

  private buildSubBody(): Record<string, unknown> {
    const sessionData = this.subSlices.map(s => ({
      singleNssai: { sst: s.sst, sd: s.sd },
      dnnConfigurations: {
        [s.dnn]: {
          pduSessionTypes: { defaultSessionType: 'IPV4', allowedSessionTypes: ['IPV4'] },
          sscModes: { defaultSscMode: 'SSC_MODE_1', allowedSscModes: ['SSC_MODE_2', 'SSC_MODE_3'] },
          '5gQosProfile': { '5qi': s.qi5, arp: { priorityLevel: 8, preemptCap: '', preemptVuln: '' }, priorityLevel: 8 },
          sessionAmbr: { uplink: s.sessionAmbrUl, downlink: s.sessionAmbrDl },
          staticIpAddress: [],
        },
      },
    }));
    const snssaiInfos: Record<string, unknown> = {};
    const smPolicy: Record<string, unknown> = {};
    for (const s of this.subSlices) {
      const key = s.sst.toString(16).padStart(2, '0') + s.sd;
      snssaiInfos[key] = { dnnInfos: [{ dnn: s.dnn }] };
      smPolicy[key] = { snssai: { sst: s.sst, sd: s.sd }, smPolicyDnnData: { [s.dnn]: { dnn: s.dnn } } };
    }
    return {
      userNumber: 1,
      ueId:   `imsi-${this.newImsi}`,
      plmnID: this.newPlmn,
      AuthenticationSubscription: {
        authenticationMethod: '5G_AKA',
        permanentKey:                  { permanentKeyValue: this.newKey, encryptionKey: 0, encryptionAlgorithm: 0 },
        sequenceNumber:                this.newSeqNum,
        authenticationManagementField: this.newAmf,
        milenage: { op: { opValue: '', encryptionKey: 0, encryptionAlgorithm: 0 } },
        opc: { opcValue: this.newOpc, encryptionKey: 0, encryptionAlgorithm: 0 },
      },
      AccessAndMobilitySubscriptionData: {
        gpsis: ['msisdn-'],
        subscribedUeAmbr: { uplink: this.newUlAmbr, downlink: this.newDlAmbr },
        nssai: {
          defaultSingleNssais: this.subSlices.filter(s => s.isDefault).map(s => ({ sst: s.sst, sd: s.sd })),
          singleNssais:        this.subSlices.filter(s => !s.isDefault).map(s => ({ sst: s.sst, sd: s.sd })),
        },
      },
      SessionManagementSubscriptionData: sessionData,
      SmfSelectionSubscriptionData: { subscribedSnssaiInfos: snssaiInfos },
      AmPolicyData: { subscCats: ['free5gc'] },
      SmPolicyData: { smPolicySnssaiData: smPolicy },
      FlowRules:    this.subFlowRules.map(r => ({ filter: r.filter, precedence: r.precedence, snssai: r.snssai, dnn: r.dnn, qosRef: r.qosRef })),
      QosFlows:     this.subQosFlows.map(f => ({ snssai: f.snssai, dnn: f.dnn, qosRef: f.qosRef, '5qi': f.qi5, mbrUL: f.mbrUL, mbrDL: f.mbrDL, gbrUL: f.gbrUL, gbrDL: f.gbrDL })),
      ChargingDatas: this.subCharging.map(c => {
        const e: Record<string, unknown> = { chargingMethod: c.method, quota: c.quota, unitCost: c.unitCost, snssai: c.snssai, dnn: c.dnn, filter: c.filter };
        if (c.qosRef != null) e['qosRef'] = c.qosRef;
        return e;
      }),
    };
  }

  private resetSubForm() {
    this.newImsi   = '';
    this.newKey    = '8baf473f2f8fd09487cccbd7097c6862';
    this.newOpc    = '8e27b6af0e692e750f32667a3b14605d';
    this.newPlmn   = '20893';
    this.newSeqNum = '000000000023';
    this.newAmf    = '8000';
    this.newUlAmbr = '1 Gbps';
    this.newDlAmbr = '2 Gbps';
    this.subSlices    = defaultSlices();
    this.subFlowRules = defaultFlowRules();
    this.subQosFlows  = defaultQosFlows();
    this.subCharging  = defaultCharging();
    this.selectedProfileName = '';
  }

  deleteSubscriber(ueId: string) {
    if (!confirm(`Delete subscriber ${ueId}?`)) return;
    this.api.deleteSubscriber(ueId).subscribe({
      next: () => this.loadSubscribers(),
      error: (err: HttpErrorResponse) =>
        this.saveError.set(err.error?.error ?? `Delete failed (${err.status})`),
    });
  }

  // ── profiles ─────────────────────────────────────────────────────────────────

  private loadProfiles() {
    this.loadingProfiles.set(true);
    this.api.profiles().subscribe({
      next: (v) => { this.profiles.set(v); this.loadingProfiles.set(false); },
      error: () => this.loadingProfiles.set(false),
    });
  }

  applyProfile(name: string) {
    if (!name) return;
    const p = this.profiles().find((pr) => pr.profileName === name);
    if (!p) return;

    const ambr = (p['AccessAndMobilitySubscriptionData'] as Record<string, unknown> | undefined)?.['subscribedUeAmbr'] as Record<string, string> | undefined;
    if (ambr?.['uplink'])   this.newUlAmbr = ambr['uplink'];
    if (ambr?.['downlink']) this.newDlAmbr = ambr['downlink'];

    const sessionArr = p['SessionManagementSubscriptionData'] as Record<string, unknown>[] | undefined;
    if (sessionArr?.length) {
      this.subSlices = sessionArr.map((s, i) => {
        const dnn = Object.keys((s['dnnConfigurations'] as Record<string, unknown>) ?? {})[0] ?? 'internet';
        const dnnConf = ((s['dnnConfigurations'] as Record<string, Record<string, unknown>>) ?? {})[dnn] ?? {};
        const qos5g = dnnConf['5gQosProfile'] as Record<string, unknown> | undefined;
        const sessAmbr = dnnConf['sessionAmbr'] as Record<string, string> | undefined;
        const nssai = s['singleNssai'] as Record<string, unknown> | undefined;
        return { sst: (nssai?.['sst'] as number) ?? 1, sd: (nssai?.['sd'] as string) ?? '',
          dnn, sessionAmbrUl: sessAmbr?.['uplink'] ?? '1000 Mbps', sessionAmbrDl: sessAmbr?.['downlink'] ?? '1000 Mbps',
          qi5: (qos5g?.['5qi'] as number) ?? 9, isDefault: i === 0 };
      });
    }
    const flowArr = p['FlowRules'] as Record<string, unknown>[] | undefined;
    if (flowArr?.length) {
      this.subFlowRules = flowArr.map(r => ({
        filter: (r['filter'] as string) ?? '', precedence: (r['precedence'] as number) ?? 128,
        snssai: (r['snssai'] as string) ?? '', dnn: (r['dnn'] as string) ?? '', qosRef: (r['qosRef'] as number) ?? 1,
      }));
    }
    const qosArr = p['QosFlows'] as Record<string, unknown>[] | undefined;
    if (qosArr?.length) {
      this.subQosFlows = qosArr.map(f => ({
        snssai: (f['snssai'] as string) ?? '', dnn: (f['dnn'] as string) ?? '', qosRef: (f['qosRef'] as number) ?? 1,
        qi5: (f['5qi'] as number) ?? 9, mbrUL: (f['mbrUL'] as string) ?? '', mbrDL: (f['mbrDL'] as string) ?? '',
        gbrUL: (f['gbrUL'] as string) ?? '', gbrDL: (f['gbrDL'] as string) ?? '',
      }));
    }
    const chArr = p['ChargingDatas'] as Record<string, unknown>[] | undefined;
    if (chArr?.length) {
      this.subCharging = chArr.map(c => ({
        method: (c['chargingMethod'] as string) ?? 'Offline', quota: (c['quota'] as string) ?? '100000',
        unitCost: (c['unitCost'] as string) ?? '1', snssai: (c['snssai'] as string) ?? '',
        dnn: (c['dnn'] as string) ?? '', filter: (c['filter'] as string) ?? '',
        qosRef: c['qosRef'] != null ? (c['qosRef'] as number) : null,
      }));
    }
  }

  createProfile() {
    if (!this.newProfileName) return;
    this.savingProfile.set(true);
    this.profileError.set(null);

    const sessionData = this.profSlices.map(s => ({
      singleNssai: { sst: s.sst, sd: s.sd },
      dnnConfigurations: {
        [s.dnn]: {
          pduSessionTypes: { defaultSessionType: 'IPV4', allowedSessionTypes: ['IPV4'] },
          sscModes: { defaultSscMode: 'SSC_MODE_1', allowedSscModes: ['SSC_MODE_2', 'SSC_MODE_3'] },
          '5gQosProfile': { '5qi': s.qi5, arp: { priorityLevel: 8, preemptCap: '', preemptVuln: '' }, priorityLevel: 8 },
          sessionAmbr: { uplink: s.sessionAmbrUl, downlink: s.sessionAmbrDl },
          staticIpAddress: [],
        },
      },
    }));
    const snssaiInfos: Record<string, unknown> = {};
    const smPolicy: Record<string, unknown> = {};
    for (const s of this.profSlices) {
      const key = s.sst.toString(16).padStart(2, '0') + s.sd;
      snssaiInfos[key] = { dnnInfos: [{ dnn: s.dnn }] };
      smPolicy[key] = { snssai: { sst: s.sst, sd: s.sd }, smPolicyDnnData: { [s.dnn]: { dnn: s.dnn } } };
    }
    const body: Record<string, unknown> = {
      profileName: this.newProfileName,
      AccessAndMobilitySubscriptionData: {
        gpsis: ['msisdn-'],
        subscribedUeAmbr: { uplink: this.newProfileUlAmbr, downlink: this.newProfileDlAmbr },
        nssai: {
          defaultSingleNssais: this.profSlices.filter(s => s.isDefault).map(s => ({ sst: s.sst, sd: s.sd })),
          singleNssais:        this.profSlices.filter(s => !s.isDefault).map(s => ({ sst: s.sst, sd: s.sd })),
        },
      },
      SessionManagementSubscriptionData: sessionData,
      SmfSelectionSubscriptionData: { subscribedSnssaiInfos: snssaiInfos },
      AmPolicyData: { subscCats: ['free5gc'] },
      SmPolicyData: { smPolicySnssaiData: smPolicy },
      FlowRules:    this.profFlowRules.map(r => ({ ...r })),
      QosFlows:     this.profQosFlows.map(f => ({ snssai: f.snssai, dnn: f.dnn, qosRef: f.qosRef, '5qi': f.qi5, mbrUL: f.mbrUL, mbrDL: f.mbrDL, gbrUL: f.gbrUL, gbrDL: f.gbrDL })),
      ChargingDatas: this.profCharging.map(c => {
        const e: Record<string, unknown> = { chargingMethod: c.method, quota: c.quota, unitCost: c.unitCost, snssai: c.snssai, dnn: c.dnn, filter: c.filter };
        if (c.qosRef != null) e['qosRef'] = c.qosRef;
        return e;
      }),
    };
    this.api.createProfile(this.newProfileName, body).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.showProfileForm.set(false);
        this.resetProfileForm();
        this.loadProfiles();
      },
      error: (err: HttpErrorResponse) => {
        this.savingProfile.set(false);
        this.profileError.set(err.error?.error ?? err.error?.details ?? `Failed (${err.status})`);
      },
    });
  }

  private resetProfileForm() {
    this.newProfileName   = '';
    this.newProfileUlAmbr = '1 Gbps';
    this.newProfileDlAmbr = '2 Gbps';
    this.profSlices    = defaultSlices();
    this.profFlowRules = defaultFlowRules();
    this.profQosFlows  = defaultQosFlows();
    this.profCharging  = defaultCharging();
  }

  deleteProfile(name: string) {
    if (!confirm(`Delete profile "${name}"?`)) return;
    this.api.deleteProfile(name).subscribe({
      next: () => this.loadProfiles(),
      error: (err: HttpErrorResponse) =>
        this.profileError.set(err.error?.error ?? `Delete failed (${err.status})`),
    });
  }

  // ── tenants ───────────────────────────────────────────────────────────────────

  private loadTenants() {
    this.loadingTenants.set(true);
    this.api.tenants().subscribe({
      next: (v) => { this.tenants.set(v); this.loadingTenants.set(false); },
      error: () => this.loadingTenants.set(false),
    });
  }

  createTenant() {
    if (!this.newTenantName) return;
    this.savingTenant.set(true);
    this.tenantError.set(null);
    this.api.createTenant(this.newTenantName).subscribe({
      next: () => {
        this.savingTenant.set(false);
        this.showTenantForm.set(false);
        this.newTenantName = '';
        this.loadTenants();
      },
      error: (err: HttpErrorResponse) => {
        this.savingTenant.set(false);
        this.tenantError.set(err.error?.error ?? err.error?.details ?? `Failed (${err.status})`);
      },
    });
  }

  deleteTenant(tenantId: string) {
    if (!confirm(`Delete tenant ${tenantId}?`)) return;
    this.api.deleteTenant(tenantId).subscribe({
      next: () => this.loadTenants(),
      error: (err: HttpErrorResponse) =>
        this.tenantError.set(err.error?.error ?? `Delete failed (${err.status})`),
    });
  }

  // ── subscriber form row helpers ───────────────────────────────────────────────
  addSlice()    { this.subSlices.push({ sst: 1, sd: '', dnn: 'internet', sessionAmbrUl: '1000 Mbps', sessionAmbrDl: '1000 Mbps', qi5: 9, isDefault: false }); }
  removeSlice(i: number)    { this.subSlices.splice(i, 1); }
  addFlowRule() { this.subFlowRules.push({ filter: '', precedence: 128, snssai: '', dnn: 'internet', qosRef: 1 }); }
  removeFlowRule(i: number) { this.subFlowRules.splice(i, 1); }
  addQosFlow()  { this.subQosFlows.push({ snssai: '', dnn: 'internet', qosRef: 1, qi5: 9, mbrUL: '', mbrDL: '', gbrUL: '', gbrDL: '' }); }
  removeQosFlow(i: number)  { this.subQosFlows.splice(i, 1); }
  addCharging() { this.subCharging.push({ method: 'Offline', quota: '100000', unitCost: '1', snssai: '', dnn: '', filter: '', qosRef: null }); }
  removeCharging(i: number) { this.subCharging.splice(i, 1); }

  // ── profile form row helpers ──────────────────────────────────────────────────
  addProfSlice()     { this.profSlices.push({ sst: 1, sd: '', dnn: 'internet', sessionAmbrUl: '1000 Mbps', sessionAmbrDl: '1000 Mbps', qi5: 9, isDefault: false }); }
  removeProfSlice(i: number)    { this.profSlices.splice(i, 1); }
  addProfFlow()      { this.profFlowRules.push({ filter: '', precedence: 128, snssai: '', dnn: 'internet', qosRef: 1 }); }
  removeProfFlow(i: number)     { this.profFlowRules.splice(i, 1); }
  addProfQos()       { this.profQosFlows.push({ snssai: '', dnn: 'internet', qosRef: 1, qi5: 9, mbrUL: '', mbrDL: '', gbrUL: '', gbrDL: '' }); }
  removeProfQos(i: number)      { this.profQosFlows.splice(i, 1); }
  addProfCharging()  { this.profCharging.push({ method: 'Offline', quota: '100000', unitCost: '1', snssai: '', dnn: '', filter: '', qosRef: null }); }
  removeProfCharging(i: number) { this.profCharging.splice(i, 1); }

  // ── UE contexts ──────────────────────────────────────────────────────────────

  private loadUeContexts() {
    this.loadingUe.set(true);
    this.api.ueContexts().subscribe({
      next: (v) => { this.ueContexts.set(Array.isArray(v) ? v : []); this.loadingUe.set(false); },
      error: () => this.loadingUe.set(false),
    });
  }

  // ── containers ────────────────────────────────────────────────────────────────

  private loadContainers() {
    this.loadingContainers.set(true);
    this.actionError.set(null);
    this.api.containers().subscribe({
      next: (v) => { this.containers.set(v); this.loadingContainers.set(false); },
      error: () => this.loadingContainers.set(false),
    });
  }

  startContainer(name: string) {
    this.runAction(name, this.api.startContainer(name));
  }

  stopContainer(name: string) {
    if (!confirm(`Stop container ${name}?`)) return;
    this.runAction(name, this.api.stopContainer(name));
  }

  restartContainer(name: string) {
    this.runAction(name, this.api.restartContainer(name));
  }

  private runAction(name: string, obs: ReturnType<FiveGcService['startContainer']>) {
    this.busyContainer.set(name);
    this.actionError.set(null);
    obs.subscribe({
      next: () => { this.busyContainer.set(null); this.loadContainers(); },
      error: (err: HttpErrorResponse) => {
        this.busyContainer.set(null);
        this.actionError.set(err.error?.details ?? err.error?.error ?? `Action failed (${err.status})`);
      },
    });
  }

  fetchLogs(name: string) {
    this.api.containerLogs(name, this.logTail).subscribe({
      next: (v) => this.selectedLogs.set(v),
      error: (err: HttpErrorResponse) =>
        this.actionError.set(err.error?.error ?? `Could not fetch logs (${err.status})`),
    });
  }
}
