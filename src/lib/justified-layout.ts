export interface JustifiedLayoutItem<T> {
  item: T;
  aspectRatio: number;
}

export interface JustifiedLayoutBox<T> {
  item: T;
  width: number;
  height: number;
}

export interface JustifiedLayoutRow<T> {
  boxes: JustifiedLayoutBox<T>[];
  height: number;
  isLastRow?: boolean;
}

export interface JustifiedLayoutOptions {
  targetRowHeight?: number;
  maxRowHeight?: number;
  minRowHeight?: number;
  gap?: number;
}

export function buildJustifiedRows<T>(
  items: JustifiedLayoutItem<T>[],
  containerWidth: number,
  options: JustifiedLayoutOptions = {}
): JustifiedLayoutRow<T>[] {
  if (items.length === 0 || containerWidth <= 0) return [];

  const targetRowHeight = options.targetRowHeight ?? 180;
  const maxRowHeight = options.maxRowHeight ?? 260;
  const minRowHeight = options.minRowHeight ?? 110;
  const gap = options.gap ?? 12;

  const rows: JustifiedLayoutRow<T>[] = [];
  let index = 0;

  while (index < items.length) {
    const rowItems: JustifiedLayoutItem<T>[] = [];

    while (index < items.length) {
      rowItems.push(items[index]);
      index += 1;

      const aspectSum = rowItems.reduce((sum, entry) => sum + entry.aspectRatio, 0);
      const gaps = Math.max(0, rowItems.length - 1) * gap;
      const rowHeight = (containerWidth - gaps) / aspectSum;

      if (rowHeight <= targetRowHeight || index >= items.length) {
        break;
      }
    }

    const isLastRow = index >= items.length;
    const aspectSum = rowItems.reduce((sum, entry) => sum + entry.aspectRatio, 0);
    const gaps = Math.max(0, rowItems.length - 1) * gap;

    let height: number;
    if (isLastRow) {
      // 最終行は他行と同じ高さに揃え、左寄せで自然幅にする
      height = targetRowHeight;
    } else {
      height = (containerWidth - gaps) / aspectSum;
      height = Math.min(Math.max(height, minRowHeight), maxRowHeight);
    }

    rows.push({
      height,
      isLastRow,
      boxes: rowItems.map((entry) => ({
        item: entry.item,
        width: entry.aspectRatio * height,
        height,
      })),
    });
  }

  return rows;
}
