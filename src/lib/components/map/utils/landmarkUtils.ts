// ランドマーク関連のユーティリティ関数

export interface Landmark {
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

/**
 * ランドマーク識別子の生成
 */
export const getLandmarkId = (landmark: Landmark): string => {
  // IDがある場合はそれを使う、なければ座標から生成
  if (landmark.id) return landmark.id;
  return `${landmark.latitude.toFixed(6)},${landmark.longitude.toFixed(6)}`;
};

/**
 * ジャンルコードから色を取得
 */
export const getLandmarkColor = (genreCode: string | undefined): string => {
  if (!genreCode) return '#FF9900'; // デフォルト色
  
  // ジャンルコードによる色分け
  if (genreCode.startsWith('01')) return '#FF6347'; // 店舗・施設 - 赤系
  if (genreCode.startsWith('02')) return '#4682B4'; // 交通・宿泊 - 青系
  if (genreCode.startsWith('03')) return '#2E8B57'; // 観光・文化・スポーツ - 緑系
  if (genreCode.startsWith('04')) return '#9370DB'; // イベント・レジャー - 紫系
  
  return '#FF9900'; // デフォルト色
};

/**
 * ランドマークの情報ウィンドウ用HTMLを生成
 */
export const createLandmarkInfoContent = (landmark: Landmark, isVisited: boolean): string => {
  return `
    <div>
      <h3>${landmark.name || 'Unknown landmark'}</h3>
      <p>${landmark.address || 'No address available'}</p>
      ${landmark.genre_name ? `<p>Genre: ${landmark.genre_name}</p>` : ''}
      ${landmark.tel ? `<p>Tel: ${landmark.tel}</p>` : ''}
      ${landmark.detail ? `<p>${landmark.detail}</p>` : ''}
      ${isVisited ? '<p><strong>✓ 訪問済み</strong></p>' : ''}
    </div>
  `;
};
