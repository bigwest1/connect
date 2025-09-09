export type XYZ = [number, number, number];
export type Quaternion = [number, number, number, number];

export type Capability =
  | "onOff"
  | "brightness"
  | "color"
  | "tempSetpoint"
  | "openClose"
  | "sprinkle"
  | "panTilt"
  | "playPause";

export type DeviceType =
  | "light"
  | "outlet"
  | "switch"
  | "dimmer"
  | "blind"
  | "thermostat"
  | "lock"
  | "keypad"
  | "garageDoor"
  | "doorbell"
  | "camera"
  | "motionSensor"
  | "contactSensor"
  | "sprinkler"
  | "mower"
  | "speaker"
  | "relay";

export type DeviceSchema = {
  id: string;
  name: string;
  type: DeviceType;
  roomId?: string;
  position3D?: XYZ;
  orientation?: Quaternion;
  groupIds?: string[];
  capabilities: Capability[];
  state: Record<string, any> & { on?: boolean; brightness?: number };
  scenes?: string[];
};

