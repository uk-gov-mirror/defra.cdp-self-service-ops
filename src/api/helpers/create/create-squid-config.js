import { config } from '~/src/config'
import { statuses } from '~/src/constants/statuses'
import { updateCreationStatus } from '~/src/api/create-microservice/helpers/save-status'
import { triggerWorkflow } from '~/src/api/helpers/workflow/trigger-workflow'

const createSquidConfig = async (request, repositoryName) => {
  const org = config.get('gitHubOrg')
  const workflowRepo = config.get('gitHubRepoSquid')
  const workflowName = config.get('createSquidConfigWorkflow')

  try {
    await triggerWorkflow(org, workflowRepo, workflowName, {
      service: repositoryName
    })

    request.logger.info(
      `Create squid config workflow triggered for ${repositoryName} successfully`
    )

    await updateCreationStatus(request.db, repositoryName, workflowRepo, {
      status: statuses.requested
    })
  } catch (e) {
    await updateCreationStatus(request.db, repositoryName, workflowRepo, {
      status: statuses.failure,
      result: e?.response ?? 'see cdp-self-service-ops logs'
    })
    request.logger.error(`update ${workflowRepo} ${repositoryName} failed ${e}`)
  }
}

export { createSquidConfig }
