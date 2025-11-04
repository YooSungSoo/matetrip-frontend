import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// 1. axios의 기본 설정을 만듬
const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 다른 도메인에 쿠키를 전송하기 위한 설정 (CORS 환경에서 필수)
});

// 2. HttpOnly 쿠키를 사용하므로, 요청 인터셉터에서 헤더에 토큰을 직접 추가할 필요가 없습니다.
// 브라우저가 자동으로 쿠키를 요청에 포함시켜 줍니다.
// client.interceptors.request.use((config) => {
//   // 토큰 추가 로직
//
//   return config;
// });

export default client;
