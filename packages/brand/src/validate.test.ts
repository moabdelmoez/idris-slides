import { describe, expect, it } from "vitest";
import { findForbiddenHexColors, isApprovedHexColor } from "./validate";

describe("brand color validation", () => {
  it("accepts approved Solutions palette colors", () => {
    expect(isApprovedHexColor("#ff6a39")).toBe(true);
    expect(isApprovedHexColor("#4F008C")).toBe(true);
  });

  it("rejects colors outside the Solutions palette", () => {
    expect(isApprovedHexColor("#123456")).toBe(false);
  });

  it("finds forbidden hex colors in generated source", () => {
    const source = "const style = { color: '#123456', background: '#ff6a39' };";
    expect(findForbiddenHexColors(source)).toEqual(["#123456"]);
  });

  it("finds forbidden shorthand and alpha hex colors in generated source", () => {
    const source =
      "const style = { color: '#123', borderColor: '#1234', boxShadow: '0 0 8px #12345678' };";

    expect(findForbiddenHexColors(source)).toEqual(["#123", "#1234", "#12345678"]);
  });
});
