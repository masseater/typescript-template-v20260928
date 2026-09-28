import { describe, expect, test } from "vite-plus/test";

import { RECOVERY_STATE, recoveryStateOf, recoveryUrl } from "./recovery-state.ts";

describe("recoveryStateOf", () => {
  const it = test
    .extend("recognisedReads", () =>
      ["?recovery=1", "?recovery=setup"].map((search) => recoveryStateOf(search)))
    .extend("unrecognisedReads", () =>
      ["", "?recovery=2", "?recovery=", "?other=1"].map((search) => recoveryStateOf(search)),
    );

  it("reads the two recovery states from the query", ({ recognisedReads }) => {
    expect.hasAssertions();
    expect(recognisedReads).toStrictEqual([RECOVERY_STATE.recovered, RECOVERY_STATE.setup]);
  });

  it("reads any other query as no recovery", ({ unrecognisedReads }) => {
    expect.hasAssertions();
    expect(unrecognisedReads).toStrictEqual([undefined, undefined, undefined, undefined]);
  });
});

describe("recoveryUrl", () => {
  const it = test.extend("setupUrl", () => recoveryUrl("/security", RECOVERY_STATE.setup));

  it("writes the state into the recovery query", ({ setupUrl }) => {
    expect.hasAssertions();
    expect(setupUrl).toBe("/security?recovery=setup");
  });
});
