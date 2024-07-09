import Boom from '@hapi/boom'
import { isNil } from 'lodash'
import { config } from '~/src/config'
import { envTestSuiteValidation } from '~/src/api/create-env-test-suite/helpers/schema/env-test-suite-validation'
import { updateOverallStatus } from '~/src/api/create-microservice/helpers/save-status'
import { raiseInfraPullRequest } from '~/src/api/helpers/create/raise-infra-pull-request'
import { testRunnerEnvironments } from '~/src/config/test-runner-environments'
import { createTestSuiteStatus } from '~/src/api/helpers/create/create-test-suite-status'
import { creations } from '~/src/constants/creations'
import { createTestSuiteFromTemplate } from '~/src/api/helpers/create/create-test-suite-from-template'
import { createSquidConfig } from '~/src/api/helpers/create/create-squid-config'

const createEnvTestSuiteController = {
  options: {
    auth: {
      strategy: 'azure-oidc',
      access: {
        scope: [config.get('oidcAdminGroupId'), '{payload.teamId}']
      }
    },
    validate: {
      payload: envTestSuiteValidation,
      failAction: () => Boom.boomify(Boom.badRequest())
    }
  },
  handler: async (request, h) => {
    const gitHubOrg = config.get('gitHubOrg')

    const payload = request?.payload
    const repositoryName = payload?.repositoryName

    const zone = 'public'
    const { team } = await request.server.methods.fetchTeam(payload?.teamId)
    if (isNil(team?.github)) {
      throw Boom.badData(`Team ${team.name} does not have a linked Github team`)
    }

    request.logger.info(`Creating env test suite: ${repositoryName}`)

    try {
      await createTestSuiteStatus(
        request.db,
        gitHubOrg,
        repositoryName,
        zone,
        team,
        creations.envTestsuite,
        'cdp-node-env-test-suite-template'
      )
    } catch (e) {
      request.logger.error(e)
      throw Boom.badData(
        `repository ${repositoryName} has already been requested or is in progress`
      )
    }

    const template = config.get('createEnvTestSuiteWorkflow')
    await createTestSuiteFromTemplate(request, template, repositoryName, team)

    await createSquidConfig(request, repositoryName)

    await raiseInfraPullRequest(
      request,
      repositoryName,
      zone,
      testRunnerEnvironments.environment
    )

    // calculate and set the overall status
    await updateOverallStatus(request.db, repositoryName)

    return h
      .response({
        message: 'Env test suite creation has started',
        repositoryName,
        statusUrl: `/status/${repositoryName}`
      })
      .code(200)
  }
}

export { createEnvTestSuiteController }
