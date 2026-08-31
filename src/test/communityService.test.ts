import { describe, it, expect } from "vitest";
import { validateCommunityInput, COMMUNITY_TYPES } from "../services/communityService";

describe("Community Service - Validation & Constants Suite", () => {
  it("should have valid predefined community types with metadata", () => {
    expect(COMMUNITY_TYPES).toHaveLength(3);
    const typeIds = COMMUNITY_TYPES.map((t) => t.id);
    expect(typeIds).toContain("group");
    expect(typeIds).toContain("channel");
    expect(typeIds).toContain("status_audience");
  });

  it("should accept valid community inputs for group, channel, and status_audience", () => {
    const validGroup = validateCommunityInput({
      name: "Lagos Tech Founders Hub",
      communityType: "group",
      memberCount: 500,
      activeDailyViews: 200,
    });
    expect(validGroup.isValid).toBe(true);
    expect(validGroup.error).toBeUndefined();

    const validChannel = validateCommunityInput({
      name: "Abuja Real Estate Deals",
      communityType: "channel",
      memberCount: 12000,
      activeDailyViews: 4500,
    });
    expect(validChannel.isValid).toBe(true);

    const validStatus = validateCommunityInput({
      name: "Daily Lifestyle & Bargains",
      communityType: "status_audience",
      memberCount: 3500,
      activeDailyViews: 1200,
    });
    expect(validStatus.isValid).toBe(true);
  });

  it("should reject empty or whitespace-only community names", () => {
    const emptyName = validateCommunityInput({
      name: "   ",
      communityType: "group",
      memberCount: 200,
    });
    expect(emptyName.isValid).toBe(false);
    expect(emptyName.error).toContain("Community name is required");
  });

  it("should reject invalid community types", () => {
    const invalidType = validateCommunityInput({
      name: "Test Group",
      // @ts-expect-error testing invalid type input
      communityType: "telegram_group",
      memberCount: 100,
    });
    expect(invalidType.isValid).toBe(false);
    expect(invalidType.error).toContain("Invalid community type");
  });

  it("should reject non-positive member counts (0 or negative)", () => {
    const zeroCount = validateCommunityInput({
      name: "Test Group",
      communityType: "group",
      memberCount: 0,
    });
    expect(zeroCount.isValid).toBe(false);
    expect(zeroCount.error).toContain("greater than zero");

    const negativeCount = validateCommunityInput({
      name: "Test Group",
      communityType: "group",
      memberCount: -50,
    });
    expect(negativeCount.isValid).toBe(false);
    expect(negativeCount.error).toContain("greater than zero");
  });

  it("should reject negative active daily views", () => {
    const negativeViews = validateCommunityInput({
      name: "Test Group",
      communityType: "group",
      memberCount: 500,
      activeDailyViews: -10,
    });
    expect(negativeViews.isValid).toBe(false);
    expect(negativeViews.error).toContain("cannot be negative");
  });

  it("should accept 0 active daily views", () => {
    const zeroViews = validateCommunityInput({
      name: "Brand New Status Audience",
      communityType: "status_audience",
      memberCount: 150,
      activeDailyViews: 0,
    });
    expect(zeroViews.isValid).toBe(true);
  });
});
