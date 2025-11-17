/**
 * 백엔드에서 제공하는 장소 데이터 DTO
 */
export interface PlaceDto {
  id: string;
  category: CategoryCode; // 카테고리 코드(예)
  title: string;
  address: string;
  summary?: string; // 요약 설명
  image_url?: string;
  longitude: number;
  latitude: number;
}

/**
 * 카테고리 코드와 이름 매핑
 */
export const CATEGORY_INFO = {
  '인문(문화/예술/역사)': { name: '문화/역사', color: '#FFEAA7' }, // 선명한 노란색 (Amber)
  '레포츠': { name: '레포츠', color: '#673AB7' }, // 선명한 보라색 (Deep Purple)
  '추천코스': { name: '추천코스', color: '#E91E63' }, // 선명한 핑크색 (Pink)
  '자연': { name: '자연', color: '#4CAF50' }, // 선명한 녹색 (Green)
  '숙박': { name: '숙박', color: '#74B9FF' },
  '음식': { name: '음식', color: '#FF9800' }, // 주황색 (Orange)
  '기타': { name: '기타', color: '#9E9E9E' }, // 회색 (Grey)
} as const;

// 카테고리 : 레포츠, 추천코스, 인문(문화/예술/역사), 자연, 숙박, 음식점

export type CategoryCode = keyof typeof CATEGORY_INFO;

/**
 * 지도 영역 정보 (bounding box)
 */
export interface MapBounds {
  swLat: number; // 남서쪽 위도
  swLng: number; // 남서쪽 경도
  neLat: number; // 북동쪽 위도
  neLng: number; // 북동쪽 경도
}
