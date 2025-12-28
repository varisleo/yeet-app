export type SortOrder = 'ASC' | 'DESC';

export interface SortParams {
  sortBy: string;
  sortOrder: SortOrder;
}

const VALID_USER_SORT_FIELDS = ['username', 'balance', 'createdAt', 'status'];
const DEFAULT_SORT_FIELD = 'createdAt';
const DEFAULT_SORT_ORDER: SortOrder = 'DESC';

export function parseSortParams(
  query: { sortBy?: string; sortOrder?: string },
  validFields: string[] = VALID_USER_SORT_FIELDS,
  defaultField: string = DEFAULT_SORT_FIELD
): SortParams {
  const sortBy = validFields.includes(query.sortBy || '') ? query.sortBy! : defaultField;
  const sortOrder: SortOrder =
    query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : DEFAULT_SORT_ORDER;

  return { sortBy, sortOrder };
}

export function getValidUserSortFields(): string[] {
  return [...VALID_USER_SORT_FIELDS];
}
