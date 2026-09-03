import type { ColumnType } from 'kysely';

export interface ElectricityDataRow {
  id: ColumnType<string, never, never>;
  date: string | null;
  starttime: ColumnType<Date, never, never> | null;
  productionamount: string | null;
  consumptionamount: string | null;
  hourlyprice: string | null;
}

export interface Database {
  electricitydata: ElectricityDataRow;
}
