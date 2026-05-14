export type SettingValueType =
  | 'integer'
  | 'number'
  | 'string'
  | 'boolean'
  | 'duration_hours';

export type SettingValue = number | string | boolean;

export interface PlatformSetting {
  _id: string;
  key: string;
  group: string;
  label: string;
  description: string;
  valueType: SettingValueType;
  value: SettingValue;
  min: number | null;
  max: number | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
