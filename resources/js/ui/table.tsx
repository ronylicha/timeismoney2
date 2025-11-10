import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

interface TableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  colSpan?: number;
}

export const Table: React.FC<TableProps> = ({ children, className = '', ...props }) => {
  return (
    <div className="w-full overflow-auto">
      <table
        className={`w-full border-collapse border border-gray-200 ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '', ...props }) => {
  return (
    <thead className={`bg-gray-50 ${className}`} {...props}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableBodyProps> = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`bg-white divide-y divide-gray-200 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<TableRowProps> = ({ children, className = '', ...props }) => {
  return (
    <tr className={`hover:bg-gray-50 ${className}`} {...props}>
      {children}
    </tr>
  );
};

export const TableHead: React.FC<TableHeadProps> = ({ children, className = '', ...props }) => {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableCell: React.FC<TableCellProps> = ({ children, className = '', ...props }) => {
  return (
    <td className={`px-4 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`} {...props}>
      {children}
    </td>
  );
};