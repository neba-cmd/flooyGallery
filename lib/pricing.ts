export const PHOTO_BUNDLE_SIZE = 5
export const PHOTO_BUNDLE_PRICE = 1900
export const TEAM_PACKAGE_PRICE = 7500

export type PhotoPricing = {
  count: number
  originalTotal: number
  bundleCount: number
  discount: number
  total: number
}

/**
 * Applies the €19 bundle to each complete group of five photos when doing so
 * lowers the price. Highest-priced photos are bundled first.
 */
export function calculatePhotoPricing(prices: number[]): PhotoPricing {
  const validPrices = prices.map((price) => Number(price) || 0)
  const originalTotal = validPrices.reduce((sum, price) => sum + price, 0)
  const sorted = [...validPrices].sort((a, b) => b - a)
  let discount = 0
  let bundleCount = 0

  for (let index = 0; index + PHOTO_BUNDLE_SIZE <= sorted.length; index += PHOTO_BUNDLE_SIZE) {
    const groupTotal = sorted
      .slice(index, index + PHOTO_BUNDLE_SIZE)
      .reduce((sum, price) => sum + price, 0)
    const groupDiscount = Math.max(0, groupTotal - PHOTO_BUNDLE_PRICE)
    if (groupDiscount > 0) {
      discount += groupDiscount
      bundleCount += 1
    }
  }

  return {
    count: validPrices.length,
    originalTotal,
    bundleCount,
    discount,
    total: originalTotal - discount,
  }
}
