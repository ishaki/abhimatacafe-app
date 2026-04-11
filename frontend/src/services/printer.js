/**
 * Bluetooth thermal printer service (Web Bluetooth + ESC/POS).
 *
 * Designed for generic 80mm BLE thermal printers (Xprinter, GOOJPRT,
 * MUNBYN, etc.). Maintains a single GATT connection across the app, so
 * navigation between pages doesn't drop the printer.
 *
 * Browser support: Chrome on Android, Chrome/Edge on desktop. iOS
 * Safari does NOT support Web Bluetooth at all.
 */

// --- ESC/POS command primitives ---
const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

const INIT = [ESC, 0x40]
const ALIGN_LEFT = [ESC, 0x61, 0x00]
const ALIGN_CENTER = [ESC, 0x61, 0x01]
const FONT_NORMAL = [ESC, 0x21, 0x00]
const FONT_DOUBLE = [ESC, 0x21, 0x30] // double width + double height
const BOLD_ON = [ESC, 0x45, 0x01]
const BOLD_OFF = [ESC, 0x45, 0x00]
const CUT_FULL = [GS, 0x56, 0x42, 0x00]
const feed = (n) => [ESC, 0x64, n]

// 80mm thermal printer with font A (default) = 48 chars per line.
const LINE_WIDTH = 48

// Common BLE service UUIDs used by generic thermal printers. Listed in
// `optionalServices` so we can access them after connecting with
// `acceptAllDevices`.
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // standard ESC/POS over BLE
  '0000ff00-0000-1000-8000-00805f9b34fb', // some Xprinter models
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // some MUNBYN models
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / generic SPP
]

// --- Encoding ---

/**
 * Encode a JS string to bytes that a CP437/Latin-1 thermal printer can
 * render. Indonesian text is almost entirely ASCII so this is safe;
 * anything outside Latin-1 becomes '?'.
 */
function encodeText(str) {
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    bytes.push(code > 255 ? 0x3f : code)
  }
  return bytes
}

function encodeLine(str) {
  return [...encodeText(str), LF]
}

function repeatChar(char, n) {
  return char.repeat(n)
}

/**
 * Wrap a string at LINE_WIDTH on word boundaries. Used for long item
 * names / notes so they don't overflow off the right edge.
 */
function wrapLines(str, width = LINE_WIDTH, indent = '') {
  if (!str) return ['']
  const words = String(str).split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    if (!current.length) {
      current = word
    } else if (current.length + 1 + word.length <= width) {
      current += ' ' + word
    } else {
      lines.push(current)
      current = indent + word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

// --- Receipt builder ---

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * Build the raw ESC/POS byte sequence for a kitchen ticket. No prices,
 * no totals, no tax — just what the kitchen needs to cook the order.
 */
export function buildKitchenTicketBytes(order, { cafeName = 'ABHIMATA CAFE' } = {}) {
  const out = []
  const push = (chunk) => out.push(...chunk)

  push(INIT)

  // Header
  push(ALIGN_CENTER)
  push(FONT_DOUBLE)
  push(encodeLine(cafeName.toUpperCase()))
  push(FONT_NORMAL)
  push(BOLD_ON)
  push(encodeLine('KITCHEN TICKET'))
  push(BOLD_OFF)
  push(encodeLine(repeatChar('=', LINE_WIDTH)))

  // Order metadata
  push(ALIGN_LEFT)
  push(FONT_DOUBLE)
  push(encodeLine(`Order #${order.id}`))
  push(FONT_NORMAL)

  push(encodeLine(`Time: ${formatTimestamp(order.created_at)}`))

  // Table or takeaway
  if (order.order_type === 'take_away') {
    const queue = order.queue_number ? `#${order.queue_number}` : ''
    push(BOLD_ON)
    push(encodeLine(`TAKEAWAY ${queue}`.trim()))
    push(BOLD_OFF)
  } else {
    push(BOLD_ON)
    push(encodeLine(`TABLE ${order.table_number}`))
    push(BOLD_OFF)
  }

  if (order.customer_name) {
    push(encodeLine(`Customer: ${order.customer_name}`))
  }

  push(encodeLine(repeatChar('-', LINE_WIDTH)))

  // Items
  const items = order.items || []
  if (items.length === 0) {
    push(encodeLine('(no items)'))
  } else {
    for (const item of items) {
      const qty = `${item.quantity}x`
      const namePrefix = `${qty} `
      const nameLines = wrapLines(item.menu_item_name || '', LINE_WIDTH - namePrefix.length, '    ')

      // First line of the item, bold for visibility
      push(BOLD_ON)
      push(encodeLine(`${namePrefix}${nameLines[0]}`))
      // Continuation lines (if name was wrapped)
      for (let i = 1; i < nameLines.length; i++) {
        push(encodeLine(`    ${nameLines[i]}`))
      }
      push(BOLD_OFF)

      // Special instructions
      if (item.notes && item.notes.trim()) {
        const noteLines = wrapLines(`>> ${item.notes.trim()}`, LINE_WIDTH - 4, '   ')
        for (const ln of noteLines) {
          push(encodeLine(`   ${ln}`))
        }
      }
      // Spacer between items
      push([LF])
    }
  }

  push(encodeLine(repeatChar('=', LINE_WIDTH)))

  // Trailing feed + cut
  push(feed(4))
  push(CUT_FULL)

  return new Uint8Array(out)
}

// --- Bluetooth client (singleton) ---

class PrinterClient {
  constructor() {
    this.device = null
    this.server = null
    this.characteristic = null
    this._listeners = new Set()
  }

  isSupported() {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth
  }

  isConnected() {
    return !!(this.characteristic && this.device && this.device.gatt && this.device.gatt.connected)
  }

  getDeviceName() {
    return this.device ? this.device.name || 'Unknown printer' : null
  }

  /** Subscribe to connection-state changes. Returns an unsubscribe fn. */
  onChange(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify() {
    for (const listener of this._listeners) {
      try {
        listener({ connected: this.isConnected(), deviceName: this.getDeviceName() })
      } catch (e) {
        // ignore listener errors
      }
    }
  }

  /**
   * On app load, try to silently reconnect to a previously-permitted
   * device. Requires `navigator.bluetooth.getDevices()` (Chrome 85+).
   * Does nothing if no permission was previously granted or the API
   * isn't available.
   */
  async tryAutoReconnect() {
    if (!this.isSupported() || !navigator.bluetooth.getDevices) return false
    try {
      const devices = await navigator.bluetooth.getDevices()
      if (!devices || devices.length === 0) return false
      // Use the first remembered device
      const device = devices[0]
      await this._attachDevice(device)
      return this.isConnected()
    } catch (e) {
      return false
    }
  }

  /**
   * Show the browser's device chooser and connect to the selected printer.
   * Must be called from a user gesture (button click).
   */
  async connect() {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth is not supported on this browser. Use Chrome on Android.')
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_PRINTER_SERVICES,
    })

    await this._attachDevice(device)

    if (!this.characteristic) {
      throw new Error(
        'Connected to device but no writable characteristic was found. Is this a printer?'
      )
    }
  }

  async _attachDevice(device) {
    this.device = device
    device.addEventListener('gattserverdisconnected', () => this._handleDisconnect())

    const server = await device.gatt.connect()
    this.server = server

    // Find a writable characteristic across all primary services.
    const services = await server.getPrimaryServices()
    let writable = null
    outer: for (const service of services) {
      const characteristics = await service.getCharacteristics()
      for (const ch of characteristics) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          writable = ch
          break outer
        }
      }
    }

    this.characteristic = writable
    this._notify()
  }

  _handleDisconnect() {
    this.characteristic = null
    this.server = null
    this._notify()
  }

  async disconnect() {
    try {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect()
      }
    } catch (e) {
      // ignore
    }
    this.device = null
    this.server = null
    this.characteristic = null
    this._notify()
  }

  /**
   * Write the given Uint8Array to the printer in small chunks. Default
   * BLE MTU only allows 20-byte payloads on older Android versions, so
   * we chunk to 100 bytes which works on every printer we've tested.
   */
  async _writeBytes(bytes) {
    if (!this.isConnected()) {
      throw new Error('Printer is not connected. Tap "Connect Printer" first.')
    }
    const ch = this.characteristic
    const useResponse = ch.properties.write && !ch.properties.writeWithoutResponse
    const CHUNK = 100
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
      if (useResponse) {
        await ch.writeValueWithResponse(slice)
      } else if (ch.writeValueWithoutResponse) {
        await ch.writeValueWithoutResponse(slice)
      } else {
        await ch.writeValue(slice)
      }
      // Tiny gap so cheap printers don't choke on back-to-back writes
      await new Promise((r) => setTimeout(r, 15))
    }
  }

  /** High-level: print a kitchen ticket for an order. */
  async printOrder(order, opts = {}) {
    const bytes = buildKitchenTicketBytes(order, opts)
    await this._writeBytes(bytes)
  }
}

const printerClient = new PrinterClient()
export default printerClient
