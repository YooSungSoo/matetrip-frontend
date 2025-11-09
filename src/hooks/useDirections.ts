import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import type { Poi } from './usePoiSocket';
import { KAKAO_REST_API_KEY } from '../constants';

type Itinerary = Record<string, Poi[]>;
type LatLng = { lat: number; lng: number }; // 위도(latitude)와 경도(longitude)를 가지는 좌표 객체 타입
type DailyRoutePaths = Record<string, LatLng[]>; // 날짜별로 계산된 경로(좌표 배열)를 저장하는 객체 타입

/**
 * [헬퍼 함수] 카카오모빌리티 길찾기 API를 호출하여 특정 날짜의 POI들 간의 경로를 계산한다.
 * @param dayId - 경로를 계산할 날짜의 ID (주로 디버깅 및 로깅에 사용한다).
 * @param pois - 해당 날짜의 POI(장소) 목록.
 * @param apiKey - API 호출에 사용할 카카오 REST API 키.
 * @returns {Promise<LatLng[] | undefined>} 계산된 경로 좌표(LatLng) 배열을 담은 Promise. 경로 계산이 불가능하거나 오류 발생 시 undefined를 반환한다.
 */
async function fetchRouteForDay(
  dayId: string,
  pois: Poi[],
  apiKey: string
): Promise<LatLng[] | undefined> {
  if (pois.length < 2) { // 경로를 그리려면 최소 출발지와 도착지, 즉 2개 이상의 POI가 필요하다.
    return undefined;
  }

  const origin = `${pois[0].longitude},${pois[0].latitude}`; // 출발지: 첫 번째 POI의 좌표 (경도,위도 형식)
  const destination = `${pois[pois.length - 1].longitude},${pois[pois.length - 1].latitude}`; // 도착지: 마지막 POI의 좌표 (경도,위도 형식)
  const waypoints =
    pois.length > 2
      ? pois
          .slice(1, -1)
          .map((p) => `${p.longitude},${p.latitude}`)
          .join('|')
      : undefined;

  try { // API 호출 중 발생할 수 있는 오류를 처리하기 위해 try-catch 블록을 사용한다.
    const response = await axios.get( // 카카오모빌리티 길찾기 API에 GET 요청을 보낸다.
      'https://apis-navi.kakaomobility.com/v1/directions',
      {
        headers: { Authorization: `KakaoAK ${apiKey}`, 'Content-Type': 'application/json' }, // 인증을 위한 API 키를 헤더에 포함한다.
        params: { origin, destination, waypoints }, // 출발지, 도착지, 경유지를 파라미터로 전달한다.
      }
    );

    const route = response.data.routes[0]; // API 응답에서 추천 경로 중 첫 번째 경로 정보를 가져온다.
    if (route) {
      const path: LatLng[] = []; // 경로 좌표를 저장할 빈 배열을 초기화한다.
      route.sections.forEach((section: any) => { // 경로는 여러 '구간(section)'으로 나뉘어 있다 (예: 출발지-경유지1, 경유지1-도착지).
        section.roads.forEach((road: any) => { // 각 구간은 다시 여러 '도로(road)' 정보로 구성된다.
          for (let i = 0; i < road.vertexes.length; i += 2) { // 도로 정보의 vertexes 배열에는 [경도1, 위도1, 경도2, 위도2, ...] 형태로 좌표가 들어있다. 2개씩 짝을 지어 (경도, 위도) 좌표를 추출한다.
            path.push({ lat: road.vertexes[i + 1], lng: road.vertexes[i] }); // 추출한 좌표를 {lat, lng} 객체 형태로 변환하여 path 배열에 추가한다.
          }
        });
      });
      return path; // 완성된 경로 좌표 배열을 반환한다.
    }
    return undefined; // API 응답에 경로 정보가 없으면 undefined를 반환한다.
  } catch (error) { // API 요청 실패 시 콘솔에 오류를 기록하고 undefined를 반환한다.
    console.error(`[${dayId}] 경로 계산 중 오류 발생:`, error);
    return undefined;
  }
}

/**
 * [헬퍼 함수] 특정 날짜의 POI 목록 변경 여부를 확인하고, 변경 시에만 경로를 다시 계산한다.
 * @param dayId - 처리할 날짜의 ID.
 * @param pois - 해당 날짜의 현재 POI 목록.
 * @param prevItinerary - 이전 렌더링 시점의 전체 일정 데이터 (비교용).
 * @param apiKey - API 호출에 사용할 카카오 REST API 키.
 * @returns {Promise<{ dayId: string; path: LatLng[] | null | 'UNCHANGED' }>} 날짜 ID와 처리 결과를 담은 Promise. 결과는 계산된 경로(LatLng[]), 변경 없음('UNCHANGED'), 또는 경로 없음/오류(null) 중 하나이다.
 */
async function processDayRoute(
  dayId: string,
  pois: Poi[],
  prevItinerary: Itinerary | undefined,
  apiKey: string
): Promise<{ dayId: string; path: LatLng[] | null | 'UNCHANGED' }> {
  const currentPoiIds = JSON.stringify(pois.map((p) => p.id)); // 현재 POI 목록의 ID 배열을 JSON 문자열로 변환한다. (간단한 비교를 위해)
  const previousPoiIds = JSON.stringify(prevItinerary?.[dayId]?.map((p) => p.id) || []); // 이전 POI 목록의 ID 배열을 JSON 문자열로 변환한다.

  if (currentPoiIds === previousPoiIds) {
    return { dayId, path: 'UNCHANGED' as const }; // 두 문자열이 같다면 POI 목록에 변경이 없다는 의미이다. 불필요한 API 호출을 막기 위해 'UNCHANGED' 마커를 반환한다.
  }

  console.log(`[${dayId}] 일정이 변경되어 경로를 다시 계산한다.`); // POI 목록에 변경이 있으면, 경로 계산 함수를 호출한다.
  const path = await fetchRouteForDay(dayId, pois, apiKey); // 계산된 경로(또는 오류 시 null)를 날짜 ID와 함께 반환한다.
  return { dayId, path: path || null };
}

/**
 * [헬퍼 함수] 모든 날짜의 경로 계산 결과를 바탕으로 다음 경로 상태(state)를 생성하는 순수 함수이다.
 * @param currentRoutePaths - 현재의 경로 상태 객체.
 * @param results - 각 날짜별 경로 계산 결과({dayId, path})의 배열.
 * @returns {DailyRoutePaths} 업데이트될 새로운 경로 상태 객체.
 */
function buildNextRoutePaths(
  currentRoutePaths: DailyRoutePaths,
  results: { dayId: string; path: LatLng[] | null | 'UNCHANGED' }[]
): DailyRoutePaths {
  const nextRoutePaths: DailyRoutePaths = {}; // 반환할 새로운 경로 상태 객체를 초기화한다.

  results.forEach(({ dayId, path }) => { // 모든 날짜의 계산 결과를 순회한다.
    if (path === 'UNCHANGED') { // 경로에 변경이 없는 경우,
      if (currentRoutePaths[dayId]) { // 현재 상태에 해당 날짜의 경로가 있다면 그대로 새로운 상태에 복사한다.
        nextRoutePaths[dayId] = currentRoutePaths[dayId];
      }
    } else if (path) { // 새로운 경로가 성공적으로 계산된 경우,
      nextRoutePaths[dayId] = path; // 새로운 상태에 해당 날짜의 새 경로를 추가한다.
    } // 경로가 null인 경우(오류 또는 POI 부족)는 아무 작업도 하지 않는다. 결과적으로 nextRoutePaths에 추가되지 않으므로, 해당 날짜의 경로가 제거되는 효과가 있다.
  });
  return nextRoutePaths; // 최종적으로 만들어진 새로운 경로 상태 객체를 반환한다.
}

/**
 * 전체 여행 일정(itinerary)이 변경될 때마다 카카오 API를 통해 날짜별 경로를 계산하는 커스텀 훅이다.
 * @param itinerary - 날짜별로 정리된 POI 배열을 담은 객체.
 * @returns {{ routePaths: DailyRoutePaths, isLoading: boolean }} 날짜별 경로 데이터와 로딩 상태를 포함하는 객체.
 */
export function useDirections(itinerary: Itinerary) {
  const [routePaths, setRoutePaths] = useState<DailyRoutePaths>({}); // 계산된 경로들을 저장하는 상태이다.
  const [isLoading, setIsLoading] = useState(false); // API 호출이 진행 중인지 여부를 나타내는 로딩 상태이다.
  const prevItineraryRef = useRef<Itinerary | undefined>(); // 이전 itinerary 상태를 저장하기 위한 ref이다. 리렌더링을 유발하지 않으면서 값을 유지한다.

  useEffect(() => {
    const fetchAllRoutes = async () => { // 비동기 로직을 처리하기 위한 async 함수를 useEffect 내부에 정의한다.
      if (!KAKAO_REST_API_KEY) { // API 키가 없으면 오류를 출력하고 함수를 종료한다.
        console.error('Kakao REST API Key가 설정되지 않았다.');
        return;
      }
      setIsLoading(true); // 경로 계산 시작을 알리기 위해 로딩 상태를 true로 설정한다.

      const prevItinerary = prevItineraryRef.current; // 이전 itinerary 값을 ref에서 가져온다.
      const dayRoutePromises = Object.keys(itinerary).map(async (dayId) => { // itinerary의 모든 날짜에 대해 경로 처리 Promise를 생성한다.
        const pois = itinerary[dayId]; // 각 날짜별로 POI 변경 여부를 확인하고 필요 시 경로를 계산하는 함수를 호출한다.
        return processDayRoute(dayId, pois, prevItinerary, KAKAO_REST_API_KEY);
      });

      const results = await Promise.all(dayRoutePromises); // Promise.all을 사용하여 모든 날짜의 경로 계산을 병렬로 실행하고 결과를 기다린다.

      // 모든 계산이 완료되면, 결과를 바탕으로 routePaths 상태를 업데이트한다.
      setRoutePaths((currentRoutePaths) => // 함수형 업데이트를 사용하여 항상 최신 상태(currentRoutePaths)를 기반으로 다음 상태를 계산한다.
        buildNextRoutePaths(currentRoutePaths, results)
      );

      setIsLoading(false); // 모든 작업이 끝났으므로 로딩 상태를 false로 설정한다.
      prevItineraryRef.current = itinerary; // 다음 렌더링에서 비교할 수 있도록 현재 itinerary를 ref에 저장한다.
    };

    fetchAllRoutes(); // useEffect가 실행될 때 정의한 비동기 함수를 호출한다.
  }, [itinerary, KAKAO_REST_API_KEY]); // 의존성 배열에 itinerary와 KAKAO_REST_API_KEY를 넣어, 이 값들이 변경될 때마다 effect가 다시 실행되도록 한다.

  return { routePaths, isLoading }; // 훅의 최종 결과물인 경로 데이터와 로딩 상태를 반환한다.
}
