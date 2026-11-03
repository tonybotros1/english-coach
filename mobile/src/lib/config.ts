import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEV_SERVER_PORT = 3100;

/**
 * Where the app finds its server.
 * - Set EXPO_PUBLIC_API_URL (in mobile/.env) to your deployed Vercel URL for real use.
 * - In development, phones on the same Wi-Fi reach the server on your computer automatically:
 *   the computer's address is taken from the Expo dev server the phone is already connected to.
 */
function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (Platform.OS === 'web') return `http://localhost:${DEV_SERVER_PORT}`;
  const hostUri = Constants.expoConfig?.hostUri; // for example "192.168.1.20:8081"
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${DEV_SERVER_PORT}`;
  return Platform.OS === 'android' ? `http://10.0.2.2:${DEV_SERVER_PORT}` : `http://localhost:${DEV_SERVER_PORT}`;
}

export const API_URL = resolveApiUrl();
