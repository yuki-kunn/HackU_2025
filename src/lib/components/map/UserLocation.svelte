<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { isWithinDistance } from './utils/mapUtils';
  
  export let map: google.maps.Map;
  
  let userLocationMarker: google.maps.Marker | null = null;
  let userLocationCircle: google.maps.Circle | null = null;
  let userLocation: google.maps.LatLngLiteral | null = null;
  let watchId: number;
  let locationUpdateTimer: ReturnType<typeof setInterval> | null = null;
  
  const dispatch = createEventDispatcher();
  
  // 位置情報更新時の処理を修正
  function handleLocationUpdate(position: GeolocationPosition) {
    const { latitude, longitude } = position.coords;
    const newLocation = { lat: latitude, lng: longitude };
    
    // 前回の位置と新しい位置が大きく異なる場合のみ更新処理を実行
    const shouldUpdate = !userLocation || 
      google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(userLocation),
        new google.maps.LatLng(newLocation)
      ) > 1000; // 10m以上移動した場合
    
    userLocation = newLocation;

    // マップの中心を現在位置に移動
    if (map) {
      map.setCenter(userLocation);
    }

    // 現在位置のマーカーを更新または作成
    if (userLocationMarker) {
      updateMarkerAndCircle(userLocation);
    } else if (map) {
      userLocationMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: '現在地',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        },
        draggable: true
      });

      userLocationMarker.addListener('dragend', () => {
        const newPosition = userLocationMarker?.getPosition();
        if (newPosition) {
          userLocation = {
            lat: newPosition.lat(),
            lng: newPosition.lng()
          };
          // 円も同時に更新するために共通関数を使用
          updateMarkerAndCircle(userLocation);
          dispatch('locationUpdate', { location: userLocation, shouldUpdate: true });
        }
      });

      // ドラッグ中も円を同期させる
      userLocationMarker.addListener('drag', () => {
        const currentPosition = userLocationMarker?.getPosition();
        if (currentPosition && userLocationCircle) {
          userLocationCircle.setCenter({
            lat: currentPosition.lat(),
            lng: currentPosition.lng()
          });
        }
      });

      // 円を作成 (初回のみ)
      userLocationCircle = new google.maps.Circle({
        strokeColor: '#4285F4',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#4285F4',
        fillOpacity: 0.2,
        map,
        center: userLocation,
        radius: 50 // 半径50メートル
      });
    }

    // 位置情報が更新されたことを通知
    dispatch('locationUpdate', { location: userLocation, shouldUpdate });

    // 初回の位置情報取得時に1回だけ実行
    if (!locationUpdateTimer) {
      // 定期更新を開始
      startPeriodicLocationUpdates();
    }
  }
  
  // 位置情報エラー時の処理
  function handleLocationError(error: GeolocationPositionError) {
    console.error('位置情報の取得に失敗しました:', error.message);
    dispatch('locationError', { error });
  }
  
  // 位置情報トラッキングを開始
  export function startLocationTracking() {
    if (navigator.geolocation) {
      // 最初に一度現在位置を取得
      navigator.geolocation.getCurrentPosition(
        handleLocationUpdate,
        handleLocationError,
        { enableHighAccuracy: true }
      );

      // 継続的に現在位置を監視
      watchId = navigator.geolocation.watchPosition(
        handleLocationUpdate,
        handleLocationError,
        { enableHighAccuracy: true }
      );
    } else {
      console.error('このブラウザは位置情報をサポートしていません。');
      dispatch('locationError', { error: new Error('位置情報がサポートされていません') });
    }
  }
  
  // 5分ごとに位置情報を送信する関数
  function startPeriodicLocationUpdates() {
    // 既存のタイマーをクリアする
    if (locationUpdateTimer) {
      clearInterval(locationUpdateTimer);
    }
    
    // 10分ごとに実行するタイマーをセット（600000ミリ秒 = 10分）
    locationUpdateTimer = setInterval(() => {
      if (userLocation) {
        dispatch('periodicUpdate', { location: userLocation });
      }
    }, 600000); // 10分ごと
  }
  
  // キーボードの矢印キーで移動する距離（メートル）
  const KEY_MOVE_STEP = 20;
  
  // 方向キーでの移動を処理
  function handleKeyDown(event: KeyboardEvent) {
    if (!userLocation) return;
    
    let lat = userLocation.lat;
    let lng = userLocation.lng;
    let moved = false;
    
    // 緯度経度の1度あたりのメートル数（概算）
    const meterPerLat = 111111; // 緯度は約111kmで一定
    const meterPerLng = 111111 * Math.cos(userLocation.lat * (Math.PI / 180)); // 経度は緯度によって変化
    
    // 矢印キーに応じて位置を更新
    switch (event.key) {
      case 'ArrowUp':
        lat += KEY_MOVE_STEP / meterPerLat;
        moved = true;
        break;
      case 'ArrowDown':
        lat -= KEY_MOVE_STEP / meterPerLat;
        moved = true;
        break;
      case 'ArrowLeft':
        lng -= KEY_MOVE_STEP / meterPerLng;
        moved = true;
        break;
      case 'ArrowRight':
        lng += KEY_MOVE_STEP / meterPerLng;
        moved = true;
        break;
      default:
        return; // 他のキーは無視
    }
    
    if (moved) {
      // 位置を更新
      userLocation = { lat, lng };
      
      // マーカーと円を更新
      updateMarkerAndCircle(userLocation);
      
      // 位置変更イベントをディスパッチ
      dispatch('locationUpdate', { 
        location: userLocation, 
        shouldUpdate: true 
      });
      
      // イベントのデフォルト動作を防止（ページスクロールなど）
      event.preventDefault();
    }
  }

  // マーカーと円を更新する共通関数（常に同期を保つ）
  function updateMarkerAndCircle(location: google.maps.LatLngLiteral) {
    // マーカーを更新
    if (userLocationMarker) {
      userLocationMarker.setPosition(location);
    }
    
    // 円を更新
    if (userLocationCircle) {
      userLocationCircle.setCenter(location);
    }
  }
  
  onMount(() => {
    startLocationTracking();
    
    // キーボードイベントのリスナーを登録
    window.addEventListener('keydown', handleKeyDown);
  });
  
  onDestroy(() => {
    // コンポーネント破棄時の処理
    if (watchId !== undefined) {
      navigator.geolocation.clearWatch(watchId);
    }
    
    // 定期更新タイマーをクリア
    if (locationUpdateTimer) {
      clearInterval(locationUpdateTimer);
    }
    
    // マーカーとサークルをクリア
    if (userLocationMarker) {
      userLocationMarker.setMap(null);
    }
    
    if (userLocationCircle) {
      userLocationCircle.setMap(null);
    }
    
    // キーボードイベントのリスナーを削除
    window.removeEventListener('keydown', handleKeyDown);
  });
</script>
