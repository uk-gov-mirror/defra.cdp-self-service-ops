import Boom from '@hapi/boom'
import { isNil } from 'lodash'
import { config } from '~/src/config'
import { updateOverallStatus } from '~/src/api/create-microservice/helpers/save-status'
import { raiseInfraPullRequest } from '~/src/api/helpers/create/raise-infra-pull-request'
import { testRunnerEnvironments } from '~/src/config/test-runner-environments'
import { createTestSuiteStatus } from '~/src/api/helpers/create/create-test-suite-status'
import { creations } from '~/src/constants/creations'
import { smokeTestSuiteValidation } from '~/src/api/create-smoke-test-suite/helpers/schema/smoke-test-suite-validation'
import { createTestSuiteFromTemplate } from '~/src/api/helpers/create/create-test-suite-from-template'
import { createSquidConfig } from '~/src/api/helpers/create/create-squid-config'

const createSmokeTestSuiteController = {
  options: {
    auth: {
      strategy: 'azure-oidc',
      access: {
        scope: [config.get('oidcAdminGroupId'), '{payload.teamId}']
      }
    },
    validate: {
      payload: smokeTestSuiteValidation,
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

    request.logger.info(`Creating smoke test suite: ${repositoryName}`)

    try {
      await createTestSuiteStatus(
        request.db,
        gitHubOrg,
        repositoryName,
        zone,
        team,
        creations.smokeTestSuite,
        'cdp-node-env-test-suite-template' // for now env and smoke share the same template
      )
    } catch (e) {
      request.logger.error(e)
      throw Boom.badData(
        `repository ${repositoryName} has already been requested or is in progress`
      )
    }

    const template = config.get('createSmokeTestSuiteWorkflow')
    await createTestSuiteFromTemplate(request, template, repositoryName, team)

    await createSquidConfig(request, repositoryName)

    await raiseInfraPullRequest(
      request,
      repositoryName,
      zone,
      testRunnerEnvironments.smoke
    )

    // calculate and set the overall status
    await updateOverallStatus(request.db, repositoryName)

    return h
      .response({
        message: 'Smoke test suite creation has started',
        repositoryName,
        statusUrl: `/status/${repositoryName}`
      })
      .code(200)
  }
}

export { createSmokeTestSuiteController }
