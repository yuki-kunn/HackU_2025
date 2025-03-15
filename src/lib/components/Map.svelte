<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import UserLocation from './map/UserLocation.svelte';
  import LandmarkManager from './map/LandmarkManager.svelte';
  import DiscoveryNotification from './map/DiscoveryNotification.svelte';
  import MapSidebar from './map/MapSidebar.svelte';
  import type { Landmark } from './map/utils/landmarkUtils';
  import Sidebar from './Sidebar.svelte';
  import QuizModal from './map/QuizModal.svelte';

  let map: google.maps.Map;
  let userLocation: google.maps.LatLngLiteral | null = null;
  
  // コンポーネントの参照
  let userLocationComponent: UserLocation;
  let landmarkManagerComponent: LandmarkManager;
  let sidebarComponent;
  
  // 通知関連
  let showNotification = false;
  let currentNotification: Landmark | null = null;
  let notificationQueue: Landmark[] = [];
  let showDiscoveryNotification = false;
  let currentDiscovery = null;
  let discoveryQueue: any[] = [];
  
  // 追加：クエスト管理用変数・関数
  let activeQuest = null;
  let landmarks: any[] = [];
  let showQuestPopup = false;
  let activeQuizQuest = null; // 現在クイズを表示中のクエスト
  let showQuiz = false;

  // モックデータ: 大阪城とUSJのクエスト
  const questMockData = [
    
    {
      id: 'tsutenkaku',
      name: '通天閣',
      latitude: 34.6524,
      longitude: 135.5059,
      address: '大阪府大阪市浪速区恵美須東1-18-6',
      genre_code: '0301',
      genre_name: '観光・文化施設',
      detail: '大阪を代表する観光名所。夜間にはライトアップされた美しい姿を見ることができ、展望台からは大阪市内を一望できる。'
    }
  ];

  // クエスト提示
  function triggerQuest() {
    // ランダムにクエストを選択
    const randomIndex = Math.floor(Math.random() * questMockData.length);
    activeQuest = questMockData[randomIndex];
    showQuestPopup = true;
  }

  // クエスト受注処理
  function acceptQuest() {
    if (activeQuest) {
      // ローカルストレージに "active_quests" キーで保存
      let quests = JSON.parse(localStorage.getItem('active_quests') || '[]');
      activeQuest.questStatus = 'クエスト受注中';
      activeQuest.acceptedAt = new Date().toISOString();
      
      // 同じIDのクエストが既にあれば更新、なければ追加
      const existingIndex = quests.findIndex(q => q.id === activeQuest.id);
      if (existingIndex >= 0) {
        quests[existingIndex] = activeQuest;
      } else {
        quests.push(activeQuest);
      }
      
      localStorage.setItem('active_quests', JSON.stringify(quests));
      
      // カスタムイベントを発行してサイドバーに通知
      window.dispatchEvent(new CustomEvent('localStorageQuestUpdated'));
      
      alert(`クエスト「${activeQuest.name}」を受注しました！`);
      closeQuestPopup();
    }
  }

  // クエストポップアップを閉じる
  function closeQuestPopup() {
    showQuestPopup = false;
    activeQuest = null;
  }
 
  // モックデータ: 大阪城
  const mockQuest = {
    id: 'osaka-castle',
    name: '大阪城',
    latitude: 34.6873,
    longitude: 135.5262,
    address: '大阪府大阪市中央区大阪城1-1',
    genre_code: '0301', // 観光・文化施設
    genre_name: '観光・文化施設', 
    detail: '豊臣秀吉によって築かれ、徳川家康によって再建された歴史的建造物。大阪のシンボル。'
  };

  // ※visitedLandmarks と landmarkManagerComponent.landmarks は既存の状態として存在する前提です
  async function ensureLandmarkDataReady() {
    const stored = localStorage.getItem('visited_landmarks');
    // たとえば、空の配列や null の場合、データが未登録と判断
    if (!stored || JSON.parse(stored).length === 0) {
      // LandmarkManager コンポーネント等から現在のランドマークデータを取得するか、
      // サーバーから再取得して localStorage に保存する
      // ※ここでは fetchLandmarksFromBackend() はバックエンドからデータを取得する仮の関数です
      const data = await fetchLandmarksFromBackend(); 
      localStorage.setItem('visited_landmarks', JSON.stringify(data));
    }
  }

  // Reactive に LandmarkManager の準備状態を監視
  $: landmarksReady = landmarkManagerComponent && landmarkManagerComponent.landmarks && landmarkManagerComponent.landmarks.length > 0;

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
    
    // クエスト位置への近接チェック
    if (event.detail.location) {
      checkQuestProximity(event.detail.location);
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

  // サイドバーからのナビゲーションイベントを処理
  function handleNavigate(event) {
    const { latitude, longitude, name } = event.detail;
    // マップの中心を目的地に設定
    if (map) {
      map.setCenter({ lat: latitude, lng: longitude });
      map.setZoom(16); // 適切なズームレベルに設定
    }
  }

  // クエストへのナビゲーション処理
  function handleNavigateToLocation(event) {
    const { latitude, longitude, name } = event.detail;
    
    if (map) {
      // 目的地にマップを移動
      map.panTo({ lat: latitude, lng: longitude });
      
      // ズームレベルを調整
      map.setZoom(17);
      
      // 通知
      alert(`${name}への行き方が表示されました。現在地から目的地に移動してください。`);
    }
  }

  // 通天閣に関するクイズデータ
  const tsutenkakuQuizData = {
    question: "大阪の通天閣は最初に建てられたのは何年でしょうか？",
    options: ["1912年", "1920年", "1956年"],
    correctAnswer: "1912年"
  };
  
  // クエスト位置と現在地の距離をチェックする関数
  function checkQuestProximity(userPos) {
    if (!userPos) return;
    
    // ローカルストレージから受注中クエストを取得
    const quests = JSON.parse(localStorage.getItem('active_quests') || '[]');
    
    // 各クエストについて距離をチェック
    quests.forEach(quest => {
      if (quest.questStatus !== 'クエスト受注中') return;
      
      // クエスト位置までの距離を計算
      const questPos = { lat: quest.latitude, lng: quest.longitude };
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(userPos),
        new google.maps.LatLng(questPos)
      );
      
      // 50m以内に近づいたかつ通天閣のクエストの場合、クイズを表示
      if (distance <= 50 && quest.name.includes('通天閣')) {
        activeQuizQuest = quest;
        showQuiz = true;
      }
    });
  }
  
  // クイズ回答処理
  function handleQuizAnswer(event) {
    const { questId, isCorrect } = event.detail;
    
    if (isCorrect) {
      // クエスト完了処理
      let quests = JSON.parse(localStorage.getItem('active_quests') || '[]');
      const questIndex = quests.findIndex(q => q.id === questId);
      
      if (questIndex >= 0) {
        // クエストステータスを「完了」に更新
        quests[questIndex].questStatus = 'クエスト完了';
        quests[questIndex].completedAt = new Date().toISOString();
        localStorage.setItem('active_quests', JSON.stringify(quests));
        
        // カスタムイベントを発行してサイドバーに通知
        window.dispatchEvent(new CustomEvent('localStorageQuestUpdated'));
        
        // 成功メッセージ
        alert('正解です！クエストを完了しました！');
      }
    } else {
      // 不正解メッセージ
      alert('残念、不正解です。もう一度挑戦してください。');
    }
    
    showQuiz = false;
  }
  
  // クイズをキャンセル
  function handleQuizClose() {
    showQuiz = false;
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
  
  <!-- サイドバーコンポーネント -->
  <Sidebar 
    bind:this={sidebarComponent} 
    on:navigate={handleNavigate} 
  />

  <!-- サイドバーコンポーネント -->
  <MapSidebar on:navigateToLocation={handleNavigateToLocation} />
{/if}



<!-- 発見通知 -->
{#if showDiscoveryNotification && currentDiscovery}
  <DiscoveryNotification 
    landmark={currentDiscovery}
    on:close={handleDiscoveryClose}
  />
{/if}



<!-- Yahoo! JAPAN attribution snippet -->
<div class="yahoo-attribution">
  <!-- Begin Yahoo! JAPAN Web Services Attribution Snippet -->
  <span style="margin:15px 15px 15px 15px">
    <a href="https://developer.yahoo.co.jp/sitemap/">Webサービス by Yahoo! JAPAN</a>
  </span>
  <!-- End Yahoo! JAPAN Web Services Attribution Snippet -->
</div>

<!-- クエスト提示ボタン（画面右上に配置） -->
<div class="quest-button-container">
  <button class="quest-button" on:click={triggerQuest}>
    クエスト探索
  </button>
</div>

<!-- クエストポップアップ -->
{#if showQuestPopup && activeQuest}
  <div class="quest-popup-overlay" on:click={closeQuestPopup}>
    <div class="quest-popup" on:click|stopPropagation>
      <div class="quest-close" on:click={closeQuestPopup}>×</div>
      <h3>新しいクエスト発見！</h3>
      <p class="quest-title">{activeQuest.name}</p>
      <p class="quest-address">{activeQuest.address}</p>
      <p class="quest-category">{activeQuest.genre_name || activeQuest.genre_code}</p>
      {#if activeQuest.detail}
        <p class="quest-detail">{activeQuest.detail}</p>
      {/if}
      <button class="accept-button" on:click={acceptQuest}>クエスト受注</button>
    </div>
  </div>
{/if}

<!-- クイズモーダル -->
{#if showQuiz && activeQuizQuest}
  <QuizModal 
    quest={activeQuizQuest} 
    quizData={tsutenkakuQuizData}
    on:answer={handleQuizAnswer}
    on:close={handleQuizClose}
  />
{/if}

<style>
  #map {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .quest-section {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 10;
  }
  .quest-section button {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    background-color: #4285F4;
    color: white;
    cursor: pointer;
    font-size: 14px;
  }
  .quest-popup {
    margin-top: 10px;
    padding: 12px;
    background-color: white;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  .quest-popup p {
    margin: 4px 0;
    font-size: 14px;
  }
  .quest-popup button {
    margin-top: 8px;
    padding: 6px 10px;
    font-size: 14px;
    background-color: #34A853;
    border: none;
    color: white;
    border-radius: 4px;
    cursor: pointer;
  }
  .yahoo-attribution {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 10px;
    color: #666;
    background-color: rgba(255,255,255,0.7);
    padding: 4px 8px;
    border-radius: 4px;
    z-index: 100;
  }
  .quest-popup h3 {
    margin-top: 0;
    color: #4285F4;
  }
  .quest-popup .detail {
    font-size: 13px;
    color: #666;
    margin-top: 8px;
    font-size: 13px;
    color: #666;
    margin-top: 8px;
  }
  .quest-button-container {
    position: absolute;
    top: 20px;
    right: 20px; /* 左から右に変更 */
    z-index: 10;
  }
  
  .quest-button {
    padding: 10px 20px;
    background-color: #4285F4;
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }
  
  .quest-button:hover {
    background-color: #3367D6;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .quest-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  
  .quest-popup {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 350px;
    width: 90%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    position: relative;
  }
  
  .quest-close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    line-height: 24px;
    text-align: center;
    cursor: pointer;
    font-size: 18px;
    color: #666;
  }
  
  .quest-popup h3 {
    margin-top: 0;
    color: #4285F4;
    font-size: 18px;
  }
  
  .quest-title {
    font-weight: bold;
    font-size: 16px;
    margin: 10px 0 5px;
  }
  
  .quest-address {
    font-size: 14px;
    color: #555;
    margin: 5px 0;
  }
  
  .quest-category {
    font-size: 14px;
    color: #4285F4;
    margin: 5px 0;
  }
  
  .quest-detail {
    font-size: 13px;
    color: #666;
    margin: 10px 0;
    line-height: 1.4;
  }
  
  .accept-button {
    display: block;
    width: 100%;
    padding: 10px;
    background-color: #34A853;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 15px;
  }
  
  .accept-button:hover {
    background-color: #2E8B57;
  }
</style>
