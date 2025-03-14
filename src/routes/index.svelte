<script>
  import { onMount } from 'svelte';
  
  let landmarks = [];
  let loading = true;
  let error = null;
  
  onMount(async () => {
    try {
      // ブラウザの位置情報APIが利用可能か確認
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`現在位置: lat=${latitude}, lon=${longitude}`);
          
          await fetchLandmarks(latitude, longitude);
        }, (err) => {
          console.error("位置情報の取得に失敗:", err);
          // 位置情報が取得できない場合はデフォルト値で取得
          fetchLandmarks();
        });
      } else {
        // 位置情報APIが使えない場合はデフォルト値で取得
        await fetchLandmarks();
      }
    } catch (e) {
      error = e.message;
      loading = false;
    }
  });
  
  async function fetchLandmarks(lat, lon) {
    try {
      // パラメータがあれば付与、なければそのまま呼び出し
      let url = 'http://localhost:3000/landmark';
      if (lat && lon) {
        url += `?lat=${lat}&lon=${lon}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'APIリクエストに失敗しました');
      }
      
      landmarks = await response.json();
    } catch (e) {
      error = e.message;
      console.error('ランドマーク取得エラー:', e);
    } finally {
      loading = false;
    }
  }
</script>

<div>
  {#if loading}
    <p>読み込み中...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if landmarks.length > 0}
    <h2>周辺のランドマーク</h2>
    <ul>
      {#each landmarks as landmark}
        <li>{landmark.name || landmark.title || '名称なし'}</li>
      {/each}
    </ul>
  {:else}
    <p>周辺のランドマークが見つかりませんでした。</p>
  {/if}
</div>
