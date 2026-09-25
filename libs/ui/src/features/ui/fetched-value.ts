type FetchedValue<Value> = Readonly<{
  data: Value | undefined;
  error: Readonly<{ message: string }> | null;
  isFetching: boolean;
}>;

const fetchedFailure = (fetched: FetchedValue<unknown>): string | undefined =>
  fetched.error?.message;

const settledData = <Value>(fetched: FetchedValue<Value>): Value | undefined =>
  fetched.isFetching ? undefined : fetched.data;

export { fetchedFailure, settledData };
export type { FetchedValue };
