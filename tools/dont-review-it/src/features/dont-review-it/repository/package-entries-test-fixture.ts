import { repositoryRoot } from "@repo/config/repository-root";
import { Effect } from "effect";
import { parseSync } from "oxc-parser";

import { type TreeScan } from "../platform/directory-entries.ts";
import { posixPath } from "../platform/path.ts";
import { field, workspaceManifests, type WorkspaceManifest } from "./dependencies-test-fixture.ts";
import { repositorySources, type SourceText } from "./single-consumer-test-fixture.ts";

import type { Program } from "oxc-parser";

interface Finding {
  readonly id: string;
  readonly message: string;
}

const scriptExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);

const everyName = "*";

const isScript = (file: string): boolean => scriptExtensions.has(posixPath.extname(file));

const isTestSupport = (file: string): boolean => /(?:\.test\.|-test-fixture\.)/u.test(file);

type Statement = Program["body"][number];

const programOf = (file: string, text: string): Program => parseSync(file, text).program;

const nameOf = (node: {
  readonly type: string;
  readonly name?: string;
  readonly value?: unknown;
}) => (node.type === "Identifier" ? (node.name ?? "") : String(node.value));

const declaredNames = (declaration: Statement): readonly string[] => {
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((declarator) =>
      declarator.id.type === "Identifier" ? [declarator.id.name] : [],
    );
  }
  return "id" in declaration && declaration.id !== null && declaration.id.type === "Identifier"
    ? [declaration.id.name]
    : [];
};

const sourceIndexOf = (sources: readonly SourceText[]): ReadonlyMap<string, string> =>
  new Map(sources.map((source) => [source.file, source.text]));

const resolvedRelative = (
  file: string,
  specifier: string,
  sources: ReadonlyMap<string, string>,
): string | undefined => {
  const base = posixPath.join(posixPath.dirname(file), specifier);
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) =>
    sources.has(candidate),
  );
};

type Origins = ReadonlyMap<string, string>;

const originThrough = (
  file: string,
  specifier: string,
  name: string,
  context: Readonly<{ sources: ReadonlyMap<string, string>; visited: ReadonlySet<string> }>,
): string => {
  if (!specifier.startsWith(".")) {
    return `${specifier}#${name}`;
  }
  const target = resolvedRelative(file, specifier, context.sources);
  return target === undefined
    ? `${posixPath.join(posixPath.dirname(file), specifier)}#${name}`
    : (exportOrigins(target, context.sources, context.visited).get(name) ?? `${target}#${name}`);
};

const importedBindings = (
  program: Program,
): ReadonlyMap<string, Readonly<{ specifier: string; name: string }>> =>
  new Map(
    program.body.flatMap((statement) =>
      statement.type === "ImportDeclaration"
        ? statement.specifiers.map(
            (specifier) =>
              [
                specifier.local.name,
                {
                  name:
                    specifier.type === "ImportSpecifier"
                      ? nameOf(specifier.imported)
                      : specifier.type === "ImportDefaultSpecifier"
                        ? "default"
                        : everyName,
                  specifier: statement.source.value,
                },
              ] as const,
          )
        : [],
    ),
  );

const exportOrigins = (
  file: string,
  sources: ReadonlyMap<string, string>,
  visited: ReadonlySet<string> = new Set(),
): Origins => {
  const text = sources.get(file);
  if (text === undefined || visited.has(file)) {
    return new Map();
  }
  const context = { sources, visited: new Set([...visited, file]) };
  const program = programOf(file, text);
  const imported = importedBindings(program);
  const localOrigin = (name: string): string => {
    const binding = imported.get(name);
    return binding === undefined
      ? `${file}#${name}`
      : originThrough(file, binding.specifier, binding.name, context);
  };
  return new Map(
    program.body.flatMap((statement): readonly (readonly [string, string])[] => {
      if (statement.type === "ExportDefaultDeclaration") {
        return [["default", `${file}#default`]];
      }
      if (statement.type === "ExportAllDeclaration") {
        if (statement.exported !== null) {
          return [[nameOf(statement.exported), `${file}#${nameOf(statement.exported)}`]];
        }
        const target = statement.source.value.startsWith(".")
          ? resolvedRelative(file, statement.source.value, sources)
          : undefined;
        return target === undefined ? [] : [...exportOrigins(target, sources, context.visited)];
      }
      if (statement.type !== "ExportNamedDeclaration") {
        return [];
      }
      if (statement.declaration !== null) {
        return declaredNames(statement.declaration).map((name) => [name, `${file}#${name}`]);
      }
      const source = statement.source?.value;
      return statement.specifiers.map((specifier) => [
        nameOf(specifier.exported),
        source === undefined
          ? localOrigin(nameOf(specifier.local))
          : originThrough(file, source, nameOf(specifier.local), context),
      ]);
    }),
  );
};

const identifiersIn = (node: unknown, found: Set<string>): ReadonlySet<string> => {
  if (Array.isArray(node)) {
    for (const child of node) {
      identifiersIn(child, found);
    }
  } else if (typeof node === "object" && node !== null) {
    if (field(node, "type") === "Identifier") {
      found.add(String(field(node, "name")));
    }
    for (const child of Object.values(node)) {
      identifiersIn(child, found);
    }
  }
  return found;
};

const unwrappedDeclaration = (statement: Statement): Statement | undefined => {
  if (statement.type === "ExportNamedDeclaration") {
    return statement.declaration ?? undefined;
  }
  return statement.type === "ExportDefaultDeclaration" ? undefined : statement;
};

const locallyExported = (program: Program): ReadonlySet<string> =>
  new Set(
    program.body.flatMap((statement): readonly string[] => {
      if (statement.type !== "ExportNamedDeclaration" || statement.source !== null) {
        return [];
      }
      return statement.declaration === null
        ? statement.specifiers.map((specifier) => nameOf(specifier.local))
        : declaredNames(statement.declaration);
    }),
  );

const signatureTypes = (
  file: string,
  sources: ReadonlyMap<string, string>,
): ReadonlySet<string> => {
  const text = sources.get(file);
  if (text === undefined) {
    return new Set();
  }
  const program = programOf(file, text);
  const exported = locallyExported(program);
  const declarations = program.body.flatMap((statement) => unwrappedDeclaration(statement) ?? []);
  const typeNames = new Set(
    declarations
      .filter(
        (declaration) =>
          declaration.type === "TSTypeAliasDeclaration" ||
          declaration.type === "TSInterfaceDeclaration",
      )
      .flatMap(declaredNames),
  );
  const referenced = declarations
    .filter((declaration) => declaredNames(declaration).some((name) => exported.has(name)))
    .flatMap((declaration) => {
      const own = new Set(declaredNames(declaration));
      return [...identifiersIn(declaration, new Set())].filter((name) => !own.has(name));
    });
  return new Set(referenced.filter((name) => typeNames.has(name)));
};

const namedBySignature = (origin: string, sources: ReadonlyMap<string, string>): boolean => {
  const separator = origin.lastIndexOf("#");
  return signatureTypes(origin.slice(0, separator), sources).has(origin.slice(separator + 1));
};

const literalValue = (node: unknown): string | undefined => {
  const value = field(node, "value");
  return field(node, "type") === "Literal" && typeof value === "string" ? value : undefined;
};

const calleeText = (callee: unknown): string => {
  if (field(callee, "type") === "Identifier") {
    return String(field(callee, "name"));
  }
  if (field(callee, "type") === "MetaProperty") {
    return "import.meta";
  }
  return field(callee, "type") === "MemberExpression"
    ? `${calleeText(field(callee, "object"))}.${calleeText(field(callee, "property"))}`
    : "";
};

const loaderCallees = new Set(["require", "require.resolve", "import.meta.resolve"]);

const loadedSpecifier = (node: unknown): string | undefined => {
  const type = field(node, "type");
  if (type === "ImportExpression") {
    return literalValue(field(node, "source"));
  }
  if (type === "TSImportType") {
    const argument = field(node, "argument");
    return literalValue(field(argument, "literal") ?? argument);
  }
  if (type === "CallExpression" && loaderCallees.has(calleeText(field(node, "callee")))) {
    const [first] = Array.isArray(field(node, "arguments"))
      ? (field(node, "arguments") as unknown[])
      : [];
    return literalValue(first);
  }
  const key = field(node, "key");
  return type === "Property" && field(key, "name") === "specifier"
    ? literalValue(field(node, "value"))
    : undefined;
};

const loadedSpecifiers = (node: unknown, found: string[]): void => {
  if (Array.isArray(node)) {
    for (const child of node) {
      loadedSpecifiers(child, found);
    }
    return;
  }
  if (typeof node !== "object" || node === null) {
    return;
  }
  const loaded = loadedSpecifier(node);
  if (loaded !== undefined) {
    found.push(loaded);
  }
  for (const child of Object.values(node)) {
    loadedSpecifiers(child, found);
  }
};

type Consumed = ReadonlyMap<string, ReadonlySet<string>>;

const importedName = (
  specifier: Extract<Statement, { type: "ImportDeclaration" }>["specifiers"][number],
): string => {
  if (specifier.type === "ImportSpecifier") {
    return nameOf(specifier.imported);
  }
  return specifier.type === "ImportDefaultSpecifier" ? "default" : everyName;
};

const declaredConsumption = (
  statement: Statement,
): readonly (readonly [string, string])[] | undefined => {
  if (statement.type === "ImportDeclaration") {
    return statement.specifiers.map(
      (specifier) => [statement.source.value, importedName(specifier)] as const,
    );
  }
  if (statement.type === "ExportNamedDeclaration" && statement.source !== null) {
    const { source } = statement;
    return statement.specifiers.map(
      (specifier) => [source.value, nameOf(specifier.local)] as const,
    );
  }
  return statement.type === "ExportAllDeclaration"
    ? [[statement.source.value, everyName]]
    : undefined;
};

const consumedNames = (file: string, text: string): Consumed => {
  const program = programOf(file, text);
  const declared = program.body.map((statement) => declaredConsumption(statement));
  const loaded: string[] = [];
  loadedSpecifiers(
    program.body.filter((_statement, position) => declared[position] === undefined),
    loaded,
  );
  const pairs = [
    ...declared.flatMap((consumption) => consumption ?? []),
    ...loaded.map((specifier) => [specifier, everyName] as const),
  ];
  return new Map(
    [...Map.groupBy(pairs, ([specifier]) => specifier)].map(
      ([specifier, taken]) => [specifier, new Set(taken.map(([, name]) => name))] as const,
    ),
  );
};

interface Entry {
  readonly packageDirectory: string;
  readonly specifier: string;
  readonly target: string;
}

const scriptTarget = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return isScript(value) ? value : undefined;
  }
  return typeof value === "object" && value !== null
    ? Object.values(value)
        .map(scriptTarget)
        .find((target) => target !== undefined)
    : undefined;
};

const entriesOf = (workspace: WorkspaceManifest): readonly Entry[] => {
  const name = field(workspace.manifest, "name");
  const exportsField = field(workspace.manifest, "exports");
  if (typeof name !== "string" || typeof exportsField !== "object" || exportsField === null) {
    return [];
  }
  const packageDirectory = posixPath.dirname(workspace.file);
  return Object.entries(exportsField).flatMap(([key, value]): readonly Entry[] => {
    const target = scriptTarget(value);
    return target === undefined || key.includes("*")
      ? []
      : [
          {
            packageDirectory,
            specifier: key === "." ? name : `${name}/${key.slice(2)}`,
            target: posixPath.join(packageDirectory, target),
          },
        ];
  });
};

const consumersOf = (
  entry: Entry,
  consumed: ReadonlyMap<string, Consumed>,
): ReadonlySet<string> => {
  const names = new Set<string>();
  const testSupportCounts = isTestSupport(entry.target);
  for (const [file, specifiers] of consumed) {
    if (
      file.startsWith(`${entry.packageDirectory}/`) ||
      (!testSupportCounts && isTestSupport(file))
    ) {
      continue;
    }
    for (const name of specifiers.get(entry.specifier) ?? []) {
      names.add(name);
    }
  }
  return names;
};

const unconsumedExportFindings = (
  workspaces: readonly WorkspaceManifest[],
  sources: readonly SourceText[],
): readonly Finding[] => {
  const index = sourceIndexOf(sources);
  const consumed = new Map(
    sources
      .filter((source) => isScript(source.file))
      .map((source) => [source.file, consumedNames(source.file, source.text)] as const),
  );
  return workspaces
    .filter((workspace) => field(workspace.manifest, "private") === true)
    .flatMap(entriesOf)
    .flatMap((entry): readonly Finding[] => {
      const used = consumersOf(entry, consumed);
      if (used.has(everyName)) {
        return [];
      }
      const who = isTestSupport(entry.target) ? "パッケージの外" : "パッケージの外のテスト以外";
      return [...exportOrigins(entry.target, index)]
        .filter(([name, origin]) => !used.has(name) && !namedBySignature(origin, index))
        .map(([name]) => name)
        .map((name) => ({
          id: `${entry.specifier}#${name}`,
          message: `${entry.target}: ${entry.specifier} の ${name} は${who}から import されていません。利用者のいない export は外し、テストは利用者が通る入口越しに書きます。`,
        }));
    })
    .toSorted((left, right) => left.id.localeCompare(right.id));
};

const repositoryUnconsumedExportFindings: TreeScan<readonly Finding[]> = Effect.map(
  repositorySources(repositoryRoot),
  (sources) => unconsumedExportFindings(workspaceManifests, sources),
);

export { repositoryUnconsumedExportFindings, unconsumedExportFindings };
