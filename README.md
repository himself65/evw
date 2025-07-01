# evw

evw (aka. event &workflow) is a library for building event-driven application in JavaScript/TypeScript.

- designed for cross JavaScript environments (Node.js, Electron, Browser)
- minimal core API
- written in TypeScript, 100% type and test coverage

## Usage

```shell
npm i evw
```

### Electron <-> Web Communication

```tsx
// @file: events.ts
import { defineEvent } from 'evw'

export const storeDBEvent = defineEvent<{
  content: string;
}>()
```

```ts
// @file: main.ts
import { storeDBEvent } from './events'
import { ipcMain } from 'evw/electron'

ipcMain.on(storeDBEvent, (event, data) => {
  console.log('Received data from web:', data.content)
})
```

```tsx
// @file: app.tsx
import { storeDBEvent } from './events'
import { sendEvent } from 'evw/electron'

export const App = () => {
  const handleClick = () => {
    sendEvent(storeDBEvent, { content: 'Hello from Web!' })
  }

  return (
    <div>
      <button onClick={handleClick}>Send Message to Electron</button>
    </div>
  )
}
```

## LICENSE

MIT
