import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'zh';

/**
 * Minimal language state for the console's language switcher (English / 中文).
 * Persists the choice in localStorage and reflects it on <html lang>. String translation
 * (ngx-translate / @angular/localize) can build on top of the `lang` signal later.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private static readonly KEY = 'lang';

  /** English string → Chinese. English is the source, so keys ARE the English text. */
  private static readonly ZH: Record<string, string> = {
    // sidebar sections + account
    Main: '主导航', Account: '账户', Notifications: '通知', Messages: '消息',
    'Change password': '修改密码', Collapse: '收起', 'Sign out': '退出登录',
    // role names
    'Platform Admin': '平台管理员', 'Network Operator': '网络运营员',
    'Security Analyst': '安全分析师', Auditor: '审计员',
    // nav labels (all roles)
    Dashboard: '仪表盘', Users: '用户', 'Roles & Permissions': '角色与权限',
    'System Health': '系统健康', 'API Metrics': 'API 指标',
    'Network Functions': '网络功能', 'Core Config': '核心配置',
    'Security Alerts': '安全告警', Roaming: '漫游', Overview: '概览', Events: '事件',
    Anomalies: '异常检测', Partners: '合作伙伴', 'QoS & Experience': '服务质量与体验',
    Revenue: '收入', Tools: '工具', 'Detection Rules': '检测规则',
    'Rate Limiting': '限流', 'Audit Logs': '审计日志',
  };

  readonly lang = signal<Lang>(this.initial());

  constructor() {
    this.apply(this.lang());
  }

  /** Translate an English source string to the active language (returns the key if untranslated). */
  t(key: string): string {
    return this.lang() === 'zh' ? (I18nService.ZH[key] ?? key) : key;
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(I18nService.KEY, lang);
    this.apply(lang);
  }

  toggle(): void {
    this.setLang(this.lang() === 'en' ? 'zh' : 'en');
  }

  private initial(): Lang {
    const saved = localStorage.getItem(I18nService.KEY);
    return saved === 'zh' ? 'zh' : 'en';
  }

  private apply(lang: Lang): void {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }
}
