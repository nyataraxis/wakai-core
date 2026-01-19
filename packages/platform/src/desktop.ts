import type { AdsAdapter, AdsResult, AnalyticsAdapter, IapAdapter, PurchaseResult } from './types'

const DEFAULT_TRANSACTION_ID = 'desktop-transaction'

export const desktopAdsAdapter = (): AdsAdapter => {
  return {
    showRewardedAd: async (): Promise<AdsResult> => {
      return { rewarded: true }
    }
  }
}

export const desktopIapAdapter = (): IapAdapter => {
  return {
    purchase: async (): Promise<PurchaseResult> => {
      return { success: true, transactionId: DEFAULT_TRANSACTION_ID }
    }
  }
}

export const desktopAnalyticsAdapter = (): AnalyticsAdapter => {
  return {
    track: async (): Promise<void> => {}
  }
}
