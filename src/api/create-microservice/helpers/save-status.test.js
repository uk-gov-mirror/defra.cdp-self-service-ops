import { statuses } from '~/src/constants/statuses'
import { creations } from '~/src/constants/creations'
import { calculateOverallStatus } from '~/src/api/create-microservice/helpers/save-status'

describe('#calculateOverallStatus', () => {
  describe('When calculating a microservice status', () => {
    test('Should provide a "Success" status', () => {
      const result = calculateOverallStatus({
        kind: creations.microservice,
        createRepository: { status: statuses.success },
        'cdp-tf-svc-infra': { status: statuses.success },
        'cdp-app-config': { status: statuses.success },
        'cdp-nginx-upstreams': { status: statuses.success },
        'cdp-squid-proxy': { status: statuses.success }
      })

      expect(result).toBe(statuses.success)
    })

    test('Should provide a "Failure" status', () => {
      const result = calculateOverallStatus({
        kind: creations.microservice,
        createRepository: { status: statuses.success },
        'cdp-tf-svc-infra': { status: statuses.success },
        'cdp-app-config': { status: statuses.failure },
        'cdp-nginx-upstreams': { status: statuses.success },
        'cdp-squid-proxy': { status: statuses.success }
      })

      expect(result).toBe(statuses.failure)
    })

    test('Should provide an "In Progress" status', () => {
      const result = calculateOverallStatus({
        kind: creations.microservice,
        createRepository: { status: statuses.success },
        'cdp-tf-svc-infra': { status: statuses.success },
        'cdp-app-config': { status: 'some-weird-setting' },
        'cdp-nginx-upstreams': { status: statuses.inProgress },
        'cdp-squid-proxy': { status: statuses.success }
      })

      expect(result).toBe(statuses.inProgress)
    })
  })

  describe('When calculating a repository status', () => {
    test('Should provide a "Success" status', () => {
      const result = calculateOverallStatus({
        kind: creations.repository,
        createRepository: { status: statuses.success }
      })

      expect(result).toBe(statuses.success)
    })

    test('Should provide a "Failure" status', () => {
      const result = calculateOverallStatus({
        kind: creations.repository,
        createRepository: { status: statuses.failure }
      })

      expect(result).toBe(statuses.failure)
    })

    test('Should provide an "In Progress" status', () => {
      const result = calculateOverallStatus({
        kind: creations.repository,
        createRepository: { status: 'some-weird-setting' }
      })

      expect(result).toBe(statuses.inProgress)
    })
  })
})
