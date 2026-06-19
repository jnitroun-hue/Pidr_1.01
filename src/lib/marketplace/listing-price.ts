/** Лот считается валидным, если указана хотя бы одна цена */
export function listingHasValidPrice(listing: {
  price_coins?: number | null;
  price_ton?: number | null;
  price_sol?: number | null;
  price_rub?: number | null;
} | null | undefined): boolean {
  if (!listing) return false;
  return (
    (listing.price_coins != null && Number(listing.price_coins) > 0) ||
    (listing.price_ton != null && Number(listing.price_ton) > 0) ||
    (listing.price_sol != null && Number(listing.price_sol) > 0) ||
    (listing.price_rub != null && Number(listing.price_rub) > 0)
  );
}
