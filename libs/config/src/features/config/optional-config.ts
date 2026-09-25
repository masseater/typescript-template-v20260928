import { Config, Option } from "effect";

const optionalConfig = <Value>(config: Config.Config<Value>): Config.Config<Value | undefined> =>
  Config.option(config).pipe(Config.map(Option.getOrUndefined));

export { optionalConfig };
