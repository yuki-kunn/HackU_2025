<script lang="ts">
    export let buildingName: string;
    export let address: string;
    export let showOnMap: boolean = false;

    function discardQuest() {
        // クエスト破棄の処理をここに実装
        alert('クエストを破棄しました');
    }
</script>

<div class="quest-card">
    <h3 class="building-name">{buildingName}</h3>
    <p class="address">{address}</p>
    <div class="card-footer">
        <label class="checkbox-container">
            <input 
                type="checkbox" 
                bind:checked={showOnMap}
            >
            <span class="checkbox-text">マップに表示する</span>
        </label>
        <button class="discard-button" on:click={discardQuest}>
            クエスト破棄
        </button>
    </div>
</div>

<style>
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

    .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
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
