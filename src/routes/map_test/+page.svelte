<script lang="ts">
    import { onMount } from 'svelte';
    import { Loader } from '@googlemaps/js-api-loader';

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    let mapElement: HTMLDivElement;
    let map: google.maps.Map;
    let userMarker: google.maps.Marker;
    let viewCircle: google.maps.Circle;
    let watchId: number;
    let questMarkers: google.maps.Marker[] = [];
    let questInfoWindows: google.maps.InfoWindow[] = [];
    let isFirstLoad = true;
    
    // 定数
    const RADIUS_METERS = 50;
    const QUEST_SEARCH_RADIUS = 1000; // 1km圏内のイベントを検索
    const QUEST_MAX_RESULTS = 5; // 最大5件のクエストを表示
    
    interface YahooLocalSearchResult {
        Feature: {
            Name: string;
            Property: {
                Address?: string;
                Tel?: string;
                Detail?: string;
            };
            Geometry: {
                Coordinates: string; // "経度,緯度"の形式
            };
        }[];
        ResultInfo: {
            Count: number;
            Total: number;
            Start: number;
            Status: number;
            Description: string;
            Latency: number;
        };
    }

    // クエスト関連の型定義
    interface Quest {
        id: string;
        title: string;
        description: string;
        location: google.maps.LatLngLiteral;
        distance?: number; // ユーザーからの距離（メートル）
    }

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
                    
                    // 初回のクエスト検索を実行
                    searchQuests(userLocation);
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
                    
                    // 位置が大きく変わった場合やはじめての場合は、クエストを再検索
                    if (isFirstLoad || shouldRefreshQuests(newPosition)) {
                        searchQuests(newPosition);
                        isFirstLoad = false;
                    }
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

    // クエストを再検索すべきかどうかを判断する関数
    function shouldRefreshQuests(newPosition: google.maps.LatLngLiteral): boolean {
        // 前回のクエスト検索から200m以上移動した場合に再検索
        if (questMarkers.length === 0) return true;
        
        const lastQuestPosition = questMarkers[0].getPosition();
        if (!lastQuestPosition) return true;
        
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(newPosition),
            lastQuestPosition
        );
        
        return distance > 200; // 200m以上移動した場合
    }

    // サーバーエンドポイントを介してYahoo!ローカルサーチAPIのイベント（クエスト）を検索する関数
    async function searchQuests(position: google.maps.LatLngLiteral) {
        try {
            // クエスト検索前に既存のマーカーとInfoWindowをクリア
            clearQuestMarkers();
            
            // サーバーエンドポイントURL
            const url = new URL('/api/yahoo-local-search', window.location.origin);
            
            // クエリパラメータの設定
            url.searchParams.append('lat', position.lat.toString());
            url.searchParams.append('lon', position.lng.toString());
            url.searchParams.append('dist', QUEST_SEARCH_RADIUS.toString());
            url.searchParams.append('results', QUEST_MAX_RESULTS.toString());
            
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error('API response was not ok: ' + response.status);
            }
            
            const data: YahooLocalSearchResult = await response.json();
            
            if (!data.Feature || data.Feature.length === 0 || data.ResultInfo.Count === 0) {
                console.log('近くのイベントはありませんでした');
                addDummyQuests(position); // イベントがない場合はダミーを表示
                return;
            }
            
            // 検索結果をクエストとして表示
            const quests: Quest[] = data.Feature.map(feature => {
                const [lng, lat] = feature.Geometry.Coordinates.split(',').map(Number);
                const location = { lat, lng };
                
                // ユーザーからの距離を計算
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(position),
                    new google.maps.LatLng(location)
                );
                
                return {
                    id: Math.random().toString(36).substring(2, 9),
                    title: feature.Name,
                    description: feature.Property.Detail || '詳細情報なし',
                    location,
                    distance
                };
            });
            
            // クエストをマップに追加
            addQuestsToMap(quests);
            
        } catch (error) {
            console.error('クエスト検索エラー:', error);
            addDummyQuests(position); // エラー時はダミーを表示
        }
    }
    
    // APIから結果が得られなかった場合のダミークエストを追加
    function addDummyQuests(position: google.maps.LatLngLiteral) {
        const dummyQuests: Quest[] = [
            {
                id: 'dummy1',
                title: '謎の祭り',
                description: '伝説の祭りが開催されているようだ。調査してみよう！',
                location: offsetPosition(position, 400, 300)
            },
            {
                id: 'dummy2',
                title: '不思議な展示会',
                description: '限定的な芸術展が行われている。見に行こう！',
                location: offsetPosition(position, -300, 500)
            },
            {
                id: 'dummy3',
                title: 'ストリートパフォーマンス',
                description: '評判のパフォーマーが近くで演奏中！',
                location: offsetPosition(position, 600, -200)
            }
        ];
        
        addQuestsToMap(dummyQuests);
    }
    
    // 現在位置から指定したオフセット（メートル）の位置を計算
    function offsetPosition(position: google.maps.LatLngLiteral, xMeters: number, yMeters: number): google.maps.LatLngLiteral {
        // 緯度経度1度あたりの距離は概算値（地球は完全な球体ではないため）
        const metersPerLat = 111111; // 緯度1度あたりの距離（メートル）
        const metersPerLng = 111111 * Math.cos(position.lat * (Math.PI / 180)); // 経度1度あたりの距離
        
        return {
            lat: position.lat + (yMeters / metersPerLat),
            lng: position.lng + (xMeters / metersPerLng)
        };
    }
    
    // クエストマーカーをマップに追加
    function addQuestsToMap(quests: Quest[]) {
        quests.forEach(quest => {
            // クエスト用のカスタムアイコン - RPG風のマーカーに変更
            const questIcon = {
                path: "M -2,-5 2,-5 2,5 -2,5 z", // 簡易的な旗や巻物の形状
                fillColor: '#FF9900',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                scale: 1.5,
                labelOrigin: new google.maps.Point(0, -10)
            };
            
            // クエストマーカーを作成
            const marker = new google.maps.Marker({
                position: quest.location,
                map: map,
                icon: questIcon,
                title: quest.title,
                animation: google.maps.Animation.DROP,
                label: {
                    text: "❗", // クエストマーク
                    color: "#FFFFFF",
                    fontSize: "16px"
                }
            });
            
            // クエスト情報ウィンドウを作成
            const infoWindow = new google.maps.InfoWindow({
                content: createQuestInfoContent(quest)
            });
            
            // マーカークリックでInfoWindowを表示
            marker.addListener('click', () => {
                // 他の開いているInfoWindowを閉じる
                questInfoWindows.forEach(window => window.close());
                infoWindow.open(map, marker);
            });
            
            questMarkers.push(marker);
            questInfoWindows.push(infoWindow);
        });
    }
    
    // クエスト情報ウィンドウのHTMLコンテンツを作成
    function createQuestInfoContent(quest: Quest): string {
        const distanceText = quest.distance 
            ? `約${Math.round(quest.distance)}m先` 
            : '近くで開催中';
            
        return `
            <div class="quest-info">
                <h3 class="quest-title">📜 ${quest.title}</h3>
                <p class="quest-description">${quest.description}</p>
                <p class="quest-distance">🚶 ${distanceText}</p>
                <button class="quest-accept-btn" onclick="document.dispatchEvent(new CustomEvent('accept-quest', { detail: '${quest.id}' }))">
                    クエスト受注
                </button>
            </div>
        `;
    }
    
    // 既存のクエストマーカーとInfoWindowをクリア
    function clearQuestMarkers() {
        questMarkers.forEach(marker => marker.setMap(null));
        questInfoWindows.forEach(window => window.close());
        questMarkers = [];
        questInfoWindows = [];
    }
    
    // クエスト受注イベントリスナー
    onMount(() => {
        document.addEventListener('accept-quest', (event: CustomEvent) => {
            const questId = event.detail;
            alert(`クエスト受注: ${questId}`);
            // ここに受注後の処理を追加（例：詳細ページへの遷移）
        });
    });

    // コンポーネント破棄時にウォッチをクリア
    function onDestroy() {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }
        document.removeEventListener('accept-quest', () => {});
    }
</script>

<style>
    .map-container {
        width: 100vw;
        height: 100vh;
    }
    
    /* InfoWindowに適用されるスタイル（Google Maps APIがiframeを使用するため、外部から注入する必要がある） */
    :global(.quest-info) {
        padding: 10px;
        max-width: 250px;
        font-family: 'ヒラギノ角ゴ Pro W3', 'Hiragino Kaku Gothic Pro', 'メイリオ', Meiryo, 'ＭＳ Ｐゴシック', sans-serif;
    }
    
    :global(.quest-title) {
        margin: 0 0 8px 0;
        color: #FF9900;
        font-size: 16px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
    }
    
    :global(.quest-description) {
        margin: 0 0 8px 0;
        font-size: 14px;
        line-height: 1.4;
    }
    
    :global(.quest-distance) {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #666;
    }
    
    :global(.quest-accept-btn) {
        background-color: #FF9900;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.2s;
        display: block;
        width: 100%;
    }
    
    :global(.quest-accept-btn:hover) {
        background-color: #E68A00;
    }
</style>

<div bind:this={mapElement} class="map-container"></div>