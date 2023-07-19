import { Component } from "@odoo/owl";
import { isVisibleErrorCell } from "../../helpers/cells";
import { _lt } from "../../translation";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";
import { css } from "../helpers/css";

const ERROR_TOOLTIP_MAX_HEIGHT = 80;
const ERROR_TOOLTIP_WIDTH = 180;

css/* scss */ `
  .o-error-tooltip {
    font-size: 13px;
    background-color: white;
    border-left: 3px solid red;
    padding: 10px;
    width: ${ERROR_TOOLTIP_WIDTH}px;
    box-sizing: border-box !important;
  }
`;

export enum ErrorTooltipType {
  ErrorCell,
  InvalidDataValidation,
}

export interface ErrorToolTipMessage {
  type: ErrorTooltipType;
  message: string;
}

interface ErrorToolTipProps {
  errors: ErrorToolTipMessage[];
  onClosed?: () => void;
}

class ErrorToolTip extends Component<ErrorToolTipProps> {
  static maxSize = { maxHeight: ERROR_TOOLTIP_MAX_HEIGHT };
  static template = "o-spreadsheet-ErrorToolTip";
  static components = {};

  getErrorTitle(error: ErrorToolTipMessage): string {
    switch (error.type) {
      case ErrorTooltipType.ErrorCell:
        return _lt("Error");
      case ErrorTooltipType.InvalidDataValidation:
        return _lt("Invalid");
    }
  }
}

ErrorToolTip.props = {
  errors: Array,
  onClosed: { type: Function, optional: true },
};

export const ErrorToolTipPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof ErrorToolTip> => {
    const cell = getters.getEvaluatedCell(position);
    const errors: ErrorToolTipMessage[] = [];
    if (isVisibleErrorCell(cell)) {
      errors.push({
        type: ErrorTooltipType.ErrorCell,
        message: cell.error.message,
      });
    }
    if (getters.isDataValidationInvalid(position)) {
      const invalidDataValidationsMessages = getters.getInvalidDataValidationMessages(position);
      errors.push(
        ...invalidDataValidationsMessages.map((message) => ({
          type: ErrorTooltipType.InvalidDataValidation,
          message,
        }))
      );
    }

    return errors.length
      ? {
          isOpen: true,
          props: { errors: errors }, //ADRM TODO: imp message
          Component: ErrorToolTip,
          cellCorner: "TopRight",
        }
      : { isOpen: false };
  },
};
