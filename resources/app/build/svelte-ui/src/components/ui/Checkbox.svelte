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

  let isChecked = $state(checked);
  // Sync with parent bind:checked changes
  $effect(() => { isChecked = checked; });

  function toggle() {
    if (disabled) return;
    isChecked = !isChecked;
    onchange(isChecked);
  }
</script>

<label class="oc-checkbox-row" class:oc-checkbox-disabled={disabled}>
  <div class="oc-checkbox" class:oc-checkbox-on={isChecked} onclick={toggle} role="checkbox" aria-checked={isChecked} tabindex="0" onkeydown={(e) => e.key === 'Enter' && toggle()}>
    {#if isChecked}
      <svg class="oc-checkmark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    {/if}
  </div>
  {#if label}
    <span class="oc-checkbox-label">{label}</span>
  {/if}
</label>

<style>
  .oc-checkbox-row {
    display: flex;
    align-items: center;
    gap: var(--oc-space-8);
    height: var(--oc-checkbox-row-height);
    cursor: pointer;
    user-select: none;
  }
  .oc-checkbox-disabled {
    opacity: var(--oc-button-disabled-opacity);
    pointer-events: none;
  }
  .oc-checkbox-label {
    font-size: var(--oc-text-base);
    font-weight: var(--oc-weight-medium);
    color: var(--oc-white-80);
  }

  .oc-checkbox {
    width: var(--oc-checkbox-size);
    height: var(--oc-checkbox-size);
    border-radius: var(--oc-checkbox-radius);
    border: 2px solid var(--oc-checkbox-border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--oc-duration-checkbox) var(--oc-ease-in-out-quad),
                border-color var(--oc-duration-checkbox) var(--oc-ease-in-out-quad);
    flex-shrink: 0;
    background: transparent;
  }
  .oc-checkbox-on {
    background: var(--oc-checkbox-fill);
    border-color: var(--oc-checkbox-fill);
  }
  .oc-checkmark {
    flex-shrink: 0;
  }
</style>
