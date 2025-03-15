<script>
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<div class="app-container">
  <Header />
  
  <main>
    <slot />
  </main>
  
  <Footer />
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    padding-top: 52px; /* Same as header height to prevent content from going under the header */
    padding-bottom: 40px; /* To prevent content from going under the footer */
  }
</style>
