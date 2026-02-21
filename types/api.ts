export type RouteContext<T extends Record<string, string>> = {
  params: Promise<T>;
};

export type AlbumType = 'PRIVATE' | 'SHARED';

export type DayOverDayChange = {
  value: number;
  percentage: number;
};

export type GroupItem = {
  groupId: number;
  groupName: string;
};
