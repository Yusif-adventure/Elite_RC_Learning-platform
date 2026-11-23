import assert from "node:assert/strict";
import { test } from "node:test";
import { accountPhoto } from "../accountPhoto";

test("an uploaded photo is used first, then a sign-in provider's picture", () => {
  assert.equal(
    accountPhoto({ user_metadata: { avatar_url: "https://a.example/me.png", picture: "https://b.example/g.png" } }),
    "https://a.example/me.png",
  );
  assert.equal(accountPhoto({ user_metadata: { picture: "https://b.example/g.png" } }), "https://b.example/g.png");
});

test("accounts without a usable photo have none", () => {
  assert.equal(accountPhoto(null), undefined);
  assert.equal(accountPhoto({ user_metadata: {} }), undefined);
  assert.equal(accountPhoto({ user_metadata: { avatar_url: null } }), undefined);
  assert.equal(accountPhoto({ user_metadata: { avatar_url: "javascript:alert(1)" } }), undefined);
  assert.equal(accountPhoto({ user_metadata: { avatar_url: "http://plain.example/me.png" } }), undefined);
  assert.equal(accountPhoto({ user_metadata: { avatar_url: "not a link", picture: "https://b.example/g.png" } }), "https://b.example/g.png");
});
