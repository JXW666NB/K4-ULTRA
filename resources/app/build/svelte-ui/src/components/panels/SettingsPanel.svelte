<script lang="ts">
  import Button from '../ui/Button.svelte';
  import Switch from '../ui/Switch.svelte';
  import Checkbox from '../ui/Checkbox.svelte';
  import { uiStore } from '../../stores/ui.store';
  import { locale as localeStore, t, setLocale, LOCALES } from '../../stores/i18n';

  let { onclose = () => {} }: { onclose?: () => void } = $props();

  // i18n: locale reactivity
  let _lang = $state('zh-CN');
  localeStore.subscribe(v => _lang = v);

  const FS = (window as any).FS;
  const APP_DIR = (window as any).__app_dir || '';
  const SETTINGS_PATH = APP_DIR ? APP_DIR.replaceAll('\\', '/') + '/k4-settings.json' : '';
  const LOADING_CONFIG = APP_DIR ? APP_DIR.replaceAll('\\', '/') + '/loading-config.json' : '';

  function readJSON(path: string, fallback: any): any {
    try { if (FS && FS.exists(path)) return JSON.parse(FS.readFile(path)); } catch (_) {}
    return fallback;
  }
  function writeJSON(path: string, data: any): void {
    try { if (FS) FS.writeFile(path, JSON.stringify(data, null, 2)); } catch (_) {}
  }

  const saved = readJSON(SETTINGS_PATH, {});
  const loadingCfg = readJSON(LOADING_CONFIG, { activeTheme: 'ultra' });

  let general = $state({
    autoSave: saved.general?.autoSave ?? true,
    hardwareAccel: saved.general?.hardwareAccel ?? true,
    showFps: saved.general?.showFps ?? false,
    smoothZoom: saved.general?.smoothZoom ?? true,
    theme: loadingCfg.activeTheme || 'ultra',
  });

  let appearance = $state({
    primaryColor: saved.appearance?.primaryColor ?? '#583cdc',
    secondaryColor: saved.appearance?.secondaryColor ?? '#00b4ff',
    bgColor: saved.appearance?.bgColor ?? '#050508',
    bgImage: saved.appearance?.bgImage ?? '',
    glassMorphism: saved.appearance?.glassMorphism ?? false,
    glassBlur: saved.appearance?.glassBlur ?? 12,
    glassOpacity: saved.appearance?.glassOpacity ?? 0.15,
    accentGlow: saved.appearance?.accentGlow ?? true,
    textColor: saved.appearance?.textColor ?? '#ffffff',
  });

  let editor = $state({
    snapToGrid: saved.editor?.snapToGrid ?? true,
    showCategoryIcons: saved.editor?.showCategoryIcons ?? true,
    compactMode: saved.editor?.compactMode ?? false,
    fontSize: saved.editor?.fontSize ?? 14,
    lineNumbers: saved.editor?.lineNumbers ?? true,
    autoComplete: saved.editor?.autoComplete ?? true,
  });

  let extensions = $state({
    allowUnsigned: saved.extensions?.allowUnsigned ?? false,
    devMode: saved.extensions?.devMode ?? true,
    sandbox: saved.extensions?.sandbox ?? true,
    maxMemory: saved.extensions?.maxMemory ?? 256,
  });

  let debug = $state({
    verboseLogging: saved.debug?.verboseLogging ?? false,
    showBlockIds: saved.debug?.showBlockIds ?? false,
    perfMonitor: saved.debug?.perfMonitor ?? false,
  });

  // ─── 插件列表 ───
  let loadedExts = $state<Array<{ id: string; name: string; version?: string; description?: string; enabled: boolean }>>([]);
  let disabledList = $state<string[]>([]);
  let extError = $state<string | null>(null);

  function refreshExtensions() {
    try {
      const K4 = (window as any).__k4;
      const exts = (K4 && K4._loadedExtensions) || [];
      const EXT_DIR = (window as any).__app_dir ? (window as any).__app_dir.replaceAll('\\', '/') + '/extensions' : '';
      const disabledPath = EXT_DIR + '/.disabled.json';
      let disabled: string[] = [];
      try { if (FS && FS.exists(disabledPath)) disabled = JSON.parse(FS.readFile(disabledPath)); } catch(_) {}
      disabledList = disabled;
      loadedExts = exts.map((e: any) => ({
        id: e.id,
        name: e.name || e.id,
        version: e.version || '?',
        description: e.description || '',
        enabled: disabled.indexOf(e.id) === -1,
      }));
      extError = null;
    } catch(e: any) {
      extError = e.message;
    }
  }

  function toggleExtension(id: string) {
    const idx = disabledList.indexOf(id);
    if (idx === -1) {
      disabledList = [...disabledList, id];
    } else {
      disabledList = [...disabledList.slice(0, idx), ...disabledList.slice(idx + 1)];
    }
    loadedExts = loadedExts.map(e => e.id === id ? { ...e, enabled: disabledList.indexOf(id) === -1 } : e);
    // 保存到文件
    try {
      const EXT_DIR = (window as any).__app_dir ? (window as any).__app_dir.replaceAll('\\', '/') + '/extensions' : '';
      const disabledPath = EXT_DIR + '/.disabled.json';
      if (FS) FS.writeFile(disabledPath, JSON.stringify(disabledList, null, 2));
    } catch(_) {}
  }

  // ─── 关于信息 ───
  let aboutInfo = $state({
    version: 'V0.2',
    author: 'JXW & K4ULTRA Team',
    qq: '2123600961',
    group: '967426331',
  });

  // 初始化
  refreshExtensions();

  function saveSettings() {
    const payload = { general, appearance, editor, extensions, debug };
    writeJSON(SETTINGS_PATH, payload);
    loadingCfg.activeTheme = general.theme;
    writeJSON(LOADING_CONFIG, loadingCfg);

    // 实时生效 — 调用 K4Settings runtime bridge
    try {
      const K4S = (window as any).K4Settings;
      if (K4S) {
        K4S.write(payload);
        K4S.applyAppearance(appearance);
        K4S.applyGeneral(general);
        K4S.applyEditor(editor);
        K4S.applyDebug(debug);
      }
    } catch (_) {}

    uiStore.notify({ type: 'success', message: t('settings.saved') });
    onclose();
  }
</script>

<div class="k4-overlay" onclick={onclose} role="presentation"></div>

<div class="k4-settings-panel" onclick={(e) => e.stopPropagation()}>
  <header class="k4-panel-header">
    <h2>{t('settings.title')}</h2>
    <button class="k4-panel-close" onclick={onclose}>&times;</button>
  </header>

  <div class="k4-panel-body">
    <!-- APPEARANCE -->
    <section class="k4-section">
      <h3 class="k4-section-title">{t('section.appearance')}</h3>

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('appearance.primary')}</label>
        <div class="k4-color-row">
          <input type="color" class="k4-color-pick" bind:value={appearance.primaryColor} />
          <code class="k4-color-hex">{appearance.primaryColor}</code>
        </div>
      </div>

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('appearance.secondary')}</label>
        <div class="k4-color-row">
          <input type="color" class="k4-color-pick" bind:value={appearance.secondaryColor} />
          <code class="k4-color-hex">{appearance.secondaryColor}</code>
        </div>
      </div>

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('appearance.bg')}</label>
        <div class="k4-color-row">
          <input type="color" class="k4-color-pick" bind:value={appearance.bgColor} />
          <code class="k4-color-hex">{appearance.bgColor}</code>
        </div>
      </div>

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('appearance.text')}</label>
        <div class="k4-color-row">
          <input type="color" class="k4-color-pick" bind:value={appearance.textColor} />
          <code class="k4-color-hex">{appearance.textColor}</code>
        </div>
      </div>

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('appearance.bgImage')}</label>
        <input type="text" class="k4-input" bind:value={appearance.bgImage} placeholder="e.g. asset/bg.png or https://..." />
      </div>

      <Switch label={t('appearance.accentGlow')} bind:checked={appearance.accentGlow} />

      <div class="k4-divider-sub"></div>

      <Switch label={t('appearance.glass')} bind:checked={appearance.glassMorphism} />

      {#if appearance.glassMorphism}
        <div class="k4-setting-row">
          <label class="k4-setting-label">{t('appearance.blur')}</label>
          <div class="k4-stepper">
            <button class="k4-step-btn" onclick={() => appearance.glassBlur = Math.max(4, appearance.glassBlur - 2)}>-</button>
            <span class="k4-step-value">{appearance.glassBlur}px</span>
            <button class="k4-step-btn" onclick={() => appearance.glassBlur = Math.min(40, appearance.glassBlur + 2)}>+</button>
          </div>
        </div>

        <div class="k4-setting-row">
          <label class="k4-setting-label">{t('appearance.opacity')}</label>
          <input type="range" class="k4-slider" min="0" max="50" step="1" bind:value={appearance.glassOpacity} />
          <code class="k4-color-hex">{appearance.glassOpacity}%</code>
        </div>
      {/if}
    </section>

    <div class="k4-divider"></div>

    <!-- GENERAL -->
    <section class="k4-section">
      <h3 class="k4-section-title">{t('section.general')}</h3>

      <Switch label={t('general.autoSave')} bind:checked={general.autoSave} />
      <Switch label={t('general.hardwareAccel')} bind:checked={general.hardwareAccel} />
      <Switch label={t('general.showFps')} bind:checked={general.showFps} />
      <Switch label={t('general.smoothZoom')} bind:checked={general.smoothZoom} />

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('language.label')}</label>
        <select class="k4-select" value={_lang} onchange={(e) => setLocale(e.currentTarget.value as any)}>
          {#each LOCALES as l}
            <option value={l.code}>{l.label}</option>
          {/each}
        </select>
      </div>

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('general.theme')}</label>
        <select class="k4-select" bind:value={general.theme}>
          <option value="ultra">Ultra</option>
          <option value="matrix">Matrix</option>
          <option value="minimal">Minimal</option>
          <option value="kitten">Kitten</option>
        </select>
      </div>

      <!-- Changes save to k4-settings.json + localStorage.editor_settings -->
      <div style="margin-top:12px;padding:10px 14px;background:var(--oc-gray-850);border-radius:8px;font-size:12px;color:var(--oc-white-50);line-height:1.6;">
        <span style="color:var(--oc-success-600);font-weight:600;">↻</span>
        {t('general.persist_note')}
      </div>
    </section>

    <div class="k4-divider"></div>

    <!-- EDITOR -->
    <section class="k4-section">
      <h3 class="k4-section-title">{t('section.editor')}</h3>

      <Checkbox label={t('editor.snapToGrid')} bind:checked={editor.snapToGrid} />
      <Checkbox label={t('editor.categoryIcons')} bind:checked={editor.showCategoryIcons} />
      <Checkbox label={t('editor.compactMode')} bind:checked={editor.compactMode} />
      <Checkbox label={t('editor.lineNumbers')} bind:checked={editor.lineNumbers} />
      <Checkbox label={t('editor.autoComplete')} bind:checked={editor.autoComplete} />

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('editor.fontSize')}</label>
        <div class="k4-stepper">
          <button class="k4-step-btn" onclick={() => editor.fontSize = Math.max(10, editor.fontSize - 1)}>-</button>
          <span class="k4-step-value">{editor.fontSize}px</span>
          <button class="k4-step-btn" onclick={() => editor.fontSize = Math.min(24, editor.fontSize + 1)}>+</button>
        </div>
      </div>
    </section>

    <div class="k4-divider"></div>

    <!-- EXTENSIONS -->
    <section class="k4-section">
      <h3 class="k4-section-title">{t('section.extensions')}</h3>

      <Switch label={t('extensions.allowUnsigned')} bind:checked={extensions.allowUnsigned} />
      <Switch label={t('extensions.devMode')} bind:checked={extensions.devMode} />
      <Switch label={t('extensions.sandbox')} bind:checked={extensions.sandbox} />

      <div class="k4-setting-row">
        <label class="k4-setting-label">{t('extensions.maxMemory')}</label>
        <select class="k4-select" bind:value={extensions.maxMemory}>
          <option value={64}>64 MB</option>
          <option value={128}>128 MB</option>
          <option value={256}>256 MB</option>
          <option value={512}>512 MB</option>
        </select>
      </div>

      <div class="k4-section-header" style="margin-top: 16px;">
        <span class="k4-step-value">{t('extensions.loaded')}</span>
        <button class="k4-step-btn" onclick={refreshExtensions} title={t('extensions.refresh')}>
          ↻
        </button>
      </div>
      {#if extError}
        <div class="k4-ext-error">{extError}</div>
      {/if}
      <div class="k4-ext-list">
        {#if loadedExts.length === 0}
          <div class="k4-ext-empty">{t('extensions.empty')}</div>
          <div class="k4-ext-hint">{t('extensions.hint')}</div>
        {:else}
          {#each loadedExts as ext}
            <div class="k4-ext-item" class:k4-ext-disabled={!ext.enabled}>
              <div class="k4-ext-info">
                <div class="k4-ext-name">{ext.name}</div>
                <div class="k4-ext-meta">
                  <span class="k4-ext-version">{ext.version}</span>
                  {#if ext.description}
                    <span class="k4-ext-desc">{ext.description}</span>
                  {/if}
                </div>
              </div>
              <label class="k4-ext-toggle">
                <input type="checkbox" checked={ext.enabled} onchange={() => toggleExtension(ext.id)} />
                <span class="k4-ext-toggle-knob"></span>
              </label>
            </div>
          {/each}
        {/if}
      </div>
    </section>

    <div class="k4-divider"></div>

    <!-- DEBUG -->
    <section class="k4-section">
      <h3 class="k4-section-title">{t('section.debug')}</h3>

      <Switch label={t('debug.verboseLogging')} bind:checked={debug.verboseLogging} />
      <Switch label={t('debug.showBlockIds')} bind:checked={debug.showBlockIds} />
      <Switch label={t('debug.perfMonitor')} bind:checked={debug.perfMonitor} />
    </section>

    <div class="k4-divider"></div>

    <!-- ABOUT -->
    <section class="k4-section">
      <h3 class="k4-section-title">{t('section.about')}</h3>
      <div class="k4-about-box">
        <div class="k4-about-logo">K4 <span class="k4-about-accent">ULTRA</span></div>
        <div class="k4-about-version">{aboutInfo.version}</div>
        <div class="k4-about-line"><span class="k4-about-label">{t('about.developer')}</span><span class="k4-about-val">{aboutInfo.author}</span></div>
        <div class="k4-about-line"><span class="k4-about-label">{t('about.qq')}</span><span class="k4-about-val">{aboutInfo.qq}</span></div>
        <div class="k4-about-line"><span class="k4-about-label">{t('about.group')}</span><span class="k4-about-val">{aboutInfo.group}</span></div>
      </div>
    </section>
  </div>

  <footer class="k4-panel-footer">
    <Button variant="tertiary" onclick={onclose}>{t('settings.cancel')}</Button>
    <Button variant="primary" onclick={saveSettings}>{t('settings.save')}</Button>
  </footer>
</div>

<style>
  .k4-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 5000; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .k4-settings-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 640px; max-height: 80vh; background: var(--oc-gray-800); border-radius: var(--oc-window-radius); box-shadow: 0 20px 60px rgba(0,0,0,0.5); z-index: 5010; display: flex; flex-direction: column; overflow: hidden; animation: panelIn 0.3s ease-out; border: 1px solid var(--oc-gray-700); }
  @keyframes panelIn { from { transform: translate(-50%,-50%) scale(0.9); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
  .k4-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--oc-gray-700); flex-shrink: 0; }
  .k4-panel-header h2 { font-size: var(--oc-text-lg); font-weight: var(--oc-weight-bold); color: var(--oc-white-90); margin: 0; }
  .k4-panel-close { width: 28px; height: 28px; border: none; background: none; color: var(--oc-white-50); font-size: 20px; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
  .k4-panel-close:hover { background: var(--oc-gray-600); color: var(--oc-white-90); }
  .k4-panel-body { flex: 1; overflow-y: auto; padding: 24px; padding-bottom: 8px; }
  .k4-section { margin-bottom: 16px; }
  .k4-section-title { font-size: var(--oc-text-sm); font-weight: var(--oc-weight-semibold); color: var(--oc-white-70); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; position: sticky; top: 8px; }
  .k4-setting-row { display: flex; align-items: center; justify-content: space-between; height: 36px; }
  .k4-setting-label { font-size: var(--oc-text-base); font-weight: var(--oc-weight-medium); color: var(--oc-white-80); }
  .k4-divider { height: 1px; background: var(--oc-gray-700); margin: 8px 24px; }
  .k4-divider-sub { height: 1px; background: var(--oc-gray-750); margin: 6px 0; }

  /* Color picker */
  .k4-color-row { display: flex; align-items: center; gap: 10px; }
  .k4-color-pick { width: 32px; height: 28px; border: 1px solid var(--oc-gray-600); border-radius: 6px; background: none; cursor: pointer; padding: 2px; }
  .k4-color-pick::-webkit-color-swatch-wrapper { padding: 0; }
  .k4-color-pick::-webkit-color-swatch { border: none; border-radius: 3px; }
  .k4-color-hex { font-size: 12px; font-family: var(--oc-font-mono, monospace); color: var(--oc-white-50); min-width: 60px; }

  /* Text input */
  .k4-input { height: 32px; background: var(--oc-gray-850); border: 1px solid var(--oc-gray-700); border-radius: 8px; padding: 0 12px; color: var(--oc-white-80); font-size: 13px; font-family: var(--oc-font-inter); outline: none; width: 280px; transition: border-color 0.15s; }
  .k4-input:focus { border-color: var(--oc-primary-600); }
  .k4-input::placeholder { color: var(--oc-gray-400); }

  /* Slider */
  .k4-slider { -webkit-appearance: none; appearance: none; width: 120px; height: 4px; background: var(--oc-gray-700); border-radius: 2px; outline: none; cursor: pointer; }
  .k4-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--oc-primary-500); cursor: pointer; border: 2px solid var(--oc-gray-800); }

  .k4-select { height: 32px; background: var(--oc-gray-850); border: 1px solid var(--oc-gray-700); border-radius: 8px; padding: 0 32px 0 12px; color: var(--oc-white-80); font-size: 13px; font-family: var(--oc-font-inter); outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; min-width: 140px; transition: border-color 0.15s; }
  .k4-select:focus { border-color: var(--oc-primary-600); }
  .k4-stepper { display: flex; align-items: center; gap: 8px; }
  .k4-step-btn { width: 28px; height: 28px; border: 1px solid var(--oc-gray-600); border-radius: 6px; background: var(--oc-gray-850); color: var(--oc-white-70); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, border-color 0.15s; }
  .k4-step-btn:hover { background: var(--oc-gray-600); border-color: var(--oc-gray-500); }
  .k4-step-value { font-size: var(--oc-text-base); font-weight: var(--oc-weight-medium); color: var(--oc-white-80); min-width: 40px; text-align: center; }
  .k4-panel-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--oc-gray-700); flex-shrink: 0; }

  /* Section header (title + action button) */
  .k4-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }

  /* Extension list */
  .k4-ext-error { color: var(--oc-error-600); font-size: 12px; padding: 8px; background: var(--oc-gray-850); border-radius: 8px; margin-bottom: 8px; }
  .k4-ext-empty { color: var(--oc-white-50); font-size: 13px; text-align: center; padding: 20px 0; }
  .k4-ext-hint { color: var(--oc-white-30); font-size: 11px; margin-top: 8px; text-align: center; }
  .k4-ext-list { display: flex; flex-direction: column; gap: 4px; }
  .k4-ext-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 8px; background: var(--oc-gray-850); border: 1px solid transparent; transition: background 0.15s; }
  .k4-ext-item:hover { background: var(--oc-gray-700); }
  .k4-ext-disabled { opacity: 0.5; }
  .k4-ext-info { flex: 1; min-width: 0; }
  .k4-ext-name { font-size: 13px; font-weight: 500; color: var(--oc-white-90); }
  .k4-ext-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
  .k4-ext-version { font-size: 11px; color: var(--oc-primary-500); font-family: var(--oc-font-mono); }
  .k4-ext-desc { font-size: 11px; color: var(--oc-white-50); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Toggle switch for extensions */
  .k4-ext-toggle { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; cursor: pointer; }
  .k4-ext-toggle input { opacity: 0; width: 0; height: 0; }
  .k4-ext-toggle-knob { position: absolute; inset: 0; background: var(--oc-gray-500); border-radius: 10px; transition: background 0.15s; }
  .k4-ext-toggle-knob::before { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform 0.15s; }
  .k4-ext-toggle input:checked + .k4-ext-toggle-knob { background: var(--oc-primary-600); }
  .k4-ext-toggle input:checked + .k4-ext-toggle-knob::before { transform: translateX(16px); }

  /* About section */
  .k4-about-box { background: var(--oc-gray-850); border-radius: 12px; padding: 20px; text-align: center; }
  .k4-about-logo { font-size: 32px; font-weight: 900; letter-spacing: 2px; color: var(--oc-white-90); }
  .k4-about-accent { background: linear-gradient(135deg, #583cdc, var(--oc-primary-500)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .k4-about-version { font-size: 13px; color: var(--oc-white-50); margin: 4px 0 16px; letter-spacing: 2px; }
  .k4-about-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--oc-gray-700); }
  .k4-about-line:last-child { border-bottom: none; }
  .k4-about-label { color: var(--oc-white-50); }
  .k4-about-val { color: var(--oc-white-80); font-weight: 500; }
</style>
