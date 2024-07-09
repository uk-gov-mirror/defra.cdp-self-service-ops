import Boom from '@hapi/boom'
import { isNil, isNull } from 'lodash'

import { serviceTemplates } from '~/src/api/create-microservice/helpers/service-templates'
import { createServiceValidationSchema } from '~/src/api/create-microservice/helpers/create-service-validation-schema'
import { createServiceConfig } from '~/src/api/create-microservice/helpers/create-service-config'
import { createNginxConfig } from '~/src/api/create-microservice/helpers/create-nginx-config'
import { doUpdateTfSvcInfra } from '~/src/api/create-microservice/helpers/update-tfsvcinfra'
import { config, environments } from '~/src/config'
import { trimPr } from '~/src/api/create-microservice/helpers/trim-pr'
import { triggerWorkflow } from '~/src/api/helpers/workflow/trigger-workflow'
import { statuses } from '~/src/constants/statuses'
import {
  initCreationStatus,
  updateCreationStatus,
  updateOverallStatus
} from '~/src/api/create-microservice/helpers/save-status'
import { createSquidConfig } from '~/src/api/helpers/create/create-squid-config'

const createMicroserviceController = {
  options: {
    auth: {
      strategy: 'azure-oidc',
      access: {
        scope: [config.get('oidcAdminGroupId'), '{payload.teamId}']
      }
    },
    validate: {
      payload: createServiceValidationSchema(),
      failAction: () => Boom.boomify(Boom.badRequest())
    }
  },
  handler: async (request, h) => {
    const payload = request?.payload
    const serviceTypeTemplate = payload?.serviceTypeTemplate
    const org = config.get('gitHubOrg')
    const repositoryName = payload?.repositoryName

    const zone = serviceTemplates[serviceTypeTemplate]?.zone ?? null
    if (isNull(zone)) {
      throw Boom.badData(`Invalid service template: '${serviceTypeTemplate}'`)
    }

    const { team } = await request.server.methods.fetchTeam(payload.teamId)
    if (isNil(team.github)) {
      throw Boom.badData(
        `Team ${team.name} does not have a link to a Github team`
      )
    }

    request.logger.info(`creating service ${repositoryName}`)

    // Set up the initial DB record
    try {
      await initCreationStatus(
        request.db,
        org,
        repositoryName,
        payload,
        zone,
        team
      )
    } catch (e) {
      request.logger.error(e)
      throw Boom.badData(
        `repository ${repositoryName} has already been requested or is in progress`
      )
    }
    // create the blank repo
    await doCreateRepo(request, repositoryName, payload, team)

    // tf-svc-infra
    await doUpdateTfSvcInfra(request, repositoryName, zone)

    // cdp-app-config
    await doUpdateCdpAppConfig(request, repositoryName, team)

    // cdp-nginx-upstreams
    await doUpdateCdpNginxUpstream(request, repositoryName, zone)

    // cdp-squid-proxy
    await createSquidConfig(request, repositoryName)

    // calculate and set the overall status
    await updateOverallStatus(request.db, repositoryName)

    return h
      .response({
        message: 'Service creation has started',
        repositoryName,
        statusUrl: `/status/${repositoryName}`
      })
      .code(200)
  }
}

const doCreateRepo = async (request, repositoryName, payload, team) => {
  try {
    const org = config.get('gitHubOrg')
    const serviceTypeTemplate = payload?.serviceTypeTemplate

    await triggerWorkflow(
      org,
      config.get('gitHubRepoCreateWorkflows'),
      config.get('createMicroServiceWorkflow'),
      {
        repositoryName,
        serviceTypeTemplate,
        team: team.github
      }
    )
  } catch (e) {
    await updateCreationStatus(request.db, repositoryName, 'createRepository', {
      status: statuses.failure,
      result: e
    })
    request.logger.error(`created repo ${repositoryName} failed ${e}`)
    request.logger.error(e)
  }
}

const doUpdateCdpAppConfig = async (request, repositoryName, team) => {
  const cdpAppConfig = config.get('gitHubRepoConfig')
  try {
    const createServiceConfigResult = await createServiceConfig(
      repositoryName,
      team
    )
    await updateCreationStatus(request.db, repositoryName, cdpAppConfig, {
      status: statuses.raised,
      pr: trimPr(createServiceConfigResult?.data)
    })
    request.logger.info(
      `created service config PR for ${repositoryName}: ${createServiceConfigResult.data.html_url}`
    )
  } catch (e) {
    await updateCreationStatus(request.db, repositoryName, cdpAppConfig, {
      status: statuses.failure,
      result: e?.response ?? 'see cdp-self-service-ops logs'
    })
    request.logger.error(`update cdp-app-config ${repositoryName} failed ${e}`)
  }
}

const doUpdateCdpNginxUpstream = async (request, repositoryName, zone) => {
  const cdpNginxUpstream = config.get('gitHubRepoNginx')
  try {
    const createNginxConfigResult = await createNginxConfig(
      repositoryName,
      zone,
      environments,
      [] // TODO: support user defined paths?
    )
    await updateCreationStatus(request.db, repositoryName, cdpNginxUpstream, {
      status: statuses.raised,
      pr: trimPr(createNginxConfigResult?.data)
    })
    request.logger.info(
      `created nginx PR for ${repositoryName}: ${createNginxConfigResult.data.html_url}`
    )
  } catch (e) {
    await updateCreationStatus(request.db, repositoryName, cdpNginxUpstream, {
      status: statuses.failure,
      result: e?.response ?? 'see cdp-self-service-ops logs'
    })
    request.logger.error(
      `update cdp-nginx-upstreams ${repositoryName} failed ${e}`
    )
  }
}

export { createMicroserviceController }
