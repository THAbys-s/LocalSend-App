import { create } from 'zustand';
import { DeviceInfo } from '../../shared/device.types';

type State = {
  devices: DeviceInfo[];
  setDevices: (devices: DeviceInfo[]) => void;
};

export const useDevicesStore = create<State>((set) => ({
  devices: [],
  setDevices: (devices) => set({ devices }),
}));
