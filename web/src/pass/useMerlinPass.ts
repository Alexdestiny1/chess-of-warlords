import { useCallback, useMemo, useState } from "react";

import {
  clearMerlinPass,
  consumeCheckoutReturn,
  grantMerlinPass,
  loadMerlinPass,
  openMerlinCheckout,
  stripePaymentLink,
  type MerlinPassState,
  type MerlinReturn,
} from "./merlinPass";
import { localizeMerlinPrice, type LocalizedPrice } from "./price";

export interface MerlinPassApi {
  active: boolean;
  price: LocalizedPrice;
  checkoutReady: boolean;
  purchase: () => boolean;
  grantForDevelopment: () => void;
  clearForDevelopment: () => void;
  consumeReturn: () => MerlinReturn;
}

export function useMerlinPass(): MerlinPassApi {
  const [state, setState] = useState<MerlinPassState>(() => loadMerlinPass());
  const price = useMemo(() => localizeMerlinPrice(), []);
  const checkoutReady = Boolean(stripePaymentLink());

  const consumeReturn = useCallback((): MerlinReturn => {
    const result = consumeCheckoutReturn(window.location.search, import.meta.env.DEV);
    setState(loadMerlinPass());
    return result;
  }, []);

  const purchase = useCallback((): boolean => openMerlinCheckout(), []);

  const grantForDevelopment = useCallback((): void => {
    if (!import.meta.env.DEV) return;
    setState(grantMerlinPass("dev"));
  }, []);

  const clearForDevelopment = useCallback((): void => {
    if (!import.meta.env.DEV) return;
    setState(clearMerlinPass());
  }, []);

  return {
    active: state.active,
    price,
    checkoutReady,
    purchase,
    grantForDevelopment,
    clearForDevelopment,
    consumeReturn,
  };
}
