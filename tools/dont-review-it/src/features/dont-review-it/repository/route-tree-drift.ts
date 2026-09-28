import { Effect, Schema } from "effect";
import { format } from "oxfmt";

const ROUTE_TREE = "src/app/routeTree.gen.ts";

class RouteTreeUnformattable extends Schema.TaggedError<RouteTreeUnformattable>()(
  "RouteTreeUnformattable",
  { side: Schema.String, detail: Schema.String },
) {
  public override get message(): string {
    return `The ${this.side} ${ROUTE_TREE} does not parse, so it cannot be compared: ${this.detail}`;
  }
}

const normalized = (side: string, source: string): Effect.Effect<string, RouteTreeUnformattable> =>
  Effect.flatMap(
    Effect.promise(() => format(ROUTE_TREE, source, {})),
    ({ code, errors }) =>
      errors.length === 0
        ? Effect.succeed(code)
        : Effect.fail(
            new RouteTreeUnformattable({
              side,
              detail: errors.map((error) => error.message).join("; "),
            }),
          ),
  );

const routeTreeDrifted = (sides: {
  readonly committed: string;
  readonly regenerated: string;
}): Effect.Effect<boolean, RouteTreeUnformattable> =>
  Effect.map(
    Effect.all([
      normalized("committed", sides.committed),
      normalized("regenerated", sides.regenerated),
    ]),
    ([committed, regenerated]) => committed !== regenerated,
  );

export { ROUTE_TREE, RouteTreeUnformattable, routeTreeDrifted };
