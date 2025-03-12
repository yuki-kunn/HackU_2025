<script lang="ts">
    import QuestCard from './QuestCard.svelte';
    let isSidebarOpen = true;
    let showQuestList = false;

    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
    }

    function toggleQuestList() {
        showQuestList = !showQuestList;
    }

    // サンプルデータ（後で実際のデータに置き換え）
    const quests = [
        {
            buildingName: "大阪城",
            address: "大阪府大阪市中央区大阪城1-1"
        },
        {
            buildingName: "通天閣",
            address: "大阪府大阪市浪速区恵美須東1-18-6"
        }
    ];
</script>

<div class="sidebar" class:open={isSidebarOpen}>
    <button class="toggle-button" on:click={toggleSidebar}>
        {isSidebarOpen ? '×' : '☰'}
    </button>
    <div class="sidebar-content">
        <h2>メニュー</h2>
        
        <nav>
            <ul>
                <li><a href="/profile">プロフィール</a></li>
                <li><button class="nav-button" on:click={toggleQuestList}>クエスト一覧</button></li>
            </ul>
        </nav>

        {#if showQuestList}
            <div class="quest-list">
                <h3>進行中のクエスト</h3>
                {#each quests as quest}
                    <QuestCard 
                        buildingName={quest.buildingName}
                        address={quest.address}
                    />
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .sidebar {
        position: fixed;
        left: -400px;
        width: 400px;
        height: 100vh;
        background-color: rgba(51, 51, 51, 0.8); /* 半透明のグレー */
        color: white;
        transition: left 0.3s ease;
        z-index: 1000;
    }

    .sidebar.open {
        left: 0;
    }

    .toggle-button {
        position: absolute;
        right: -40px;
        top: 10px;
        width: 40px;
        height: 40px;
        background-color: rgba(51, 51, 51, 0.8); /* 半透明のグレー */
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    }

    .sidebar-content {
        padding: 20px;
    }

    .sidebar-content h2 {
        margin-bottom: 20px;
    }

    .sidebar-content nav ul {
        list-style: none;
        padding: 0;
    }

    .sidebar-content nav ul li {
        margin-bottom: 15px;
    }

    .sidebar-content nav ul li a {
        color: white;
        text-decoration: none;
        font-size: 16px;
    }

    .sidebar-content nav ul li a:hover {
        color: #ddd;
    }

    /* クエストカードのスタイル */
    .quest-card {
        background-color: #444;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .building-name {
        margin: 0 0 8px 0;
        font-size: 18px;
        color: #fff;
    }

    .address {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: #ccc;
    }

    .nav-button {
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        text-align: left;
        width: 100%;
    }

    .nav-button:hover {
        color: #ddd;
    }

    .quest-list {
        margin-top: 20px;
    }

    .quest-list h3 {
        color: #fff;
        margin-bottom: 16px;
    }

    .checkbox-container {
        display: flex;
        align-items: center;
        color: #ccc;
        font-size: 14px;
    }

    .checkbox-container input[type="checkbox"] {
        margin-right: 8px;
    }

    .discard-button {
        background-color: #ff4444;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .discard-button:hover {
        background-color: #ff2222;
    }
</style>
