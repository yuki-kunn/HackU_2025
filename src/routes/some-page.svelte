<script>
  import { onMount } from 'svelte';
  
  let landmarks = [];
  let error = null;
  
  onMount(async () => {
    try {
      // 東京駅の緯度経度を例として使用
      const lat = 35.6812;
      const lon = 139.7671;
      
      const response = await fetch(`http://localhost:3000/landmark?lat=${lat}&lon=${lon}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'APIリクエストに失敗しました');
      }
      
      landmarks = await response.json();
    } catch (e) {
      error = e.message;
      console.error('ランドマーク取得エラー:', e);
    }
  });
</script>

<div>
  {#if error}
    <p class="error">{error}</p>
  {:else if landmarks.length > 0}
    <ul>
      {#each landmarks as landmark}
        <li>{landmark.name}</li>
      {/each}
    </ul>
  {:else}
    <p>ランドマークを読み込み中...</p>
  {/if}
</div>
