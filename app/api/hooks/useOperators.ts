import { useState, useCallback, useRef } from 'react';
import { callApi }   from '../apiClient';
import { OPERATOR }  from '../endpoints';
import { OperatorData } from '../../types/auth';

interface Page {
  content:       OperatorData[];
  totalPages:    number;
  totalElements: number;
  number:        number;
  size:          number;
}

interface State {
  operators:   OperatorData[];
  loading:     boolean;
  loadingMore: boolean;
  error:       string | null;
  page:        number;
  hasMore:     boolean;
}

const PAGE_SIZE = 10;

export const useOperators = () => {
  const [state, setState] = useState<State>({
    operators:   [],
    loading:     false,
    loadingMore: false,
    error:       null,
    page:        0,
    hasMore:     true,
  });

  const searchRef  = useRef('');
  const allRef     = useRef<OperatorData[]>([]);  // full list for client-side search

  // ── Fetch page from API ───────────────────────────────────────────
  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    setState(s => ({ ...s, loading: reset, loadingMore: !reset, error: null }));
    try {
      const res = await callApi<null, Page>({
        method: 'get',
        url:    OPERATOR.ALL(pageNum, PAGE_SIZE),
      });

      allRef.current = reset
        ? res.content
        : [...allRef.current, ...res.content];

      const filtered = applySearch(allRef.current, searchRef.current);

      setState(s => ({
        ...s,
        operators:   filtered,
        loading:     false,
        loadingMore: false,
        page:        pageNum,
        hasMore:     pageNum + 1 < res.totalPages,
      }));
    } catch (err: any) {
      setState(s => ({
        ...s,
        loading:     false,
        loadingMore: false,
        error:       err.message ?? 'Failed to load operators',
      }));
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────
  const loadOperators = useCallback(() => {
    allRef.current  = [];
    searchRef.current = '';
    fetchPage(0, true);
  }, [fetchPage]);

  // ── Load next page ────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (state.loadingMore || !state.hasMore) return;
    fetchPage(state.page + 1, false);
  }, [state.loadingMore, state.hasMore, state.page, fetchPage]);

  // ── Client-side search filter ────────────────────────────────────
  const search = useCallback((query: string) => {
    searchRef.current = query;
    const filtered = applySearch(allRef.current, query);
    setState(s => ({ ...s, operators: filtered }));
    // If few results remain and there are more pages, fetch more
    if (filtered.length < 5 && state.hasMore) {
      fetchPage(state.page + 1, false);
    }
  }, [state.hasMore, state.page, fetchPage]);

  return {
    ...state,
    loadOperators,
    loadMore,
    search,
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function applySearch(list: OperatorData[], query: string): OperatorData[] {
  if (!query.trim()) return list;
  const q = query.toLowerCase();
  return list.filter(op =>
    op.OPER_NAME?.toLowerCase().includes(q) ||
    op.EMP_CODE?.toLowerCase().includes(q)
  );
}
