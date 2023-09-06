import { cellStyleToCss, cssPropertiesToCss } from "../../components/helpers";
import { SELECTION_BORDER_COLOR } from "../../constants";
import {
  ClipboardCell,
  Dimension,
  Getters,
  GridRenderingContext,
  HeaderIndex,
  Zone,
} from "../../types";
import { ClipboardMIMEType, ClipboardOperation } from "../../types/clipboard";
import { xmlEscape } from "../../xlsx/helpers/xml_helpers";
import { mergeOverlappingZones, positions } from "../zones";
import { ClipboardCellsAbstractState } from "./clipboard_abstract_cell_state";

export interface CopiedTable {
  zone: Zone;
  filtersValues: Array<string[]>;
}

/** State of the clipboard when copying/cutting cells */
export class ClipboardCellsState extends ClipboardCellsAbstractState {
  private cells: ClipboardCell[][];
  private readonly zones: Zone[];

  constructor(zones: Zone[], operation: ClipboardOperation, getters: Getters) {
    super(operation, getters);
    if (!zones.length) {
      this.cells = [[]];
      this.zones = [];
      return;
    }
    const lefts = new Set(zones.map((z) => z.left));
    const rights = new Set(zones.map((z) => z.right));
    const tops = new Set(zones.map((z) => z.top));
    const bottoms = new Set(zones.map((z) => z.bottom));

    const areZonesCompatible =
      (tops.size === 1 && bottoms.size === 1) || (lefts.size === 1 && rights.size === 1);

    // In order to don't paste several times the same cells in intersected zones
    // --> we merge zones that have common cells
    const clippedZones = areZonesCompatible
      ? mergeOverlappingZones(zones)
      : [zones[zones.length - 1]];

    const cellsPosition = clippedZones.map((zone) => positions(zone)).flat();
    const columnsIndex = [...new Set(cellsPosition.map((p) => p.col))].sort((a, b) => a - b);
    const rowsIndex = [...new Set(cellsPosition.map((p) => p.row))].sort((a, b) => a - b);

    const cellsInClipboard: ClipboardCell[][] = [];
    const sheetId = getters.getActiveSheetId();

    for (let row of rowsIndex) {
      let cellsInRow: ClipboardCell[] = [];
      for (let col of columnsIndex) {
        const position = { col, row, sheetId };
        cellsInRow.push({
          cell: getters.getCell(position),
          style: getters.getCellComputedStyle(position),
          evaluatedCell: getters.getEvaluatedCell(position),
          border: getters.getCellBorder(position) || undefined,
          position,
        });
      }
      cellsInClipboard.push(cellsInRow);
    }

    this.cells = cellsInClipboard;
    this.zones = clippedZones;
  }

  /**
   * Compute the complete zones where to paste the current clipboard
   */

  getClipboardContent(): Record<string, string> {
    return {
      [ClipboardMIMEType.PlainText]: this.getPlainTextContent(),
      [ClipboardMIMEType.Html]: this.getHTMLContent(),
    };
  }

  private getPlainTextContent(): string {
    return (
      this.cells
        .map((cells) => {
          return cells
            .map((c) =>
              this.getters.shouldShowFormulas() && c.cell?.isFormula
                ? c.cell?.content || ""
                : c.evaluatedCell?.formattedValue || ""
            )
            .join("\t");
        })
        .join("\n") || "\t"
    );
  }

  private getHTMLContent(): string {
    if (this.cells.length === 1 && this.cells[0].length === 1) {
      return this.getters.getCellText(this.cells[0][0].position);
    }

    let htmlTable = '<table border="1" style="border-collapse:collapse">';
    for (const row of this.cells) {
      htmlTable += "<tr>";
      for (const cell of row) {
        const cssStyle = cssPropertiesToCss(cellStyleToCss(cell.style));
        const cellText = this.getters.getCellText(cell.position);
        htmlTable += `<td style="${cssStyle}">` + xmlEscape(cellText) + "</td>";
      }
      htmlTable += "</tr>";
    }
    htmlTable += "</table>";
    return htmlTable;
  }

  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension): boolean {
    if (!this.zones) {
      return false;
    }
    for (let zone of this.zones) {
      if (dimension === "COL" && position <= zone.right) {
        return true;
      }
      if (dimension === "ROW" && position <= zone.bottom) {
        return true;
      }
    }
    return false;
  }

  drawClipboard(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    if (this.sheetId !== this.getters.getActiveSheetId() || !this.zones || !this.zones.length) {
      return;
    }
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3.3 * thinLineWidth;
    for (const zone of this.zones) {
      const { x, y, width, height } = this.getters.getVisibleRect(zone);
      if (width > 0 && height > 0) {
        ctx.strokeRect(x, y, width, height);
      }
    }
  }
}
