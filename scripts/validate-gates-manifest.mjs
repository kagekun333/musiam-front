import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = process.cwd();
const manifestPath = path.join(root, "public/gates/manifest.json");
const schemaPath = path.join(root, "schemas/gates.manifest.schema.json");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

const validate = ajv.compile(schema);
const ok = validate(data);

if (!ok) {
  console.error("❌ Gates manifest validation failed.\n");
  for (const err of validate.errors ?? []) {
    console.error(`- ${err.instancePath || "(root)"} ${err.message}`);
    if (err.params) console.error(`  params: ${JSON.stringify(err.params)}`);
  }
  process.exit(1);
}

console.log("✅ Gates manifest is valid.");
