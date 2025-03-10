<script lang="ts">
    import { onMount } from 'svelte';
    import { Loader } from '@googlemaps/js-api-loader';

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    let mapElement: HTMLDivElement;

    onMount(async () => {
        const loader = new Loader({ apiKey, version: 'weekly' });
        const { Map } = await loader.importLibrary('maps');

        new Map(mapElement, {
            center: { lat: 35.6895, lng: 139.6917 },
            zoom: 10
        });
    });
</script>

<style>
    .map-container {
        width: 100vw;
        height: 100vh;
    }
</style>

<div bind:this={mapElement} class="map-container" />