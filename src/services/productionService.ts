import { persistenceService } from "./persistenceService";

async function state() {
  return (await persistenceService.loadState()).state;
}

export const productionService = {
  async listProductionPacks() {
    return (await state()).productionPacks;
  },
  async listQuestProductionPacks(questId: string) {
    const { productionPacks } = await state();
    return productionPacks.filter((pack) => pack.questId === questId);
  },
  async listProductionAssets(packId?: string) {
    const { productionAssets } = await state();
    return packId ? productionAssets.filter((asset) => asset.packId === packId) : productionAssets;
  },
};
