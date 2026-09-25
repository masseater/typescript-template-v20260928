import { fetchedFailure, settledData, type FetchedValue } from "./fetched-value";
import { LoadingRow } from "./loading-row";
import { RetryableFailure } from "./retryable-failure";
import { Table } from "./shared/ui/table";
import { TableBody } from "./shared/ui/table-body";
import { TableHead } from "./shared/ui/table-head";
import { TableHeader } from "./shared/ui/table-header";
import { TableRow } from "./shared/ui/table-row";

import type { ReactElement } from "react";

const RequestTable = <Listed,>({
  columns,
  listing,
  onReload,
  row,
}: Readonly<{
  columns: readonly string[];
  listing: FetchedValue<readonly Listed[]>;
  onReload: () => void;
  row: (listed: Listed) => ReactElement;
}>): ReactElement => {
  const failure = fetchedFailure(listing);
  if (failure !== undefined) {
    return (
      <RetryableFailure onRetry={onReload}>
        {"一覧を取得できませんでした。"}
        {failure}
      </RetryableFailure>
    );
  }
  const loaded = settledData(listing);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loaded === undefined ? (
          <LoadingRow columnCount={columns.length} />
        ) : (
          loaded.map((listed) => row(listed))
        )}
      </TableBody>
    </Table>
  );
};

export { RequestTable };
