<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import QuestCard from './QuestCard.svelte';
  
  // イベントディスパッチャー
  const dispatch = createEventDispatcher();
  
  // アクティブなクエスト一覧
  let activeQuests = [];
  
  // ローカルストレージからクエスト情報を読み込む
  function loadActiveQuests() {
    try {
      const stored = localStorage.getItem('active_quests');
      if (stored) {
        activeQuests = JSON.parse(stored);
      } else {
        activeQuests = [];
      }
    } catch (error) {
      console.error('Failed to load quests from localStorage:', error);
      activeQuests = [];
    }
  }
  
  // クエスト更新イベントのハンドラ
  function handleQuestUpdate() {
    loadActiveQuests();
  }
  
  // クエスト破棄処理
  function handleAbandonQuest(event) {
    const questId = event.detail.questId;
    
    // ローカルストレージから削除
    let quests = JSON.parse(localStorage.getItem('active_quests') || '[]');
    quests = quests.filter(quest => quest.id !== questId);
    localStorage.setItem('active_quests', JSON.stringify(quests));
    
    // UI更新
    activeQuests = activeQuests.filter(quest => quest.id !== questId);
  }
  
  // 目的地への移動
  function handleNavigateToQuest(event) {
    const { latitude, longitude, name } = event.detail;
    
    // 親コンポーネントにナビゲーション要求を通知
    dispatch('navigateToLocation', {
      latitude,
      longitude,
      name
    });
  }
  
  onMount(() => {
    loadActiveQuests();
    
    // クエスト更新イベントをリッスン
    window.addEventListener('localStorageQuestUpdated', handleQuestUpdate);
  });
  
  onDestroy(() => {
    window.removeEventListener('localStorageQuestUpdated', handleQuestUpdate);
  });
</script>

<div class="sidebar">
  <div class="sidebar-content">
    <div class="sidebar-section">
      <h3>マップオプション</h3>
    </div>
    
    <div class="sidebar-section">
      <h3>進行中のクエスト <span class="quest-count">{activeQuests.length}</span></h3>
      {#if activeQuests.length > 0}
        <div class="quest-list">
          {#each activeQuests as quest (quest.id)}
            <QuestCard 
              {quest}
              on:abandon={handleAbandonQuest}
              on:navigate={handleNavigateToQuest}
            />
          {/each}
        </div>
      {:else}
        <p class="empty-state">進行中のクエストはありません</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .sidebar {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 240px;
    max-height: calc(100vh - 20px);
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    z-index: 10;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .sidebar-content {
    padding: 15px;
    overflow-y: auto;
    max-height: calc(100vh - 20px);
  }
  
  .sidebar-section {
    margin-bottom: 15px;
  }
  
  .sidebar-section h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: bold;
    color: #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .quest-count {
    background-color: #4285F4;
    color: white;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 10px;
  }
  
  .quest-list {
    max-height: 300px;
    overflow-y: auto;
  }
  
  .empty-state {
    font-size: 12px;
    color: #888;
    font-style: italic;
  }
</style>
