<script lang="ts">
  import { createCirclePoints } from './utils/mapUtils';
  
  // Props
  export let map: google.maps.Map;
  export let showCrimeAreas = true;
  
  // 内部状態
  let crimePolygons: google.maps.Polygon[] = [];
  
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
  
  /**
   * 犯罪エリアポリゴンを作成する関数
   */
  export function createCrimeAreaPolygons() {
    clearCrimePolygons();
    
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
  
  /**
   * 犯罪エリアの表示/非表示を切り替える関数
   */
  export function toggleCrimeAreas() {
    crimePolygons.forEach(polygon => {
      polygon.setMap(showCrimeAreas ? map : null);
    });
  }
  
  /**
   * 犯罪エリアポリゴンをクリア
   */
  function clearCrimePolygons() {
    crimePolygons.forEach(polygon => polygon.setMap(null));
    crimePolygons = [];
  }
  
  // map プロパティが変更されたときに再作成
  $: if (map) {
    createCrimeAreaPolygons();
  }
  
  // showCrimeAreas プロパティが変更されたときに表示を切り替え
  $: {
    if (crimePolygons.length > 0) {
      toggleCrimeAreas();
    }
  }
</script>
