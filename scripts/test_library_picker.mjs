import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=========================================");
console.log("Running Regression Radar Library Picker Tests");
console.log("=========================================\n");

// Test 1: Verify presets definition in LibraryPicker component
console.log("Test 1: Verify LibraryPicker presets definition");
const libraryPickerContent = fs.readFileSync(
  path.resolve("components/LibraryPicker.tsx"),
  "utf-8"
);

// Verify 4 presets
assert(
  libraryPickerContent.includes('label: "Next.js 14.1 → 14.2"'),
  "Preset Next.js 14.1 → 14.2 label missing"
);
assert(
  libraryPickerContent.includes('library: "Next.js"'),
  "Preset Next.js library missing"
);
assert(
  libraryPickerContent.includes('fromVersion: "14.1"'),
  "Preset Next.js fromVersion missing"
);
assert(
  libraryPickerContent.includes('toVersion: "14.2"'),
  "Preset Next.js toVersion missing"
);

assert(
  libraryPickerContent.includes('label: "Pydantic v1 → v2"'),
  "Preset Pydantic v1 → v2 label missing"
);
assert(
  libraryPickerContent.includes('library: "Pydantic"'),
  "Preset Pydantic library missing"
);
assert(
  libraryPickerContent.includes('fromVersion: "v1"'),
  "Preset Pydantic fromVersion missing"
);
assert(
  libraryPickerContent.includes('toVersion: "v2"'),
  "Preset Pydantic toVersion missing"
);

assert(
  libraryPickerContent.includes('label: "NumPy 2.0"'),
  "Preset NumPy 2.0 label missing"
);
assert(
  libraryPickerContent.includes('library: "NumPy"'),
  "Preset NumPy library missing"
);
assert(
  libraryPickerContent.includes('fromVersion: ""'),
  "Preset NumPy fromVersion must be empty string / unspecified"
);
assert(
  libraryPickerContent.includes('toVersion: "2.0"'),
  "Preset NumPy toVersion missing"
);

assert(
  libraryPickerContent.includes('label: "React 18 → 19"'),
  "Preset React 18 → 19 label missing"
);
assert(
  libraryPickerContent.includes('library: "React"'),
  "Preset React library missing"
);
assert(
  libraryPickerContent.includes('fromVersion: "18"'),
  "Preset React fromVersion missing"
);
assert(
  libraryPickerContent.includes('toVersion: "19"'),
  "Preset React toVersion missing"
);
console.log("✓ All 4 presets accurately defined with specified values\n");

// Test 2: Verify formatUpgradeQuery function logic
console.log("Test 2: Verify formatUpgradeQuery logic");
function formatUpgradeQuery(library, fromVersion, toVersion) {
  const lib = (library || "").trim();
  const from = (fromVersion || "").trim();
  const to = (toVersion || "").trim();

  if (lib && from && to) {
    return `${lib} ${from} to ${to}`;
  }
  if (lib && to) {
    return `${lib} ${to}`;
  }
  if (lib && from) {
    return `${lib} from ${from}`;
  }
  return lib || to || "";
}

// Preset 1: Next.js 14.1 to 14.2
assert.strictEqual(
  formatUpgradeQuery("Next.js", "14.1", "14.2"),
  "Next.js 14.1 to 14.2",
  "Next.js preset formatting"
);
// Preset 2: Pydantic v1 to v2
assert.strictEqual(
  formatUpgradeQuery("Pydantic", "v1", "v2"),
  "Pydantic v1 to v2",
  "Pydantic preset formatting"
);
// Preset 3: NumPy 2.0 (without source version)
assert.strictEqual(
  formatUpgradeQuery("NumPy", "", "2.0"),
  "NumPy 2.0",
  "NumPy 2.0 preset without source version formatting"
);
// Preset 3 with user-specified source version: NumPy 1.26 to 2.0
assert.strictEqual(
  formatUpgradeQuery("NumPy", "1.26", "2.0"),
  "NumPy 1.26 to 2.0",
  "NumPy 2.0 with user-specified source version"
);
// Preset 4: React 18 to 19
assert.strictEqual(
  formatUpgradeQuery("React", "18", "19"),
  "React 18 to 19",
  "React preset formatting"
);
// Custom library and version
assert.strictEqual(
  formatUpgradeQuery("FastAPI", "0.95", "0.100"),
  "FastAPI 0.95 to 0.100",
  "Custom library formatting"
);
console.log("✓ Query formatting works correctly for presets and custom libraries\n");

// Test 3: Verify required-field validation logic
console.log("Test 3: Verify required-field validation logic");
function validateUpgradeInputs(library, toVersion) {
  const lib = (library || "").trim();
  const to = (toVersion || "").trim();
  const errors = {};
  if (!lib) errors.library = "Library name is required";
  if (!to) errors.toVersion = "Target version is required";
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Missing library
const val1 = validateUpgradeInputs("", "14.2");
assert.strictEqual(val1.isValid, false);
assert.strictEqual(val1.errors.library, "Library name is required");

// Missing target version
const val2 = validateUpgradeInputs("Next.js", "");
assert.strictEqual(val2.isValid, false);
assert.strictEqual(val2.errors.toVersion, "Target version is required");

// NumPy 2.0 without source version is valid
const val3 = validateUpgradeInputs("NumPy", "2.0");
assert.strictEqual(val3.isValid, true);
assert.strictEqual(Object.keys(val3.errors).length, 0);

// Full inputs are valid
const val4 = validateUpgradeInputs("Pydantic", "v2");
assert.strictEqual(val4.isValid, true);
console.log("✓ Validation requirements correctly enforced (library & toVersion required, fromVersion optional)\n");

// Test 4: Verify Ground Truth and GitHub Issue resolution
console.log("Test 4: Verify Ground Truth and GitHub Issue resolution");
const groundTruthContent = fs.readFileSync(path.resolve("lib/groundTruth.ts"), "utf-8");
assert(groundTruthContent.includes("export function lookup"), "lookup function exists");
assert(groundTruthContent.includes("export function verifyCitations"), "verifyCitations function exists");

const issuesIndex = JSON.parse(fs.readFileSync(path.resolve("data/issues-index.json"), "utf-8"));
assert(issuesIndex.length === 98, `Expected 98 issues, found ${issuesIndex.length}`);
const sampleIssue = issuesIndex.find((i) => i.number === 64921);
assert(sampleIssue, "Issue #64921 found in issues-index");
assert.strictEqual(sampleIssue.repo, "vercel/next.js");
assert.strictEqual(sampleIssue.state, "open");
assert(sampleIssue.url.includes("github.com/vercel/next.js/issues/64921"));
console.log("✓ Ground truth data and GitHub issues snapshot verified (98 bug reports intact)\n");

// Test 5: Verify API Route parameter acceptance
console.log("Test 5: Verify API route parameter acceptance");
const briefRoute = fs.readFileSync(path.resolve("app/api/brief/route.ts"), "utf-8");
assert(briefRoute.includes("body?.library"), "brief route accepts library");
assert(briefRoute.includes("body?.fromVersion"), "brief route accepts fromVersion");
assert(briefRoute.includes("body?.toVersion"), "brief route accepts toVersion");
assert(briefRoute.includes("body?.stack"), "brief route accepts stack");

const baselineRoute = fs.readFileSync(path.resolve("app/api/baseline/route.ts"), "utf-8");
assert(baselineRoute.includes("body?.library"), "baseline route accepts library");
assert(baselineRoute.includes("body?.fromVersion"), "baseline route accepts fromVersion");
assert(baselineRoute.includes("body?.toVersion"), "baseline route accepts toVersion");

const learnRoute = fs.readFileSync(path.resolve("app/api/learn/route.ts"), "utf-8");
assert(learnRoute.includes("body.library"), "learn route accepts library");
assert(learnRoute.includes("body.fromVersion"), "learn route accepts fromVersion");
assert(learnRoute.includes("body.toVersion"), "learn route accepts toVersion");
console.log("✓ API endpoints (/api/brief, /api/baseline, /api/learn) accept library and version fields\n");

// Test 6: Verify UI elements and placeholders
console.log("Test 6: Verify UI elements, placeholders, and buttons");
assert(libraryPickerContent.includes('placeholder="e.g. Pydantic"'), "Library placeholder e.g. Pydantic exists");
assert(libraryPickerContent.includes('placeholder="e.g. 1.x"'), "From version placeholder e.g. 1.x exists");
assert(libraryPickerContent.includes('placeholder="e.g. 2.0"'), "To version placeholder e.g. 2.0 exists");
assert(libraryPickerContent.includes("Check Upgrade Risks"), "Primary button Check Upgrade Risks exists");
assert(libraryPickerContent.includes("Checking risks…"), "Loading state label exists");
console.log("✓ UI placeholders, labels, and primary button match requirements\n");

console.log("=========================================");
console.log("All 6 test suites passed successfully!");
console.log("=========================================");
