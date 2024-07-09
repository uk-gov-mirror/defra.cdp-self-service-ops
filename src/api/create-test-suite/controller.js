import Boom from '@hapi/boom'
import { isNil } from 'lodash'

import { config } from '~/src/config'
import { testSuiteValidation } from '~/src/api/create-test-suite/helpers/schema/test-suite-validation'
import { createTestSuiteStatus } from '~/src/api/create-test-suite/helpers/status/create-test-suite-status'
import { createTestSuiteFromTemplate } from '~/src/api/helpers/create/create-test-suite-from-template'

const createTestSuiteController = {
  options: {
    auth: {
      strategy: 'azure-oidc',
      access: {
        scope: [config.get('oidcAdminGroupId'), '{payload.teamId}']
      }
    },
    validate: {
      payload: testSuiteValidation,
      failAction: () => Boom.boomify(Boom.badRequest())
    }
  },
  handler: async (request, h) => {
    const gitHubOrg = config.get('gitHubOrg')

    const payload = request?.payload
    const repositoryName = payload?.repositoryName

    const { team } = await request.server.methods.fetchTeam(payload?.teamId)
    if (isNil(team?.github)) {
      throw Boom.badData(`Team ${team.name} does not have a linked Github team`)
    }

    request.logger.info(`Creating repository: ${repositoryName}`)

    await createTestSuiteStatus(
      request.db,
      gitHubOrg,
      repositoryName,
      payload,
      team
    )

    const template = config.get('createJourneyTestWorkflow')
    await createTestSuiteFromTemplate(request, template, repositoryName, team)

    return h
      .response({
        message: 'Test suite creation has started',
        repositoryName,
        statusUrl: `/status/${repositoryName}`
      })
      .code(200)
  }
}

export { createTestSuiteController }
