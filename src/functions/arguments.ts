import { ComputeFunctionArg } from ".";
import { _lt } from "../translation";
import {
  AddFunctionDescription,
  ArgSpec,
  ArgTypeSpec,
  ArgValue,
  EvalContext,
  FunctionDescription,
  InferArgType,
  isMatrix,
  Matrix,
  MatrixArgValue,
  PrimitiveArgValue,
} from "../types";
import { toBoolean, toJsDate, toNumber, toString } from "./helpers";

//------------------------------------------------------------------------------
// Arg description DSL
//------------------------------------------------------------------------------

const ARG_REGEXP = /(.*?)\((.*?)\)(.*)/;
const ARG_TYPES: ArgTypeSpec[] = [
  "ANY",
  "BOOLEAN",
  "DATE",
  "NUMBER",
  "STRING",
  "RANGE",
  "RANGE<BOOLEAN>",
  "RANGE<DATE>",
  "RANGE<NUMBER>",
  "RANGE<STRING>",
  "META",
];

export function arg<D extends string>(
  definition: D,
  description: string = ""
): ArgSpec<InferArgType<D>> {
  return makeArg(definition, description) as ArgSpec<InferArgType<D>>;
}

// export function args<Args extends readonly ArgDefinition<ArgType>[]>(args: Args): Args {
//   return args;
// }

export function typeCheckFunction<Args extends readonly ArgSpec[]>(
  desc: AddFunctionDescription<Args>
) {
  return desc;
}

function makeArg(str: string, description: string): ArgSpec {
  let parts = str.match(ARG_REGEXP)!;
  let name = parts[1].trim();
  let types: ArgTypeSpec[] = [];
  let isOptional = false;
  let isRepeating = false;
  let isLazy = false;
  let defaultValue;

  for (let param of parts[2].split(",")) {
    const key = param.trim().toUpperCase();
    let type = ARG_TYPES.find((t) => key === t);
    if (type) {
      types.push(type);
    } else if (key === "RANGE<ANY>") {
      types.push("RANGE");
    } else if (key === "OPTIONAL") {
      isOptional = true;
    } else if (key === "REPEATING") {
      isRepeating = true;
    } else if (key === "LAZY") {
      isLazy = true;
    } else if (key.startsWith("DEFAULT=")) {
      defaultValue = param.trim().slice(8);
    }
  }
  const result: ArgSpec = {
    name,
    description,
    type: types,
  };
  if (isOptional) {
    result.optional = true;
  }
  if (isRepeating) {
    result.repeating = true;
  }
  if (isLazy) {
    result.lazy = true;
  }
  if (defaultValue !== undefined) {
    result.default = true;
    result.defaultValue = defaultValue;
  }
  return result;
}

/**
 * This function adds on description more general information derived from the
 * arguments.
 *
 * This information is useful during compilation.
 */
export function addMetaInfoFromArg(addDescr: AddFunctionDescription): FunctionDescription {
  let countArg = 0;
  let minArg = 0;
  let repeatingArg = 0;
  for (let arg of addDescr.args) {
    countArg++;
    if (!arg.optional && !arg.repeating && !arg.default) {
      minArg++;
    }
    if (arg.repeating) {
      repeatingArg++;
    }
  }

  return {
    ...addDescr,
    minArgRequired: minArg,
    maxArgPossible: repeatingArg ? Infinity : countArg,
    nbrArgRepeating: repeatingArg,
    getArgToFocus: argTargeting(countArg, repeatingArg),
    hidden: addDescr.hidden || false,
  };
}

/**
 * Returns a function allowing finding which argument corresponds a position
 * in a function. This is particularly useful for functions with repeatable
 * arguments.
 *
 * Indeed the function makes it possible to etablish corespondance between
 * arguments when the number of arguments supplied is greater than the number of
 * arguments defined by the function.
 *
 * Ex:
 *
 * in the formula "=SUM(11, 55, 66)" which is defined like this "SUM(value1, [value2, ...])"
 * - 11 corresponds to the value1 argument => position will be 1
 * - 55 corresponds to the [value2, ...] argument => position will be 2
 * - 66 corresponds to the [value2, ...] argument => position will be 2
 *
 * in the formula "=AVERAGE.WEIGHTED(1, 2, 3, 4, 5, 6)" which is defined like this
 * "AVERAGE.WEIGHTED(values, weights, [additional_values, ...], [additional_weights, ...])"
 * - 1 corresponds to the values argument => position will be 1
 * - 2 corresponds to the weights argument => position will be 2
 * - 3 corresponds to the [additional_values, ...] argument => position will be 3
 * - 4 corresponds to the [additional_weights, ...] argument => position will be 4
 * - 5 corresponds to the [additional_values, ...] argument => position will be 3
 * - 6 corresponds to the [additional_weights, ...] argument => position will be 4
 */
function argTargeting(countArg, repeatingArg): (argPosition: number) => number {
  if (!repeatingArg) {
    return (argPosition) => argPosition;
  }
  if (repeatingArg === 1) {
    return (argPosition) => Math.min(argPosition, countArg);
  }
  const argBeforeRepeat = countArg - repeatingArg;
  return (argPosition) => {
    if (argPosition <= argBeforeRepeat) {
      return argPosition;
    }
    const argAfterRepeat = (argPosition - argBeforeRepeat) % repeatingArg || repeatingArg;
    return argBeforeRepeat + argAfterRepeat;
  };
}

//------------------------------------------------------------------------------
// Argument validation
//------------------------------------------------------------------------------

export function validateArguments(args: ArgSpec[]) {
  let previousArgRepeating: boolean | undefined = false;
  let previousArgOptional: boolean | undefined = false;
  let previousArgDefault: boolean | undefined = false;
  for (let current of args) {
    if (current.type.includes("META") && current.type.length > 1) {
      throw new Error(
        _lt(
          "Function ${name} has an argument that has been declared with more than one type whose type 'META'. The 'META' type can only be declared alone."
        )
      );
    }

    if (previousArgRepeating && !current.repeating) {
      throw new Error(
        _lt(
          "Function ${name} has no-repeatable arguments declared after repeatable ones. All repeatable arguments must be declared last."
        )
      );
    }
    const previousIsOptional = previousArgOptional || previousArgRepeating || previousArgDefault;
    const currentIsntOptional = !(current.optional || current.repeating || current.default);
    if (previousIsOptional && currentIsntOptional) {
      throw new Error(
        _lt(
          "Function ${name} has at mandatory arguments declared after optional ones. All optional arguments must be after all mandatory arguments."
        )
      );
    }
    previousArgRepeating = current.repeating;
    previousArgOptional = current.optional;
    previousArgDefault = current.default;
  }
}

export function getCastingFunctions(args: ArgSpec[]) {
  return args.map((arg) => {
    arg;
    const castingFunction = getCastingFunction(arg);
    return castingFunction;
  });
}

const CAST_MAP = {
  NUMBER: toNumber,
  STRING: toString,
  BOOLEAN: toBoolean,
  DATE: toJsDate,
};

function getCastingFunction(arg: ArgSpec) {
  const types = arg.type.map(getPrimitiveType);
  const hasMixedType = new Set(types).size > 1;
  const hasAnyType = types.includes("ANY");
  if (hasMixedType || hasAnyType) {
    // no auto-casting
    return (v) => v;
  }
  const type = types[0];
  // const argTypes = arg.type;
  // const hasRange = argTypes.some((type) => type.startsWith("RANGE"));
  // const isRangeOnly = argTypes.every((type) => type.startsWith("RANGE"));
  // if (isRangeOnly) {
  //   return rangeCastingFunction(type, arg.optional || false);
  // }
  // if (!hasRange) {
  //   return singleValueCastingFunction(type, arg.optional || false);
  // }
  return function (this: EvalContext, value: ComputeFunctionArg<ArgValue>) {
    if (arg.optional && value === undefined) {
      return undefined;
    }
    if (typeof value === "function") {
      return () => {
        if (isMatrix(value)) {
          return matrixMap(value, CAST_MAP[type]);
        }
        return CAST_MAP[type];
      };
    }
    if (isMatrix(value)) {
      return matrixMap(value, CAST_MAP[type]);
    }
    return CAST_MAP[type];
  };
}

function rangeCastingFunction(type: ArgTypeSpec, optional: boolean) {
  return function (this: EvalContext, value: MatrixArgValue) {
    if (optional && value === undefined) {
      return undefined;
    }
    return matrixMap(value, CAST_MAP[type]);
  };
}
function singleValueCastingFunction(type: ArgTypeSpec, optional: boolean) {
  return function (this: EvalContext, value: PrimitiveArgValue) {
    if (optional && value === undefined) {
      return undefined;
    }
    return CAST_MAP[type];
  };
}

function getPrimitiveType(type: ArgTypeSpec): ArgTypeSpec {
  if (type.startsWith("RANGE")) {
    return type.slice(6, -1) as ArgTypeSpec;
  }
  return type;
}

// TODO ADRM's PR #2380
export function matrixMap<T, M>(matrix: Matrix<T>, fn: (value: T) => M): Matrix<M> {
  let result: Matrix<M> = new Array(matrix.length);
  for (let i = 0; i < matrix.length; i++) {
    result[i] = new Array(matrix[i].length);
    for (let j = 0; j < matrix[i].length; j++) {
      result[i][j] = fn(matrix[i][j]);
    }
  }
  return result;
}
