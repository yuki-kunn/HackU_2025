<script lang="ts">
    import Sidebar from '$lib/components/Sidebar.svelte';
    import Map from '$lib/components/Map.svelte';
</script>

<svelte:head>
    <script src={`https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}></script>
</svelte:head>

<div class="page-container">
    <Sidebar />
    <div class="main-content">
        <Map />
    </div>
</div>

<style>
    
    .page-container {
        display: flex;
        height: 100vh;
    }

    .main-content {
        flex: 1;
        margin-left: 0;
        transition: margin-left 0.3s ease;
        position: relative;
    }

    #map {
        width: 100%;
        height: 100%;
    }
</style>
