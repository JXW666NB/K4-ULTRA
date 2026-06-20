<script lang="ts">
  let {
    checked = false,
    disabled = false,
    label = '',
    onchange = (_val: boolean) => {},
  }: {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (val: boolean) => void;
  } = $props();

  let isOn = $state(checked);
  // Sync with parent bind:checked changes
  $effect(() => { isOn = checked; });

  function toggle() {
    if (disabled) return;
    isOn = !isOn;
    onchange(isOn);
  }
</script>

<label class="oc-switch-row" class:oc-switch-disabled={disabled}>
  <span class="oc-switch-label">{label}</span>
  <div class="oc-switch" class:oc-switch-on={isOn} onclick={toggle} role="switch" aria-checked={isOn} tabindex="0" onkeydown={(e) => e.key === 'Enter' && toggle()}>
    <div class="oc-switch-thumb"></div>
  </div>
</label>

<style>
  .oc-switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--oc-switch-row-height);
    cursor: pointer;
    user-select: none;
  }
  .oc-switch-disabled {
    opacity: var(--oc-button-disabled-opacity);
    pointer-events: none;
  }
  .oc-switch-label {
    font-size: var(--oc-text-base);
    font-weight: var(--oc-weight-medium);
    color: var(--oc-white-80);
  }

  .oc-switch {
    position: relative;
    width: var(--oc-switch-width);
    height: var(--oc-switch-height);
    background: var(--oc-gray-500);
    border-radius: var(--oc-switch-radius);
    transition: background var(--oc-duration-switch) var(--oc-ease-in-out-quad);
    flex-shrink: 0;
    cursor: pointer;
  }
  .oc-switch-on {
    background: var(--oc-primary-600);
  }

  .oc-switch-thumb {
    position: absolute;
    top: 50%;
    left: 3px;
    width: var(--oc-switch-thumb-size);
    height: var(--oc-switch-thumb-size);
    background: var(--oc-switch-thumb-color);
    border-radius: var(--oc-switch-thumb-radius);
    transform: translateY(-50%);
    transition: left var(--oc-duration-switch-bounce) var(--oc-ease-out-bump);
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .oc-switch-on .oc-switch-thumb {
    left: calc(var(--oc-switch-width) - var(--oc-switch-thumb-size) - 3px);
  }
</style>
