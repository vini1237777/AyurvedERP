import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSaleLine } from "../src/services/saleLines";

const line = (over: Record<string, unknown> = {}) => ({
  itemId: 1,
  itemName: "Dolo 650",
  qty: 2,
  freeQty: 0,
  rate: 30,
  disc: 0,
  sDis: 0,
  ...over,
});

test("a normal line passes", () => {
  assert.equal(checkSaleLine(line()), null);
});

test("a free only line passes", () => {
  assert.equal(checkSaleLine(line({ qty: 0, freeQty: 1, rate: 0 })), null);
});

test("blank optional fields count as 0", () => {
  assert.equal(checkSaleLine(line({ disc: "", sDis: undefined, freeQty: null })), null);
});

const rejected: [string, Record<string, unknown>][] = [
  ["a negative rate", { rate: -100 }],
  ["a discount above 100%", { disc: 101 }],
  ["a negative discount", { disc: -5 }],
  ["a second discount above 100%", { sDis: 150 }],
  ["a rate that is not a number", { rate: "abc" }],
  ["an infinite rate", { rate: Infinity }],
  ["a zero quantity", { qty: 0, freeQty: 0 }],
  ["a negative quantity", { qty: -3 }],
  ["a missing item", { itemId: undefined }],
  ["an item id that is not a whole number", { itemId: "1.5" }],
];

for (const [what, over] of rejected) {
  test(`rejects ${what}`, () => {
    assert.match(checkSaleLine(line(over)) ?? "", /Dolo 650/);
  });
}
