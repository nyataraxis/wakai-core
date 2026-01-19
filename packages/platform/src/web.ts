import type { AdsAdapter, AdsResult, AnalyticsAdapter, IapAdapter, PurchaseResult } from './types'

const DEFAULT_TRANSACTION_ID = 'web-transaction'

export const webAdsAdapter = (): AdsAdapter => {
  return {
    showRewardedAd: async (): Promise<AdsResult> => {
      return { rewarded: true }
    }
  }
}

export const webIapAdapter = (): IapAdapter => {
  return {
    purchase: async (): Promise<PurchaseResult> => {
      return { success: true, transactionId: DEFAULT_TRANSACTION_ID }
    }
  }
}

export const webAnalyticsAdapter = (): AnalyticsAdapter => {
  return {
    track: async (): Promise<void> => {}
  }
}
