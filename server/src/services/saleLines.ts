// Checks one sale line before anything touches the database. The cashier may
// change the rate, so only its range is checked here; GST is set from the item.

const toNumber = (value: unknown): number =>
  value === undefined || value === null || value === "" ? 0 : Number(value);

export function checkSaleLine(row: any): string | null {
  const name = row?.itemName || "this item";
  if (!Number.isInteger(Number(row?.itemId)) || Number(row.itemId) <= 0)
    return `Choose an item for ${name}`;

  const qty = toNumber(row.qty);
  const freeQty = toNumber(row.freeQty);
  const rate = toNumber(row.rate);
  const disc = toNumber(row.disc);
  const sDis = toNumber(row.sDis);

  if (![qty, freeQty, rate, disc, sDis].every(Number.isFinite))
    return `Enter numbers only for ${name}`;
  if (qty < 0 || freeQty < 0 || qty + freeQty <= 0)
    return `Enter a valid quantity for ${name}`;
  if (rate < 0) return `Rate can't be below 0 for ${name}`;
  if (disc < 0 || disc > 100 || sDis < 0 || sDis > 100)
    return `Discount must be between 0 and 100% for ${name}`;
  return null;
}
