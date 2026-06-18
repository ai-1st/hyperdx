import { DashboardFilter, Filter } from '@hyperdx/common-utils/dist/types';
import { act, renderHook } from '@testing-library/react';

import useDashboardFilters from '../useDashboardFilters';

// Mock nuqs useQueryState with a simple useState-like implementation
let mockState: Filter[] | null = null;
const mockSetState = jest.fn(
  (updater: Filter[] | null | ((prev: Filter[] | null) => Filter[] | null)) => {
    if (typeof updater === 'function') {
      mockState = updater(mockState);
    } else {
      mockState = updater;
    }
  },
);

jest.mock('nuqs', () => ({
  useQueryState: () => [mockState, mockSetState],
  createParser: (opts: { parse: Function; serialize: Function }) => opts,
}));

describe('useDashboardFilters', () => {
  const mockFilters: DashboardFilter[] = [
    {
      id: 'filter1',
      type: 'QUERY_EXPRESSION',
      name: 'Environment',
      expression: 'environment',
      source: 'logs',
    },
    {
      id: 'filter2',
      type: 'QUERY_EXPRESSION',
      name: 'Service',
      expression: 'service.name',
      source: 'traces',
    },
    {
      id: 'filter3',
      type: 'QUERY_EXPRESSION',
      name: 'Status',
      expression: 'status_code',
      source: 'logs',
    },
  ];

  beforeEach(() => {
    mockState = null;
    mockSetState.mockClear();
  });

  it('should initialize with empty filter values', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    expect(result.current.filterValues).toEqual({});
    expect(result.current.filterQueries).toEqual([]);
  });

  it('should set a single filter value', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    act(() => {
      result.current.setFilterValue('environment', ['production']);
    });

    // Re-render to pick up the new mockState
    const { result: result2 } = renderHook(() =>
      useDashboardFilters(mockFilters),
    );

    expect(result2.current.filterValues.environment.included).toEqual(
      new Set(['production']),
    );
  });

  it('should set multiple values for a single filter (multi-select)', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    act(() => {
      result.current.setFilterValue('environment', ['production', 'staging']);
    });

    const { result: result2 } = renderHook(() =>
      useDashboardFilters(mockFilters),
    );

    expect(result2.current.filterValues.environment.included).toEqual(
      new Set(['production', 'staging']),
    );
  });

  it('should generate IN clause for multi-select values', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    act(() => {
      result.current.setFilterValue('environment', ['production', 'staging']);
    });

    const { result: result2 } = renderHook(() =>
      useDashboardFilters(mockFilters),
    );

    expect(result2.current.filterQueries).toHaveLength(1);
    const query = result2.current.filterQueries[0];
    const condition = 'condition' in query ? query.condition : '';
    expect(condition).toEqual(
      "toString(environment) IN ('production', 'staging')",
    );
  });

  it('should clear filter when set to empty array', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    act(() => {
      result.current.setFilterValue('environment', ['production']);
    });
    act(() => {
      result.current.setFilterValue('environment', []);
    });

    const { result: result2 } = renderHook(() =>
      useDashboardFilters(mockFilters),
    );

    expect(result2.current.filterValues.environment).toBeUndefined();
    expect(result2.current.filterQueries).toEqual([]);
  });

  it('should support multi-select on multiple expressions simultaneously', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    act(() => {
      result.current.setFilterValue('environment', ['production', 'staging']);
    });
    act(() => {
      result.current.setFilterValue('service.name', ['api', 'web']);
    });

    const { result: result2 } = renderHook(() =>
      useDashboardFilters(mockFilters),
    );

    expect(result2.current.filterValues.environment.included).toEqual(
      new Set(['production', 'staging']),
    );
    expect(result2.current.filterValues['service.name'].included).toEqual(
      new Set(['api', 'web']),
    );
    expect(result2.current.filterQueries).toHaveLength(2);
  });

  it('should replace previous multi-select values when updated', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    act(() => {
      result.current.setFilterValue('environment', ['production', 'staging']);
    });
    act(() => {
      result.current.setFilterValue('environment', ['development']);
    });

    const { result: result2 } = renderHook(() =>
      useDashboardFilters(mockFilters),
    );

    expect(result2.current.filterValues.environment.included).toEqual(
      new Set(['development']),
    );
  });

  it('should ignore filter values for non-existent filter expressions', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    act(() => {
      result.current.setFilterValue('environment', ['production']);
    });
    act(() => {
      result.current.setFilterValue('nonexistent', ['value']);
    });

    const { result: result2 } = renderHook(() =>
      useDashboardFilters(mockFilters),
    );

    expect(Object.keys(result2.current.filterValues)).toEqual(['environment']);
  });

  it('should clear one filter without affecting others', () => {
    const { result } = renderHook(() => useDashboardFilters(mockFilters));

    act(() => {
      result.current.setFilterValue('environment', ['production', 'staging']);
    });
    act(() => {
      result.current.setFilterValue('service.name', ['api']);
    });
    act(() => {
      result.current.setFilterValue('environment', []);
    });

    const { result: result2 } = renderHook(() =>
      useDashboardFilters(mockFilters),
    );

    expect(result2.current.filterValues.environment).toBeUndefined();
    expect(result2.current.filterValues['service.name'].included).toEqual(
      new Set(['api']),
    );
  });

  // Dashboard filter `expression`s are verbatim user input, so `filtersToQuery`
  // emits them unchanged — it does NOT auto-backtick-quote. A column whose name
  // needs quoting (e.g. `vpc-id`) only works if the filter definition quotes it
  // itself; a bare `vpc-id` expression is passed through verbatim (and would be
  // parsed by ClickHouse as `vpc - id`). This keeps both the per-tile queries
  // (stringifyKeys: true) and the URL-serialized queries (stringifyKeys: false)
  // backtick-free.
  describe('dashboard filter expressions are emitted verbatim', () => {
    const specialCharFilters: DashboardFilter[] = [
      {
        id: 'vpcFilter',
        type: 'QUERY_EXPRESSION',
        name: 'VPC',
        expression: 'vpc-id',
        source: 'logs',
      },
    ];

    it('emits a verbatim (unquoted) IN clause for a bare hyphenated expression', () => {
      const { result } = renderHook(() =>
        useDashboardFilters(specialCharFilters),
      );

      act(() => {
        result.current.setFilterValue('vpc-id', ['vpc-abc', 'vpc-def']);
      });

      // Per-tile query: keys are wrapped in toString(), with the expression
      // passed through verbatim (no added backticks).
      const { result: result2 } = renderHook(() =>
        useDashboardFilters(specialCharFilters),
      );

      expect(result2.current.filterQueries).toHaveLength(1);
      const tileQuery = result2.current.filterQueries[0];
      const tileCondition = 'condition' in tileQuery ? tileQuery.condition : '';
      expect(tileCondition).toBe("toString(vpc-id) IN ('vpc-abc', 'vpc-def')");

      // URL-serialized query (stringifyKeys: false) is verbatim too.
      const urlSerialized = mockSetState.mock.calls.at(-1)?.[0];
      const urlState =
        typeof urlSerialized === 'function'
          ? urlSerialized(null)
          : urlSerialized;
      expect(urlState).toEqual([
        { type: 'sql', condition: "vpc-id IN ('vpc-abc', 'vpc-def')" },
      ]);

      // The expression-keyed state hydrated from the URL round-trips back to
      // `vpc-id` so the dashboard filter lookup finds it.
      expect(Object.keys(result2.current.filterValues)).toEqual(['vpc-id']);
      expect(result2.current.filterValues['vpc-id'].included).toEqual(
        new Set(['vpc-abc', 'vpc-def']),
      );
    });
  });

  // Regression: a dashboard filter whose `expression` is already
  // backtick-quoted — e.g. a JSON sub-column path like
  // `` `ResourceAttributesJSON`.`key2`.`subKey2` `` — must still hydrate its
  // selected values from the URL. Dashboard expressions are verbatim, so the
  // declared (backticked) expression is keyed and serialized to the URL exactly
  // as written, and `parseQuery` recovers it unchanged — declared expression
  // and parsed key match by raw equality.
  describe('backtick-quoted dashboard filter expressions', () => {
    const jsonPathFilters: DashboardFilter[] = [
      {
        id: 'jsonFilter',
        type: 'QUERY_EXPRESSION',
        name: 'Sub Sub Key',
        expression: '`ResourceAttributesJSON`.`key2`.`subKey2`.`subSubKey2`',
        source: 'logs',
      },
    ];

    it('hydrates values for an already-backticked JSON sub-column path', () => {
      const expression =
        '`ResourceAttributesJSON`.`key2`.`subKey2`.`subSubKey2`';
      const { result } = renderHook(() => useDashboardFilters(jsonPathFilters));

      act(() => {
        result.current.setFilterValue(expression, ['myValue']);
      });

      const { result: result2 } = renderHook(() =>
        useDashboardFilters(jsonPathFilters),
      );

      // The selected value must populate under the original (backticked)
      // expression key, despite parseQuery stripping the backticks.
      expect(Object.keys(result2.current.filterValues)).toEqual([expression]);
      expect(result2.current.filterValues[expression].included).toEqual(
        new Set(['myValue']),
      );
      // It must not be reported as an ignored (undeclared) expression.
      expect(result2.current.ignoredFilterExpressions).toEqual([]);
      // The per-tile query wraps the already-quoted path in toString().
      const tileQuery = result2.current.filterQueries[0];
      const tileCondition = 'condition' in tileQuery ? tileQuery.condition : '';
      expect(tileCondition).toBe(
        "toString(`ResourceAttributesJSON`.`key2`.`subKey2`.`subSubKey2`) IN ('myValue')",
      );
    });

    it('removes a value for an already-backticked JSON sub-column path', () => {
      const expression =
        '`ResourceAttributesJSON`.`key2`.`subKey2`.`subSubKey2`';
      const { result } = renderHook(() => useDashboardFilters(jsonPathFilters));

      act(() => {
        result.current.setFilterValue(expression, ['myValue']);
      });
      act(() => {
        result.current.setFilterValue(expression, []);
      });

      const { result: result2 } = renderHook(() =>
        useDashboardFilters(jsonPathFilters),
      );

      expect(result2.current.filterValues[expression]).toBeUndefined();
      expect(result2.current.filterQueries).toEqual([]);
    });

    it('replaces values for an already-backticked path without duplicating', () => {
      const expression =
        '`ResourceAttributesJSON`.`key2`.`subKey2`.`subSubKey2`';
      const { result } = renderHook(() => useDashboardFilters(jsonPathFilters));

      act(() => {
        result.current.setFilterValue(expression, ['first']);
      });
      act(() => {
        result.current.setFilterValue(expression, ['second']);
      });

      const { result: result2 } = renderHook(() =>
        useDashboardFilters(jsonPathFilters),
      );

      // A single, replaced entry — not a stripped+backticked duplicate.
      expect(result2.current.filterValues[expression].included).toEqual(
        new Set(['second']),
      );
      expect(result2.current.filterQueries).toHaveLength(1);
    });
  });

  describe('ignoredFilterExpressions', () => {
    it('is empty when no URL filters are set', () => {
      const { result } = renderHook(() => useDashboardFilters(mockFilters));

      expect(result.current.ignoredFilterExpressions).toEqual([]);
    });

    it('is empty when URL filters only reference declared expressions', () => {
      mockState = [
        { type: 'sql', condition: "environment IN ('production')" },
        { type: 'sql', condition: "service.name IN ('api')" },
      ];

      const { result } = renderHook(() => useDashboardFilters(mockFilters));

      expect(result.current.ignoredFilterExpressions).toEqual([]);
    });

    it('lists a single ignored expression not declared by the dashboard', () => {
      mockState = [
        { type: 'sql', condition: "environment IN ('production')" },
        { type: 'sql', condition: "team IN ('platform')" },
      ];

      const { result } = renderHook(() => useDashboardFilters(mockFilters));

      expect(result.current.ignoredFilterExpressions).toEqual(['team']);
      // sanity: declared expression still wins through normal path
      expect(result.current.filterValues.environment.included).toEqual(
        new Set(['production']),
      );
    });

    it('lists multiple ignored expressions in URL-encounter order', () => {
      mockState = [
        { type: 'sql', condition: "team IN ('platform')" },
        { type: 'sql', condition: "environment IN ('production')" },
        { type: 'sql', condition: "region IN ('us-east-1')" },
        { type: 'sql', condition: "owner IN ('drew')" },
      ];

      const { result } = renderHook(() => useDashboardFilters(mockFilters));

      expect(result.current.ignoredFilterExpressions).toEqual([
        'team',
        'region',
        'owner',
      ]);
      expect(Object.keys(result.current.filterValues)).toEqual(['environment']);
    });

    it('does not flag declared expressions with no URL values as ignored', () => {
      // URL is empty — every declared expression has no values, but none of
      // them should be reported as ignored since they are valid dashboard
      // filters that just happen to be unset.
      mockState = null;

      const { result } = renderHook(() => useDashboardFilters(mockFilters));

      expect(result.current.filterValues).toEqual({});
      expect(result.current.ignoredFilterExpressions).toEqual([]);
    });
  });
});
