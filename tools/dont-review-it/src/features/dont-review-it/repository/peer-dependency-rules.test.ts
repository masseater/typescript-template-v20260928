import { isPlainObject } from "es-toolkit";
import { describe, expect, it } from "vite-plus/test";
import { parse } from "yaml";

const workspaceDefinitions: Readonly<Record<string, string>> = import.meta.glob(
  "../../../../../../pnpm-workspace.yaml",
  { eager: true, import: "default", query: "?raw" },
);

const peerDependencyRules = (definition: unknown): Readonly<Record<string, unknown>> => {
  const rules = isPlainObject(definition) ? definition["peerDependencyRules"] : undefined;
  return isPlainObject(rules) ? rules : {};
};

const doublyAllowed = (rules: Readonly<Record<string, unknown>>): readonly string[] => {
  const allowAny = rules["allowAny"];
  const allowedVersions = rules["allowedVersions"];
  if (!Array.isArray(allowAny) || !isPlainObject(allowedVersions)) return [];
  return Object.keys(allowedVersions).filter((name) => allowAny.includes(name));
};

describe("peer dependency rules", () => {
  it("names each package under allowAny or allowedVersions, never both", () => {
    expect.hasAssertions();
    const [definition = ""] = Object.values(workspaceDefinitions);
    expect(doublyAllowed(peerDependencyRules(parse(definition)))).toStrictEqual([]);
  });

  it("reports a package allowed at any version and at a named range", () => {
    expect.hasAssertions();
    expect(
      doublyAllowed({
        allowAny: ["vite", "vitest"],
        allowedVersions: { "@effect/atom-react>scheduler": "^0.28.0", vite: "*" },
      }),
    ).toStrictEqual(["vite"]);
  });
});
