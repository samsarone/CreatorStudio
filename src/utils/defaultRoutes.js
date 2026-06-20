export const STUDIO_ACCESS_CREDIT_THRESHOLD = 100;
export const VIDGENIE_MINIMUM_GENERATION_CREDITS = STUDIO_ACCESS_CREDIT_THRESHOLD;
const VIDGENIE_MOBILE_CREDIT_THRESHOLD = 300;

export function getGenerationCredits(user) {
  return Number(user?.generationCredits || 0);
}

export function hasNoGenerationCredits(user) {
  if (!user || user.isExternalUser) return false;
  return getGenerationCredits(user) <= 0;
}

export function hasInsufficientGenerationCredits(
  user,
  threshold = VIDGENIE_MINIMUM_GENERATION_CREDITS,
) {
  if (!user || user.isExternalUser) return false;
  return getGenerationCredits(user) < threshold;
}

export function hasStudioAccess(user) {
  if (!user || user.isExternalUser) return false;

  const credits = getGenerationCredits(user);
  return Boolean(
    user.isPremiumUser ||
      credits >= STUDIO_ACCESS_CREDIT_THRESHOLD ||
      user.autoRechargePaymentMethodId ||
      user.autoRechargeEnabled
  );
}

export function hasMobileVidgenieDefaultAccess(user) {
  if (!user || user.isExternalUser) return false;
  if (user.isPremiumUser || user.autoRechargePaymentMethodId || user.autoRechargeEnabled) {
    return true;
  }

  return getGenerationCredits(user) >= VIDGENIE_MOBILE_CREDIT_THRESHOLD;
}

export function getDefaultAuthenticatedPath(user, { isMobile = false } = {}) {
  if (user?.isExternalUser) {
    return '/external/studio';
  }

  return '/vidgenie';
}
