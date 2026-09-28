import { Effect, FileSystem, Path } from "effect";
import { parseSync } from "oxc-parser";
import { remark } from "remark";

import type { Nodes } from "mdast";

type RouteKind = "redirect" | "screen" | "server";

type AppRoute = Readonly<{ fullPath: string; kind: RouteKind }>;

type DocumentUrls = Readonly<{ file: string; urls: readonly string[] }>;

type AstNode = Readonly<Record<string, unknown>>;

const isNode = (candidate: unknown): candidate is AstNode =>
  typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);

const childNodes = (node: AstNode): readonly AstNode[] =>
  Object.entries(node).flatMap(([key, child]) => {
    if (key === "parent") return [];
    if (Array.isArray(child)) return child.filter(isNode);
    return isNode(child) ? [child] : [];
  });

const allNodes = (root: AstNode): readonly AstNode[] => [
  root,
  ...childNodes(root).flatMap((child) => allNodes(child)),
];

const identifierName = (candidate: unknown): string | undefined =>
  isNode(candidate) && candidate["type"] === "Identifier" && typeof candidate["name"] === "string"
    ? candidate["name"]
    : undefined;

const stringValue = (candidate: unknown): string | undefined =>
  isNode(candidate) && typeof candidate["value"] === "string" ? candidate["value"] : undefined;

const routeImports = (nodes: readonly AstNode[]): ReadonlyMap<string, string> =>
  new Map(
    nodes
      .filter((node) => node["type"] === "ImportDeclaration")
      .flatMap((node) => {
        const source = stringValue(node["source"]);
        const specifiers = Array.isArray(node["specifiers"]) ? node["specifiers"] : [];
        return source === undefined
          ? []
          : specifiers.flatMap((specifier: unknown) => {
              const local = isNode(specifier) ? identifierName(specifier["local"]) : undefined;
              return local === undefined ? [] : [[local, source] as const];
            });
      }),
  );

const derivedFrom = (nodes: readonly AstNode[]): ReadonlyMap<string, string> =>
  new Map(
    nodes
      .filter((node) => node["type"] === "VariableDeclarator")
      .flatMap((node) => {
        const declared = identifierName(node["id"]);
        const initializer = node["init"];
        const callee = isNode(initializer) ? initializer["callee"] : undefined;
        const base = isNode(callee) ? identifierName(callee["object"]) : undefined;
        return declared === undefined || base === undefined ? [] : [[declared, base] as const];
      }),
  );

const fullPathRoutes = (nodes: readonly AstNode[]): readonly (readonly [string, string])[] =>
  nodes
    .filter(
      (node) =>
        node["type"] === "TSInterfaceDeclaration" &&
        identifierName(node["id"]) === "FileRoutesByFullPath",
    )
    .flatMap((node) => {
      const body = node["body"];
      const members = isNode(body) && Array.isArray(body["body"]) ? body["body"] : [];
      return members.flatMap((member: unknown) => {
        if (!isNode(member)) return [];
        const fullPath = stringValue(member["key"]);
        const annotation = member["typeAnnotation"];
        const query = isNode(annotation) ? annotation["typeAnnotation"] : undefined;
        const routeName = isNode(query) ? identifierName(query["exprName"]) : undefined;
        return fullPath === undefined || routeName === undefined
          ? []
          : [[fullPath, routeName] as const];
      });
    });

const importedSource = (
  routeName: string,
  derived: ReadonlyMap<string, string>,
  imports: ReadonlyMap<string, string>,
): string | undefined => {
  const source = imports.get(routeName);
  if (source !== undefined) return source;
  const base = derived.get(routeName);
  return base === undefined ? undefined : importedSource(base, derived, imports);
};

const routeKind = (file: string, source: string): RouteKind => {
  const options = allNodes(parseSync(file, source).program as unknown as AstNode)
    .filter((node) => {
      const callee = node["callee"];
      return (
        node["type"] === "CallExpression" &&
        isNode(callee) &&
        callee["type"] === "CallExpression" &&
        identifierName(callee["callee"]) === "createFileRoute"
      );
    })
    .flatMap((node) => (Array.isArray(node["arguments"]) ? node["arguments"] : []))
    .filter(isNode)
    .flatMap((argument) => (Array.isArray(argument["properties"]) ? argument["properties"] : []))
    .flatMap((property: unknown) => {
      const key = isNode(property) ? identifierName(property["key"]) : undefined;
      return key === undefined ? [] : [key];
    });
  if (options.includes("server")) return "server";
  return options.includes("component") ? "screen" : "redirect";
};

const appRoutes = (
  appDirectory: string,
): Effect.Effect<readonly AppRoute[], unknown, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* readAppRoutes() {
    const filesystem = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const treeFile = paths.join(appDirectory, "src/app/routeTree.gen.ts");
    const tree = allNodes(
      parseSync(treeFile, yield* filesystem.readFileString(treeFile)).program as unknown as AstNode,
    );
    const imports = routeImports(tree);
    const derived = derivedFrom(tree);
    return yield* Effect.forEach(fullPathRoutes(tree), ([fullPath, routeName]) =>
      Effect.gen(function* readRoute() {
        const source = importedSource(routeName, derived, imports) ?? "";
        const base = paths.join(paths.dirname(treeFile), source);
        const candidates = [`${base}.tsx`, `${base}.ts`];
        const existing = yield* Effect.filter(candidates, (candidate) =>
          filesystem.exists(candidate),
        );
        const [routeFile = ""] = existing;
        return {
          fullPath,
          kind: routeKind(routeFile, yield* filesystem.readFileString(routeFile)),
        };
      }),
    );
  });

const inlineUrls = (node: Nodes): readonly string[] => {
  if (node.type === "inlineCode") return node.value.startsWith("/") ? [node.value] : [];
  if (!("children" in node)) return [];
  const children: readonly Nodes[] = node.children;
  return children.flatMap((child) => inlineUrls(child));
};

const documentUrls = (markdown: string): readonly string[] => inlineUrls(remark().parse(markdown));

const placeholder = "{}";
const splat = "{*}";

const urlSegments = (url: string): readonly string[] =>
  (url.split(/[?#]/u)[0] ?? "")
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => (/^\{.*\}$/u.test(segment) ? placeholder : segment));

const routeSegments = (fullPath: string): readonly string[] =>
  fullPath
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => {
      if (segment === "$") return splat;
      return segment.startsWith("$") ? placeholder : segment;
    });

const segmentsMatch = (documented: readonly string[], routed: readonly string[]): boolean => {
  const [documentHead, ...documentRest] = documented;
  const [routeHead, ...routeRest] = routed;
  if (routeHead === undefined) return documentHead === undefined;
  if (routeHead === splat) {
    return (
      documented.length > 0 &&
      documented.every((documentSegment) => documentSegment === placeholder)
    );
  }
  if (documentHead === undefined || documentHead !== routeHead) return false;
  return segmentsMatch(documentRest, routeRest);
};

const matchesRoute = (url: string, route: AppRoute): boolean =>
  segmentsMatch(urlSegments(url), routeSegments(route.fullPath));

const standsForUrl = (route: AppRoute): boolean =>
  route.kind !== "server" || !routeSegments(route.fullPath).includes(splat);

const unroutedUrls = (
  documents: readonly DocumentUrls[],
  routes: readonly AppRoute[],
): readonly string[] =>
  documents.flatMap(({ file, urls }) =>
    urls
      .filter((url) => !routes.some((route) => standsForUrl(route) && matchesRoute(url, route)))
      .map((url) => `${file}: ${url}`),
  );

const undocumentedScreens = (
  documents: readonly DocumentUrls[],
  routes: readonly AppRoute[],
): readonly string[] =>
  routes
    .filter(
      (route) =>
        route.kind === "screen" &&
        !documents.some(({ urls }) => urls.some((url) => matchesRoute(url, route))),
    )
    .map((route) => route.fullPath);

export { appRoutes, documentUrls, undocumentedScreens, unroutedUrls };
export type { AppRoute, DocumentUrls, RouteKind };
