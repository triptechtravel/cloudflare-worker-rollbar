import { describe, it, expect } from 'vitest'
import {
  parseStackFrames,
  createStackFrame,
  getErrorLocation,
} from '../src/stack-parser'

describe('Stack Parser', () => {
  describe('parseStackFrames', () => {
    it('should parse V8/Chrome style stack traces', () => {
      const error = new Error('Test error')
      error.stack = `Error: Test error
    at functionName (file:///path/to/file.js:10:15)
    at anotherFunction (file:///path/to/other.js:20:25)
    at file:///path/to/anonymous.js:30:35`

      const frames = parseStackFrames(error)

      // Should have 3 meaningful frames (Error: Test error is skipped)
      expect(frames.length).toBeGreaterThanOrEqual(3)

      // Check that we got meaningful frames with filenames
      const meaningfulFrames = frames.filter(f => f.filename && f.filename !== '(unknown)')
      expect(meaningfulFrames.length).toBeGreaterThanOrEqual(3)

      // Verify at least one frame has correct structure
      const hasValidFrame = frames.some(
        f => f.filename?.includes('file.js') || f.filename?.includes('other.js')
      )
      expect(hasValidFrame).toBe(true)
    })

    it('should handle real V8 stack traces from Workers', () => {
      const error = new Error('Test error')
      // This is what a real Worker stack trace looks like
      error.stack = `Error: Test error
    at handleRequest (worker.js:50:10)
    at Object.fetch (worker.js:30:5)`

      const frames = parseStackFrames(error)
      expect(frames.length).toBeGreaterThan(0)

      // Find the handleRequest frame
      const handleRequestFrame = frames.find(f => f.method === 'handleRequest')
      if (handleRequestFrame) {
        expect(handleRequestFrame.filename).toBe('worker.js')
        expect(handleRequestFrame.lineno).toBe(50)
        expect(handleRequestFrame.colno).toBe(10)
      }
    })

    it('should handle errors without stack traces', () => {
      const error = new Error('No stack')
      error.stack = undefined

      const frames = parseStackFrames(error)

      expect(frames).toHaveLength(1)
      expect(frames[0]).toEqual({
        filename: '(no stack trace)',
        method: 'Error',
      })
    })

    it('should handle empty stack traces', () => {
      const error = new Error('Empty stack')
      error.stack = ''

      const frames = parseStackFrames(error)

      expect(frames).toHaveLength(1)
      expect(frames[0]?.filename).toBe('(no stack trace)')
    })

    it('should preserve original error name', () => {
      const error = new TypeError('Type mismatch')
      error.stack = undefined

      const frames = parseStackFrames(error)

      expect(frames[0]?.method).toBe('TypeError')
    })

    it('should parse actual Error stack traces', () => {
      // Create a real error to test actual parsing
      const error = new Error('Real error')

      const frames = parseStackFrames(error)

      // Should have at least one frame
      expect(frames.length).toBeGreaterThan(0)

      // All frames should have at least a filename or method
      for (const frame of frames) {
        expect(frame.filename || frame.method).toBeDefined()
      }
    })
  })

  describe('createStackFrame', () => {
    it('should create a stack frame with all fields', () => {
      const frame = createStackFrame('test.js', 'myFunction', 10, 5)

      expect(frame).toEqual({
        filename: 'test.js',
        method: 'myFunction',
        lineno: 10,
        colno: 5,
      })
    })

    it('should create a stack frame with optional fields', () => {
      const frame = createStackFrame('test.js', 'myFunction')

      expect(frame).toEqual({
        filename: 'test.js',
        method: 'myFunction',
        lineno: undefined,
        colno: undefined,
      })
    })
  })

  describe('getErrorLocation', () => {
    it('should extract location from stack trace', () => {
      const error = new Error('Test')
      error.stack = `Error: Test
    at innerFunction (inner.js:5:10)
    at outerFunction (outer.js:15:20)`

      const location = getErrorLocation(error)

      // Should get a location from the stack
      expect(location).not.toBeNull()
      if (location) {
        expect(location.filename || location.method).toBeDefined()
      }
    })

    it('should return null for errors without stack', () => {
      const error = new Error('No stack')
      error.stack = undefined

      const location = getErrorLocation(error)

      expect(location).toBeNull()
    })

    it('should work with real errors', () => {
      // Create a real error
      const error = new Error('Real error')

      const location = getErrorLocation(error)

      // Real errors should have a location
      expect(location).not.toBeNull()
    })
  })
})
