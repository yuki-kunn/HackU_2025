// ローカルストレージ関連のユーティリティ関数

// ローカルストレージキー
export const VISITED_LANDMARKS_KEY = 'visited_landmarks';

/**
 * 訪問済みランドマークをローカルストレージから読み込み
 */
export const loadVisitedLandmarks = (): Set<string> => {
  const stored = localStorage.getItem(VISITED_LANDMARKS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const result = new Set(parsed);
      console.log(`Loaded ${result.size} visited landmarks from local storage`);
      return result;
    } catch (e) {
      console.error('Failed to parse visited landmarks from localStorage:', e);
    }
  }
  return new Set();
};

/**
 * 訪問済みランドマークをローカルストレージに保存
 */
export const saveVisitedLandmarks = (visitedLandmarks: Set<string>): void => {
  localStorage.setItem(VISITED_LANDMARKS_KEY, JSON.stringify([...visitedLandmarks]));
};

/**
 * 新しいランドマークを訪問済みとして追加
 */
export const addVisitedLandmark = (landmarkId: string): Set<string> => {
  const visitedLandmarks = loadVisitedLandmarks();
  visitedLandmarks.add(landmarkId);
  saveVisitedLandmarks(visitedLandmarks);
  return visitedLandmarks;
};
