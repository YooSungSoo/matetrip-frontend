export interface WorkspaceResDto {
  id: string;
  workspaceName: string;
}

export interface PlanDayDto {
  dayNo: number;
  id: string;
  planDate: string;
}

export interface CreateWorkspaceResponse {
  planDayDtos: PlanDayDto[];
  workspaceResDto: WorkspaceResDto;
}
