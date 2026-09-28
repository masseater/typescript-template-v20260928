import { Effect, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

const docsDirectory = "../../../../internal-dashboard/content/docs/";

const documentFiles = Object.keys(
  import.meta.glob("../../../../internal-dashboard/content/docs/**/*.md", { query: "?raw" }),
);

const navigationFiles: Readonly<Record<string, unknown>> = import.meta.glob(
  "../../../../internal-dashboard/content/docs/**/meta.json",
  { eager: true, import: "default" },
);

const Navigation = Schema.Struct({ pages: Schema.Array(Schema.String) });

type Directory = Readonly<{ children: readonly string[]; pages: readonly string[] | undefined }>;

const restMarkers: ReadonlySet<string> = new Set(["...", "z...a"]);

function directoryOf(relative: string): string {
  return relative.includes("/") ? relative.slice(0, relative.lastIndexOf("/")) : "";
}

function directories(
  documents: readonly string[],
  navigations: Readonly<Record<string, typeof Navigation.Type>>,
): ReadonlyMap<string, Directory> {
  const relativeDocuments = documents.map((file) => file.slice(docsDirectory.length));
  const names = new Set([
    "",
    ...relativeDocuments.flatMap((file) => {
      const parts = directoryOf(file).split("/").filter(Boolean);
      return parts.map((_part, index) => parts.slice(0, index + 1).join("/"));
    }),
  ]);
  return new Map(
    [...names].map((name) => {
      const prefix = name === "" ? "" : `${name}/`;
      const children = [
        ...new Set(
          relativeDocuments
            .filter((file) => file.startsWith(prefix))
            .map((file) => file.slice(prefix.length).split("/")[0] ?? "")
            .map((child) => child.replace(/\.md$/u, "")),
        ),
      ].toSorted();
      const pages = navigations[`${docsDirectory}${prefix}meta.json`]?.pages;
      return [name, { children, pages }] as const;
    }),
  );
}

function navigationProblems(tree: ReadonlyMap<string, Directory>): readonly string[] {
  return [...tree].flatMap(([name, { children, pages }]) => {
    if (pages === undefined) return [];
    const listed = pages.filter(
      (entry) => !restMarkers.has(entry) && !entry.startsWith("---") && !entry.startsWith("["),
    );
    const excluded = new Set(
      listed.filter((entry) => entry.startsWith("!")).map((entry) => entry.slice(1)),
    );
    const named = new Set(listed.filter((entry) => !entry.startsWith("!")));
    const rest = pages.some((entry) => restMarkers.has(entry));
    const where = name === "" ? "meta.json" : `${name}/meta.json`;
    return [
      ...[...named, ...excluded]
        .filter((entry) => !children.includes(entry))
        .map((entry) => `${where}: ${entry} が無い`),
      ...(rest
        ? []
        : children
            .filter((child) => !named.has(child) && !excluded.has(child))
            .map((child) => `${where}: ${child} がナビゲーションに無い`)),
    ];
  });
}

describe("wiki navigation", () => {
  it("reports a document left out of its meta.json and an entry without a document", () => {
    expect(
      navigationProblems(
        new Map([
          [
            "plans",
            { children: ["architecture-diagram", "modernization"], pages: ["modernization"] },
          ],
          ["pages", { children: ["member-privacy"], pages: ["member-privacy", "member-gone"] }],
        ]),
      ),
    ).toStrictEqual([
      "plans/meta.json: architecture-diagram がナビゲーションに無い",
      "pages/meta.json: member-gone が無い",
    ]);
  });

  it("lets the rest marker pick up the documents it does not name", () => {
    expect(
      navigationProblems(new Map([["plans", { children: ["a", "b"], pages: ["b", "..."] }]])),
    ).toStrictEqual([]);
  });

  it("shows every document of the wiki", async () => {
    const navigations = await Effect.runPromise(
      Schema.decodeUnknownEffect(Schema.Record(Schema.String, Navigation))(navigationFiles),
    );
    const tree = directories(documentFiles, navigations);
    expect(tree.size).toBeGreaterThan(1);
    expect(navigationProblems(tree)).toStrictEqual([]);
  });
});
