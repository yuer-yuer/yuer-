const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'cpp_engine', 'build');
const enginePath = process.platform === 'win32'
  ? path.join(buildDir, 'Release', 'calc_engine.exe')
  : path.join(buildDir, 'calc_engine');

function ensureBuilt() {
  fs.mkdirSync(path.dirname(enginePath), { recursive: true });
  execFileSync('g++', [
    '-std=c++17',
    '-O2',
    path.join(root, 'cpp_engine', 'src', 'main.cpp'),
    path.join(root, 'cpp_engine', 'src', 'calculator.cpp'),
    '-o',
    enginePath,
  ], { stdio: 'inherit' });
  assert.ok(fs.existsSync(enginePath), `engine binary missing at ${enginePath}`);
}

function callEngine(payload) {
  const result = spawnSync(enginePath, {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

ensureBuilt();

{
  const output = callEngine({
    action: 'tdee',
    weight: 65.5,
    height: 175,
    age: 22,
    gender: 'male',
    activity_level: 2,
  });
  assert.strictEqual(output.success, true);
  assert.strictEqual(output.action, 'tdee');
  assert.strictEqual(output.result.bmr, 1643.75);
  assert.strictEqual(output.result.tdee, 2260.16);
  assert.strictEqual(output.result.activity_label, '轻度活动');
}

{
  const output = callEngine({
    action: 'bmi',
    weight: 65.5,
    height: 175,
  });
  assert.strictEqual(output.success, true);
  assert.strictEqual(output.result.bmi, 21.39);
  assert.strictEqual(output.result.category, '正常');
}

{
  const output = callEngine({
    action: 'weight_plan',
    current_weight: 75,
    target_weight: 65,
    tdee: 2400,
  });
  assert.strictEqual(output.success, true);
  assert.strictEqual(output.result.daily_deficit, 480);
  assert.strictEqual(output.result.daily_intake, 1920);
  assert.ok(output.result.estimated_weeks > 22 && output.result.estimated_weeks < 24);
}

{
  const output = callEngine({ action: 'bmr', weight: 70 });
  assert.strictEqual(output.success, false);
  assert.match(output.error, /缺少必要字段/);
}

console.log('calc-engine tests passed');
