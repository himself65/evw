import { expect, test } from 'vitest'
import { transform } from '@swc/core'
import path from 'node:path'

const pluginPath = path.resolve(import.meta.dirname, '..',
  'evw_swc_plugin.wasm')

test('swc plugin basic test', async () => {
  const { code } = await transform(`import { defineEvent } from 'evw';

const startEvent = defineEvent();
const endEvent = defineEvent();`, {
    jsc: {
      parser: {
        syntax: 'ecmascript',
        jsx: true
      },
      target: 'es2018',
      experimental: {
        plugins: [
          [
            pluginPath,
            {}
          ]
        ]
      }
    },
    filename: 'test.js'
  })
  expect(code).toMatchInlineSnapshot(`
    "import { registerEvent } from 'evw/ipc';
    import { defineEvent } from 'evw';
    const startEvent = defineEvent();
    registerEvent(startEvent, "c8da81ae30c106374b862dcaecc88e610bbb27fdcaab230cf448d5b64241b672");
    const endEvent = defineEvent();
    registerEvent(endEvent, "0c2a400828776e969bb2b036c7b245fb835d06acb406d24032fe7c5d38753969");
    "
  `)
})