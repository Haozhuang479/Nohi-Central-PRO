import { describe, it, expect } from 'vitest'
import {
  SessionSchema,
  CreateSessionSchema,
  SkillCreateSchema,
  AutomationCreateSchema,
  NohiSettingsSchema,
  safeParseIpc,
} from '../electron/main/engine/ipc-schemas'

describe('SessionSchema', () => {
  it('accepts a valid session', () => {
    const session = {
      id: 'sess-1',
      title: 'Test',
      createdAt: 1,
      updatedAt: 2,
      messages: [{ id: 'm1', role: 'user' as const, content: 'hi', timestamp: 1 }],
      model: 'claude-opus-4-6',
      workingDir: '/tmp',
    }
    expect(() => SessionSchema.parse(session)).not.toThrow()
  })

  it('rejects invalid role', () => {
    expect(() => SessionSchema.parse({
      id: 'a', title: 't', createdAt: 1, updatedAt: 1,
      messages: [{ id: 'm', role: 'system', content: 'x', timestamp: 1 }],
      model: 'm', workingDir: '/',
    })).toThrow()
  })
})

describe('CreateSessionSchema', () => {
  it('requires model', () => {
    expect(() => CreateSessionSchema.parse({})).toThrow()
  })
  it('makes workingDir optional', () => {
    const r = CreateSessionSchema.parse({ model: 'claude-opus-4-6' })
    expect(r.workingDir).toBeUndefined()
  })
})

describe('SkillCreateSchema', () => {
  it('rejects skill names with special chars', () => {
    expect(() => SkillCreateSchema.parse({
      name: 'my skill!', description: 'd', trigger: 't', content: 'c',
    })).toThrow()
  })
  it('accepts valid kebab-case name', () => {
    expect(() => SkillCreateSchema.parse({
      name: 'my-skill', description: 'd', trigger: 't', content: 'c',
    })).not.toThrow()
  })
})

describe('AutomationCreateSchema', () => {
  it('rejects invalid timeOfDay', () => {
    expect(() => AutomationCreateSchema.parse({
      name: 'n', prompt: 'p', schedule: 'daily', timeOfDay: '25:99',
    })).toThrow()
  })
  it('rejects out-of-range dayOfWeek', () => {
    expect(() => AutomationCreateSchema.parse({
      name: 'n', prompt: 'p', schedule: 'weekly', dayOfWeek: 8,
    })).toThrow()
  })
})

describe('NohiSettingsSchema', () => {
  it('accepts a minimal settings object', () => {
    expect(() => NohiSettingsSchema.parse({
      defaultModel: 'claude-opus-4-6',
      skillsDir: '/x',
      workingDir: '/y',
      mcpServers: [],
      theme: 'light',
    })).not.toThrow()
  })

  it('rejects unknown theme', () => {
    expect(() => NohiSettingsSchema.parse({
      defaultModel: 'm', skillsDir: '/x', workingDir: '/y', mcpServers: [], theme: 'rainbow',
    })).toThrow()
  })
})

describe('safeParseIpc', () => {
  it('returns parsed data on success', () => {
    const r = safeParseIpc(CreateSessionSchema, { model: 'm' }, 'test')
    expect(r.model).toBe('m')
  })
  it('throws labeled error on failure', () => {
    expect(() => safeParseIpc(CreateSessionSchema, {}, 'test'))
      .toThrowError(/\[IPC test\]/)
  })
})
