import React, { type ReactNode, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { calculateMaxVisible } from '../../utils/format.js';

interface PaginatedListProps<T> {
  items: T[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  availableHeight: number;
  header?: ReactNode;
  footer?: ReactNode;
  renderItem: (item: T, index: number, isSelected: boolean) => ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  extraReserved?: number;
  onConfirm?: (item: T, index: number) => void;
  enabled?: boolean;
}

export function PaginatedList<T>({
  items,
  selectedIndex,
  onSelectIndex,
  availableHeight,
  header,
  footer,
  renderItem,
  keyExtractor,
  emptyMessage = 'No items',
  extraReserved = 0,
  onConfirm,
  enabled = true,
}: PaginatedListProps<T>) {
  const maxVisible = calculateMaxVisible(availableHeight, extraReserved);

  // Calculate visible range with auto-scroll
  const startIdx = Math.max(0, Math.min(
    selectedIndex - Math.floor(maxVisible / 2),
    Math.max(0, items.length - maxVisible)
  ));
  const endIdx = Math.min(startIdx + maxVisible, items.length);
  const visibleItems = items.slice(startIdx, endIdx);

  // Page info
  const currentPage = Math.floor(selectedIndex / maxVisible) + 1;
  const totalPages = Math.ceil(items.length / maxVisible);

  // Keyboard navigation
  useInput((input, key) => {
    if (!enabled || items.length === 0) return;

    if (key.upArrow || input === 'k') {
      onSelectIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow || input === 'j') {
      onSelectIndex(Math.min(items.length - 1, selectedIndex + 1));
    } else if (input === 'g') {
      onSelectIndex(0);
    } else if (input === 'G') {
      onSelectIndex(items.length - 1);
    } else if (key.pageUp || (key.ctrl && input === 'u')) {
      onSelectIndex(Math.max(0, selectedIndex - maxVisible));
    } else if (key.pageDown || (key.ctrl && input === 'd')) {
      onSelectIndex(Math.min(items.length - 1, selectedIndex + maxVisible));
    } else if ((key.return || input === 'l') && onConfirm) {
      onConfirm(items[selectedIndex], selectedIndex);
    }
  });

  if (items.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      {header}

      {/* Items */}
      {visibleItems.map((item, i) => {
        const actualIndex = startIdx + i;
        const isSelected = actualIndex === selectedIndex;
        return (
          <Box key={keyExtractor(item, actualIndex)}>
            {renderItem(item, actualIndex, isSelected)}
          </Box>
        );
      })}

      {/* Footer / Pagination info */}
      {footer ?? (
        items.length > maxVisible && (
          <Box paddingX={1} justifyContent="flex-end">
            <Text dimColor>
              {selectedIndex + 1}/{items.length} · Page {currentPage}/{totalPages}
            </Text>
          </Box>
        )
      )}
    </Box>
  );
}
