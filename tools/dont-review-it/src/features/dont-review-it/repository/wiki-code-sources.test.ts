import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Path } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { repositoryRoot } from "./repository-root.ts";
import { codeSourceFiles, codeSourceProblems } from "./wiki-code-sources.ts";

const sources: Readonly<Record<string, string>> = {
  "libs/db/src/features/db/admin.ts":
    "const change = () => {\n  const audit = 1;\n  return database.batch([audit, transition] as const);\n};\n",
};

const sourceText = (source: string): string | undefined => sources[source];

describe("code examples in the wiki", () => {
  it("reports an example without a source and one whose lines the source does not have", () => {
    expect(
      codeSourceProblems(
        "tech-stack/drizzle.md",
        [
          "```ts",
          "await db.batch([",
          "  db.insert(user).values({ id, name }),",
          "]);",
          "```",
          "",
          '```ts title="libs/db/src/features/db/admin.ts"',
          "await db.batch([]);",
          "```",
          "",
          '```yaml title="infra/collector.yaml"',
          "receivers: {}",
          "```",
        ].join("\n"),
        sourceText,
      ),
    ).toStrictEqual([
      "tech-stack/drizzle.md: 出典の無いコード例（await db.batch([）",
      "tech-stack/drizzle.md: libs/db/src/features/db/admin.ts に無い行を含むコード例（await db.batch([]);）",
      "tech-stack/drizzle.md: 出典 infra/collector.yaml が無い",
    ]);
  });

  it("accepts an excerpt whose lines appear in the source in the same order and leaves other languages alone", () => {
    expect(
      codeSourceProblems(
        "tech-stack/drizzle.md",
        [
          '```ts title="libs/db/src/features/db/admin.ts"',
          "const change = () => {",
          "    return database.batch([audit, transition] as const);",
          "```",
          "",
          "```mermaid",
          "flowchart TD",
          "```",
          "",
          "```sh",
          "vp install",
          "```",
        ].join("\n"),
        sourceText,
      ),
    ).toStrictEqual([]);
  });

  it("reports lines that appear in the source only in another order", () => {
    expect(
      codeSourceProblems(
        "tech-stack/drizzle.md",
        [
          '```ts title="libs/db/src/features/db/admin.ts"',
          "return database.batch([audit, transition] as const);",
          "const audit = 1;",
          "```",
        ].join("\n"),
        sourceText,
      ),
    ).toStrictEqual([
      "tech-stack/drizzle.md: libs/db/src/features/db/admin.ts に無い行を含むコード例（return database.batch([audit, transition] as const);）",
    ]);
  });
});

describe("code examples in the repository wiki", () => {
  it("each come from the file their title names", () =>
    Effect.runPromise(
      Effect.gen(function* repositoryWiki() {
        const filesystem = yield* FileSystem.FileSystem;
        const paths = yield* Path.Path;
        const docsRoot = paths.join(repositoryRoot, "apps/internal-dashboard/content/docs");
        const documents = (yield* filesystem.readDirectory(docsRoot, { recursive: true })).filter(
          (file) => file.endsWith(".md"),
        );
        const texts = yield* Effect.forEach(documents, (file) =>
          Effect.map(filesystem.readFileString(paths.join(docsRoot, file)), (markdown) => ({
            file,
            markdown,
          })),
        );
        const titled = new Set(texts.flatMap(({ markdown }) => codeSourceFiles(markdown)));
        const sourceTexts = new Map(
          yield* Effect.forEach([...titled], (source) =>
            Effect.gen(function* readSource() {
              const sourcePath = paths.join(repositoryRoot, source);
              return [
                source,
                (yield* filesystem.exists(sourcePath))
                  ? yield* filesystem.readFileString(sourcePath)
                  : undefined,
              ] as const;
            }),
          ),
        );
        expect(documents.length).toBeGreaterThan(0);
        expect(
          texts.flatMap(({ file, markdown }) =>
            codeSourceProblems(file, markdown, (source) => sourceTexts.get(source)),
          ),
        ).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));
});
