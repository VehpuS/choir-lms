import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { basename, join } from 'node:path';

import { BROWSER_ENV_VARIABLE, isBrowserName } from './browser-choice';

// Runs the browser scenarios: several at a time, every one to the end (a failure
// does not hide the rest), with a timing line each and a summary.
//
//   tsx tools/browser-session/run-scenarios.ts <outDir> [--scenario=<text>]
//     [--lane=default|matrix] [--parallel=<n>] [--browser=chromium|webkit|firefox]
//
// Lanes: `*.scenario.ts` run by default. `*.matrix.scenario.ts` (device
// matrices, long tracks, other browsers: slow or sensitive to machine speed)
// run only in the `matrix` lane, which CI offers on demand, not on every push.
const SCENARIO_DIR = 'tools/browser-session';
const SCENARIO_SUFFIX = '.scenario.ts';
const MATRIX_SUFFIX = '.matrix.scenario.ts';
const DEFAULT_PARALLEL_CAP = 3;
const MS_PER_SECOND = 1000;

type Lane = 'default' | 'matrix';
type ScenarioResult = {
  durationSeconds: number;
  name: string;
  output: string;
  passed: boolean;
};

const readFlag = (name: string): string | undefined =>
  process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);

/** `--browser=<name>` reaches each scenario through the environment. */
const browserEnvironment = (): Record<string, string> => {
  const browser = readFlag('browser');

  if (browser === undefined) {
    return {};
  }

  if (!isBrowserName(browser)) {
    throw new Error(
      `Unknown --browser=${browser}; use chromium, firefox or webkit.`,
    );
  }

  return { [BROWSER_ENV_VARIABLE]: browser };
};

const listScenarios = (lane: Lane, filter: string | undefined): string[] =>
  readdirSync(SCENARIO_DIR)
    .filter((file) => file.endsWith(SCENARIO_SUFFIX))
    .filter((file) => file.endsWith(MATRIX_SUFFIX) === (lane === 'matrix'))
    .filter((file) => !filter || file.includes(filter))
    .sort();

const runScenario = (file: string, outDir: string): Promise<ScenarioResult> =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('npx', ['tsx', join(SCENARIO_DIR, file), outDir], {
      env: { ...process.env, ...browserEnvironment() },
    });
    let output = '';

    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) =>
      resolve({
        durationSeconds: (Date.now() - started) / MS_PER_SECOND,
        name: basename(file, SCENARIO_SUFFIX),
        output: output.trim(),
        passed: code === 0,
      }),
    );
  });

const runAll = async (
  files: string[],
  outDir: string,
  parallel: number,
): Promise<ScenarioResult[]> => {
  const results: ScenarioResult[] = [];
  const queue = [...files];

  // Each worker takes the next scenario when it finishes one.
  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      const result = await runScenario(file, outDir);

      results.push(result);
      console.log(
        `${result.passed ? 'ok  ' : 'FAIL'} ${result.name} (${result.durationSeconds.toFixed(1)} s)\n${result.output}\n`,
      );
    }
  };

  await Promise.all(Array.from({ length: parallel }, worker));

  return results;
};

const main = async () => {
  const outDir =
    process.argv.slice(2).find((argument) => !argument.startsWith('--')) ??
    'browser-session-output';
  const lane: Lane = readFlag('lane') === 'matrix' ? 'matrix' : 'default';
  const parallel = Number(
    readFlag('parallel') ??
      Math.min(DEFAULT_PARALLEL_CAP, availableParallelism()),
  );
  const files = listScenarios(lane, readFlag('scenario'));

  if (files.length === 0) {
    console.error(`No ${lane} scenarios match.`);
    process.exit(1);
  }

  const started = Date.now();
  const results = await runAll(files, outDir, parallel);
  const failed = results.filter(({ passed }) => !passed);

  console.log(
    `${results.length - failed.length}/${results.length} scenarios passed in ${((Date.now() - started) / MS_PER_SECOND).toFixed(1)} s (${lane} lane, ${parallel} at a time)`,
  );

  if (failed.length > 0) {
    console.log(`Failed: ${failed.map(({ name }) => name).join(', ')}`);
    process.exitCode = 1;
  }
};

void main();
