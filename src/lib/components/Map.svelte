<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import UserLocation from './map/UserLocation.svelte';
  import LandmarkManager from './map/LandmarkManager.svelte';
  import CrimeAreaManager from './map/CrimeAreaManager.svelte';
  import DiscoveryNotification from './map/DiscoveryNotification.svelte';
  import MapSidebar from './map/MapSidebar.svelte';
  import type { Landmark } from './map/utils/landmarkUtils';

  let map: google.maps.Map;
  let userLocation: google.maps.LatLngLiteral | null = null;
  let showCrimeAreas = true;
  
  // コンポーネントの参照
  let userLocationComponent: UserLocation;
  let landmarkManagerComponent: LandmarkManager;
  let crimeAreaManagerComponent: CrimeAreaManager;
  
  // 通知関連
  let showNotification = false;
  let currentNotification: Landmark | null = null;
  let notificationQueue: Landmark[] = [];
  let showDiscoveryNotification = false;
  let currentDiscovery = null;
  let discoveryQueue: any[] = [];
  
  /**
   * 位置情報と共に近くのランドマークを取得する関数
   */
  async function sendLocationAndFetchLandmarks(position: google.maps.LatLngLiteral) {
    try {
      console.log(`Sending location update and fetching landmarks: lat=${position.lat}, lng=${position.lng}`);
      
      const response = await fetch('http://localhost:3000/user-location/with-landmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          latitude: position.lat,
          longitude: position.lng,
          user_id: 'anonymous' // 実際のアプリではユーザーIDを設定
        }),
        credentials: 'omit'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Received ${data.landmarks?.length || 0} landmarks from server`);
      
      if (data.landmarks && Array.isArray(data.landmarks)) {
        landmarkManagerComponent.updateLandmarksOnMap(data.landmarks);
      } else {
        console.warn('No landmarks data in response or invalid format');
        // バックアップとして直接ランドマークを取得
        fetchNearbyLandmarks(position);
      }
    } catch (error) {
      console.error('Error sending location and fetching landmarks:', error);
      // エラー時はバックアップAPIを使用
      fetchNearbyLandmarks(position);
    }
  }

  /**
   * バックアップAPIを使用してランドマークを取得
   */
  async function fetchNearbyLandmarks(position: google.maps.LatLngLiteral) {
    try {
      console.log('Using backup API to fetch landmarks');
      
      const response = await fetch(`http://localhost:3000/landmark?lat=${position.lat}&lng=${position.lng}&radius=1000`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Backup API responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.landmarks && Array.isArray(data.landmarks)) {
        landmarkManagerComponent.updateLandmarksOnMap(data.landmarks);
      } else if (Array.isArray(data)) {
        landmarkManagerComponent.updateLandmarksOnMap(data);
      } else {
        console.warn('No landmarks returned from backup API');
      }
    } catch (error) {
      console.error('Error fetching landmarks from backup API:', error);
    }
  }

  /**
   * 犯罪エリアの表示/非表示を切り替える関数
   */
  function toggleCrimeAreas() {
    showCrimeAreas = !showCrimeAreas;
  }

  /**
   * ユーザー位置が更新されたときの処理
   */
  function handleLocationUpdate(event: CustomEvent) {
    userLocation = event.detail.location;
    
    if (event.detail.shouldUpdate) {
      // 位置が大きく変わった場合のみランドマークを再取得
      sendLocationAndFetchLandmarks(userLocation);
    }
  }

  /**
   * 位置情報エラー時の処理
   */
  function handleLocationError(event: CustomEvent) {
    console.error('位置情報エラー:', event.detail.error);
    // バックアップAPIを使用してランドマークを取得（固定位置）
    fetchNearbyLandmarks({ lat: 34.6937, lng: 135.5023 }); // 大阪市の中心付近
  }

  /**
   * 5分ごとの定期更新処理
   */
  function handlePeriodicUpdate(event: CustomEvent) {
    sendLocationAndFetchLandmarks(event.detail.location);
  }

  /**
   * ランドマーク訪問時の処理
   */
  function handleLandmarkVisited(event: CustomEvent) {
    const newLandmarks = event.detail.landmarks;
    
    newLandmarks.forEach(landmark => {
      // 通知キューに追加
      notificationQueue.push(landmark);
      discoveryQueue.push(landmark);
    });
    
    // 通知が表示されていない場合は、次の通知を表示
    if (!showNotification) {
      showNextNotification();
    }
    
    if (!showDiscoveryNotification) {
      showNextDiscovery();
    }
  }

  /**
   * 次の通知を表示
   */
  function showNextNotification() {
    if (notificationQueue.length > 0) {
      currentNotification = notificationQueue.shift();
      showNotification = true;
    } else {
      showNotification = false;
      currentNotification = null;
    }
  }

  /**
   * 次の発見通知を表示
   */
  function showNextDiscovery() {
    if (discoveryQueue.length === 0) return;
    
    currentDiscovery = discoveryQueue.shift();
    showDiscoveryNotification = true;
  }

  /**
   * 通知クローズ時の処理
   */
  function handleNotificationClose() {
    showNotification = false;
    currentNotification = null;
    
    // キューに次の通知があれば表示
    if (notificationQueue.length > 0) {
      setTimeout(showNextNotification, 300); // 少し遅延させて表示
    }
  }

  /**
   * 通知クローズ時の処理
   */
  function handleDiscoveryClose() {
    showDiscoveryNotification = false;
    currentDiscovery = null;
    
    // キューに次の通知があれば表示
    if (discoveryQueue.length > 0) {
      setTimeout(showNextDiscovery, 500); // 少し遅延させて表示
    }
  }

  onMount(() => {
    const mapOptions = {
      center: { lat: 34.6937, lng: 135.5023 }, // 大阪の中心付近
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      // ゲーム風の暗い青系のマップスタイル
      styles: [
        { "elementType": "geometry", "stylers": [{ "color": "#0e1626" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0e1626" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#c5c5c5" }] },
        {
          "featureType": "administrative",
          "elementType": "geometry",
          "stylers": [{ "color": "#0e1626" }]
        },
        {
          "featureType": "road",
          "elementType": "labels",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "administrative.locality",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#b0b0b0" }]
        },
        {
          "featureType": "poi",
          "elementType": "labels",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "poi.park",
          "elementType": "geometry",
          "stylers": [{ "color": "#133d36" }]
        },
        {
          "featureType": "poi.park",
          "elementType": "labels.text",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "road",
          "elementType": "geometry",
          "stylers": [{ "color": "#1c2e4a" }]
        },
        {
          "featureType": "road",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#8a9aab" }]
        },
        {
          "featureType": "transit",
          "elementType": "labels",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "water",
          "elementType": "geometry",
          "stylers": [{ "color": "#17263c" }]
        },
        {
          "featureType": "water",
          "elementType": "labels.text",
          "stylers": [{ "visibility": "off" }]
        }
      ]
    };
    
    map = new google.maps.Map(
      document.getElementById('map') as HTMLElement,
      mapOptions
    );
  });
</script>

<div id="map"></div>

{#if map}
  <UserLocation 
    {map}
    bind:this={userLocationComponent}
    on:locationUpdate={handleLocationUpdate}
    on:locationError={handleLocationError}
    on:periodicUpdate={handlePeriodicUpdate}
  />

  <LandmarkManager
    {map}
    {userLocation}
    bind:this={landmarkManagerComponent}
    on:landmarkVisited={handleLandmarkVisited}
  />

  <CrimeAreaManager
    {map}
    bind:showCrimeAreas
    bind:this={crimeAreaManagerComponent}
  />
  
  <!-- サイドバー -->
  <MapSidebar bind:showCrimeAreas={showCrimeAreas} />
{/if}

<!-- 犯罪エリア表示切り替えボタン -->
<button class="toggle-button" class:active={showCrimeAreas} on:click={toggleCrimeAreas}>
    <div class="toggle-icon"></div>
    犯罪多発エリア {showCrimeAreas ? 'ON' : 'OFF'}
</button>


<!-- 発見通知 -->
{#if showDiscoveryNotification && currentDiscovery}
  <DiscoveryNotification 
    landmark={currentDiscovery}
    on:close={handleDiscoveryClose}
  />
{/if}

<style>
  #map {
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
