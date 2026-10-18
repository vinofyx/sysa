import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { donationCategories } from '../content/donations';
import { categoryCodeFor } from './donation-category';

describe('categoryCodeFor', () => {
  it('returns the stable code for every build-time snapshot category', () => {
    for (const category of donationCategories) {
      const code = categoryCodeFor(donationCategories, category.id);
      assert.ok(code && /^[A-Z0-9_]{1,64}$/.test(code), `bad code for ${category.id}`);
    }
  });

  it('returns undefined for an id that is not in the list', () => {
    assert.equal(categoryCodeFor(donationCategories, 'not-a-real-id'), undefined);
  });
});
