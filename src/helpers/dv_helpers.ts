import { HeaderIndex, Position, Range } from "../types";
import { positions } from "./zones";

export function getPositionsInRanges(ranges: Range[]): Position[] {
  const positionMap = new Map<HeaderIndex, Set<HeaderIndex>>();
  for (const range of ranges) {
    for (const position of positions(range.zone)) {
      if (!positionMap.has(position.col)) {
        positionMap.set(position.col, new Set());
      }
      positionMap.get(position.col)!.add(position.row);
    }
  }

  return [...positionMap.entries()]
    .map(([col, rows]) => [...rows.values()].map((row) => ({ col, row })))
    .flat();
}
