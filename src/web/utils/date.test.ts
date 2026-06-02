import { describe, expect, it } from "vitest";
import { DateU } from "./date";

describe("DateU.addWeeks", () => {
  it("通常週の加算", () => {
    expect(DateU.addWeeks("2025-W10", 1)).toBe("2025-W11");
    expect(DateU.addWeeks("2025-W10", -1)).toBe("2025-W09");
    expect(DateU.addWeeks("2025-W10", 3)).toBe("2025-W13");
  });

  it("年をまたぐ加算: 2020-W53 → 2021-W01", () => {
    expect(DateU.addWeeks("2020-W53", 1)).toBe("2021-W01");
  });

  it("年をまたぐ減算: 2021-W01 → 2020-W53", () => {
    expect(DateU.addWeeks("2021-W01", -1)).toBe("2020-W53");
  });

  it("通常: 2021-W01 + 1 → 2021-W02", () => {
    expect(DateU.addWeeks("2021-W01", 1)).toBe("2021-W02");
  });

  it("年末: 2021-W52 + 1 → 2022-W01", () => {
    expect(DateU.addWeeks("2021-W52", 1)).toBe("2022-W01");
  });

  it("年初: 2022-W01 - 1 → 2021-W52", () => {
    expect(DateU.addWeeks("2022-W01", -1)).toBe("2021-W52");
  });

  it("2024-W52 + 1 → 2025-W01 (2024年は52週)", () => {
    expect(DateU.addWeeks("2024-W52", 1)).toBe("2025-W01");
  });
});
