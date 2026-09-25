---
description: "Disallow a function handed to `mapError` or to the `catch` of a `try` object that builds a new failure without passing on the failure it received, so the original failure stays in the `cause` chain instead of being replaced by one that says only where it happened"
---

# no-dropped-cause--pass-the-failure-as-cause

<!-- BEGIN GENERATED rule-header -->

Disallow a function handed to `mapError` or to the `catch` of a `try` object that builds a new failure without passing on the failure it received, so the original failure stays in the `cause` chain instead of being replaced by one that says only where it happened

- Tool: `oxlint`
- Fixable: no
- Suggestions: no
- Options: no
- Bundle: `mutation-and-failure`
- Source: [`no-dropped-cause--pass-the-failure-as-cause.ts`](../../src/features/dont-review-it/lint/oxlint/rules/mutation-and-failure/no-dropped-cause--pass-the-failure-as-cause.ts)

<!-- END GENERATED rule-header -->

## Violation

A function handed to `mapError`, or given as the `catch` of an object that also has `try` (the argument of `Effect.try` and `Effect.tryPromise`), that builds a new failure without passing on the failure it received. The function is reported when it takes no parameter, when its first parameter is a pattern, or when the parameter is only read through a member, `String`, a template or a comparison. Passing the parameter as `cause`, handing it whole to a call or `new`, or returning it unchanged on a branch all count as passing it on.

A function passed by name is read from its declaration in the same file, and so is the function returned by a factory called in place. A function imported from another module is not read.

The original failure is the only record of what went wrong below this layer. A new failure that says only where it happened turns every lower failure into the same report, and whoever reads it can no longer tell a timeout from a refusal or a malformed answer.

## Fix

Take the failure as the first parameter and put it in the new failure as `cause`: `Effect.mapError((cause) => new ReadFailed({ cause }))`. Give the failure class a `cause: Schema.optionalKey(Schema.Defect())` field when it has none. When a helper builds the failure, give the helper a `cause` parameter and pass the failure to it.

<!-- BEGIN GENERATED examples -->

Code this rule rejects.

```ts
// mapping a failure into a new one without receiving it is reported
const read = load.pipe(Effect.mapError(() => new ReadFailed()));
```

```ts
// a try object whose catch ignores what it caught is reported
const sent = Effect.tryPromise({
  catch: () => new SendFailed({ reason: 'unreachable' }),
  try: () => send(),
});
```

Code this rule accepts.

```ts
// mapping a failure into a new one that carries it as cause keeps the chain
const read = load.pipe(Effect.mapError((cause) => new ReadFailed({ cause })));
```

```ts
// a try object whose catch carries the failure as cause keeps the chain
const sent = Effect.tryPromise({
  catch: (cause) => new SendFailed({ cause, reason: 'unreachable' }),
  try: () => send(),
});
```

<!-- END GENERATED examples -->

### Forbidden bypasses (do not do this)

- Keeping only `String(cause)` or `cause.message` in a text field. The kind of the failure and its own `cause` are lost the same way
- Moving the wrapper into a module of its own so that its declaration is not read. The failure is still dropped

## Messages

<!-- BEGIN GENERATED messages -->

| messageId | Text |
| --- | --- |
| `droppedCause` | A function that turns one failure into another must not leave the failure it received behind. Take the failure as its first parameter and put it in the new failure as \`cause\`, or hand it whole to the function that builds the new failure. |

<!-- END GENERATED messages -->

## Runtime Selection

<!-- BEGIN GENERATED runtime -->

This rule runs as an oxlint JS plugin, in the same pass as every other rule the workspace ships. It reads no options. A consumer turns it on or off as a whole.

<!-- END GENERATED runtime -->
