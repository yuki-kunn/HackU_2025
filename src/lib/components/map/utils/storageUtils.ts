// ローカルストレージ関連のユーティリティ関数

// ローカルストレージキー
export const VISITED_LANDMARKS_KEY = 'visited_landmarks';

// 保存するランドマーク情報の型定義
export type StoredLandmark = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  genre_code?: string;
  color?: string;
};

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
 * 訪問済みランドマーク詳細情報をローカルストレージから読み込み
 */
export const loadVisitedLandmarkDetails = (): StoredLandmark[] => {
  const stored = localStorage.getItem(VISITED_LANDMARKS_KEY + '_details');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      console.log(`Loaded ${parsed.length} detailed landmarks from local storage`);
      return parsed;
    } catch (e) {
      console.error('Failed to parse landmark details from localStorage:', e);
    }
  }
  return [];
};

/**
 * 訪問済みランドマークをローカルストレージに保存
 */
export const saveVisitedLandmarks = (visitedLandmarks: Set<string>): void => {
  localStorage.setItem(VISITED_LANDMARKS_KEY, JSON.stringify([...visitedLandmarks]));
};

/**
 * 訪問済みランドマーク詳細情報をローカルストレージに保存
 */
export const saveVisitedLandmarkDetails = (landmarks: StoredLandmark[]): void => {
  localStorage.setItem(VISITED_LANDMARKS_KEY + '_details', JSON.stringify(landmarks));
};

/**
 * 新しいランドマークを訪問済みとして追加（詳細情報も含む）
 */
export const addVisitedLandmarkWithDetails = (landmark: StoredLandmark): StoredLandmark[] => {
  // IDセットにも追加
  const visitedLandmarks = loadVisitedLandmarks();
  visitedLandmarks.add(landmark.id);
  saveVisitedLandmarks(visitedLandmarks);
  
  // 詳細情報を追加
  const details = loadVisitedLandmarkDetails();
  // 既存のランドマークは更新、新規は追加
  const existingIndex = details.findIndex(l => l.id === landmark.id);
  if (existingIndex >= 0) {
    details[existingIndex] = landmark;
  } else {
    details.push(landmark);
  }
  
  saveVisitedLandmarkDetails(details);
  return details;
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
