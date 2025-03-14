// 地図関連のユーティリティ関数

/**
 * 円を近似する多角形ポイントを生成する関数
 */
export const createCirclePoints = (
  center: google.maps.LatLngLiteral, 
  radius: number, 
  numPoints: number = 24
): google.maps.LatLngLiteral[] => {
  return Array.from({ length: numPoints }, (_, i) => {
    const angle = (i / numPoints) * 2 * Math.PI;
    const d = radius / 111300;
    return {
      lat: center.lat + Math.sin(angle) * d,
      lng: center.lng + Math.cos(angle) * d / Math.cos(center.lat * Math.PI / 180)
    };
  });
};

/**
 * 2点間の距離を計算（メートル）
 */
export const calculateDistance = (
  point1: google.maps.LatLngLiteral, 
  point2: google.maps.LatLngLiteral
): number => {
  return google.maps.geometry.spherical.computeDistanceBetween(
    new google.maps.LatLng(point1),
    new google.maps.LatLng(point2)
  );
};

/**
 * ユーザー位置と指定された位置の間の距離が指定した範囲内かを判定
 */
export const isWithinDistance = (
  userPosition: google.maps.LatLngLiteral,
  targetPosition: google.maps.LatLngLiteral, 
  maxDistance: number
): boolean => {
  return calculateDistance(userPosition, targetPosition) <= maxDistance;
};
