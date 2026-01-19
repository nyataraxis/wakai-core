export interface AdsResult {
  rewarded: boolean
}

export interface PurchaseResult {
  success: boolean
  transactionId: string
}

export interface AdsAdapter {
  showRewardedAd: () => Promise<AdsResult>
}

export interface IapAdapter {
  purchase: (itemId: string) => Promise<PurchaseResult>
}

export interface AnalyticsAdapter {
  track: (eventName: string, payload: Record<string, string>) => Promise<void>
}
