/** Карточка для модалки управления NFT (колода / продажа / удаление). */
export interface NftCardModalPayload {
  id: string | number;
  user_id?: string | number;
  rank: string;
  suit: string;
  rarity: string;
  image_url: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  is_listed?: boolean;
  is_in_deck?: boolean;
}

export const NFT_OPEN_CARD_MODAL_EVENT = 'nft-open-card-modal';

export function openNftCardModal(card: NftCardModalPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<NftCardModalPayload>(NFT_OPEN_CARD_MODAL_EVENT, { detail: card })
  );
}
