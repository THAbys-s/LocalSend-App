// src/utils/deviceInfo.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADJECTIVES = [
  'Cheerful','Brave','Calm','Dazzling','Eager','Fierce','Gentle',
  'Happy','Jolly','Kind','Lively','Merry','Noble','Polite','Quick',
  'Radiant','Swift','Tender','Vivid','Witty',
];
const COLORS = [
  'Orange','Teal','Violet','Crimson','Cobalt','Emerald','Amber',
  'Indigo','Coral','Jade','Lilac','Magenta','Onyx','Pearl','Ruby',
  'Sapphire','Topaz','Umber','Walnut','Zircon',
];

function generateAlias(): string {
  const adj   = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const plat  = Platform.OS === 'ios' ? 'iPhone' : 'Android';
  return `${adj} ${color} ${plat}`;
}

function generateId(): string {
  return `mobile-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

// In-memory cache (survives within session)
let _id: string | null    = null;
let _alias: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (_id) return _id;
  try {
    const stored = await AsyncStorage.getItem('ls_device_id');
    if (stored) { _id = stored; return _id; }
  } catch (_) {}
  // Use Expo installationId if available
  const expoId = Constants.easConfig?.projectId ?? null;
  _id = expoId ? `expo-${expoId.slice(0,8)}` : generateId();
  try { await AsyncStorage.setItem('ls_device_id', _id); } catch (_) {}
  return _id;
}

export async function getDeviceAlias(): Promise<string> {
  if (_alias) return _alias;
  try {
    const stored = await AsyncStorage.getItem('ls_device_alias');
    if (stored) { _alias = stored; return _alias; }
  } catch (_) {}
  _alias = generateAlias();
  try { await AsyncStorage.setItem('ls_device_alias', _alias); } catch (_) {}
  return _alias;
}

export async function setDeviceAlias(alias: string): Promise<void> {
  _alias = alias;
  try { await AsyncStorage.setItem('ls_device_alias', alias); } catch (_) {}
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatSpeed(bps: number): string {
  return formatBytes(bps) + '/s';
}
