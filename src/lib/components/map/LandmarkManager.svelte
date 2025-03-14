<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { getLandmarkId, getLandmarkColor, createLandmarkInfoContent, type Landmark } from './utils/landmarkUtils';
  import { loadVisitedLandmarks, loadVisitedLandmarkDetails, addVisitedLandmarkWithDetails, type StoredLandmark } from './utils/storageUtils';
  import { isWithinDistance } from './utils/mapUtils';
  
  // Props
  export let map: google.maps.Map;
  export let userLocation: google.maps.LatLngLiteral | null = null;
  
  // 内部状態
  let landmarkMarkers: google.maps.Marker[] = [];
  let visitedLandmarks: Set<string>;
  let visitedLandmarkDetails: StoredLandmark[] = [];
  let permanentMarkers: google.maps.Marker[] = [];
  
  // イベント通知用
  const dispatch = createEventDispatcher();
  
  // ページ読み込み時にローカルストレージから訪問済みランドマークを読み込む
  onMount(() => {
    visitedLandmarks = loadVisitedLandmarks();
    visitedLandmarkDetails = loadVisitedLandmarkDetails();
    
    // 訪問済みランドマークを常時表示
    displayPermanentLandmarks();
  });
  
  /**
   * 保存済みのランドマークを常時表示する
   */
  function displayPermanentLandmarks() {
    // 既存の永続マーカーをクリア
    clearPermanentMarkers();
    
    visitedLandmarkDetails.forEach(landmark => {
      if (!landmark.latitude || !landmark.longitude) return;
      
      // マーカー色を決定
      const iconColor = landmark.color || getLandmarkColor(landmark.genre_code || '');
      
      const marker = new google.maps.Marker({
        position: { lat: landmark.latitude, lng: landmark.longitude },
        map,
        title: landmark.name || 'Unknown landmark',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: iconColor,
          fillOpacity: 1.0,
          strokeColor: 'white',
          strokeWeight: 1
        }
      });
      
      // クリックでランドマーク情報を表示
      const infoContent = `
        <div>
          <h3>${landmark.name || 'Unknown landmark'}</h3>
          <p>✓ 訪問済み</p>
        </div>
      `;
      
      const infoWindow = new google.maps.InfoWindow({
        content: infoContent
      });
      
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      permanentMarkers.push(marker);
    });
    
    console.log(`Displayed ${permanentMarkers.length} permanent landmarks`);
  }
  
  /**
   * 永続マーカーをクリア
   */
  function clearPermanentMarkers() {
    permanentMarkers.forEach(marker => marker.setMap(null));
    permanentMarkers = [];
  }

  /**
   * 近くのランドマークをチェックし、訪問済みにする
   */
  function checkNearbyLandmarks(landmarks: Landmark[], userPos: google.maps.LatLngLiteral) {
    if (!userPos) return;
    
    const newlyVisited: Landmark[] = [];
    
    landmarks.forEach(landmark => {
      const landmarkId = getLandmarkId(landmark);
      const landmarkPos = { lat: Number(landmark.latitude), lng: Number(landmark.longitude) };
      
      // 50m以内に入ったランドマークを訪問済みとして記録
      if (isWithinDistance(userPos, landmarkPos, 50)) {
        if (!visitedLandmarks.has(landmarkId)) {
          // 新規訪問を記録
          visitedLandmarks.add(landmarkId);
          // ローカルストレージに保存
          addVisitedLandmarkWithDetails({
            id: landmarkId,
            name: landmark.name,
            latitude: Number(landmark.latitude),
            longitude: Number(landmark.longitude),
            genre_code: landmark.genre_code,
            color: getLandmarkColor(landmark.genre_code)
          });
          newlyVisited.push(landmark);
        }
      }
    });

    // 新しく訪問したランドマークがあれば通知イベントを発行
    if (newlyVisited.length > 0) {
      dispatch('landmarkVisited', { landmarks: newlyVisited });
    }
  }
  
  /**
   * 新しい永続マーカーを追加
   */
  function addPermanentMarker(landmark: StoredLandmark) {
    const iconColor = landmark.color || getLandmarkColor(landmark.genre_code || '');
    
    const marker = new google.maps.Marker({
      position: { lat: landmark.latitude, lng: landmark.longitude },
      map,
      title: landmark.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: iconColor,
        fillOpacity: 1.0,
        strokeColor: 'white',
        strokeWeight: 1
      },
      animation: google.maps.Animation.DROP
    });
    
    // クリックでランドマーク情報を表示
    const infoContent = `
      <div>
        <h3>${landmark.name || 'Unknown landmark'}</h3>
        <p>✓ 訪問済み</p>
      </div>
    `;
    
    const infoWindow = new google.maps.InfoWindow({
      content: infoContent
    });
    
    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });
    
    permanentMarkers.push(marker);
  }
  
  /**
   * マップ上のランドマークマーカーをクリア
   */
  function clearLandmarkMarkers() {
    landmarkMarkers.forEach(marker => marker.setMap(null));
    landmarkMarkers = [];
  }
  
  /**
   * ランドマークをマップに表示（ユーザー位置を考慮）
   */
  export function updateLandmarksOnMap(landmarks: Landmark[]) {
    // 既存のマーカーをクリア
    clearLandmarkMarkers();
    
    console.log(`Displaying landmarks on the map: total=${landmarks.length}`);
    
    // ユーザーの現在地で訪問済みランドマークをチェック
    if (userLocation) {
      checkNearbyLandmarks(landmarks, userLocation);
    }
    
    // 表示するランドマークをフィルタリングとマッピング
    landmarks.forEach(landmark => {
      // 座標データの取得
      const lat = Number(landmark.latitude);
      const lng = Number(landmark.longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.warn('Invalid coordinates for landmark:', landmark);
        return;
      }
      
      const landmarkId = getLandmarkId(landmark);
      const isVisited = visitedLandmarks.has(landmarkId);
      
      // ジャンルに基づいてアイコンの色を決定
      const iconColor = getLandmarkColor(landmark.genre_code);
      
      // 未訪問のランドマークはハテナアイコンで表示
      const markerIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: isVisited ? iconColor : '#888888', // 未訪問は灰色
        fillOpacity: isVisited ? 1.0 : 0.5,
        strokeColor: 'white',
        strokeWeight: 1
      };
      
      // 未訪問のランドマークは「?」のラベルを表示
      const markerLabel = isVisited ? null : {
        text: "?",
        color: "#FFFFFF",
        fontSize: "14px",
        fontWeight: "bold"
      };
      
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: landmark.name || 'Unknown landmark',
        icon: markerIcon,
        label: markerLabel
      });
      
      // クリックでランドマーク情報を表示
      const infoWindow = new google.maps.InfoWindow({
        content: createLandmarkInfoContent(landmark, isVisited)
      });
      
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      // マーカー配列に追加
      landmarkMarkers.push(marker);
    });
    
    console.log(`Displayed ${landmarkMarkers.length} landmarks`);
  }
  
  // userLocationの変更を監視
  $: if (userLocation) {
    // マーカーが存在する場合のみ処理
    if (landmarkMarkers.length > 0) {
      // 現在表示されているランドマークの座標データを抽出
      const currentLandmarks = landmarkMarkers.map(marker => {
        const position = marker.getPosition();
        if (!position) return null;
        return {
          name: marker.getTitle() || 'Unknown',
          latitude: position.lat(),
          longitude: position.lng()
        };
      }).filter(Boolean) as Landmark[];
      
      // 訪問チェック
      checkNearbyLandmarks(currentLandmarks, userLocation);
    }
  }
  
  onDestroy(() => {
    clearLandmarkMarkers();
    clearPermanentMarkers();
  });
</script>
