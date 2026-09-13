import { resolve, dirname } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
const program = ts.createProgram(parsed.fileNames, {
  ...parsed.options,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
});
const compiled = new Map();
program.emit(undefined, (_file, text, _bom, _error, sources) => {
  for (const source of sources ?? [])
    compiled.set(resolve(source.fileName), text);
});

// Execute the real TypeScript in an isolated browser-like context per test.
export function createHarness(globals = {}) {
  const context = vm.createContext({ Error, ...globals });
  const cache = new Map();
  function compile(file) {
    const text = compiled.get(resolve(file));
    if (!text) throw new Error("No compiled source: " + file);
    return text;
  }
  function load(file) {
    file = resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const execute = vm.runInContext(
      "(function(require, module, exports) {\n" + compile(file) + "\n})",
      context,
      { filename: file },
    );
    execute(
      (specifier) => {
        if (!specifier.startsWith("."))
          throw new Error("Unexpected import: " + specifier);
        return load(resolve(dirname(file), specifier.replace(/\.js$/, ".ts")));
      },
      module,
      module.exports,
    );
    return module.exports;
  }
  function script(file) {
    vm.runInContext(compile(file), context, { filename: file });
  }
  return { context, load, script };
}

export function fakeAudio() {
  const instances = [];
  class Audio {
    currentTime = 0;
    paused = false;
    constructor(url) {
      this.url = url;
      instances.push(this);
    }
    play() {
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  return { Audio, instances };
}
