export type Weather = { history: number[]; lastDelta: number | null; warned: boolean }

declare module 'claude-code' {
  interface PluginState {
    'token-weather': { weather: Weather }
  }
}
