<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { Landmark } from './utils/landmarkUtils';
  
  export let landmark: Landmark;
  
  const dispatch = createEventDispatcher();
  
  // 自動的に閉じるタイマー
  let autoCloseTimer: number;
  
  onMount(() => {
    // 5秒後に自動的に閉じる
    autoCloseTimer = setTimeout(() => {
      dispatch('close');
    }, 5000);
    
    return () => {
      clearTimeout(autoCloseTimer);
    };
  });
  
  function handleClose() {
    clearTimeout(autoCloseTimer);
    dispatch('close');
  }
</script>

<div class="landmark-notification">
  <div class="notification-content">
    <h3>新しいランドマークを発見！</h3>
    <p>{landmark.name}</p>
    <button on:click={handleClose}>閉じる</button>
  </div>
</div>

<style>
  .landmark-notification {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 3px 10px rgba(0,0,0,0.2);
    z-index: 1000;
    max-width: 80%;
    text-align: center;
    animation: fadeIn 0.3s ease-in-out;
  }
  
  .notification-content h3 {
    margin-top: 0;
    color: #2E8B57;
  }
  
  .notification-content button {
    padding: 5px 15px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
</style>
