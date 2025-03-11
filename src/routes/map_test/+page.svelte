<script lang="ts">
    import { onMount } from 'svelte';
    import { Loader } from '@googlemaps/js-api-loader';

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    let mapElement: HTMLDivElement;
    let map: google.maps.Map;
    let userMarker: google.maps.Marker;
    let viewCircle: google.maps.Circle;
    let watchId: number;
    
    // 定数
    const RADIUS_METERS = 50;

    onMount(async () => {
        const loader = new Loader({ 
            apiKey, 
            version: 'weekly',
            libraries: ['maps', 'geometry']
        });
        
        const { Map } = await loader.importLibrary('maps');
        const { Marker } = await loader.importLibrary('marker');
        const { Circle } = await loader.importLibrary('maps');

        // UIコントロールを非表示にした地図を作成
        map = new Map(mapElement, {
            center: { lat: 35.6895, lng: 139.6917 }, // デフォルトの中心位置（東京）
            zoom: 18,
            disableDefaultUI: true, // すべてのUIコントロールを非表示
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        // ユーザーの位置情報トラッキングを初期化
        if (navigator.geolocation) {
            // 初期位置を取得
            navigator.geolocation.getCurrentPosition(
                position => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // 地図の中心をユーザーの位置に設定
                    map.setCenter(userLocation);
                    
                    // ユーザーの位置を示すマーカーを作成
                    userMarker = new Marker({
                        position: userLocation,
                        map: map,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: '#4285F4',
                            fillOpacity: 1,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 2
                        }
                    });
                    
                    // 視野範囲を示す円を作成（半径50m）
                    viewCircle = new Circle({
                        center: userLocation,
                        radius: RADIUS_METERS,
                        map: map,
                        strokeColor: '#4285F4',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#4285F4',
                        fillOpacity: 0.2
                    });
                    
                    // 位置情報の追跡を開始
                    startPositionTracking();
                },
                error => {
                    console.error('位置情報エラー:', error.message);
                    alert('位置情報の取得に失敗しました。位置情報の使用を許可してください。');
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert('お使いのブラウザは位置情報サービスをサポートしていません。');
        }
    });

    // ユーザーの位置を継続的に追跡する関数
    function startPositionTracking() {
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                position => {
                    const newPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // マーカーの位置を更新
                    userMarker.setPosition(newPosition);
                    
                    // 円の位置を更新
                    viewCircle.setCenter(newPosition);
                    
                    // 地図の中心をユーザー位置に維持
                    map.setCenter(newPosition);
                },
                error => {
                    console.error('位置追跡エラー:', error.message);
                },
                { 
                    enableHighAccuracy: true, 
                    maximumAge: 10000,      // 最大10秒前までのキャッシュされた位置情報を許可
                    timeout: 5000           // 位置情報取得の待機時間
                }
            );
        }
    }

    // コンポーネント破棄時にウォッチをクリア
    function onDestroy() {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }
    }
</script>

<style>
    .map-container {
        width: 100vw;
        height: 100vh;
    }
</style>

<div bind:this={mapElement} class="map-container"></div>