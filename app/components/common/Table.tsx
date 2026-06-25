/**
 * Table — scrollable data table with:
 *   - Fixed header row
 *   - Alternating row colours
 *   - Column sort (asc/desc)
 *   - Optional row action buttons
 *   - Empty state
 *   - Horizontal scroll for wide tables
 */
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from './theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TableColumn<T = any> {
  key: string;
  title: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface TableRowAction<T = any> {
  label: string;
  color?: string;
  onPress: (row: T, index: number) => void;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string;
  rowActions?: TableRowAction<T>[];
  /** Min column width when no explicit width given */
  minColWidth?: number;
  emptyText?: string;
  style?: ViewStyle;
  /** Highlight selected row index */
  selectedIndex?: number;
  onRowPress?: (row: T, index: number) => void;
  /** Show a striped (zebra) pattern */
  striped?: boolean;
}

type SortDir = 'asc' | 'desc';

// ─── Component ───────────────────────────────────────────────────────────────

function Table<T = any>({
  columns,
  data,
  keyExtractor,
  rowActions,
  minColWidth = 100,
  emptyText = 'No data available.',
  style,
  selectedIndex,
  onRowPress,
  striped = true,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const hasActions = rowActions && rowActions.length > 0;

  // Sorting
  const handleSort = (col: TableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a: any, b: any) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const colStyle = (col: TableColumn<T>): ViewStyle => ({
    width: col.width,
    flex: col.flex ?? (col.width ? undefined : 1),
    minWidth: col.width ?? minColWidth,
    alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
  });

  return (
    <View style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* ── Header ── */}
          <View style={styles.header}>
            {columns.map(col => (
              <TouchableOpacity
                key={col.key}
                style={[styles.headerCell, colStyle(col)]}
                onPress={() => handleSort(col)}
                disabled={!col.sortable}
                activeOpacity={col.sortable ? 0.7 : 1}
              >
                <Text style={styles.headerText} numberOfLines={1}>
                  {col.title}
                </Text>
                {col.sortable && (
                  <Text style={styles.sortIcon}>
                    {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            {hasActions && (
              <View style={[styles.headerCell, styles.actionsCol]}>
                <Text style={styles.headerText}>Actions</Text>
              </View>
            )}
          </View>

          {/* ── Rows ── */}
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {sortedData.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{emptyText}</Text>
              </View>
            ) : (
              sortedData.map((row, idx) => {
                const key = keyExtractor ? keyExtractor(row, idx) : String(idx);
                const isEven    = idx % 2 === 0;
                const isSelected = selectedIndex === idx;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.row,
                      striped && (isEven ? styles.rowEven : styles.rowOdd),
                      isSelected && styles.rowSelected,
                    ]}
                    onPress={() => onRowPress?.(row, idx)}
                    activeOpacity={onRowPress ? 0.6 : 1}
                    disabled={!onRowPress && !hasActions}
                  >
                    {columns.map(col => {
                      const val = (row as any)[col.key];
                      return (
                        <View key={col.key} style={[styles.cell, colStyle(col)]}>
                          {col.render ? (
                            col.render(val, row, idx)
                          ) : (
                            <Text style={styles.cellText} numberOfLines={2}>
                              {val != null ? String(val) : '—'}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                    {hasActions && (
                      <View style={[styles.cell, styles.actionsCol, styles.actionsRow]}>
                        {rowActions!.map((action, ai) => (
                          <TouchableOpacity
                            key={ai}
                            style={[styles.actionBtn, { borderColor: action.color ?? Colors.primary }]}
                            onPress={() => action.onPress(row, idx)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.actionText, { color: action.color ?? Colors.primary }]}>
                              {action.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: Colors.tableHeader,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerText: {
    color: Colors.white,
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortIcon: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  actionsCol: {
    width: 120,
    minWidth: 120,
    flex: undefined,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowEven:     { backgroundColor: Colors.tableRowEven },
  rowOdd:      { backgroundColor: Colors.tableRowOdd  },
  rowSelected: { backgroundColor: Colors.primaryBg    },
  cell: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
  },
  empty: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizeMD,
  },
});

export default Table;
