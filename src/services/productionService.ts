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
  async listSiteProjects() {
    return (await state()).siteProjects;
  },
  async listContentItems(siteProjectId?: string) {
    const { contentItems } = await state();
    return siteProjectId ? contentItems.filter((item) => item.siteProjectId === siteProjectId) : contentItems;
  },
  async listPublishingDiffs(siteProjectId?: string) {
    const { publishingDiffs } = await state();
    return siteProjectId ? publishingDiffs.filter((diff) => diff.siteProjectId === siteProjectId) : publishingDiffs;
  },
  async listAffiliateOffers(questId?: string) {
    const { affiliateOffers } = await state();
    return questId ? affiliateOffers.filter((offer) => offer.questId === questId) : affiliateOffers;
  },
  async listOfferClaimReviews(offerId?: string) {
    const { offerClaimReviews } = await state();
    return offerId ? offerClaimReviews.filter((review) => review.offerId === offerId) : offerClaimReviews;
  },
};
