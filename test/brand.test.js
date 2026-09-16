"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { PRODUCT_NAME, PRODUCT_SHORT_NAME } = require("../src/main/brand");

describe("product brand", () => {
  it("locks the full user-facing name with double-struck 𝕏", () => {
    assert.equal(PRODUCT_NAME, "Unofficial 𝕏 (Twitter) Video Liberator");
    assert.match(PRODUCT_NAME, /𝕏/);
    assert.doesNotMatch(PRODUCT_NAME, /X Video Window/);
  });

  it("keeps a short Dock/menu fallback only", () => {
    assert.equal(PRODUCT_SHORT_NAME, "𝕏 Video Liberator");
    assert.notEqual(PRODUCT_SHORT_NAME, PRODUCT_NAME);
  });
});
