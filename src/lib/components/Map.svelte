<script lang="ts">
    import { onMount } from 'svelte';

    let map: google.maps.Map;
    let userLocationMarker: google.maps.Marker | null = null;
    let userLocationCircle: google.maps.Circle | null = null;
    let userLocation: google.maps.LatLngLiteral | null = null;
    let watchId: number;

    function handleLocationUpdate(position: GeolocationPosition) {
        const { latitude, longitude } = position.coords;
        userLocation = { lat: latitude, lng: longitude };

        // マップの中心を現在位置に移動
        if (map) {
            map.setCenter(userLocation);
        }

        // 現在位置のマーカーを更新または作成
        if (userLocationMarker) {
            userLocationMarker.setPosition(userLocation);
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
                }
            });
        }

        // 円を更新または作成
        if (userLocationCircle) {
            userLocationCircle.setCenter(userLocation);
        } else if (map) {
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
    }

    function handleLocationError(error: GeolocationPositionError) {
        console.error('位置情報の取得に失敗しました:', error.message);
        // ユーザーへのエラー通知などの処理を追加できます
    }

    function startLocationTracking() {
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
        }
    }

    onMount(() => {
        const mapOptions = {
            center: { lat: 35.6895, lng: 139.6917 },
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: false,
            disableDefaultUI: true,
            styles: [
                {
                    featureType: 'poi', // POI（Point of Interest）を非表示
                    elementType: 'labels', // ラベルを非表示
                    stylers: [{ visibility: 'off' }] // styleを適用
                }
            ]
        };

        map = new google.maps.Map(
            document.getElementById('map') as HTMLElement,
            mapOptions
        );

        // 位置情報トラッキングの開始
        startLocationTracking();

        return () => {
            // コンポーネントのクリーンアップ時に位置情報の監視を停止
            if (watchId !== undefined) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    });
</script>

<div id="map"></div>

<style>
    #map {
        width: 100%;
        height: 100%;
    }
</style>
