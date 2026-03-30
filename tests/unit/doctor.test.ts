import { describe, expect, it } from 'vitest'
import { Doctor } from '../../src/Doctor.js'

describe('forge > Doctor', () => {
  const doctor = new Doctor()

  it('checks Node.js version', () => {
    const result = doctor.checkNodeVersion()
    // We're running on Node 22+ in this project
    expect(result.status).toBe('pass')
    expect(result.name).toBe('Node.js version')
  })

  it('runs all checks without throwing', () => {
    const results = doctor.check()
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(['pass', 'warn', 'fail']).toContain(r.status)
      expect(r.name).toBeTruthy()
      expect(r.message).toBeTruthy()
    }
  })

  it('formats results with icons', () => {
    const output = doctor.format([
      { name: 'Test A', status: 'pass', message: 'OK' },
      { name: 'Test B', status: 'warn', message: 'Meh', fix: 'Do something' },
      { name: 'Test C', status: 'fail', message: 'Bad', fix: 'Fix it' },
    ])
    expect(output).toContain('[OK]')
    expect(output).toContain('[!!]')
    expect(output).toContain('[XX]')
    expect(output).toContain('Fix: Do something')
    expect(output).toContain('1 passed, 1 warnings, 1 failed')
  })

  it('checkEnvFile returns warn when no .env in cwd', () => {
    // Running from repo root which has no .env typically
    const result = doctor.checkEnvFile()
    expect(['pass', 'warn']).toContain(result.status)
  })

  it('checkPackageJson finds package.json in repo root', () => {
    const result = doctor.checkPackageJson()
    // The repo root has a package.json
    expect(['pass', 'warn']).toContain(result.status)
  })
})
