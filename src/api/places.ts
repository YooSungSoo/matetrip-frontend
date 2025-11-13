import client from './client';
import axios from 'axios';
import type { PlaceDto, MapBounds } from '../types/place';

// Mock 데이터 사용 여부 (백엔드 준비 전까지 true로 설정)

/**
 * 지도 영역 내의 장소 데이터를 가져옵니다
 * @param bounds - 지도 영역 정보 (bounding box)
 * @returns 장소 데이터 배열
 */
export async function fetchPlacesInBounds(
  bounds: MapBounds
): Promise<PlaceDto[]> {
  try {
    const requestParams = {
      southWestLatitude: bounds.swLat,
      southWestLongitude: bounds.swLng,
      northEastLatitude: bounds.neLat,
      northEastLongitude: bounds.neLng,
    };
    // API 호출 전에 파라미터를 로깅하여 실패 시에도 값을 확인할 수 있도록 합니다.
    console.log('[API] Requesting /places with params:', requestParams);

    const response = await client.get<PlaceDto[]>('/places', {
      params: requestParams,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching places:', error);
    // 에러 응답에 포함된 상세 내용을 확인하면 디버깅에 큰 도움이 됩니다.
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        'Backend validation error:',
        error.response.data,
        error.response.status
      );
    }
    throw error;
  }
}
