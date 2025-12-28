import { parsePaginationParams, createPaginatedResponse } from '../../src/utils/pagination';

describe('Pagination Utils', () => {
  describe('parsePaginationParams', () => {
    it('should return default values when no params provided', () => {
      const result = parsePaginationParams({});

      expect(result).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
      });
    });

    it('should parse valid page and limit', () => {
      const result = parsePaginationParams({ page: '3', limit: '50' });

      expect(result).toEqual({
        page: 3,
        limit: 50,
        offset: 100,
      });
    });

    it('should enforce minimum page of 1', () => {
      const result = parsePaginationParams({ page: '0' });
      expect(result.page).toBe(1);

      const result2 = parsePaginationParams({ page: '-5' });
      expect(result2.page).toBe(1);
    });

    it('should enforce maximum limit of 100', () => {
      const result = parsePaginationParams({ limit: '500' });
      expect(result.limit).toBe(100);
    });

    it('should use default limit for zero or negative values', () => {
      const result = parsePaginationParams({ limit: '0' });
      expect(result.limit).toBe(20);

      const result2 = parsePaginationParams({ limit: '-10' });
      expect(result2.limit).toBe(1);
    });

    it('should handle invalid string values', () => {
      const result = parsePaginationParams({ page: 'abc', limit: 'xyz' });

      expect(result).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
      });
    });

    it('should calculate correct offset', () => {
      const result = parsePaginationParams({ page: '5', limit: '10' });
      expect(result.offset).toBe(40);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create correct pagination metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = createPaginatedResponse(data, 50, { page: 2, limit: 10, offset: 10 });

      expect(result).toEqual({
        data,
        pagination: {
          page: 2,
          limit: 10,
          total: 50,
          totalPages: 5,
          hasNext: true,
          hasPrevious: true,
        },
      });
    });

    it('should handle first page', () => {
      const result = createPaginatedResponse([], 100, { page: 1, limit: 20, offset: 0 });

      expect(result.pagination.hasPrevious).toBe(false);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should handle last page', () => {
      const result = createPaginatedResponse([], 100, { page: 5, limit: 20, offset: 80 });

      expect(result.pagination.hasPrevious).toBe(true);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should handle single page', () => {
      const result = createPaginatedResponse([], 10, { page: 1, limit: 20, offset: 0 });

      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrevious).toBe(false);
    });

    it('should handle empty results', () => {
      const result = createPaginatedResponse([], 0, { page: 1, limit: 20, offset: 0 });

      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });
});
