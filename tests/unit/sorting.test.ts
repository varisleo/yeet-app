import { parseSortParams, getValidUserSortFields } from '../../src/utils/sorting';

describe('Sorting Utils', () => {
  describe('parseSortParams', () => {
    it('should return default values when no params provided', () => {
      const result = parseSortParams({});

      expect(result).toEqual({
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
    });

    it('should parse valid sortBy field', () => {
      const result = parseSortParams({ sortBy: 'username' });

      expect(result.sortBy).toBe('username');
    });

    it('should parse valid sortOrder', () => {
      const result = parseSortParams({ sortOrder: 'asc' });
      expect(result.sortOrder).toBe('ASC');

      const result2 = parseSortParams({ sortOrder: 'ASC' });
      expect(result2.sortOrder).toBe('ASC');

      const result3 = parseSortParams({ sortOrder: 'desc' });
      expect(result3.sortOrder).toBe('DESC');
    });

    it('should reject invalid sortBy field', () => {
      const result = parseSortParams({ sortBy: 'invalidField' });

      expect(result.sortBy).toBe('createdAt');
    });

    it('should default to DESC for invalid sortOrder', () => {
      const result = parseSortParams({ sortOrder: 'invalid' });

      expect(result.sortOrder).toBe('DESC');
    });

    it('should accept all valid user sort fields', () => {
      const validFields = ['username', 'balance', 'createdAt', 'status'];

      for (const field of validFields) {
        const result = parseSortParams({ sortBy: field });
        expect(result.sortBy).toBe(field);
      }
    });

    it('should use custom valid fields when provided', () => {
      const result = parseSortParams(
        { sortBy: 'customField' },
        ['customField', 'anotherField'],
        'customField'
      );

      expect(result.sortBy).toBe('customField');
    });

    it('should use custom default field when provided', () => {
      const result = parseSortParams({ sortBy: 'invalid' }, ['field1', 'field2'], 'field2');

      expect(result.sortBy).toBe('field2');
    });
  });

  describe('getValidUserSortFields', () => {
    it('should return all valid user sort fields', () => {
      const fields = getValidUserSortFields();

      expect(fields).toContain('username');
      expect(fields).toContain('balance');
      expect(fields).toContain('createdAt');
      expect(fields).toContain('status');
    });

    it('should return a new array each time', () => {
      const fields1 = getValidUserSortFields();
      const fields2 = getValidUserSortFields();

      expect(fields1).not.toBe(fields2);
      expect(fields1).toEqual(fields2);
    });
  });
});
