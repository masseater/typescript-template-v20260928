import { remark } from "remark";

import type { Code, Nodes } from "mdast";

const checkedLanguages: ReadonlySet<string> = new Set(["js", "sql", "ts", "tsx", "yaml"]);

type CodeSource = Readonly<{ code: string; source: string | undefined }>;

type SourceText = (source: string) => string | undefined;

const codeNodes = (node: Nodes): readonly Code[] => {
  if (node.type === "code") return [node];
  if (!("children" in node)) return [];
  const children: readonly Nodes[] = node.children;
  return children.flatMap((child) => codeNodes(child));
};

const titleOf = (meta: string | null | undefined): string | undefined =>
  /(?:^|\s)title="(?<title>[^"]+)"/u.exec(meta ?? "")?.groups?.["title"];

const checkedCodeSources = (markdown: string): readonly CodeSource[] =>
  codeNodes(remark().parse(markdown))
    .filter((node) => checkedLanguages.has(node.lang ?? ""))
    .map((node) => ({ code: node.value, source: titleOf(node.meta) }));

const meaningfulLines = (text: string): readonly string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

const appearsInOrder = (excerpt: readonly string[], source: readonly string[]): boolean => {
  const [first, ...rest] = excerpt;
  if (first === undefined) return true;
  const found = source.indexOf(first);
  return found !== -1 && appearsInOrder(rest, source.slice(found + 1));
};

const codeSourceProblems = (
  file: string,
  markdown: string,
  sourceText: SourceText,
): readonly string[] =>
  checkedCodeSources(markdown).flatMap(({ code, source }) => {
    const [firstLine = ""] = meaningfulLines(code);
    if (source === undefined) return [`${file}: 出典の無いコード例（${firstLine}）`];
    const text = sourceText(source);
    if (text === undefined) return [`${file}: 出典 ${source} が無い`];
    return appearsInOrder(meaningfulLines(code), meaningfulLines(text))
      ? []
      : [`${file}: ${source} に無い行を含むコード例（${firstLine}）`];
  });

const codeSourceFiles = (markdown: string): readonly string[] =>
  checkedCodeSources(markdown).flatMap(({ source }) => (source === undefined ? [] : [source]));

export { codeSourceFiles, codeSourceProblems };
