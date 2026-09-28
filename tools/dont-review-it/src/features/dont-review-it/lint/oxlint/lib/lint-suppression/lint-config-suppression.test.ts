import { parseSync } from "oxc-parser";
import { describe, expect, test } from "vite-plus/test";

import { parsedConfig } from "./lint-config-suppression-test-fixture.ts";
import { ignoreEntriesIn, lintBlockOf, weakenedTargetRulesIn } from "./lint-config-suppression.ts";

import type { ESTree } from "@oxlint/plugins";

const TARGET_RULES = ["no-duplicate-exported-type--reuse-authoritative-type"];

const TARGET_KEY = "dont-review-it/no-duplicate-exported-type--reuse-authoritative-type";

describe("lintBlockOf", () => {
  describe("a lint block written inline", () => {
    const it = test.extend("lintBlockOfAnInlineLintBlock", () => {
      const config = parsedConfig("export default { lint: { rules: {} } };");
      return {
        read: lintBlockOf({ body: config.body }),
        expected: config.propertyNamed("lint").value,
      };
    });

    it("is the block that is read", ({ lintBlockOfAnInlineLintBlock }) => {
      expect(lintBlockOfAnInlineLintBlock.read).toBe(lintBlockOfAnInlineLintBlock.expected);
    });
  });

  describe("a lint block wrapped in a call", () => {
    const it = test.extend("lintBlockOfALintBlockInsideACall", () => {
      const config = parsedConfig("export default { lint: withGitExcludes({ rules: {} }) };");
      return { read: lintBlockOf({ body: config.body }), expected: config.objectHolding("rules") };
    });

    it("is read through that call", ({ lintBlockOfALintBlockInsideACall }) => {
      expect(lintBlockOfALintBlockInsideACall.read).toBe(lintBlockOfALintBlockInsideACall.expected);
    });
  });

  describe("a config wrapped in a call", () => {
    const it = test.extend("lintBlockOfALintBlockInsideDefineConfig", () => {
      const config = parsedConfig("export default defineConfig({ lint: { rules: {} } });");
      return {
        read: lintBlockOf({ body: config.body }),
        expected: config.propertyNamed("lint").value,
      };
    });

    it("is read through that call too", ({ lintBlockOfALintBlockInsideDefineConfig }) => {
      expect(lintBlockOfALintBlockInsideDefineConfig.read).toBe(
        lintBlockOfALintBlockInsideDefineConfig.expected,
      );
    });
  });

  describe("a lint block reached through a named export", () => {
    const it = test.extend("lintBlockOfANamedExport", () =>
      lintBlockOf({
        body: parseSync("vite.config.ts", "export const lint = { rules: {} };").program.body.map(
          (statement) => statement as ESTree.Statement,
        ),
      }));

    it("yields nothing to read", ({ lintBlockOfANamedExport }) => {
      expect(lintBlockOfANamedExport).toBe(null);
    });
  });

  describe("a config that spells no lint key", () => {
    const it = test.extend("lintBlockOfAConfigWithoutALintKey", () =>
      lintBlockOf({
        body: parseSync("vite.config.ts", "export default { test: {} };").program.body.map(
          (statement) => statement as ESTree.Statement,
        ),
      }));

    it("yields nothing to read", ({ lintBlockOfAConfigWithoutALintKey }) => {
      expect(lintBlockOfAConfigWithoutALintKey).toBe(null);
    });
  });

  describe("a lint value declared elsewhere", () => {
    const it = test.extend("lintBlockOfALintValueDeclaredElsewhere", () =>
      lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          "export default { lint: configuredElsewhere };",
        ).program.body.map((statement) => statement as ESTree.Statement),
      }));

    it("yields nothing to read", ({ lintBlockOfALintValueDeclaredElsewhere }) => {
      expect(lintBlockOfALintValueDeclaredElsewhere).toBe(null);
    });
  });
});

describe("weakenedTargetRulesIn", () => {
  describe("a target rule held off", () => {
    const it = test.extend("weakenedOfARuleHeldOff", () => {
      const config = parsedConfig(
        `export default { lint: { rules: { "${TARGET_KEY}": "off" } } };`,
      );
      return {
        weakened: weakenedTargetRulesIn({ lint: config.lint, targetRules: TARGET_RULES }),
        property: config.propertyNamed(TARGET_KEY),
      };
    });

    it("is weakened", ({ weakenedOfARuleHeldOff }) => {
      expect(
        weakenedOfARuleHeldOff.weakened.map(({ ruleName, severity }) => ({ ruleName, severity })),
      ).toStrictEqual([{ ruleName: TARGET_KEY, severity: "off" }]);
    });

    it("is reported at the property that spells it", ({ weakenedOfARuleHeldOff }) => {
      expect(weakenedOfARuleHeldOff.weakened[0]?.property).toBe(weakenedOfARuleHeldOff.property);
    });
  });

  describe("a target rule held at warn", () => {
    const it = test.extend("weakenedOfARuleHeldWarn", () => {
      const config = parsedConfig(
        `export default { lint: { rules: { "${TARGET_KEY}": "warn" } } };`,
      );
      return {
        weakened: weakenedTargetRulesIn({ lint: config.lint, targetRules: TARGET_RULES }),
        property: config.propertyNamed(TARGET_KEY),
      };
    });

    it("is weakened", ({ weakenedOfARuleHeldWarn }) => {
      expect(
        weakenedOfARuleHeldWarn.weakened.map(({ ruleName, severity }) => ({ ruleName, severity })),
      ).toStrictEqual([{ ruleName: TARGET_KEY, severity: "warn" }]);
    });

    it("is reported at the property that spells it", ({ weakenedOfARuleHeldWarn }) => {
      expect(weakenedOfARuleHeldWarn.weakened[0]?.property).toBe(weakenedOfARuleHeldWarn.property);
    });
  });

  describe("a target rule held at allow", () => {
    const it = test.extend("weakenedOfARuleHeldAllow", () => {
      const config = parsedConfig(
        `export default { lint: { rules: { "${TARGET_KEY}": "allow" } } };`,
      );
      return {
        weakened: weakenedTargetRulesIn({ lint: config.lint, targetRules: TARGET_RULES }),
        property: config.propertyNamed(TARGET_KEY),
      };
    });

    it("is weakened", ({ weakenedOfARuleHeldAllow }) => {
      expect(
        weakenedOfARuleHeldAllow.weakened.map(({ ruleName, severity }) => ({ ruleName, severity })),
      ).toStrictEqual([{ ruleName: TARGET_KEY, severity: "allow" }]);
    });

    it("is reported at the property that spells it", ({ weakenedOfARuleHeldAllow }) => {
      expect(weakenedOfARuleHeldAllow.weakened[0]?.property).toBe(
        weakenedOfARuleHeldAllow.property,
      );
    });
  });

  describe("a target rule held at a number below the failing one", () => {
    const it = test.extend("weakenedOfARuleHeldAtOne", () => {
      const config = parsedConfig(`export default { lint: { rules: { "${TARGET_KEY}": 1 } } };`);
      return {
        weakened: weakenedTargetRulesIn({ lint: config.lint, targetRules: TARGET_RULES }),
        property: config.propertyNamed(TARGET_KEY),
      };
    });

    it("is weakened", ({ weakenedOfARuleHeldAtOne }) => {
      expect(
        weakenedOfARuleHeldAtOne.weakened.map(({ ruleName, severity }) => ({ ruleName, severity })),
      ).toStrictEqual([{ ruleName: TARGET_KEY, severity: "1" }]);
    });

    it("is reported at the property that spells it", ({ weakenedOfARuleHeldAtOne }) => {
      expect(weakenedOfARuleHeldAtOne.weakened[0]?.property).toBe(
        weakenedOfARuleHeldAtOne.property,
      );
    });
  });

  describe("a severity written first in a list", () => {
    const it = test.extend("weakenedOfARuleHeldOffThroughAList", () => {
      const config = parsedConfig(
        `export default { lint: { rules: { "${TARGET_KEY}": ["off", "error"] } } };`,
      );
      return {
        weakened: weakenedTargetRulesIn({ lint: config.lint, targetRules: TARGET_RULES }),
        property: config.propertyNamed(TARGET_KEY),
      };
    });

    it("is the one that counts", ({ weakenedOfARuleHeldOffThroughAList }) => {
      expect(
        weakenedOfARuleHeldOffThroughAList.weakened.map(({ ruleName, severity }) => ({
          ruleName,
          severity,
        })),
      ).toStrictEqual([{ ruleName: TARGET_KEY, severity: "off" }]);
    });

    it("is reported at the property that spells it", ({ weakenedOfARuleHeldOffThroughAList }) => {
      expect(weakenedOfARuleHeldOffThroughAList.weakened[0]?.property).toBe(
        weakenedOfARuleHeldOffThroughAList.property,
      );
    });
  });

  describe("a severity spelled through a named constant", () => {
    const it = test.extend("weakenedOfARuleHeldOffThroughANamedConstant", () => {
      const config = parsedConfig(
        `export default { lint: { rules: { "${TARGET_KEY}": LINT_SEVERITY.OFF } } };`,
      );
      return {
        weakened: weakenedTargetRulesIn({ lint: config.lint, targetRules: TARGET_RULES }),
        property: config.propertyNamed(TARGET_KEY),
      };
    });

    it("is read by its member name", ({ weakenedOfARuleHeldOffThroughANamedConstant }) => {
      expect(
        weakenedOfARuleHeldOffThroughANamedConstant.weakened.map(({ ruleName, severity }) => ({
          ruleName,
          severity,
        })),
      ).toStrictEqual([{ ruleName: TARGET_KEY, severity: "off" }]);
    });

    it("is reported at the property that spells it", ({
      weakenedOfARuleHeldOffThroughANamedConstant,
    }) => {
      expect(weakenedOfARuleHeldOffThroughANamedConstant.weakened[0]?.property).toBe(
        weakenedOfARuleHeldOffThroughANamedConstant.property,
      );
    });
  });

  describe("a rules block assembled by spreading another block", () => {
    const it = test.extend("weakenedOfARulesBlockAssembledBySpreading", () => {
      const config = parsedConfig(
        `export default { lint: { rules: { ...shared, "${TARGET_KEY}": "off" } } };`,
      );
      return {
        weakened: weakenedTargetRulesIn({ lint: config.lint, targetRules: TARGET_RULES }),
        property: config.propertyNamed(TARGET_KEY),
      };
    });

    it("is read for what it spells", ({ weakenedOfARulesBlockAssembledBySpreading }) => {
      expect(
        weakenedOfARulesBlockAssembledBySpreading.weakened.map(({ ruleName, severity }) => ({
          ruleName,
          severity,
        })),
      ).toStrictEqual([{ ruleName: TARGET_KEY, severity: "off" }]);
    });

    it("is reported at the property that spells it", ({
      weakenedOfARulesBlockAssembledBySpreading,
    }) => {
      expect(weakenedOfARulesBlockAssembledBySpreading.weakened[0]?.property).toBe(
        weakenedOfARulesBlockAssembledBySpreading.property,
      );
    });
  });

  describe("the rules an override carries", () => {
    const it = test.extend("weakenedOfARuleAnOverrideCarries", () => {
      const config = parsedConfig(
        `export default { lint: { overrides: [{ files: ["a/**"], rules: { "${TARGET_KEY}": "off" } }] } };`,
      );
      return {
        weakened: weakenedTargetRulesIn({ lint: config.lint, targetRules: TARGET_RULES }),
        property: config.propertyNamed(TARGET_KEY),
      };
    });

    it("are read the same way", ({ weakenedOfARuleAnOverrideCarries }) => {
      expect(
        weakenedOfARuleAnOverrideCarries.weakened.map(({ ruleName, severity }) => ({
          ruleName,
          severity,
        })),
      ).toStrictEqual([{ ruleName: TARGET_KEY, severity: "off" }]);
    });

    it("is reported at the property that spells it", ({ weakenedOfARuleAnOverrideCarries }) => {
      expect(weakenedOfARuleAnOverrideCarries.weakened[0]?.property).toBe(
        weakenedOfARuleAnOverrideCarries.property,
      );
    });
  });

  describe("a target rule held at error", () => {
    const it = test.extend("weakenedOfARuleHeldError", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": "error" } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is left alone", ({ weakenedOfARuleHeldError }) => {
      expect(weakenedOfARuleHeldError).toStrictEqual([]);
    });
  });

  describe("a target rule held at deny", () => {
    const it = test.extend("weakenedOfARuleHeldDeny", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": "deny" } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is left alone", ({ weakenedOfARuleHeldDeny }) => {
      expect(weakenedOfARuleHeldDeny).toStrictEqual([]);
    });
  });

  describe("a target rule held at the failing number", () => {
    const it = test.extend("weakenedOfARuleHeldAtTwo", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": 2 } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is left alone", ({ weakenedOfARuleHeldAtTwo }) => {
      expect(weakenedOfARuleHeldAtTwo).toStrictEqual([]);
    });
  });

  describe("a target rule held at error through a list", () => {
    const it = test.extend("weakenedOfARuleHeldErrorThroughAList", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": ["error", { max: 1 }] } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is left alone", ({ weakenedOfARuleHeldErrorThroughAList }) => {
      expect(weakenedOfARuleHeldErrorThroughAList).toStrictEqual([]);
    });
  });

  describe("a severity spelled through the error constant", () => {
    const it = test.extend("weakenedOfARuleHeldAtTheErrorConstant", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": LINT_SEVERITY.ERROR } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is left alone", ({ weakenedOfARuleHeldAtTheErrorConstant }) => {
      expect(weakenedOfARuleHeldAtTheErrorConstant).toStrictEqual([]);
    });
  });

  describe("a severity held at a name the config does not spell out", () => {
    const it = test.extend("weakenedOfARuleHeldAtAChosenName", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": chosenSeverity } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is not read as weakened", ({ weakenedOfARuleHeldAtAChosenName }) => {
      expect(weakenedOfARuleHeldAtAChosenName).toStrictEqual([]);
    });
  });

  describe("a severity held in a spread list", () => {
    const it = test.extend("weakenedOfARuleHeldInASpreadList", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": [...spread] } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is not read as weakened", ({ weakenedOfARuleHeldInASpreadList }) => {
      expect(weakenedOfARuleHeldInASpreadList).toStrictEqual([]);
    });
  });

  describe("a severity held in an empty list", () => {
    const it = test.extend("weakenedOfARuleHeldInAnEmptyList", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": [] } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is not read as weakened", ({ weakenedOfARuleHeldInAnEmptyList }) => {
      expect(weakenedOfARuleHeldInAnEmptyList).toStrictEqual([]);
    });
  });

  describe("a rule named by a computed key", () => {
    const it = test.extend("weakenedOfARuleNamedByAComputedKey", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          'export default { lint: { rules: { [computed]: "off" } } };',
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is not read as weakened", ({ weakenedOfARuleNamedByAComputedKey }) => {
      expect(weakenedOfARuleNamedByAComputedKey).toStrictEqual([]);
    });
  });

  describe("a severity spelled as an unknown word", () => {
    const it = test.extend("weakenedOfARuleHeldAtAnUnknownSpelling", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          `export default { lint: { rules: { "${TARGET_KEY}": "chosen" } } };`,
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is not read as weakened", ({ weakenedOfARuleHeldAtAnUnknownSpelling }) => {
      expect(weakenedOfARuleHeldAtAnUnknownSpelling).toStrictEqual([]);
    });
  });

  describe("a rule outside the target set", () => {
    const it = test.extend("weakenedOfARuleOutsideTheTargetSet", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          'export default { lint: { rules: { "no-console": "off" } } };',
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("is not this rule's business", ({ weakenedOfARuleOutsideTheTargetSet }) => {
      expect(weakenedOfARuleOutsideTheTargetSet).toStrictEqual([]);
    });
  });

  describe("overrides that carry no rules", () => {
    const it = test.extend("weakenedOfOverridesThatCarryNoRules", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          'export default { lint: { overrides: [{ files: ["a/**"] }, "elsewhere", ...more] } };',
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("yield nothing", ({ weakenedOfOverridesThatCarryNoRules }) => {
      expect(weakenedOfOverridesThatCarryNoRules).toStrictEqual([]);
    });
  });

  describe("overrides declared elsewhere", () => {
    const it = test.extend("weakenedOfOverridesDeclaredElsewhere", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          "export default { lint: { overrides: elsewhere } };",
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("yield nothing", ({ weakenedOfOverridesDeclaredElsewhere }) => {
      expect(weakenedOfOverridesDeclaredElsewhere).toStrictEqual([]);
    });
  });

  describe("a lint block without rules", () => {
    const it = test.extend("weakenedOfALintBlockWithoutRules", () => {
      const lint = lintBlockOf({
        body: parseSync("vite.config.ts", "export default { lint: { } };").program.body.map(
          (statement) => statement as ESTree.Statement,
        ),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("yields nothing", ({ weakenedOfALintBlockWithoutRules }) => {
      expect(weakenedOfALintBlockWithoutRules).toStrictEqual([]);
    });
  });

  describe("a rules block declared elsewhere", () => {
    const it = test.extend("weakenedOfARulesBlockDeclaredElsewhere", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          "export default { lint: { rules: elsewhere } };",
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return weakenedTargetRulesIn({ lint, targetRules: TARGET_RULES });
    });

    it("yields nothing", ({ weakenedOfARulesBlockDeclaredElsewhere }) => {
      expect(weakenedOfARulesBlockDeclaredElsewhere).toStrictEqual([]);
    });
  });
});

describe("ignoreEntriesIn", () => {
  describe("two patterns the config spells out", () => {
    const it = test.extend("patternsOfTwoSpelledPatterns", () => {
      const config = parsedConfig(
        'export default { lint: { ignorePatterns: ["dist/**", "src/legacy/**"] } };',
      );
      return {
        entries: ignoreEntriesIn(config.lint),
        elements: [config.literalSpelling("dist/**"), config.literalSpelling("src/legacy/**")],
      };
    });

    it("are the ignore patterns", ({ patternsOfTwoSpelledPatterns }) => {
      expect(patternsOfTwoSpelledPatterns.entries.map(({ pattern }) => pattern)).toStrictEqual([
        "dist/**",
        "src/legacy/**",
      ]);
    });

    it("points each pattern at the element that spells it", ({ patternsOfTwoSpelledPatterns }) => {
      expect(patternsOfTwoSpelledPatterns.entries.map(({ element }) => element)).toStrictEqual(
        patternsOfTwoSpelledPatterns.elements,
      );
    });
  });

  describe("a list holding things that are not spellings", () => {
    const it = test.extend("patternsOfAListHoldingThingsThatAreNotSpellings", () => {
      const config = parsedConfig(
        'export default { lint: { ignorePatterns: ["dist/**", chosen, 1, ...more] } };',
      );
      return {
        entries: ignoreEntriesIn(config.lint),
        elements: [config.literalSpelling("dist/**")],
      };
    });

    it("carries only the spellings", ({ patternsOfAListHoldingThingsThatAreNotSpellings }) => {
      expect(
        patternsOfAListHoldingThingsThatAreNotSpellings.entries.map(({ pattern }) => pattern),
      ).toStrictEqual(["dist/**"]);
    });

    it("points each pattern at the element that spells it", ({
      patternsOfAListHoldingThingsThatAreNotSpellings,
    }) => {
      expect(
        patternsOfAListHoldingThingsThatAreNotSpellings.entries.map(({ element }) => element),
      ).toStrictEqual(patternsOfAListHoldingThingsThatAreNotSpellings.elements);
    });
  });

  describe("ignore patterns declared elsewhere", () => {
    const it = test.extend("patternsOfIgnorePatternsDeclaredElsewhere", () => {
      const lint = lintBlockOf({
        body: parseSync(
          "vite.config.ts",
          "export default { lint: { ignorePatterns: elsewhere } };",
        ).program.body.map((statement) => statement as ESTree.Statement),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return ignoreEntriesIn(lint);
    });

    it("carry nothing", ({ patternsOfIgnorePatternsDeclaredElsewhere }) => {
      expect(patternsOfIgnorePatternsDeclaredElsewhere).toStrictEqual([]);
    });
  });

  describe("a lint block without ignore patterns", () => {
    const it = test.extend("patternsOfALintBlockWithoutIgnorePatterns", () => {
      const lint = lintBlockOf({
        body: parseSync("vite.config.ts", "export default { lint: { } };").program.body.map(
          (statement) => statement as ESTree.Statement,
        ),
      });
      if (lint === null) throw new Error("the configuration under test must hold a lint block");
      return ignoreEntriesIn(lint);
    });

    it("carries nothing", ({ patternsOfALintBlockWithoutIgnorePatterns }) => {
      expect(patternsOfALintBlockWithoutIgnorePatterns).toStrictEqual([]);
    });
  });
});
