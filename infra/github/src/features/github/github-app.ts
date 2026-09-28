import { isResolved } from "alchemy/Diff";
import { type Providers, GitHubCredentials } from "alchemy/GitHub";
import * as Provider from "alchemy/Provider";
import { type Resource as ResourceType, Resource } from "alchemy/Resource";
import { Duration, Effect, type Layer } from "effect";

import { ensureInstallation, uninstall } from "./app-installation.ts";
import { holdsPkcs8Key, pkcs8PrivateKey } from "./app-private-key.ts";
import {
  type AppDefinition,
  type RegisteredApp,
  registerApp,
  replacesApp,
} from "./app-registration.ts";

type GitHubApp = ResourceType<"Repo.GitHubApp", AppDefinition, RegisteredApp, never, Providers>;

const GitHubApp = Resource<GitHubApp>("Repo.GitHubApp");

const pollInterval = Duration.seconds(3);
const humanStepTimeout = Duration.minutes(15);

const appChange = (
  replaced: boolean,
  registered: RegisteredApp | undefined,
): { readonly action: "replace" | "update" } | undefined => {
  if (replaced) {
    return { action: "replace" };
  }
  return registered?.installationId === undefined || !holdsPkcs8Key(registered.privateKey)
    ? { action: "update" }
    : undefined;
};

const gitHubAppProvider = (): Layer.Layer<Provider.Provider<GitHubApp>, never, GitHubCredentials> =>
  Provider.succeed(GitHubApp, {
    delete: Effect.fn(function* deleteGitHubApp({ output, session }) {
      if (output.installationId !== undefined) {
        yield* uninstall(
          { appId: output.appId, privateKey: yield* pkcs8PrivateKey(output.privateKey) },
          output.installationId,
        );
      }
      yield* session.note(
        `GitHub has no API to delete an App; delete ${output.slug} from its GitHub settings`,
      );
    }),
    diff: ({ news, olds, output }) =>
      Effect.succeed(appChange(isResolved(news) && replacesApp(olds, news), output)),
    reconcile: Effect.fn(function* reconcileGitHubApp({ news, output, session }) {
      const credentials = yield* yield* GitHubCredentials;
      const wait = { announce: session.note, pollInterval, timeout: humanStepTimeout };
      if (output === undefined) {
        return yield* registerApp(news, {
          manifestTimeout: humanStepTimeout,
          token: credentials.token,
          wait,
        });
      }
      const privateKey = yield* pkcs8PrivateKey(output.privateKey);
      const installationId = yield* ensureInstallation({
        address: news,
        app: { appId: output.appId, privateKey },
        slug: output.slug,
        token: credentials.token,
        wait,
      });
      return { ...output, installationId, privateKey };
    }),
  });

export { GitHubApp, gitHubAppProvider };
