<script lang="ts">
  import { appStore } from '../../stores/app.store';
  import { uiStore } from '../../stores/ui.store';
  import SettingsPanel from './SettingsPanel.svelte';
  import SystemDebugPanel from './SystemDebugPanel.svelte';
  import WelcomePanel from './WelcomePanel.svelte';
  import { locale as localeStore, t } from '../../stores/i18n';
  import { onMount } from 'svelte';

  // i18n: locale reactivity
  let _lang = $state('zh-CN');
  localeStore.subscribe(v => _lang = v);

  let page = $derived($appStore.currentPage);
  let menuOpen = $state(false);
  let editorReady = $state(false);
  let showWelcome = $state(false);

  // Wait for React editor before showing FAB and overlays
  // Fallback: show after 8s even if editor never fires ready event
  var _readyTimer = setTimeout(function () { editorReady = true; }, 8000);
  (window as any).__k4bus?.on?.('react-mount', function () {
    clearTimeout(_readyTimer);
    editorReady = true;
  });

  // Listen for open-settings from native header button (click)
  var _cleanupSettingsEvt = (window as any).__k4bus?.on?.('open-settings', function () {
    appStore.setPage('settings');
  });

  // ─── Draggable FAB state (kept for future re-enable) ──
  let fabEl: HTMLButtonElement;
  let fabX = $state(12);
  let fabY = $state(64);
  let isDragging = $state(false);
  let dragStartX = 0, dragStartY = 0;
  let fabStartX = 0, fabStartY = 0;
  let hasMoved = false;

  onMount(() => {
    try {
      const saved = localStorage.getItem('k4_fab_pos');
      if (saved) { const pos = JSON.parse(saved); fabX = pos.x ?? 12; fabY = pos.y ?? 64; }
    } catch (_) {}
    try {
      if (localStorage.getItem('k4_welcome_shown') !== '1') {
        showWelcome = true;
        localStorage.setItem('k4_welcome_shown', '1');
      }
    } catch (_) {}
  });

  function onFabPointerDown(e: PointerEvent) { if (!fabEl) return; hasMoved = false; isDragging = true; dragStartX = e.clientX; dragStartY = e.clientY; fabStartX = fabX; fabStartY = fabY; fabEl.setPointerCapture(e.pointerId); }
  function onFabPointerMove(e: PointerEvent) { if (!isDragging || !fabEl) return; const dx = e.clientX - dragStartX; const dy = e.clientY - dragStartY; fabX = Math.max(0, Math.min(window.innerWidth - 48, fabStartX + dx)); fabY = Math.max(0, Math.min(window.innerHeight - 48, fabStartY + dy)); if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true; }
  function onFabPointerUp(_e: PointerEvent) { if (!isDragging) return; isDragging = false; if (!hasMoved) { menuOpen = !menuOpen; } else { try { localStorage.setItem('k4_fab_pos', JSON.stringify({ x: fabX, y: fabY })); } catch (_) {} } }
  function closeAll() { menuOpen = false; showWelcome = false; appStore.setPage('editor'); }
</script>

<!-- FAB removed; native #header-setting-btn (dblclick) now opens K4 Ultra Settings. -->
<!-- Overlays still accessible via dblclick on native settings icon. -->

{#if showWelcome}
  <WelcomePanel onclose={() => showWelcome = false} />
{/if}

{#if page === 'settings'}
  <SettingsPanel onclose={() => appStore.setPage('editor')} />
{/if}

{#if page === 'debug'}
  <SystemDebugPanel onclose={() => appStore.setPage('editor')} />
{/if}

<!-- Notifications -->
{#each $uiStore.notifications as notif (notif.id)}
  <div class="k4-notification k4-notif-{notif.type}">
    <span>{notif.message}</span>
    <button class="k4-notif-close" onclick={() => uiStore.dismissNotification(notif.id)}>&times;</button>
  </div>
{/each}

<style>
  .k4-notification { position: fixed; bottom: 20px; right: 20px; z-index: 1050; min-width: 280px; padding: 12px 16px; border-radius: 8px; background: var(--oc-gray-700); color: var(--oc-white-80); font-size: 13px; font-family: var(--oc-font-inter); display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); animation: notifIn 0.3s var(--oc-ease-out-expo); }
  @keyframes notifIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .k4-notif-close { background: none; border: none; color: var(--oc-white-50); cursor: pointer; font-size: 18px; padding: 0 4px; line-height: 1; }
  .k4-notif-close:hover { color: var(--oc-white); }
  .k4-notif-info { border-left: 3px solid var(--oc-primary-500); }
  .k4-notif-success { border-left: 3px solid var(--oc-success-600); }
  .k4-notif-warning { border-left: 3px solid var(--oc-warning-500); }
  .k4-notif-error { border-left: 3px solid var(--oc-error-600); }

  /* Legacy FAB styles kept for future re-enable */
  .k4-fab { position: fixed; z-index: 1000; width: 40px; height: 40px; border-radius: 12px; border: 1px solid rgba(88,60,220,0.3); background: var(--oc-gray-800); color: rgba(88,60,220,0.7); cursor: grab; display: flex; align-items: center; justify-content: center; transition: background 0.15s,color 0.15s,border-color 0.15s,box-shadow 0.15s; touch-action: none; user-select: none; -webkit-user-select: none; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  .k4-fab:hover { background: rgba(88,60,220,0.15); color: #fff; border-color: rgba(88,60,220,0.8); box-shadow: 0 4px 20px rgba(88,60,220,0.25); }
  .k4-fab-dragging { cursor: grabbing; box-shadow: 0 8px 30px rgba(0,0,0,0.4); border-color: var(--oc-primary-500); transform: scale(1.05); }
  .k4-fab-menu { position: fixed; z-index: 1010; background: var(--oc-gray-800); border: 1px solid var(--oc-gray-700); border-radius: 12px; padding: 6px; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 8px 30px rgba(0,0,0,0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); animation: menuIn 0.15s var(--oc-ease-out-expo); min-width: 180px; }
  @keyframes menuIn { from { transform: translateY(-8px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
  .k4-fab-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: none; border-radius: 8px; background: transparent; color: var(--oc-white-70); cursor: pointer; font-size: 13px; font-family: var(--oc-font-inter); white-space: nowrap; transition: background 0.12s,color 0.12s; text-align: left; }
  .k4-fab-item:hover { background: var(--oc-gray-600); color: var(--oc-white); }
  .k4-fab-item:active { background: var(--oc-primary-700); color: var(--oc-white); transform: scale(0.97); }
  .k4-fab-item svg { flex-shrink: 0; }
</style>
