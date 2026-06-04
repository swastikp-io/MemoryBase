export type SystemVolumeDecreaseIntent = {
  action: "system_volume_decrease";
  percentage: number;
};

export type SystemVolumeIncreaseIntent = {
  action: "system_volume_increase";
  percentage: number;
};

export type SystemVolumeGetIntent = {
  action: "system_volume_get";
};

export type SystemVolumeSetIntent = {
  action: "system_volume_set";
  volume: number;
};

export type SystemIntent = 
  | SystemVolumeDecreaseIntent 
  | SystemVolumeIncreaseIntent
  | SystemVolumeGetIntent
  | SystemVolumeSetIntent;

export type SystemExecutionResult = {
  success: boolean;
  message?: string;
  newVolume?: number;
};
