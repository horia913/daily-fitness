/**
 * Fuel hub page loader with StrictMode-safe in-flight dedupe.
 */

import { supabase } from "./supabase";
import { dedupeAsync } from "./dedupeAsync";
import {
  mapNutritionPageRpcToPageData,
  type NutritionPageRpcResponse,
  type MappedNutritionPageData,
} from "./nutritionPageDataMapper";
import { applyClientMealOverridesToNutritionRpc } from "./applyNutritionOverridesForFuel";

export type ClientNutritionPageBundle = {
  rpc: NutritionPageRpcResponse | null;
  mapped: MappedNutritionPageData | null;
};

async function fetchClientNutritionPageUncached(
  clientId: string,
  date: string,
): Promise<ClientNutritionPageBundle> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_client_nutrition_page",
    {
      p_client_id: clientId,
      p_date: date,
    },
  );

  if (rpcError) {
    throw new Error(rpcError.message || "Failed to load nutrition");
  }

  let rpc = (rpcData ?? null) as NutritionPageRpcResponse | null;
  if (!rpc) {
    return { rpc: null, mapped: null };
  }

  rpc = await applyClientMealOverridesToNutritionRpc(rpc);
  const mapped = mapNutritionPageRpcToPageData(rpc);
  return { rpc, mapped };
}

/**
 * Share one resolve per (client, date) so StrictMode double-effects
 * do not POST get_client_nutrition_page / GET overrides twice.
 */
export function fetchClientNutritionPage(
  clientId: string,
  date: string,
): Promise<ClientNutritionPageBundle> {
  return dedupeAsync("nutrition-page", `${clientId}:${date}`, () =>
    fetchClientNutritionPageUncached(clientId, date),
  );
}
