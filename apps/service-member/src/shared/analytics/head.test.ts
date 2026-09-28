import { describe, expect, test } from "vite-plus/test";

import { memberAppHead } from "./head.ts";

describe("memberAppHead", () => {
  describe("without a measurement id", () => {
    const it = test.extend("head", () => memberAppHead("Service", "/styles.css", undefined));

    it("does not add analytics scripts", ({ head }) => {
      expect(head.scripts).toBeUndefined();
    });
  });

  describe("with a measurement id", () => {
    const it = test.extend("head", () =>
      memberAppHead("Service", "/styles.css", "G-TESTMEASUREMENT1"));

    it("loads gtag from Google Tag Manager and configures it without automatic page views", ({
      head,
    }) => {
      expect(head.scripts).toStrictEqual([
        {
          async: true,
          src: "https://www.googletagmanager.com/gtag/js?id=G-TESTMEASUREMENT1",
        },
        {
          children: expect.stringContaining(
            'gtag("config","G-TESTMEASUREMENT1",{send_page_view:false})',
          ),
        },
      ]);
    });

    it("does not configure a user_id in the injected snippet", ({ head }) => {
      expect(JSON.stringify(head)).not.toContain("user_id");
    });
  });
});
