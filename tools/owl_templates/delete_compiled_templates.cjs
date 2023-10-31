const fs = require("fs");
const { TEMPLATE_FILE_PATH } = require("./compile_templates_helpers.cjs");

try {
  fs.unlinkSync(TEMPLATE_FILE_PATH);
} catch {}
