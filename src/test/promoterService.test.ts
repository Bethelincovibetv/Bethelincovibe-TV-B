import { describe, it, expect } from "vitest";
import { validateAndNormalizeWhatsAppNumber } from "../services/promoterService";

describe("Promoter Profile - WhatsApp Number Normalization Suite", () => {
  it("should normalize Nigerian 11-digit local mobile numbers starting with 080", () => {
    const result = validateAndNormalizeWhatsAppNumber("08012345678");
    expect(result.isValid).toBe(true);
    expect(result.normalizedE164).toBe("+2348012345678");
    expect(result.formattedDisplay).toBe("+234 801 234 5678");
  });

  it("should normalize Nigerian numbers with 090, 070, and 081 prefixes", () => {
    const res90 = validateAndNormalizeWhatsAppNumber("09087654321");
    expect(res90.isValid).toBe(true);
    expect(res90.normalizedE164).toBe("+2349087654321");

    const res70 = validateAndNormalizeWhatsAppNumber("07011223344");
    expect(res70.isValid).toBe(true);
    expect(res70.normalizedE164).toBe("+2347011223344");

    const res81 = validateAndNormalizeWhatsAppNumber("08133445566");
    expect(res81.isValid).toBe(true);
    expect(res81.normalizedE164).toBe("+2348133445566");
  });

  it("should handle Nigerian numbers already with +234 country code", () => {
    const result = validateAndNormalizeWhatsAppNumber("+2348012345678");
    expect(result.isValid).toBe(true);
    expect(result.normalizedE164).toBe("+2348012345678");
    expect(result.formattedDisplay).toBe("+234 801 234 5678");
  });

  it("should strip extraneous characters, spaces, and hyphens", () => {
    const result = validateAndNormalizeWhatsAppNumber("080-1234-5678");
    expect(result.isValid).toBe(true);
    expect(result.normalizedE164).toBe("+2348012345678");
  });

  it("should reject incomplete numbers", () => {
    const result = validateAndNormalizeWhatsAppNumber("080123");
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should reject empty or invalid strings", () => {
    const result = validateAndNormalizeWhatsAppNumber("");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("required");
  });
});
