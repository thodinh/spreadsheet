import { ModelConfig } from "../../model";
import { _lt } from "../../translation";
import {
  Cell,
  CellPosition,
  CellValue,
  CellValueType,
  EvaluatedCell,
  Format,
  FormulaCell,
  FormulaReturn,
  Getters,
  isMatrix,
  Matrix,
  MatrixArgFormat,
  MatrixFunctionReturn,
  PrimitiveFormat,
  UID,
} from "../../types";
import {
  CellErrorLevel,
  CellErrorType,
  CircularDependencyError,
  EvaluationError,
} from "../../types/errors";
import { createEvaluatedCell, errorCell, evaluateLiteral } from "../cells";
import { toXC } from "../coordinates";
import { JetSet } from "../misc";
import { mapToPositionsInZone } from "../zones";
import { buildCompilationParameters, CompilationParameters } from "./compilation_parameters";
import { FormulaDependencyGraph } from "./formula_dependency_graph";
import { SpreadingRelation } from "./spreading_relation";

type PositionDict<T> = { [rc: string]: T };

const MAX_ITERATION = 30;

export class Evaluator {
  private getters: Getters;
  private compilationParams: CompilationParameters;

  private evaluatedCells: PositionDict<EvaluatedCell> = {};
  private formulaDependencies = new FormulaDependencyGraph();
  /**
   * contains the position of array formula that spreads on the grid
   * (and doesn't collide with other cells)
   * Used to clear the cells that have been filled by a
   * spread of when modifying this cell. It should be updated each time an
   * array formula is evaluated and correctly spread on other cells.
   */
  private blockedArrayFormulas = new Set<string>();
  private spreadingRelations = new SpreadingRelation();

  constructor(context: ModelConfig["custom"], getters: Getters) {
    this.getters = getters;
    this.compilationParams = buildCompilationParameters(context, getters, (position) =>
      this.computeCell(cellPositionToRc(position))
    );
  }

  getEvaluatedCell(position: CellPosition): EvaluatedCell {
    return this.evaluatedCells[cellPositionToRc(position)] || createEvaluatedCell("");
  }

  getArrayFormulaSpreadingOn(position: CellPosition): CellPosition | undefined {
    const rc = cellPositionToRc(position);
    const arrayFormulaRc = this.getArrayFormulaSpreadingOnRc(rc);
    return arrayFormulaRc ? rcToCellPosition(arrayFormulaRc) : undefined;
  }

  getPositions(): CellPosition[] {
    return Object.keys(this.evaluatedCells).map(rcToCellPosition);
  }

  private getArrayFormulaSpreadingOnRc(rc: string): string | undefined {
    if (!this.spreadingRelations.hasArrayFormulaResult(rc)) {
      return undefined;
    }
    const arrayFormulas = this.spreadingRelations.getArrayFormulasRc(rc);
    return Array.from(arrayFormulas).find((rc) => !this.blockedArrayFormulas.has(rc));
  }

  // ----------------------------------------------------------
  //        METHOD RELATING TO SPECIFIC CELLS EVALUATION
  // ----------------------------------------------------------

  updateDependencies(position: CellPosition) {
    const rc = cellPositionToRc(position);
    this.formulaDependencies.removeAllDependencies(rc);
    const dependencies = this.getDirectDependencies(rc);
    this.formulaDependencies.addDependencies(rc, dependencies);
  }

  evaluateCells(positions: CellPosition[]) {
    const cells = positions.map(cellPositionToRc);
    const cellsToCompute = new JetSet<string>(cells);
    const arrayFormulas = this.getArrayFormulasImpactedByChangesOf(cells);
    cellsToCompute.add(...this.getCellsDependingOn(cells));
    cellsToCompute.add(...arrayFormulas);
    cellsToCompute.add(...this.getCellsDependingOn(arrayFormulas));
    this.evaluate(cellsToCompute);
  }

  private getArrayFormulasImpactedByChangesOf(rcs: Iterable<string>): Iterable<string> {
    const impactedRcs = new JetSet<string>();

    for (const rc of rcs) {
      const content = this.rcToCell(rc)?.content;
      const arrayFormulaRc = this.getArrayFormulaSpreadingOnRc(rc);
      if (arrayFormulaRc) {
        // take into account new collisions.
        impactedRcs.add(arrayFormulaRc);
      }
      if (!content) {
        // The previous content could have blocked some array formulas
        impactedRcs.add(...this.getArrayFormulasBlockedByOrSpreadingOn(rc));
      }
    }
    return impactedRcs;
  }

  // ----------------------------------------------------------
  //      METHOD RELATING TO THE REVALUATION OF ALL CELLS
  // ----------------------------------------------------------

  buildDependencyGraph() {
    this.formulaDependencies = new FormulaDependencyGraph();
    this.blockedArrayFormulas = new Set<string>();
    this.spreadingRelations = new SpreadingRelation();
    for (const rc of this.getAllCells()) {
      const dependencies = this.getDirectDependencies(rc);
      this.formulaDependencies.addDependencies(rc, dependencies);
    }
  }

  evaluateAllCells() {
    this.evaluatedCells = {};
    this.evaluate(this.getAllCells());
  }

  private getAllCells(): JetSet<string> {
    const rcs = new JetSet<string>();
    for (const sheetId of this.getters.getSheetIds()) {
      const cellIds = this.getters.getCells(sheetId);
      for (const cellId in cellIds) {
        rcs.add(cellPositionToRc(this.getters.getCellPosition(cellId)));
      }
    }
    return rcs;
  }

  private getArrayFormulasBlockedByOrSpreadingOn(rc: string): Iterable<string> {
    if (!this.spreadingRelations.hasArrayFormulaResult(rc)) {
      return [];
    }
    const arrayFormulas = this.spreadingRelations.getArrayFormulasRc(rc);
    const cells = new JetSet<string>(arrayFormulas);
    cells.add(...this.getCellsDependingOn(arrayFormulas));
    return cells;
  }

  // ----------------------------------------------------------
  //                 EVALUATION MAIN PROCESS
  // ----------------------------------------------------------

  private nextRcsToUpdate = new JetSet<string>();
  private cellsBeingComputed = new Set<UID>();

  /**
   * @param cells ordered topologically! TODO explain this better
   */
  private evaluate(cells: JetSet<string>) {
    this.cellsBeingComputed = new Set<UID>();
    this.nextRcsToUpdate = cells;

    let currentIteration = 0;
    while (this.nextRcsToUpdate.size && currentIteration++ < MAX_ITERATION) {
      const rcs = Array.from(this.nextRcsToUpdate);
      this.nextRcsToUpdate.clear();
      for (let i = 0; i < rcs.length; ++i) {
        const cell = rcs[i];
        delete this.evaluatedCells[cell];
      }
      for (let i = 0; i < rcs.length; ++i) {
        const cell = rcs[i];
        this.setEvaluatedCell(cell, this.computeCell(cell));
      }
    }
  }

  private setEvaluatedCell(rc: string, evaluatedCell: EvaluatedCell) {
    if (this.nextRcsToUpdate.has(rc)) {
      this.nextRcsToUpdate.delete(rc);
    }
    this.evaluatedCells[rc] = evaluatedCell;
  }

  private computeCell(rc: string): EvaluatedCell {
    const evaluation = this.evaluatedCells[rc];
    if (evaluation) {
      return evaluation; // already computed
    }

    if (!this.blockedArrayFormulas.has(rc)) {
      this.invalidateSpreading(rc);
    }

    const cell = this.rcToCell(rc);
    if (cell === undefined) {
      return createEvaluatedCell("");
    }

    const cellId = cell.id;

    try {
      if (this.cellsBeingComputed.has(cellId)) {
        throw new CircularDependencyError();
      }
      this.cellsBeingComputed.add(cellId);
      return cell.isFormula
        ? this.computeFormulaCell(cell)
        : evaluateLiteral(cell.content, cell.format);
    } catch (e) {
      return this.handleError(e, cell);
    } finally {
      this.cellsBeingComputed.delete(cellId);
    }
  }

  private handleError(e: Error | any, cell: Cell): EvaluatedCell {
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    const msg = e?.errorType || CellErrorType.GenericError;
    // apply function name
    const __lastFnCalled = this.compilationParams[2].__lastFnCalled || "";
    const error = new EvaluationError(
      msg,
      e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled),
      e.logLevel !== undefined ? e.logLevel : CellErrorLevel.error
    );
    return errorCell(cell.content, error);
  }

  private computeFormulaCell(cellData: FormulaCell): EvaluatedCell {
    const cellId = cellData.id;
    this.compilationParams[2].__originCellXC = () => {
      // compute the value lazily for performance reasons
      const position = this.compilationParams[2].getters.getCellPosition(cellId);
      return toXC(position.col, position.row);
    };
    const formulaReturn = cellData.compiledFormula.execute(
      cellData.dependencies,
      ...this.compilationParams
    );

    assertFormulaReturnHasConsistentDimensions(formulaReturn);

    const { value: computedValue, format: computedFormat } = formulaReturn;

    if (!isMatrix(computedValue)) {
      return createEvaluatedCell(
        computedValue,
        cellData.format || (computedFormat as string | undefined)
      );
    }

    const formulaPosition = this.getters.getCellPosition(cellId);

    this.assertSheetHasEnoughSpaceToSpreadFormulaResult(formulaPosition, computedValue);

    forEachSpreadPositionInMatrix(computedValue, this.updateSpreadRelation(formulaPosition));
    forEachSpreadPositionInMatrix(computedValue, this.checkCollision(formulaPosition));
    forEachSpreadPositionInMatrix(
      computedValue,
      // due the isMatrix check above, we know that formulaReturn is MatrixFunctionReturn
      this.spreadValues(formulaPosition, formulaReturn as MatrixFunctionReturn)
    );

    const formatFromPosition = formatFromPositionAccess(computedFormat);
    return createEvaluatedCell(computedValue[0][0], cellData.format || formatFromPosition(0, 0));
  }

  private assertSheetHasEnoughSpaceToSpreadFormulaResult(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<CellValue>
  ) {
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const enoughCols = col + matrixResult.length <= numberOfCols;
    const enoughRows = row + matrixResult[0].length <= numberOfRows;

    if (enoughCols && enoughRows) {
      return;
    }

    if (enoughCols) {
      throw new Error(_lt("Result couldn't be automatically expanded. Please insert more rows."));
    }

    if (enoughRows) {
      throw new Error(
        _lt("Result couldn't be automatically expanded. Please insert more columns.")
      );
    }

    throw new Error(
      _lt("Result couldn't be automatically expanded. Please insert more columns and rows.")
    );
  }

  private updateSpreadRelation({
    sheetId,
    col,
    row,
  }: CellPosition): (i: number, j: number) => void {
    const formulaRc = cellPositionToRc({ sheetId, col, row });
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const rc = cellPositionToRc(position);
      this.spreadingRelations.addRelation({ resultRc: rc, arrayFormulaRc: formulaRc });
    };
  }

  private checkCollision({ sheetId, col, row }: CellPosition): (i: number, j: number) => void {
    const formulaRc = cellPositionToRc({ sheetId, col, row });
    return (i: number, j: number) => {
      const position = { sheetId: sheetId, col: i + col, row: j + row };
      const rawCell = this.getters.getCell(position);
      if (
        rawCell?.content ||
        this.getters.getEvaluatedCell(position).type !== CellValueType.empty
      ) {
        this.blockedArrayFormulas.add(formulaRc);
        throw new Error(
          _lt(
            "Array result was not expanded because it would overwrite data in %s.",
            toXC(position.col, position.row)
          )
        );
      }
      this.blockedArrayFormulas.delete(formulaRc);
    };
  }

  private spreadValues(
    { sheetId, col, row }: CellPosition,
    matrixResult: MatrixFunctionReturn
  ): (i: number, j: number) => void {
    const formatFromPosition = formatFromPositionAccess(matrixResult.format);
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const cell = this.getters.getCell(position);
      const format = cell?.format;
      const evaluatedCell = createEvaluatedCell(
        matrixResult.value[i][j],
        format || formatFromPosition(i, j)
      );

      const rc = cellPositionToRc(position);

      this.setEvaluatedCell(rc, evaluatedCell);

      // check if formula dependencies present in the spread zone
      // if so, they need to be recomputed
      this.nextRcsToUpdate.add(...this.getCellsDependingOn([rc]));
    };
  }

  private invalidateSpreading(rc: string) {
    if (!this.spreadingRelations.isArrayFormula(rc)) {
      return;
    }
    for (const child of this.spreadingRelations.getArrayResultsRc(rc)) {
      const content = this.rcToCell(child)?.content;
      if (content) {
        // there's no point at re-evaluating overlapping array formulas,
        // there's still a collision
        continue;
      }
      delete this.evaluatedCells[child];
      this.nextRcsToUpdate.add(...this.getCellsDependingOn([child]));
      this.nextRcsToUpdate.add(...this.getArrayFormulasBlockedByOrSpreadingOn(child));
    }
    this.spreadingRelations.removeNode(rc);
  }

  // ----------------------------------------------------------
  //                 COMMON FUNCTIONALITY
  // ----------------------------------------------------------

  private getDirectDependencies(thisRc: string): string[] {
    const cell = this.rcToCell(thisRc);
    if (!cell?.isFormula) {
      return [];
    }
    const dependencies: string[] = [];
    for (const range of cell.dependencies) {
      if (range.invalidSheetName || range.invalidXc) {
        continue;
      }
      const sheetId = range.sheetId;
      mapToPositionsInZone(range.zone, (col, row) => {
        dependencies.push(cellPositionToRc({ sheetId, col, row }));
      });
    }
    return dependencies;
  }

  private getCellsDependingOn(rcs: Iterable<string>): Iterable<string> {
    return this.formulaDependencies.getCellsDependingOn(rcs);
  }

  private rcToCell(rc: string): Cell | undefined {
    return this.getters.getCell(rcToCellPosition(rc));
  }
}

function forEachSpreadPositionInMatrix(
  matrix: Matrix<CellValue>,
  callback: (i: number, j: number) => void
) {
  for (let i = 0; i < matrix.length; ++i) {
    for (let j = 0; j < matrix[i].length; ++j) {
      if (i === 0 && j === 0) {
        continue;
      }
      callback(i, j);
    }
  }
}

function formatFromPositionAccess(
  format: Format | MatrixArgFormat | undefined
): (i: number, j: number) => PrimitiveFormat {
  return isMatrix(format) ? (i: number, j: number) => format[i][j] : () => format;
}

function assertFormulaReturnHasConsistentDimensions(formulaReturn: FormulaReturn) {
  const { value: computedValue, format: computedFormat } = formulaReturn;
  if (!isMatrix(computedValue)) {
    if (isMatrix(computedFormat)) {
      throw new Error("A format matrix should never be associated with a scalar value");
    }
    return;
  }
  if (isMatrix(computedFormat)) {
    const sameDimensions =
      computedValue.length === computedFormat.length &&
      computedValue[0].length === computedFormat[0].length;
    if (!sameDimensions) {
      throw new Error("Formats and values should have the same dimensions!");
    }
  }
}

function cellPositionToRc(position: CellPosition): string {
  return `${position.row}!${position.col}!${position.sheetId}`;
}

function rcToCellPosition(rc: string): CellPosition {
  // faster than  a split("!") by a factor 2
  const i1 = rc.indexOf("!");
  const row = rc.slice(0, i1);
  const position = rc.slice(i1 + 1);
  const i2 = position.indexOf("!");
  const col = position.slice(0, i2);
  const sheetId = position.slice(i2 + 1);
  return { sheetId, col: Number(col), row: Number(row) };
}
