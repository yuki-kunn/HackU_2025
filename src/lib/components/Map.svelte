<script lang="ts">
    import { onMount } from 'svelte';
    let map: google.maps.Map;
    let userLocationMarker: google.maps.Marker | null = null;
    let userLocationCircle: google.maps.Circle | null = null;
    let userLocation: google.maps.LatLngLiteral | null = null;
    let watchId: number;

    // 犯罪エリア表示のための変数
    let crimePolygons: google.maps.Polygon[] = [];
    let showCrimeAreas = true;

    // 犯罪エリアのデータ型定義
    interface CrimeArea {
        name: string;
        center: google.maps.LatLngLiteral;
        radius?: number;
        customPolygon?: google.maps.LatLngLiteral[];
    }

    // 犯罪エリアデータ
    const crimeAreas: CrimeArea[] = [
        { name: "大阪市中央区 難波３丁目", center: {lat: 34.6669, lng: 135.5025}, radius: 200 },
        { name: "大阪市中央区 道頓堀１丁目", center: {lat: 34.6682, lng: 135.5014}, radius: 200 },
        { name: "大阪市北区 堂山町", center: {lat: 34.7057, lng: 135.5010}, radius: 200 },
        { name: "大阪市浪速区 難波中１丁目", center: {lat: 34.6657, lng: 135.5018}, radius: 200 },
        { name: "大阪市西区 南堀江１丁目", center: {lat: 34.6724, lng: 135.4939}, radius: 200 }
    ];

    async function fetchNearbyLandmarks(position: google.maps.LatLngLiteral) {
        try {
            const response = await fetch(
                `http://localhost:3000/landmark?lat=${position.lat}&lng=${position.lng}&radius=1000`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch landmarks');
            }

            const landmarks = await response.json();
            // ランドマークをマップに表示する処理
            displayLandmarks(landmarks);
        } catch (error) {
            console.error('Error fetching landmarks:', error);
        }
    }

    function displayLandmarks(landmarks: any[]) {
        landmarks.forEach(landmark => {
            new google.maps.Marker({
                position: { lat: Number(landmark.lat), lng: Number(landmark.lng) },
                map: map,
                title: landmark.name
            });
        });
    }

    // 位置情報更新時にランドマーク取得を実行
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

        // 近くのランドマークを取得
        fetchNearbyLandmarks(userLocation);
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

    // 円を近似する多角形ポイントを生成する関数
    const createCirclePoints = (center: google.maps.LatLngLiteral, radius: number): google.maps.LatLngLiteral[] =>
        Array.from({ length: 24 }, (_, i) => {
            const angle = (i / 24) * 2 * Math.PI;
            const d = radius / 111300;
            return {
                lat: center.lat + Math.sin(angle) * d,
                lng: center.lng + Math.cos(angle) * d / Math.cos(center.lat * Math.PI / 180)
            };
        });

    // 犯罪エリアポリゴンを作成する関数
    function createCrimeAreaPolygons() {
        crimePolygons = crimeAreas.map(({ name, center, radius, customPolygon }) => {
            const polygon = new google.maps.Polygon({
                paths: customPolygon || createCirclePoints(center, radius || 200),
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                map: showCrimeAreas ? map : null
            });

            polygon.addListener('click', () => 
                new google.maps.InfoWindow({
                    content: `<div><strong>${name}</strong><br>犯罪多発エリア</div>`,
                    position: center
                }).open(map)
            );
            
            return polygon;
        });
    }

    // 犯罪エリアの表示/非表示を切り替える関数
    function toggleCrimeAreas() {
        showCrimeAreas = !showCrimeAreas;
        crimePolygons.forEach(polygon => {
            polygon.setMap(showCrimeAreas ? map : null);
        });
    }

    onMount(() => {
        const mapOptions = {
            center: { lat: 34.6937, lng: 135.5023 }, // 大阪の中心付近に変更
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

        // 犯罪エリアの作成を追加
        createCrimeAreaPolygons();
        
        // 位置情報トラッキングの開始
        startLocationTracking();
        
        return () => {
            if (watchId !== undefined) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    });
</script>

<div id="map"></div>
<!-- 犯罪エリア表示切り替えボタンを追加 -->
<button class="toggle-button" class:active={showCrimeAreas} on:click={toggleCrimeAreas}>
    <div class="toggle-icon"></div>
    犯罪多発エリア {showCrimeAreas ? 'ON' : 'OFF'}
</button>

<style>
    #map {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .toggle-button {
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 10;
        background-color: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 10px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        font-family: sans-serif;
        cursor: pointer;
    }
    
    .toggle-button.active {
        background-color: #f8f8f8;
    }
    
    .toggle-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: #FF0000;
        margin-right: 8px;
        opacity: 0.7;
    }
</style>
