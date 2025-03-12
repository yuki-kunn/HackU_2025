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
    
    // 犯罪エリア表示のための変数
    let crimePolygons: google.maps.Polygon[] = [];
    let showCrimeAreas = true; // デフォルトで表示
    
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

    // 犯罪エリアのデータ (地区名と中心座標)
    interface CrimeArea {
        name: string;
        center: google.maps.LatLngLiteral;
        radius?: number; // メートル単位で半径を指定（カスタムポリゴンの場合は不要）
        customPolygon?: google.maps.LatLngLiteral[]; // カスタムポリゴンの頂点座標
    }

    // 玉造2丁目のポリゴン座標（実際の町丁目の形状に近い多角形）
    const tamazukuri2ChomePolygon = [
        {lat: 34.6758, lng: 135.5296}, // 北西
        {lat: 34.6762, lng: 135.5318}, // 北東
        {lat: 34.6758, lng: 135.5330}, // 東
        {lat: 34.6744, lng: 135.5336}, // 南東
        {lat: 34.6734, lng: 135.5325}, // 南
        {lat: 34.6728, lng: 135.5306}, // 南西
        {lat: 34.6736, lng: 135.5289}, // 西
        {lat: 34.6748, lng: 135.5287}  // 北西に戻る
    ];

    // 指定されたエリア情報
    const crimeAreas: CrimeArea[] = [
        // 大阪市西区
        { name: "大阪市西区 南堀江１丁目", center: {lat: 34.6724, lng: 135.4939}, radius: 200 },
        
        // 大阪市中央区 - 玉造２丁目はカスタムポリゴンを使用
        { name: "大阪市中央区 玉造２丁目", center: {lat: 34.6743, lng: 135.5306}, customPolygon: tamazukuri2ChomePolygon },
        
        // 他のエリアは以前と同じ
        { name: "大阪市中央区 久太郎町１丁目", center: {lat: 34.6819, lng: 135.5079}, radius: 200 },
        { name: "大阪市中央区 常盤町１丁目", center: {lat: 34.6779, lng: 135.5055}, radius: 200 },
        { name: "大阪市中央区 瓦町３丁目", center: {lat: 34.6852, lng: 135.5062}, radius: 200 },
        { name: "大阪市中央区 南本町３丁目", center: {lat: 34.6822, lng: 135.5022}, radius: 200 },
        { name: "大阪市中央区 南本町１丁目", center: {lat: 34.6815, lng: 135.5049}, radius: 200 },
        { name: "大阪市中央区 難波３丁目", center: {lat: 34.6669, lng: 135.5025}, radius: 200 },
        { name: "大阪市中央区 難波４丁目", center: {lat: 34.6661, lng: 135.5007}, radius: 200 },
        { name: "大阪市中央区 難波４丁目", center: {lat: 34.6661, lng: 135.5007}, radius: 200 },
        { name: "大阪市中央区 道頓堀１丁目", center: {lat: 34.6682, lng: 135.5014}, radius: 200 },
        { name: "大阪市中央区 上汐２丁目", center: {lat: 34.6673, lng: 135.5133}, radius: 200 },
        { name: "大阪市中央区 島之内２丁目", center: {lat: 34.6713, lng: 135.5057}, radius: 200 },
        { name: "大阪市中央区 西心斎橋２丁目", center: {lat: 34.6712, lng: 135.4997}, radius: 200 },
        { name: "大阪市中央区 南船場２丁目", center: {lat: 34.6751, lng: 135.5015}, radius: 200 },
        { name: "大阪市中央区 南船場４丁目", center: {lat: 34.6730, lng: 135.5006}, radius: 200 },
        { name: "大阪市中央区 千日前１丁目", center: {lat: 34.6651, lng: 135.5050}, radius: 200 },
        { name: "大阪市中央区 宗右衛門町", center: {lat: 34.6693, lng: 135.5016}, radius: 200 },
        { name: "大阪市中央区 島之内１丁目", center: {lat: 34.6718, lng: 135.5039}, radius: 200 },
        { name: "大阪市中央区 島之内１丁目", center: {lat: 34.6718, lng: 135.5039}, radius: 200 },
        { name: "大阪市中央区 島之内２丁目", center: {lat: 34.6713, lng: 135.5057}, radius: 200 },
        { name: "大阪市中央区 島之内２丁目", center: {lat: 34.6713, lng: 135.5057}, radius: 200 },
        { name: "大阪市中央区 南船場１丁目", center: {lat: 34.6773, lng: 135.5020}, radius: 200 },
        { name: "大阪市中央区 瓦屋町３丁目", center: {lat: 34.6847, lng: 135.5147}, radius: 200 },
        { name: "大阪市中央区 日本橋２丁目", center: {lat: 34.6651, lng: 135.5065}, radius: 200 },
        { name: "大阪市中央区 高津１丁目", center: {lat: 34.6700, lng: 135.5183}, radius: 200 },
        
        // 大阪市福島区
        { name: "大阪市福島区 福島６丁目", center: {lat: 34.6952, lng: 135.4855}, radius: 200 },
        
        // 大阪市城東区
        { name: "大阪市城東区 今福西２丁目", center: {lat: 34.7040, lng: 135.5454}, radius: 200 },
        { name: "大阪市城東区 中央３丁目", center: {lat: 34.7099, lng: 135.5437}, radius: 200 },
        { name: "大阪市城東区 鴫野東３丁目", center: {lat: 34.7040, lng: 135.5502}, radius: 200 },
        
        // 大阪市都島区
        { name: "大阪市都島区 都島本通５丁目", center: {lat: 34.7042, lng: 135.5329}, radius: 200 },
        { name: "大阪市都島区 都島南通２丁目", center: {lat: 34.6995, lng: 135.5329}, radius: 200 },
        { name: "大阪市都島区 内代町１丁目", center: {lat: 34.7100, lng: 135.5345}, radius: 200 },
        
        // 八尾市
        { name: "八尾市 南本町１丁目", center: {lat: 34.6289, lng: 135.6009}, radius: 200 },
        
        // 大阪市港区
        { name: "大阪市港区 磯路２丁目", center: {lat: 34.6602, lng: 135.4463}, radius: 200 },
        
        // 大阪市北区
        { name: "大阪市北区 兎我野町", center: {lat: 34.7037, lng: 135.5080}, radius: 200 },
        { name: "大阪市北区 堂山町", center: {lat: 34.7057, lng: 135.5010}, radius: 200 },
        { name: "大阪市北区 同心２丁目", center: {lat: 34.7047, lng: 135.5193}, radius: 200 },
        { name: "大阪市北区 曾根崎新地１丁目", center: {lat: 34.6978, lng: 135.4958}, radius: 200 },
        { name: "大阪市北区 曾根崎新地１丁目", center: {lat: 34.6978, lng: 135.4958}, radius: 200 },
        { name: "大阪市北区 天満２丁目", center: {lat: 34.6958, lng: 135.5114}, radius: 200 },
        { name: "大阪市北区 天満２丁目", center: {lat: 34.6958, lng: 135.5114}, radius: 200 },
        
        // 大阪市大正区
        { name: "大阪市大正区 三軒家西３丁目", center: {lat: 34.6497, lng: 135.4726}, radius: 200 },
        { name: "大阪市大正区 三軒家東１丁目", center: {lat: 34.6506, lng: 135.4757}, radius: 200 },
        
        // 大阪市天王寺区
        { name: "大阪市天王寺区 細工谷２丁目", center: {lat: 34.6546, lng: 135.5126}, radius: 200 },
        
        // 大阪市浪速区
        { name: "大阪市浪速区 難波中１丁目", center: {lat: 34.6657, lng: 135.5018}, radius: 200 },
        { name: "大阪市浪速区 日本橋西１丁目", center: {lat: 34.6635, lng: 135.5039}, radius: 200 },
        { name: "大阪市浪速区 元町２丁目", center: {lat: 34.6572, lng: 135.4989}, radius: 200 },
        { name: "大阪市浪速区 敷津西２丁目", center: {lat: 34.6553, lng: 135.4959}, radius: 200 },
        { name: "大阪市浪速区 恵美須西２丁目", center: {lat: 34.6529, lng: 135.5003}, radius: 200 },
        { name: "大阪市浪速区 恵美須西３丁目", center: {lat: 34.6514, lng: 135.4997}, radius: 200 },
        { name: "大阪市浪速区 恵美須東２丁目", center: {lat: 34.6528, lng: 135.5030}, radius: 200 },
        { name: "大阪市浪速区 元町１丁目", center: {lat: 34.6559, lng: 135.5002}, radius: 200 },
        
        // 大阪市淀川区
        { name: "大阪市淀川区 十三東１丁目", center: {lat: 34.7211, lng: 135.4854}, radius: 200 },
        { name: "大阪市淀川区 十三東１丁目", center: {lat: 34.7211, lng: 135.4854}, radius: 200 },
        { name: "大阪市淀川区 十三東２丁目", center: {lat: 34.7220, lng: 135.4874}, radius: 200 },
        { name: "大阪市淀川区 新北野３丁目", center: {lat: 34.7174, lng: 135.4918}, radius: 200 },
        { name: "大阪市淀川区 東三国５丁目", center: {lat: 34.7309, lng: 135.4939}, radius: 200 },
        { name: "大阪市淀川区 新高２丁目", center: {lat: 34.7332, lng: 135.4754}, radius: 200 },
        
        // 大阪市東淀川区
        { name: "大阪市東淀川区 上新庄２丁目", center: {lat: 34.7456, lng: 135.5331}, radius: 200 },
        
        // 大阪市東成区
        { name: "大阪市東成区 大今里３丁目", center: {lat: 34.6713, lng: 135.5392}, radius: 200 },
        
        // 大阪市生野区
        { name: "大阪市生野区 桃谷５丁目", center: {lat: 34.6593, lng: 135.5348}, radius: 200 },
        
        // 大阪市阿倍野区
        { name: "大阪市阿倍野区 播磨町２丁目", center: {lat: 34.6407, lng: 135.5171}, radius: 200 },
        
        // 大阪市住吉区
        { name: "大阪市住吉区 住吉２丁目", center: {lat: 34.6117, lng: 135.5006}, radius: 200 },
        
        // 大阪市西成区
        { name: "大阪市西成区 天神ノ森１丁目", center: {lat: 34.6421, lng: 135.4913}, radius: 200 },
        { name: "大阪市西成区 天神ノ森２丁目", center: {lat: 34.6421, lng: 135.4933}, radius: 200 },
        { name: "大阪市西成区 萩之茶屋１丁目", center: {lat: 34.6488, lng: 135.4980}, radius: 200 },
        { name: "大阪市西成区 萩之茶屋２丁目", center: {lat: 34.6478, lng: 135.4990}, radius: 200 },
        { name: "大阪市西成区 萩之茶屋２丁目", center: {lat: 34.6478, lng: 135.4990}, radius: 200 },
        { name: "大阪市西成区 花園北２丁目", center: {lat: 34.6532, lng: 135.4949}, radius: 200 },
        { name: "大阪市西成区 太子２丁目", center: {lat: 34.6502, lng: 135.4962}, radius: 200 },
        
        // 大阪市住之江区
        { name: "大阪市住之江区 中加賀屋３丁目", center: {lat: 34.6149, lng: 135.4792}, radius: 200 },
        { name: "大阪市住之江区 東加賀屋２丁目", center: {lat: 34.6156, lng: 135.4857}, radius: 200 },
        { name: "大阪市住之江区 泉１丁目", center: {lat: 34.6217, lng: 135.4733}, radius: 200 },
        { name: "大阪市住之江区 新北島１丁目", center: {lat: 34.6160, lng: 135.4718}, radius: 200 },
        { name: "大阪市住之江区 粉浜西２丁目", center: {lat: 34.6065, lng: 135.4828}, radius: 200 },
        
        // 高槻市
        { name: "高槻市 上本町", center: {lat: 34.8486, lng: 135.6207}, radius: 200 },
        { name: "高槻市 京口町", center: {lat: 34.8508, lng: 135.6184}, radius: 200 },
        
        // 茨木市
        { name: "茨木市 沢良宜浜２丁目", center: {lat: 34.7845, lng: 135.5660}, radius: 200 },
        { name: "茨木市 玉櫛２丁目", center: {lat: 34.8139, lng: 135.5687}, radius: 200 },
        
        // 吹田市
        { name: "吹田市 江の木町", center: {lat: 34.7574, lng: 135.5174}, radius: 200 },
        
        // 堺市堺区
        { name: "堺市堺区 向陵中町６丁", center: {lat: 34.5800, lng: 135.4770}, radius: 200 },
        { name: "堺市堺区 三宝町２丁", center: {lat: 34.5687, lng: 135.4689}, radius: 200 },
        { name: "堺市堺区 宿院町西３丁", center: {lat: 34.5772, lng: 135.4733}, radius: 200 },
        { name: "堺市堺区 南花田口町１丁", center: {lat: 34.5761, lng: 135.4809}, radius: 200 },
        { name: "堺市堺区 翁橋町１丁", center: {lat: 34.5791, lng: 135.4798}, radius: 200 },
        { name: "堺市堺区 東雲西町１丁", center: {lat: 34.5812, lng: 135.4802}, radius: 200 },
        
        // 堺市西区
        { name: "堺市西区 浜寺諏訪森町西２丁", center: {lat: 34.5475, lng: 135.4599}, radius: 200 },
        { name: "堺市西区 鳳北町１丁", center: {lat: 34.5441, lng: 135.4636}, radius: 200 },
        { name: "堺市西区 鳳西町１丁", center: {lat: 34.5430, lng: 135.4618}, radius: 200 },
        
        // 堺市北区
        { name: "堺市北区 東浅香山町３丁", center: {lat: 34.5647, lng: 135.5090}, radius: 200 },
        { name: "堺市北区 長曽根町", center: {lat: 34.5550, lng: 135.5038}, radius: 200 },
        
    
        
        // 東大阪市
        { name: "東大阪市 中新開２丁目", center: {lat: 34.6786, lng: 135.6297}, radius: 200 },
        { name: "東大阪市 箕輪１丁目", center: {lat: 34.6804, lng: 135.6394}, radius: 200 },
        { name: "東大阪市 菱屋西３丁目", center: {lat: 34.6757, lng: 135.6016}, radius: 200 },
        { name: "東大阪市 鴻池本町", center: {lat: 34.6852, lng: 135.6228}, radius: 200 },
        { name: "東大阪市 川俣１丁目", center: {lat: 34.6913, lng: 135.6480}, radius: 200 },
        { name: "東大阪市 高井田", center: {lat: 34.6719, lng: 135.5844}, radius: 200 },
        { name: "東大阪市 長堂１丁目", center: {lat: 34.6686, lng: 135.6005}, radius: 200 },
        
        // 松原市
        { name: "松原市 天美南３丁目", center: {lat: 34.5868, lng: 135.5513}, radius: 200 },
        
        // 寝屋川市
        { name: "寝屋川市 上神田２丁目", center: {lat: 34.7668, lng: 135.6368}, radius: 200 },
        { name: "寝屋川市 萱島東２丁目", center: {lat: 34.7390, lng: 135.6243}, radius: 200 },
        { name: "寝屋川市 萱島東２丁目", center: {lat: 34.7390, lng: 135.6243}, radius: 200 },
        
        // 四條畷市
        { name: "四條畷市 楠公１丁目", center: {lat: 34.7396, lng: 135.6419}, radius: 200 },
        
        // 大東市
        { name: "大東市 深野北４丁目", center: {lat: 34.7109, lng: 135.6359}, radius: 200 },
        
        // 守口市
        { name: "守口市 梶町３丁目", center: {lat: 34.7140, lng: 135.5667}, radius: 200 },
        
        // 門真市
        { name: "門真市 北岸和田１丁目", center: {lat: 34.7247, lng: 135.5883}, radius: 200 },
        { name: "門真市 寿町", center: {lat: 34.7336, lng: 135.5869}, radius: 200 },
        { name: "門真市 新橋町", center: {lat: 34.7300, lng: 135.5795}, radius: 200 },
        { name: "門真市 松葉町", center: {lat: 34.7250, lng: 135.5834}, radius: 200 },
        
        // 豊中市
        { name: "豊中市 大黒町３丁目", center: {lat: 34.7711, lng: 135.4684}, radius: 200 },
        
        // 摂津市
        { name: "摂津市 三島３丁目", center: {lat: 34.7757, lng: 135.5640}, radius: 200 }
    ];

    onMount(async () => {
        const loader = new Loader({ 
            apiKey, 
            version: 'weekly',
            libraries: ['maps', 'geometry']
        });
        
        const { Map } = await loader.importLibrary('maps');
        const { Marker } = await loader.importLibrary('marker');
        const { Circle } = await loader.importLibrary('maps');
        const { Polygon } = await loader.importLibrary('maps');
        const { InfoWindow } = await loader.importLibrary('maps');

        // UIコントロールを非表示にした地図を作成
        map = new Map(mapElement, {
            center: { lat: 34.6937, lng: 135.5023 }, // デフォルトの中心位置（大阪）
            zoom: 14,
            disableDefaultUI: true, // すべてのUIコントロールを非表示
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        // 犯罪エリアポリゴンを作成
        createCrimeAreaPolygons(Polygon);

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

    // 犯罪エリアポリゴンを作成する関数
    function createCrimeAreaPolygons(Polygon: any) {
        crimePolygons = crimeAreas.map(area => {
            // ポリゴンのパスを決定（カスタムポリゴンか円形か）
            const paths = area.customPolygon || createCirclePoints(area.center, area.radius || 200);
            
            // ポリゴンを作成
            const polygon = new Polygon({
                paths: paths,
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                map: showCrimeAreas ? map : null // 表示状態に基づいて設定
            });

            // クリックでエリア情報を表示
            polygon.addListener('click', () => {
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div><strong>${area.name}</strong><br>犯罪多発エリア</div>`,
                    position: area.center
                });
                infoWindow.open(map);
            });
            
            return polygon;
        });
    }

    // 円を近似する多角形ポントを生成する関数
    function createCirclePoints(center: google.maps.LatLngLiteral, radius: number, numPoints: number = 24): google.maps.LatLngLiteral[] {
        const points: google.maps.LatLngLiteral[] = [];
        const angularDistance = radius / 111300; // 角度換算（概算）
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI;
            const latOffset = Math.sin(angle) * angularDistance;
            const lngOffset = Math.cos(angle) * angularDistance / Math.cos(center.lat * Math.PI / 180);
            
            points.push({
                lat: center.lat + latOffset,
                lng: center.lng + lngOffset
            });
        }
        
        return points;
    }

    // 犯罪エリアの表示/非表示を切り替える関数
    function toggleCrimeAreas() {
        showCrimeAreas = !showCrimeAreas;
        
        crimePolygons.forEach(polygon => {
            polygon.setMap(showCrimeAreas ? map : null);
        });
    }

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
        position: relative;
    }
    
    /* トグルボタンのスタイル */
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
        font-family: 'ヒラギノ角ゴ Pro W3', 'Hiragino Kaku Gothic Pro', 'メイリオ', Meiryo, sans-serif;
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

<div class="map-container">
    <div bind:this={mapElement} style="width: 100%; height: 100%;"></div>
    
    <!-- 犯罪エリア表示切り替えボタン -->
    <button class="toggle-button" class:active={showCrimeAreas} on:click={toggleCrimeAreas}>
        <div class="toggle-icon"></div>
        犯罪多発エリア {showCrimeAreas ? 'ON' : 'OFF'}
    </button>
</div>