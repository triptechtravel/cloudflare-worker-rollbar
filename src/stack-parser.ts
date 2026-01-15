import type { StackFrame } from './types'

/**
 * Regular expressions for parsing different stack trace formats
 *
 * V8/Chrome format examples:
 *   at functionName (filename.js:10:15)
 *   at functionName (file:///path/to/file.js:10:15)
 *   at filename.js:10:15
 *   at async handleRequest (worker.js:50:10)
 *
 * Firefox format examples:
 *   functionName@filename.js:10:15
 *   @filename.js:10:15
 */

// Match V8/Chrome stack frames - handles file:// URLs and regular paths
const V8_FRAME_REGEX =
  /^\s*at\s+(?:async\s+)?(?:(?<method>[\w.<>[\]$]+)\s+\()?(?<filename>.+?):(?<lineno>\d+):(?<colno>\d+)\)?$/

// Match anonymous V8 frames (no method name, just filename:line:col)
const V8_ANONYMOUS_REGEX =
  /^\s*at\s+(?<filename>.+?):(?<lineno>\d+):(?<colno>\d+)$/

// Match Firefox/SpiderMonkey stack frames
const FIREFOX_REGEX =
  /^(?<method>[\w.<>[\]$]+)?@(?<filename>.+?):(?<lineno>\d+):(?<colno>\d+)$/

interface ParsedGroups {
  method?: string
  filename?: string
  lineno?: string
  colno?: string
}

/**
 * Parse a single line of a stack trace into a StackFrame
 */
function parseStackLine(line: string): StackFrame | null {
  const trimmed = line.trim()

  // Skip empty lines and the error message line
  if (!trimmed || trimmed.startsWith('Error:') || trimmed === 'Error') {
    return null
  }

  // Try V8/Chrome format with method name
  let match = trimmed.match(V8_FRAME_REGEX)
  if (match?.groups) {
    const groups = match.groups as ParsedGroups
    if (groups.filename && groups.lineno && groups.colno) {
      return {
        filename: groups.filename,
        lineno: parseInt(groups.lineno, 10),
        colno: parseInt(groups.colno, 10),
        method: groups.method || '(anonymous)',
      }
    }
  }

  // Try V8 anonymous format
  match = trimmed.match(V8_ANONYMOUS_REGEX)
  if (match?.groups) {
    const groups = match.groups as ParsedGroups
    if (groups.filename && groups.lineno && groups.colno) {
      return {
        filename: groups.filename,
        lineno: parseInt(groups.lineno, 10),
        colno: parseInt(groups.colno, 10),
        method: '(anonymous)',
      }
    }
  }

  // Try Firefox format
  match = trimmed.match(FIREFOX_REGEX)
  if (match?.groups) {
    const groups = match.groups as ParsedGroups
    if (groups.filename && groups.lineno && groups.colno) {
      return {
        filename: groups.filename,
        lineno: parseInt(groups.lineno, 10),
        colno: parseInt(groups.colno, 10),
        method: groups.method || '(anonymous)',
      }
    }
  }

  // If we can't parse it, return a basic frame with the raw line as method
  // This ensures we don't lose information
  return {
    filename: '(unparsed)',
    method: trimmed,
  }
}

/**
 * Parse an Error's stack trace into Rollbar-compatible stack frames
 *
 * Rollbar expects frames in reverse order (oldest frame first),
 * so we reverse the parsed frames.
 *
 * @param error - The Error object to parse
 * @returns Array of StackFrame objects for Rollbar
 */
export function parseStackFrames(error: Error): StackFrame[] {
  if (!error.stack) {
    return [
      {
        filename: '(no stack trace)',
        method: error.name || 'Error',
      },
    ]
  }

  const lines = error.stack.split('\n')
  const frames: StackFrame[] = []

  for (const line of lines) {
    const frame = parseStackLine(line)
    if (frame) {
      frames.push(frame)
    }
  }

  // If no frames were parsed, return a placeholder
  if (frames.length === 0) {
    return [
      {
        filename: '(no stack trace)',
        method: error.name || 'Error',
      },
    ]
  }

  // Rollbar expects frames in reverse order (oldest first)
  return frames.reverse()
}

/**
 * Create a synthetic stack frame for a given location
 * Useful for manually creating error context
 */
export function createStackFrame(
  filename: string,
  method: string,
  lineno?: number,
  colno?: number
): StackFrame {
  return {
    filename,
    method,
    lineno,
    colno,
  }
}

/**
 * Extract the error location from the first meaningful stack frame
 */
export function getErrorLocation(error: Error): {
  filename?: string
  lineno?: number
  colno?: number
  method?: string
} | null {
  const frames = parseStackFrames(error)

  // Get the last frame (which is the first in the original stack - where the error occurred)
  const frame = frames[frames.length - 1]

  if (!frame || frame.filename === '(no stack trace)' || frame.filename === '(unparsed)') {
    return null
  }

  return frame
}
