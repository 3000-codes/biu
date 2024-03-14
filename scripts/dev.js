const minimist = require('minimist')
const { resolve } = require('path')
const { build, context } = require('esbuild')

const args = minimist(process.argv.slice(2))

const target = args._[0] ?? "reactivity"
const format = args.f ?? "global"

const package = resolve(__dirname, `../packages/${target}/package.json`)

const outputFormat = format.startsWith("global") ? "iife" : format === "cjs" ? "cjs" : "esm"

const entryPoint = resolve(__dirname, `../packages/${target}/src/index.ts`)
const outputfile = resolve(__dirname, `../packages/${target}/dist/${target}.${outputFormat}.js`)

console.table({ target, format, outputFormat, entryPoint, outputfile })

build({
  entryPoints: [entryPoint],
  outfile: outputfile,
  bundle: true,
  format: outputFormat,
  sourcemap: true,
  globalName: package.buildOptions?.name,
  platform: format === "cjs" ? "node" : "browser",
  // watch: true
  // watch: {
  //   onRebuild(error, result) {
  //     if (error) console.error('watch build failed:', error)
  //     else console.log('watch build succeeded:', result)
  //   }
  // }
}).then(() => console.log('build succeeded')).catch(() => process.exit(1))

// context({

//   entryPoints: [entryPoint],
//   outfile: outputfile,
//   bundle: true,
//   format: outputFormat,
//   sourcemap: true,
//   globalName: package.buildOptions?.name,
//   platform: format === "cjs" ? "node" : "browser",
//   watch: true
//   // watch: {
//   //   onRebuild(error, result) {
//   //     if (error) console.error('watch build failed:', error)
//   //     else console.log('watch build succeeded:', result)
//   //   }
//   // }
// }).then(() => console.log('build succeeded')).catch(() => process.exit(1))