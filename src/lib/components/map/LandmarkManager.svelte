<script lang="ts">
  import { onDestroy, createEventDispatcher } from 'svelte';
  import type { Landmark } from './utils/landmarkUtils';
  import { getLandmarkId, getLandmarkColor, createLandmarkInfoContent } from './utils/landmarkUtils';
  import { isWithinDistance } from './utils/mapUtils';
  import { loadVisitedLandmarks, saveVisitedLandmarks } from './utils/storageUtils';
  
  export let map: google.maps.Map;
  export let userLocation: google.maps.LatLngLiteral | null = null;
  
  let landmarkMarkers: google.maps.Marker[] = [];
  let visitedLandmarks: Set<string> = loadVisitedLandmarks();
  
  const dispatch = createEventDispatcher();
  
  /**
   * ランドマークがユーザーの位置から指定距離内にあるか確認
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
          visitedLandmarks.add(landmarkId);
          saveVisitedLandmarks(visitedLandmarks);
          newlyVisited.push(landmark);
        }
      }
    });
    
    // 新しく訪問したランドマークがあれば通知
    if (newlyVisited.length > 0) {
      dispatch('landmarkVisited', { landmarks: newlyVisited });
    }
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
      
      // 未訪問のランドマークは表示しない（訪問済みのみ表示）
      if (!isVisited) {
        return;
      }
      
      // ジャンルに基づいてアイコンの色を決定
      const iconColor = getLandmarkColor(landmark.genre_code);
      
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: landmark.name || 'Unknown landmark',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: iconColor,
          fillOpacity: isVisited ? 1.0 : 0.5, // 訪問済みは濃く表示
          strokeColor: 'white',
          strokeWeight: 1
        }
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
    
    console.log(`Displayed ${landmarkMarkers.length} landmarks (visited only)`);
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
  });
</script>
