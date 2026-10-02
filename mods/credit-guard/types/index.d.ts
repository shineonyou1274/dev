export type Count = number

declare module 'claude-code' {
  interface PluginState {
    'credit-guard': { trusted: boolean; approved: Count; cancelled: Count }
  }
}
