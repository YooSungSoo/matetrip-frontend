// 백엔드에서 받은 영문 키워드를 한글로 변환하기 위한 맵
// TODO: 추후 백엔드와 협의하여 정확한 값으로 변경해야 합니다.
const KEYWORD_MAP: { [key: string]: string } = {
  FOOD: '음식',
  ACCOMMODATION: '숙박',
  ACTIVITY: '액티비티',
  TRANSPORT: '교통',
  // MainPostCard.tsx 와 SearchResults.tsx 의 mock 데이터에 있는 키워드 추가
  힐링: '힐링',
  자연: '자연',
  맛집투어: '맛집투어',
};

export const translateKeyword = (keyword: string) =>
  KEYWORD_MAP[keyword.toUpperCase()] || keyword;
