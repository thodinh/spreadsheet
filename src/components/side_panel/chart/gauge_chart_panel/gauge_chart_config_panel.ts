import { Component, useState } from "@odoo/owl";
import { GaugeChartDefinition } from "../../../../types/chart/gauge_chart";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";
import { ValidationMessages } from "../../../validation_messages/validation_messages";

interface Props {
  figureId: UID;
  definition: GaugeChartDefinition;
  canUpdateChart: (figureId: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
}

interface PanelState {
  dataRangeDispatchResult?: DispatchResult;
}

export class GaugeChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartConfigPanel";
  static props = {
    figureId: String,
    definition: Object,
    updateChart: "*" as const,
    canUpdateChart: "*" as const,
  };
  static components = { SelectionInput, ValidationMessages };

  private state: PanelState = useState({
    dataRangeDispatchResult: undefined,
  });

  private dataRange: string | undefined = this.props.definition.dataRange;

  get configurationErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.dataRangeDispatchResult?.reasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isDataRangeInvalid(): boolean {
    return !!this.state.dataRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidGaugeDataRange
    );
  }

  onDataRangeChanged(ranges: string[]) {
    this.dataRange = ranges[0];
    this.state.dataRangeDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      dataRange: this.dataRange,
    });
  }

  updateDataRange() {
    this.state.dataRangeDispatchResult = this.props.updateChart(this.props.figureId, {
      dataRange: this.dataRange,
    });
  }

  getDataRange(): string {
    return this.dataRange || "";
  }
}
