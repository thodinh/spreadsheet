const git = require("git-rev-sync");
const { promisify } = require("util");
const { exec } = require("child_process");
const { forbiddenPatterns } = require("./forbidden_patterns.json");
const readline = require("readline");

const execAsync = promisify(exec);
const COLORS = {
  RED: 31,
  YELLOW: 33,
};

async function main() {
  const parentBranch = getParentBranch(getCurrentBranch());

  const { stdout } = await execAsync(`git diff -U0 ${parentBranch} -- ":!.husky/*.json"`);
  const addedLines = stdout
    .split("\n")
    .filter((line) => line !== "+" && line.startsWith("+") && !line.startsWith("+++"));

  const { errors, warnings } = getWarningsAndErrors(addedLines);

  if (errors.length) {
    logInColor("[ERROR] : Instances of forbidden patterns found in the diff in lines:", COLORS.RED);
    errors.forEach((line) => logInColor(line, COLORS.RED));
  }
  if (warnings.length) {
    logInColor(
      "[WARNING] : Instances of discouraged patterns found in the diff in lines:",
      COLORS.YELLOW
    );
    warnings.forEach((line) => logInColor(line, COLORS.YELLOW));
  }
  if (errors.length) {
    process.exit(1);
  }

  if (warnings.length) {
    const answer = await askUserConfirmation("Do you want to continue? [Y/N] ");
    console.log("answer", answer);
    if (answer !== "y" && answer !== "Y") {
      process.exit(1);
    }
  }
}

function getWarningsAndErrors(diff) {
  const errorPatterns = forbiddenPatterns.filter((p) => p.type === "error").map((p) => p.pattern);
  const errorPatternsRegex = new RegExp(errorPatterns.join("|"), "g");

  const warningPatterns = forbiddenPatterns.filter((p) => p.type === "warn").map((p) => p.pattern);
  const warningPatternsRegex = new RegExp(warningPatterns.join("|"), "g");

  const errors = errorPatterns.length ? diff.filter((line) => errorPatternsRegex.test(line)) : [];
  const warnings = warningPatterns.length
    ? diff.filter((line) => warningPatternsRegex.test(line))
    : [];

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

function askUserConfirmation(message) {
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

main();
