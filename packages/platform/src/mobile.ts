import type { AdsAdapter, AdsResult, AnalyticsAdapter, IapAdapter, PurchaseResult } from './types'

const DEFAULT_TRANSACTION_ID = 'mobile-transaction'

export const mobileAdsAdapter = (): AdsAdapter => {
  return {
    showRewardedAd: async (): Promise<AdsResult> => {
      return { rewarded: true }
    }
  }
}

export const mobileIapAdapter = (): IapAdapter => {
  return {
    purchase: async (): Promise<PurchaseResult> => {
      return { success: true, transactionId: DEFAULT_TRANSACTION_ID }
    }
  }
}

export const mobileAnalyticsAdapter = (): AnalyticsAdapter => {
  return {
    track: async (): Promise<void> => {}
  }
}
