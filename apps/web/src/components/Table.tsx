/**
 * Table Component
 * Reusable data table with consistent styling
 */

interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
  className = '',
}: TableProps<T>): JSX.Element {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-secondary">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-bg-page">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-border">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="hover:bg-bg-page transition">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 text-sm text-copy">
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
