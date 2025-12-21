import { describe, expect, it } from "vitest";

import { validateSettings } from "../app/services/settings";

describe("validateSettings", () => {
  it("passes with valid threshold and emails", () => {
    const result = validateSettings("5", "one@test.com, two@test.com");
    expect(result.parsed?.globalThreshold).toBe(5);
    expect(result.parsed?.alertEmails).toEqual(["one@test.com", "two@test.com"]);
    expect(result.errors.globalThreshold).toBeUndefined();
    expect(result.errors.alertEmails).toBeUndefined();
  });

  it("fails with negative threshold", () => {
    const result = validateSettings("-1", "a@test.com");
    expect(result.parsed).toBeUndefined();
    expect(result.errors.globalThreshold).toBe("Threshold cannot be negative.");
  });

  it("fails with invalid emails", () => {
    const result = validateSettings("2", "not-an-email");
    expect(result.parsed).toBeUndefined();
    expect(result.errors.alertEmails).toBe("One or more emails are invalid.");
  });

  it("fails when missing emails", () => {
    const result = validateSettings("2", "");
    expect(result.parsed).toBeUndefined();
    expect(result.errors.alertEmails).toBe("Add at least one email.");
  });
});
