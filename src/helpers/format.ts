import { DATETIME_FORMAT } from "../constants";
import { CellValue, Format, FormattedValue } from "../types";
import { INITIAL_1900_DAY, numberToJsDate } from "./dates";

/**
 *  Constant used to indicate the maximum of digits that is possible to display
 *  in a cell with standard size.
 */
const MAX_DECIMAL_PLACES = 20;

//from https://stackoverflow.com/questions/721304/insert-commas-into-number-string @Thomas/Alan Moore
const thousandsGroupsRegexp = /(\d+?)(?=(\d{3})+(?!\d)|$)/g;

const zeroRegexp = /0/g;

/**
 * This internal format allows to represent a string format into subparts.
 * This division simplifies:
 * - the interpretation of the format when apply it to a value
 * - its modification (ex: easier to change the number of decimals)
 *
 * The internal format was introduced with the custom currency. The challenge was
 * to separate the custom currency from the rest of the format to not interfere
 * during analysis.
 *
 * This internal format and functions related to its application or modification
 * are not perfect ! Unlike implementation of custom currencies, implementation
 * of custom formats will ask to completely revisit internal format. The custom
 * formats request a customization character by character.
 *
 * For mor information, see:
 * - ECMA 376 standard:
 *  - Part 1 “Fundamentals And Markup Language Reference”, 5th edition, December 2016:
 *   - 18.8.30 numFmt (Number Format)
 *   - 18.8.31 numFmts (Number Formats)
 */
type InternalFormat = (
  | { type: "NUMBER"; format: InternalNumberFormat }
  | { type: "STRING"; format: string }
  | { type: "DATE"; format: string }
)[];

interface InternalNumberFormat {
  readonly integerPart: string;
  readonly isPercent: boolean;
  readonly thousandsSeparator: boolean;
  readonly magnitude: number;
  /**
   * optional because we need to differentiate a number
   * with a dot but no decimals with a number without any decimals.
   * i.e. '5.'  !=== '5' !=== '5.0'
   */
  readonly decimalPart?: string;
}

// -----------------------------------------------------------------------------
// FORMAT REPRESENTATION CACHE
// -----------------------------------------------------------------------------

const internalFormatByFormatString: { [format: string]: InternalFormat } = {};

function parseFormat(formatString: Format): InternalFormat {
  let internalFormat = internalFormatByFormatString[formatString];
  if (internalFormat === undefined) {
    internalFormat = convertFormatToInternalFormat(formatString);
    internalFormatByFormatString[formatString] = internalFormat;
  }
  return internalFormat;
}

// -----------------------------------------------------------------------------
// APPLY FORMAT
// -----------------------------------------------------------------------------

/**
 * Formats a cell value with its format.
 */
export function formatValue(value: CellValue, format?: Format): FormattedValue {
  switch (typeof value) {
    case "string":
      return value;
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "number":
      // transform to internalNumberFormat
      if (!format) {
        format = createDefaultFormat(value);
      }
      const internalFormat = parseFormat(format);
      return applyInternalFormat(value, internalFormat);
    case "object":
      return "0";
  }
}

function applyInternalFormat(value: number, internalFormat: InternalFormat): FormattedValue {
  if (internalFormat[0].type === "DATE") {
    return applyDateTimeFormat(value, internalFormat[0].format);
  }

  let formattedValue: FormattedValue = value < 0 ? "-" : "";
  for (let part of internalFormat) {
    switch (part.type) {
      case "NUMBER":
        formattedValue += applyInternalNumberFormat(Math.abs(value), part.format);
        break;
      case "STRING":
        formattedValue += part.format;
        break;
    }
  }
  return formattedValue;
}

function applyInternalNumberFormat(value: number, format: InternalNumberFormat) {
  if (format.isPercent) {
    value = value * 100;
  }
  value = value / format.magnitude;
  let maxDecimals = 0;
  if (format.decimalPart !== undefined) {
    maxDecimals = format.decimalPart.length;
  }
  const { integerDigits, decimalDigits } = splitNumber(value, maxDecimals);

  let formattedValue = applyIntegerFormat(
    integerDigits,
    format.integerPart,
    format.thousandsSeparator
  );

  if (format.decimalPart !== undefined) {
    formattedValue += "." + applyDecimalFormat(decimalDigits || "", format.decimalPart);
  }

  if (format.isPercent) {
    formattedValue += "%";
  }
  return formattedValue;
}

function applyIntegerFormat(
  integerDigits: string,
  integerFormat: string,
  hasSeparator: boolean
): string {
  const _integerDigits = integerDigits === "0" ? "" : integerDigits;

  let formattedInteger = _integerDigits;
  const delta = integerFormat.length - _integerDigits.length;
  if (delta > 0) {
    // ex: format = "0#000000" and integerDigit: "123"
    const restIntegerFormat = integerFormat.substring(0, delta); // restIntegerFormat = "0#00"
    const countZero = (restIntegerFormat.match(zeroRegexp) || []).length; // countZero = 3
    formattedInteger = "0".repeat(countZero) + formattedInteger; // return "000123"
  }

  if (hasSeparator) {
    formattedInteger = formattedInteger.match(thousandsGroupsRegexp)?.join(",") || formattedInteger;
  }

  return formattedInteger;
}

function applyDecimalFormat(decimalDigits: string, decimalFormat: string): string {
  // assume the format is valid (no commas)
  let formattedDecimals = decimalDigits;
  if (decimalFormat.length - decimalDigits.length > 0) {
    const restDecimalFormat = decimalFormat.substring(
      decimalDigits.length,
      decimalFormat.length + 1
    );
    const countZero = (restDecimalFormat.match(zeroRegexp) || []).length;
    formattedDecimals = formattedDecimals + "0".repeat(countZero);
  }

  return formattedDecimals;
}

/**
 * this is a cache that can contains number representation formats
 * from 0 (minimum) to 20 (maximum) digits after the decimal point
 */
const numberRepresentation: Intl.NumberFormat[] = [];

/** split a number into two strings that contain respectively:
 * - all digit stored in the integer part of the number
 * - all digit stored in the decimal part of the number
 *
 * The 'maxDecimal' parameter allows to indicate the number of digits to not
 * exceed in the decimal part, in which case digits are rounded
 *
 * Intl.Numberformat is used to properly handle all the roundings.
 * e.g. 1234.7  with format ### (<> maxDecimals=0) should become 1235, not 1234
 **/
function splitNumber(
  value: number,
  maxDecimals: number = MAX_DECIMAL_PLACES
): { integerDigits: string; decimalDigits: string | undefined } {
  let formatter = numberRepresentation[maxDecimals];
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: maxDecimals,
      useGrouping: false,
    });
    numberRepresentation[maxDecimals] = formatter;
  }

  const [integerDigits, decimalDigits] = formatter.format(value).split(".");
  return { integerDigits, decimalDigits };
}

/**
 * Check if the given format is a time, date or date time format.
 */
export function isDateTimeFormat(format: Format) {
  try {
    applyDateTimeFormat(1, format);
    return true;
  } catch (error) {
    return false;
  }
}

export function applyDateTimeFormat(value: number, format: Format): FormattedValue {
  // TODO: unify the format functions for date and datetime
  // This requires some code to 'parse' or 'tokenize' the format, keep it in a
  // cache, and use it in a single mapping, that recognizes the special list
  // of tokens dd,d,m,y,h, ... and preserves the rest

  const jsDate = numberToJsDate(value);
  const indexH = format.indexOf("h");
  let strDate: FormattedValue = "";
  let strTime: FormattedValue = "";
  if (indexH > 0) {
    strDate = formatJSDate(jsDate, format.substring(0, indexH - 1));
    strTime = formatJSTime(jsDate, format.substring(indexH));
  } else if (indexH === 0) {
    strTime = formatJSTime(jsDate, format);
  } else if (indexH < 0) {
    strDate = formatJSDate(jsDate, format);
  }
  return strDate + (strDate && strTime ? " " : "") + strTime;
}

function formatJSDate(jsDate: Date, format: Format): FormattedValue {
  const sep = format.match(/\/|-|\s/)![0];
  const parts = format.split(sep);
  return parts
    .map((p) => {
      switch (p) {
        case "d":
          return jsDate.getDate();
        case "dd":
          return jsDate.getDate().toString().padStart(2, "0");
        case "m":
          return jsDate.getMonth() + 1;
        case "mm":
          return String(jsDate.getMonth() + 1).padStart(2, "0");
        case "yyyy":
          return jsDate.getFullYear();
        default:
          throw new Error(`invalid format: ${format}`);
      }
    })
    .join(sep);
}

function formatJSTime(jsDate: Date, format: Format): FormattedValue {
  let parts = format.split(/:|\s/);

  const dateHours = jsDate.getHours();
  const isMeridian = parts[parts.length - 1] === "a";
  let hours = dateHours;
  let meridian = "";
  if (isMeridian) {
    hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    meridian = dateHours >= 12 ? " PM" : " AM";
    parts.pop();
  }

  return (
    parts
      .map((p) => {
        switch (p) {
          case "hhhh":
            const helapsedHours = Math.floor(
              (jsDate.getTime() - INITIAL_1900_DAY) / (60 * 60 * 1000)
            );
            return helapsedHours.toString();
          case "hh":
            return hours.toString().padStart(2, "0");
          case "mm":
            return jsDate.getMinutes().toString().padStart(2, "0");
          case "ss":
            return jsDate.getSeconds().toString().padStart(2, "0");
          default:
            throw new Error(`invalid format: ${format}`);
        }
      })
      .join(":") + meridian
  );
}

// -----------------------------------------------------------------------------
// CREATE / MODIFY FORMAT
// -----------------------------------------------------------------------------

export function createDefaultFormat(value: number): Format {
  let { decimalDigits } = splitNumber(value, 10);
  return decimalDigits ? "0." + "0".repeat(decimalDigits.length) : "0";
}

export function createLargeNumberFormat(
  format: Format | undefined,
  magnitude: number,
  postFix: string
): Format {
  const internalFormat = parseFormat(format || "#,##0");
  const largeNumberFormat = internalFormat
    .map((formatPart) => {
      if (formatPart.type === "NUMBER") {
        return [
          {
            ...formatPart,
            format: {
              ...formatPart.format,
              magnitude,
              decimalPart: undefined,
            },
          },
          {
            type: "STRING" as const,
            format: postFix,
          },
        ];
      }
      return formatPart;
    })
    .flat();
  return convertInternalFormatToFormat(largeNumberFormat);
}

export function changeDecimalPlaces(format: Format, step: number) {
  const internalFormat = parseFormat(format);
  const newInternalFormat = internalFormat.map((intFmt) => {
    if (intFmt.type === "NUMBER") {
      return { ...intFmt, format: changeInternalNumberFormatDecimalPlaces(intFmt.format, step) };
    } else {
      return intFmt;
    }
  });
  const newFormat = convertInternalFormatToFormat(newInternalFormat);
  internalFormatByFormatString[newFormat] = newInternalFormat;
  return newFormat;
}

function changeInternalNumberFormatDecimalPlaces(
  format: Readonly<InternalNumberFormat>,
  step: number
): InternalNumberFormat {
  const _format = { ...format };
  const sign = Math.sign(step);
  const decimalLength = _format.decimalPart?.length || 0;
  const countZero = Math.min(Math.max(0, decimalLength + sign), MAX_DECIMAL_PLACES);
  _format.decimalPart = "0".repeat(countZero);
  if (_format.decimalPart === "") {
    delete _format.decimalPart;
  }
  return _format;
}

// -----------------------------------------------------------------------------
// MANAGING FORMAT
// -----------------------------------------------------------------------------

/**
 * Validates the provided format string and returns an InternalFormat Object.
 */
function convertFormatToInternalFormat(format: Format): InternalFormat {
  if (format === "") {
    throw new Error("A format cannot be empty");
  }
  let currentIndex = 0;
  let result: InternalFormat = [];
  while (currentIndex < format.length) {
    let closingIndex: number;
    if (format.charAt(currentIndex) === "[") {
      if (format.charAt(currentIndex + 1) !== "$") {
        throw new Error(`Currency formats have to be prefixed by a $: ${format}`);
      }
      // manage brackets/customStrings
      closingIndex = format.substring(currentIndex + 1).indexOf("]") + currentIndex + 2;
      if (closingIndex === 0) {
        throw new Error(`Invalid currency brackets format: ${format}`);
      }
      const str = format.substring(currentIndex + 2, closingIndex - 1);
      if (str.includes("[")) {
        throw new Error(`Invalid currency format: ${format}`);
      }
      result.push({
        type: "STRING",
        format: str,
      }); // remove leading "[$"" and ending "]".
    } else {
      // rest of the time
      const nextPartIndex = format.substring(currentIndex).indexOf("[");
      closingIndex = nextPartIndex > -1 ? nextPartIndex + currentIndex : format.length;
      const subFormat = format.substring(currentIndex, closingIndex);
      if (subFormat.match(DATETIME_FORMAT)) {
        result.push({ type: "DATE", format: subFormat });
      } else {
        result.push({
          type: "NUMBER",
          format: convertToInternalNumberFormat(subFormat),
        });
      }
    }
    currentIndex = closingIndex;
  }
  return result;
}

const magnitudeRegex = /,*?$/;

/**
 * @param format a formatString that is only applicable to numbers. I.e. composed of characters 0 # , . %
 */
function convertToInternalNumberFormat(format: Format): InternalNumberFormat {
  format = format.trim();
  if (containsInvalidNumberChars(format)) {
    throw new Error(`Invalid number format: ${format}`);
  }
  const isPercent = format.includes("%");
  const magnitudeCommas = format.match(magnitudeRegex)?.[0] || "";
  const magnitude = !magnitudeCommas ? 1 : 1000 ** magnitudeCommas.length;
  let _format = format.slice(0, format.length - (magnitudeCommas.length || 0));
  const thousandsSeparator = _format.includes(",");
  if (_format.match(/\..*,/)) {
    throw new Error("A format can't contain ',' symbol in the decimal part");
  }
  _format = _format.replace("%", "").replace(",", "");

  const extraSigns = _format.match(/[\%|,]/);
  if (extraSigns) {
    throw new Error(`A format can only contain a single '${extraSigns[0]}' symbol`);
  }
  const [integerPart, decimalPart] = _format.split(".");
  if (decimalPart && decimalPart.length > 20) {
    throw new Error("A format can't contain more than 20 decimal places");
  }
  if (decimalPart !== undefined) {
    return {
      integerPart,
      isPercent,
      thousandsSeparator,
      decimalPart,
      magnitude,
    };
  } else {
    return {
      integerPart,
      isPercent,
      thousandsSeparator,
      magnitude,
    };
  }
}

const validNumberChars = /[,#0.%]/g;

function containsInvalidNumberChars(format: Format): boolean {
  return Boolean(format.replace(validNumberChars, ""));
}

function convertInternalFormatToFormat(internalFormat: InternalFormat): Format {
  let format: Format = "";
  for (let part of internalFormat) {
    let currentFormat: string;
    switch (part.type) {
      case "NUMBER":
        const fmt = part.format;
        currentFormat = fmt.integerPart;
        if (fmt.thousandsSeparator) {
          currentFormat = currentFormat.slice(0, -3) + "," + currentFormat.slice(-3);
        }
        if (fmt.decimalPart !== undefined) {
          currentFormat += "." + fmt.decimalPart;
        }
        if (fmt.isPercent) {
          currentFormat += "%";
        }
        if (fmt.magnitude) {
          currentFormat += ",".repeat(Math.log10(fmt.magnitude) / 3);
        }
        break;
      case "STRING":
        currentFormat = `[$${part.format}]`;
        break;
      case "DATE":
        currentFormat = part.format;
        break;
    }
    format += currentFormat;
  }
  return format;
}