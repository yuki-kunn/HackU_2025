<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // プロパティ
  export let quest;
  
  // イベント通知用
  const dispatch = createEventDispatcher();
  
  // クエスト破棄機能
  function abandonQuest() {
    if (confirm(`「${quest.name}」のクエストを破棄しますか？`)) {
      dispatch('abandon', { questId: quest.id });
    }
  }
  
  // 目的地への移動
  function navigateToQuest() {
    dispatch('navigate', { 
      latitude: quest.latitude,
      longitude: quest.longitude,
      name: quest.name
    });
  }
  
  // 受注してからの経過時間を計算
  $: acceptedDate = quest.acceptedAt ? new Date(quest.acceptedAt) : null;
  $: timeElapsed = acceptedDate ? getTimeElapsed(acceptedDate) : '不明';
  
  function getTimeElapsed(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}日前に受注`;
    } else if (hours > 0) {
      return `${hours}時間前に受注`;
    } else {
      return `${minutes}分前に受注`;
    }
  }

  // クエストタイプに基づいたアイコン画像のパスを取得
  function getQuestIcon(genreCode) {
    // ジャンルコードに基づいて異なるアイコンを返す
    switch(genreCode?.substring(0, 2)) {
      case '01': // 店舗・施設
        return '/icons/pointer.png';
      case '02': // 交通・宿泊
        return '/icons/pointer.png';
      case '03': // 観光・文化・スポーツ
        return '/icons/pointer.png';
      case '04': // イベント・レジャー
        return '/icons/pointer.png';
      default:
        return '/icons/pointer.png'; // デフォルトアイコン
    }
  }
  
  $: questIcon = getQuestIcon(quest.genre_code);

  // クエストのステータスに応じたラベルとスタイルを取得
  $: questStatusLabel = quest.questStatus === 'クエスト完了' ? '完了' : '受注中';
  $: statusColor = quest.questStatus === 'クエスト完了' ? '#34A853' : '#4285F4';
</script>

<div class="quest-card" style="border-left-color: {statusColor}">
  <div class="quest-header">
    <div class="quest-icon-container">
      <span class="quest-icon-text">?</span>
    </div>
    <div class="quest-title-container">
      <div class="quest-title">{quest.name}</div>
      <div class="quest-status" style="background-color: {statusColor}">
        {questStatusLabel}
      </div>
    </div>
  </div>
  
  <div class="quest-address">{quest.address || '住所情報なし'}</div>
  
  {#if quest.genre_name || quest.genre_code}
    <div class="quest-category">{quest.genre_name || quest.genre_code}</div>
  {/if}
  
  {#if quest.detail}
    <div class="quest-detail">{quest.detail}</div>
  {/if}
  
  <div class="quest-footer">
    <div class="quest-elapsed">{timeElapsed}</div>
    
    <div class="quest-actions">
      {#if quest.questStatus !== 'クエスト完了'}
        <button class="navigate-btn" on:click={navigateToQuest}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
          移動
        </button>
        
        <button class="abandon-btn" on:click={abandonQuest}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          破棄
        </button>
      {:else}
        <span class="completed-label">クリア済み</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .quest-card {
    background-color: #fff;
    border-radius: 10px;
    border-left: 4px solid #4285F4;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    transition: transform 0.2s ease;
  }
  
  .quest-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  .quest-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .quest-icon-container {
    width: 36px;
    height: 36px;
    margin-right: 12px;
    background-color: #f0f5ff;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .quest-icon-text {
    font-size: 20px;
    font-weight: bold;
    color: #4285F4;
  }
  
  .quest-title-container {
    flex: 1;
  }
  
  .quest-title {
    font-weight: bold;
    font-size: 16px;
    color: #333;
    margin-bottom: 4px;
  }
  
  .quest-status {
    font-size: 10px;
    background-color: #4285F4;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    display: inline-block;
  }
  
  .quest-address {
    font-size: 13px;
    color: #666;
    margin-bottom: 6px;
  }
  
  .quest-category {
    font-size: 13px;
    color: #4285F4;
    margin-bottom: 6px;
    font-weight: 500;
  }
  
  .quest-detail {
    font-size: 13px;
    color: #555;
    margin: 10px 0;
    line-height: 1.4;
    max-height: 70px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }
  
  .quest-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    font-size: 12px;
  }
  
  .quest-elapsed {
    color: #888;
    font-style: italic;
  }
  
  .quest-actions {
    display: flex;
    gap: 6px;
  }
  
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  button svg {
    margin-right: 3px;
  }
  
  .navigate-btn {
    background-color: #34A853;
    color: white;
  }
  
  .navigate-btn:hover {
    background-color: #2E8B57;
  }
  
  .abandon-btn {
    background-color: #EA4335;
    color: white;
  }
  
  .abandon-btn:hover {
    background-color: #D32F2F;
  }

  .completed-label {
    font-size: 12px;
    color: #34A853;
    font-weight: bold;
  }
</style>
