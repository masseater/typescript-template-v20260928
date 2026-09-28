import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Path } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { pathExists } from "../platform/file-system.ts";
import {
  browserConfirmViolations,
  captchaImportViolations,
  hoverOnlyActionViolations,
  shippedUiRuleViolations,
} from "./ai-operable-ui-test-fixture.ts";
import { repositoryRoot } from "./repository-root.ts";

const shippedModules: Readonly<Record<string, unknown>> = import.meta.glob(
  "../../../../../../{apps,libs}/**/*.{ts,tsx}",
);

const fixture = (name: string, source: string): void => {
  it(`detects ${name}`, () => {
    expect.hasAssertions();
    expect(shippedUiRuleViolations(source).length).toBeGreaterThan(0);
  });
};

describe("AI-operable UI source rules", () => {
  fixture(
    "a captcha import",
    'import Turnstile from "@marsidev/react-turnstile";\nexport const Wall = Turnstile;\n',
  );

  fixture(
    "window.confirm",
    'export const remove = () => { if (!window.confirm("消しますか？")) return; };\n',
  );

  fixture(
    "globalThis.confirm",
    'export const remove = () => { if (!globalThis.confirm("消しますか？")) return; };\n',
  );

  fixture("window.alert", 'export const warn = () => { window.alert("完了"); };\n');

  fixture(
    "a hover-only row action",
    'export const Row = () => <button type="button" className="opacity-0 group-hover:opacity-100">削除</button>;\n',
  );

  fixture(
    "a hover-only action with template className",
    'export const Row = () => <button type="button" className={`invisible group-hover:visible`}>削除</button>;\n',
  );

  fixture(
    "a hover-only action with single-quoted className",
    "export const Row = () => <button type=\"button\" className='opacity-0 group-hover:opacity-100'>削除</button>;\n",
  );

  it("reports each captcha package import", () => {
    expect.hasAssertions();
    expect(
      captchaImportViolations('import X from "@hcaptcha/react-hcaptcha";\n'),
    ).not.toStrictEqual([]);
  });

  it("accepts ConfirmDialog usage", () => {
    expect.hasAssertions();
    expect(
      browserConfirmViolations(
        'export const ask = () => <ConfirmDialog title="削除しますか？" confirmLabel="削除する" />;\n',
      ),
    ).toStrictEqual([]);
  });

  it("accepts visible controls without hover reveal", () => {
    expect.hasAssertions();
    expect(
      hoverOnlyActionViolations(
        'export const Row = () => <button type="button" className="opacity-100">削除</button>;\n',
      ),
    ).toStrictEqual([]);
    expect(
      hoverOnlyActionViolations(
        'export const Row = () => <button type="button" className="">削除</button>;\n',
      ),
    ).toStrictEqual([]);
  });

  it("keeps shipped UI free of captcha, browser confirm, and hover-only actions", () =>
    Effect.runPromise(
      Effect.gen(function* shippedUiViolations() {
        expect.hasAssertions();
        const filesystem = yield* FileSystem.FileSystem;
        const paths = yield* Path.Path;
        const files = Object.keys(shippedModules)
          .map((file) => file.replace(/^(?:\.\.\/)+/u, ""))
          .filter(
            (file) =>
              !file.includes(".stories.") &&
              !file.includes(".test.") &&
              !file.endsWith("routeTree.gen.ts"),
          )
          .toSorted();
        const violations = yield* Effect.forEach(files, (file) =>
          Effect.gen(function* fileViolations() {
            const absolute = paths.join(repositoryRoot, file);
            if (!(yield* pathExists(absolute))) {
              return [];
            }
            return shippedUiRuleViolations(yield* filesystem.readFileString(absolute)).map(
              (violation) => `${file}: ${violation}`,
            );
          }),
        );
        expect(violations.flat()).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));
});
