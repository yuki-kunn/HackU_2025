<script>
  // Add any header-related functionality here
</script>

<header class="app-header">
  <div class="header-content">
    <h1 class="app-title">mapQuest</h1>
  </div>
</header>

<style>
  .app-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    background-color: #33425a;
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .header-content {
    width: 100%;
    max-width: 1200px;
    padding: 0 16px;
    display: flex;
    align-items: center;
  }
  
  .app-title {
    margin: 0;
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 1px;
  }
</style>
