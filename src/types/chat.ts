export interface ToolCallData {
  tool_name: string;
  tool_output: any; // 실제 데이터 (지도 좌표 등)
  frontend_actions: string[]; // ["UPDATE_MAP", "SHOW_TOAST"]
}

export interface AIChatResponse {
  response: string; // AI의 텍스트 답변
  tool_data: ToolCallData[]; // 도구 실행 결과 리스트
}
