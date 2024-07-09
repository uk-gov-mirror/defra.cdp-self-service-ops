import {
  findByCommitHash,
  findByRepoName,
  updateWorkflowStatus
} from '~/src/listeners/github/status-repo'
import { createLogger } from '~/src/helpers/logging/logger'
import { updateOverallStatus } from '~/src/api/create-microservice/helpers/save-status'
import { config } from '~/src/config'
import { bulkUpdateTfSvcInfra } from '~/src/listeners/github/helpers/bulk-update-tf-svc-infra'
import { normalizeStatus } from '~/src/listeners/github/helpers/normalize-status'
import { dontOverwriteStatus } from '~/src/listeners/github/helpers/dont-overwrite-status'

const logger = createLogger()

const workflowRunHandlerV2 = async (db, message) => {
  const workflowRepo = message.repository?.name
  const headBranch = message.workflow_run?.head_branch
  const headSHA = message.workflow_run?.head_sha

  logger.info(
    `processing workflow_run message for ${workflowRepo}, ${headBranch}/${headSHA}, action: ${message.action}`
  )

  switch (workflowRepo) {
    case config.get('gitHubRepoTfServiceInfra'):
      await handleTfSvcInfra(db, message)
      break
    case config.get('gitHubRepoCreateWorkflows'):
      await handleCdpCreateWorkflows(db, message)
      break
    case config.get('gitHubRepoSquid'):
      await handleTriggeredWorkflow(db, message)
      break
    default:
      await handlePRWorkflow(db, message)
      break
  }
}

const trimWorkflowRun = (workflowRun) => {
  return {
    name: workflowRun.name,
    id: workflowRun.id,
    html_url: workflowRun.html_url,
    created_at: workflowRun.created_at,
    updated_at: workflowRun.updated_at,
    path: workflowRun.path
  }
}

const handleTfSvcInfra = async (db, message) => {
  try {
    if (
      message.action === 'completed' &&
      message.workflow_run?.head_branch === 'main'
    ) {
      logger.info(`handling tf-svc-infra workflow completed message from main`)

      // Any time cdp-tf-svc-infra completes on main, regardless of which commit triggered it
      // assume all services in management tenant-services.json are successfully created.
      // (we use management as it is responsible for the ECR)
      const status = normalizeStatus(
        message.action,
        message.workflow_run?.conclusion
      )
      await bulkUpdateTfSvcInfra(
        db,
        trimWorkflowRun(message.workflow_run),
        status
      )
    } else {
      logger.info(
        'handling tf-svc-infra workflow completed message from non-main'
      )
      await handlePRWorkflow(db, message)
    }
  } catch (e) {
    logger.error(e)
  }
}

const handleCdpCreateWorkflows = async (db, message) => {
  logger.info(`handling cdp-create-workflows message`)

  try {
    const repoName = message.workflow_run?.name // we repurpose the name to track name of repo its creating
    const status = findByRepoName(db, repoName)

    if (status === null) {
      return
    }

    const workflowStatus = normalizeStatus(
      message.action,
      message.workflow_run?.conclusion
    )

    logger.info(
      `attempting to update createRepository status for ${repoName} to ${workflowStatus}`
    )

    // Make sure statuses can only be progressed forward, not back (request -> in-progress -> success/failure)
    // This can happen if the gitHub events arrives in the wrong order or at the same time
    const dontOverwrite = dontOverwriteStatus(workflowStatus)
    const updateResult = await db.collection('status').updateOne(
      {
        repositoryName: repoName,
        'createRepository.status': { $nin: dontOverwrite } // only update record if status is Not In ($nin) the dont overwrite list
      },
      {
        $set: {
          'createRepository.status': workflowStatus
        }
      }
    )

    if (updateResult.matchedCount > 0) {
      logger.info(
        `set ${repoName} createRepository status to ${workflowStatus}`
      )
    } else {
      logger.warn(
        `NOT setting status on ${repoName} createRepository. Status ${workflowStatus} cant replace ${dontOverwrite.toString()}. Its possible the update message arrived out of order`
      )
    }

    await updateOverallStatus(db, repoName)
  } catch (e) {
    logger.error(e)
  }
}

/**
 * Generic handler for any workflow messages that are triggered directly via workflow-dispatch.
 * The thing to be aware of here is that by convention we set the `workflow_run.name` value to
 * link to the status record.
 * @param db
 * @param message
 * @returns {Promise<void>}
 */
const handleTriggeredWorkflow = async (db, message) => {
  try {
    const workflowRepo = message.repository?.name
    const headBranch = message.workflow_run?.head_branch
    const serviceRepo = message.workflow_run?.name // we repurpose the name to track name of repo its creating
    const status = findByRepoName(db, serviceRepo)

    if (status === null) {
      return
    }

    const workflowStatus = normalizeStatus(
      message.action,
      message.workflow_run?.conclusion
    )

    logger.info(
      `attempting to update ${message.repository?.name} status for ${serviceRepo} to ${workflowStatus}`
    )

    await updateWorkflowStatus(
      db,
      serviceRepo,
      workflowRepo,
      headBranch,
      workflowStatus,
      trimWorkflowRun(message.workflow_run)
    )
    await updateOverallStatus(db, serviceRepo)
  } catch (e) {
    logger.error(e)
  }
}

/**
 * Generic workflow handler for workflows triggered by PR/merges. We track these by matching on commit hashes.
 * @param db
 * @param message
 * @returns {Promise<void>}
 */
const handlePRWorkflow = async (db, message) => {
  try {
    const workflowRepo = message.repository?.name
    const headBranch = message.workflow_run?.head_branch
    const headSHA = message.workflow_run?.head_sha

    const status = await findByCommitHash(db, workflowRepo, headSHA)
    const serviceRepo = status?.repositoryName

    if (serviceRepo) {
      // Record what happened
      const workflowStatus = normalizeStatus(
        message.action,
        message.workflow_run?.conclusion
      )
      logger.info(
        `updating status for creation job ${serviceRepo} ${workflowRepo}:${workflowStatus}`
      )

      let branch = 'pr'
      if (headBranch === 'main') {
        branch = 'main'
      }
      await updateWorkflowStatus(
        db,
        serviceRepo,
        workflowRepo,
        branch,
        workflowStatus,
        trimWorkflowRun(message.workflow_run)
      )

      await updateOverallStatus(db, serviceRepo)
    }
  } catch (e) {
    logger.error(e)
  }
}

export { workflowRunHandlerV2 }
