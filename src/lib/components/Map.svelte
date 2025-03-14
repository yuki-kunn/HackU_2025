<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    let map: google.maps.Map;
    let userLocationMarker: google.maps.Marker | null = null;
    let userLocationCircle: google.maps.Circle | null = null;
    let userLocation: google.maps.LatLngLiteral | null = null;
    let watchId: number;
    let locationUpdateTimer: ReturnType<typeof setInterval> | null = null;
    let landmarkMarkers: google.maps.Marker[] = []; // ランドマークマーカーを管理する配列

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

    // ランドマーク型の定義
    interface Landmark {
        id?: string;
        name: string;
        address?: string;
        latitude: number;
        longitude: number;
        genre_code?: string;
        genre_name?: string;
        tel?: string;
        detail?: string;
    }

    // 位置情報と共に全ランドマークを取得する関数
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
                displayLandmarks(data.landmarks);
            } else {
                console.warn('No landmarks data in response or invalid format');
                // バックアップとして直接ランドマークを取得
                fetchAllLandmarks();
            }
        } catch (error) {
            console.error('Error sending location and fetching landmarks:', error);
            // エラー時はバックアップAPIを使用
            fetchAllLandmarks();
        }
    }

    // バックアップ: 全ランドマーク取得APIを直接呼び出す
    async function fetchAllLandmarks() {
        try {
            console.log('Fetching all landmarks from backup API');
            
            const response = await fetch('http://localhost:3000/all-landmarks', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'omit'
            });

            if (!response.ok) {
                throw new Error(`Backup API responded with status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.landmarks && Array.isArray(data.landmarks)) {
                displayLandmarks(data.landmarks);
            } else if (Array.isArray(data)) {
                // APIがランドマークの配列を直接返す場合
                displayLandmarks(data);
            } else {
                console.warn('No landmarks returned from backup API');
            }
        } catch (error) {
            console.error('Error fetching landmarks from backup API:', error);
        }
    }

    // 5分ごとに位置情報を送信する関数
    function startPeriodicLocationUpdates() {
        // 既存のタイマーをクリアする
        if (locationUpdateTimer) {
            clearInterval(locationUpdateTimer);
        }
        
        // 最初の1回は即座に実行
        if (userLocation) {
            sendLocationAndFetchLandmarks(userLocation);
        }
        
        // 5分ごとに実行するタイマーをセット（300000ミリ秒 = 5分）
        locationUpdateTimer = setInterval(() => {
            if (userLocation) {
                sendLocationAndFetchLandmarks(userLocation);
            }
        }, 300000); // 5分ごと
    }

    // マップ上のランドマークマーカーをクリア
    function clearLandmarkMarkers() {
        landmarkMarkers.forEach(marker => marker.setMap(null));
        landmarkMarkers = [];
    }

    // ランドマークをマップに表示
    function displayLandmarks(landmarks: Landmark[]) {
        // 既存のマーカーをクリア
        clearLandmarkMarkers();
        
        console.log(`Displaying ${landmarks.length} landmarks on the map`);
        
        landmarks.forEach(landmark => {
            // 座標データの取得
            const lat = Number(landmark.latitude);
            const lng = Number(landmark.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
                console.warn('Invalid coordinates for landmark:', landmark);
                return;
            }
            
            // ジャンルに基づいてアイコンの色を決定
            let iconColor = '#FF9900'; // デフォルト色
            
            // ジャンルコードによる色分け
            if (landmark.genre_code) {
                const code = landmark.genre_code;
                if (code.startsWith('01')) iconColor = '#FF6347'; // 店舗・施設 - 赤系
                else if (code.startsWith('02')) iconColor = '#4682B4'; // 交通・宿泊 - 青系
                else if (code.startsWith('03')) iconColor = '#2E8B57'; // 観光・文化・スポーツ - 緑系
                else if (code.startsWith('04')) iconColor = '#9370DB'; // イベント・レジャー - 紫系
            }
            
            const marker = new google.maps.Marker({
                position: { lat, lng },
                map: map,
                title: landmark.name || 'Unknown landmark',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: iconColor,
                    fillOpacity: 0.8,
                    strokeColor: 'white',
                    strokeWeight: 1
                }
            });
            
            // クリックでランドマーク情報を表示
            const infoContent = `
                <div>
                    <h3>${landmark.name || 'Unknown landmark'}</h3>
                    <p>${landmark.address || 'No address available'}</p>
                    ${landmark.genre_name ? `<p>Genre: ${landmark.genre_name}</p>` : ''}
                    ${landmark.tel ? `<p>Tel: ${landmark.tel}</p>` : ''}
                    ${landmark.detail ? `<p>${landmark.detail}</p>` : ''}
                </div>
            `;
            
            const infoWindow = new google.maps.InfoWindow({
                content: infoContent
            });
            
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
            
            // マーカー配列に追加
            landmarkMarkers.push(marker);
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

        // 初回の位置情報取得時に1回だけ実行
        if (!locationUpdateTimer) {
            // 現在位置と全ランドマークを取得
            sendLocationAndFetchLandmarks(userLocation);
            // 定期更新を開始
            startPeriodicLocationUpdates();
        }
    }

    function handleLocationError(error: GeolocationPositionError) {
        console.error('位置情報の取得に失敗しました:', error.message);
        // ユーザーへのエラー通知などの処理
        
        // エラー時でも全てのランドマークを取得する
        fetchAllLandmarks();
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
            // 位置情報が使えない場合でもランドマークを表示
            fetchAllLandmarks();
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
        
        // マーカーをクリア
        clearLandmarkMarkers();
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
