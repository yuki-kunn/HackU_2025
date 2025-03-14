<script lang="ts">
  export let showCrimeAreas: boolean = true;
  
  function toggleCrimeAreas() {
    showCrimeAreas = !showCrimeAreas;
  }
</script>

<div class="sidebar">
  <div class="sidebar-content">
    <div class="sidebar-section">
      <h3>マップオプション</h3>
      
      <div class="toggle-option">
        <button 
          class="toggle-button" 
          class:active={showCrimeAreas} 
          on:click={toggleCrimeAreas}
        >
          <div class="toggle-icon"></div>
          <span>犯罪多発エリア {showCrimeAreas ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .sidebar {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 220px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }
  
  .sidebar-content {
    padding: 15px;
  }
  
  .sidebar-section {
    margin-bottom: 15px;
  }
  
  .sidebar-section h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: bold;
    color: #333;
  }
  
  .toggle-option {
    margin-bottom: 10px;
  }
  
  .toggle-button {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: white;
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s;
  }
  
  .toggle-button.active {
    background-color: #f8f8f8;
  }
  
  .toggle-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #FF0000;
    margin-right: 8px;
    opacity: 0.7;
  }
  
  .toggle-button span {
    flex: 1;
  }
</style>
