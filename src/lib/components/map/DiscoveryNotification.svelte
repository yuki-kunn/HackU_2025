<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fly } from 'svelte/transition';
  import { getLandmarkColor } from './utils/landmarkUtils';

  // プロパティ
  export let landmark: any;
  export let autoDismissTime: number = 4000; // 4秒後に自動的に閉じる
  
  const dispatch = createEventDispatcher();
  
  // 通知を閉じる処理
  function closeNotification() {
    dispatch('close');
  }
  
  // 自動で閉じるタイマー
  onMount(() => {
    const timer = setTimeout(() => {
      closeNotification();
    }, autoDismissTime);
    
    return () => {
      clearTimeout(timer);
    };
  });
  
  // ランドマークのジャンルから色を取得
  const iconColor = getLandmarkColor(landmark.genre_code);
</script>

<div class="discovery-notification" transition:fly={{ y: -30, duration: 300 }}>
  <div class="icon" style="background-color: {iconColor}">
    <span>!</span>
  </div>
  <div class="content">
    <h3>新しい発見！</h3>
    <p class="landmark-name">{landmark.name}</p>
    {#if landmark.genre_name}
      <p class="landmark-genre">{landmark.genre_name}</p>
    {/if}
  </div>
  <button class="close-btn" on:click={closeNotification}>×</button>
</div>

<style>
  .discovery-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 280px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    padding: 12px;
    z-index: 1000;
  }
  
  .icon {
    width: 40px;
    height: 40px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    flex-shrink: 0;
  }
  
  .icon span {
    color: white;
    font-weight: bold;
    font-size: 20px;
  }
  
  .content {
    flex: 1;
  }
  
  h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    color: #333;
  }
  
  .landmark-name {
    margin: 0 0 2px 0;
    font-size: 14px;
    font-weight: bold;
  }
  
  .landmark-genre {
    margin: 0;
    font-size: 12px;
    color: #666;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: #999;
    cursor: pointer;
    padding: 4px 8px;
  }
  
  .close-btn:hover {
    color: #333;
  }
</style>
