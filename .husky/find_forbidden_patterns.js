const git = require("git-rev-sync");
const { promisify } = require("util");
const { exec } = require("child_process");
const { forbiddenPatterns } = require("./forbidden_patterns.json");
const readline = require("readline");
const parseArgs = require("minimist");
const execAsync = promisify(exec);

const COLORS = {
  RED: 31,
  YELLOW: 33,
};

const argv = parseArgs(process.argv.slice(2));
main();

async function main() {
  const addedLines = await getAddedLines();

  const { errors, warnings } = getWarningsAndErrors(addedLines);

  if (Object.keys(errors).length) {
    logInColor("[ERROR] : Instances of forbidden patterns found in the diff in files:", COLORS.RED);
    for (const file in errors) {
      logInColor(`+ ${file}:`, COLORS.RED);
      errors[file].forEach((line) => logInColor(`\t${line}`, COLORS.RED));
    }
  }
  if (Object.keys(warnings).length) {
    logInColor(
      "[WARNING] : Instances of discouraged patterns found in the diff in files:",
      COLORS.YELLOW
    );
    for (const file in warnings) {
      logInColor(`+ ${file}:`, COLORS.YELLOW);
      warnings[file].forEach((line) => logInColor(`\t${line}`, COLORS.YELLOW));
    }
  }
  if (Object.keys(errors).length) {
    process.exit(1);
  }

  if (argv.userInput && Object.keys(warnings).length) {
    const answer = await askUserConfirmation("Do you want to continue? [Y/N]: ");
    console.log("answered");
    if (answer.toLowerCase() !== "y") {
      process.exit(1);
    }
  }
}

function getWarningsAndErrors(addedLines) {
  const errorPatterns = forbiddenPatterns.filter((p) => p.type === "error").map((p) => p.pattern);
  const errorPatternsRegex = new RegExp(errorPatterns.join("|"), "g");

  const warningPatterns = forbiddenPatterns.filter((p) => p.type === "warn").map((p) => p.pattern);
  const warningPatternsRegex = new RegExp(warningPatterns.join("|"), "g");

  const errors = {};
  const warnings = {};
  for (const file in addedLines) {
    const errorsInFile = addedLines[file].filter((line) => errorPatternsRegex.test(line));
    const warningsInFile = addedLines[file].filter((line) => warningPatternsRegex.test(line));

    if (errorsInFile.length) {
      errors[file] = errorsInFile;
    }
    if (warningsInFile.length) {
      warnings[file] = warningsInFile;
    }
  }

  return { errors, warnings };
}

function getParentBranch(branch) {
  if (branch.startsWith("master")) return "master";
  const parentBranch = branch.match(/^(saas-)?[\d.]*/)[0];
  if (!parentBranch.startsWith("saas") && !parentBranch.endsWith("0")) {
    return "saas-" + parentBranch;
  }
  return parentBranch;
}

function getCurrentBranch() {
  return git.branch();
}

function logInColor(message, color = 0) {
  console.log(`\x1b[${color}m${message}\x1b[0m`);
}

async function askUserConfirmation(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function getAddedLines() {
  let stdout;
  if (argv.mode === "staged") {
    ({ stdout } = await execAsync(`git diff -U0 --staged --no-prefix -- ":!.husky/*.json"`));
  } else {
    const parentBranch = getParentBranch(getCurrentBranch());
    ({ stdout } = await execAsync(`git diff -U0 ${parentBranch} --no-prefix -- ":!.husky/*.json"`));
  }
  const addedLines = stdout.split("\n");

  const files = {};
  let currentFile = "";
  for (const line of addedLines) {
    if (line === "+") continue;
    if (line.startsWith("+++")) {
      currentFile = line.slice(3).trim();
    } else if (line.startsWith("+")) {
      if (!files[currentFile]) files[currentFile] = [];
      files[currentFile].push(line.slice(1).trim());
    }
  }

  return files;
}
