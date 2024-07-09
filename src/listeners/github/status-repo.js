import { statuses } from '~/src/constants/statuses'
import { dontOverwriteStatus } from '~/src/listeners/github/helpers/dont-overwrite-status'

async function findByPrNumber(db, repo, prNumber) {
  const searchOn = `${repo}.pr.number`
  return db.collection('status').findOne({ [searchOn]: prNumber })
}

async function findByCommitHash(db, repo, sha) {
  const searchOn = `${repo}.merged_sha`
  return db.collection('status').findOne({ [searchOn]: sha })
}

async function findByRepoName(db, repoName) {
  return db.collection('status').findOne({ repositoryName: repoName })
}

async function updatePrStatus(db, repo, field, status, mergedSha) {
  const statusField = `${field}.status`
  const mergedShaField = `${field}.merged_sha`

  const setFields = { [statusField]: status }
  if (mergedSha) {
    setFields[mergedShaField] = mergedSha
  }

  return db.collection('status').updateOne(
    {
      repositoryName: repo,
      [statusField]: { $nin: dontOverwriteStatus(status) }
    },
    { $set: setFields }
  )
}

/**
 * @param {*} db        - mongodb database
 * @param {string} repo - status record to update
 * @param {*} workflow  - workflow step to update (e.g. cdp-tf-svc-infra)
 * @param {*} branch    - is this update related to the PR or the main branch
 * @param {*} status    - status of this step
 * @param {{path, updated_at, html_url, name, created_at, id}} workflowPayload - extra data to store against this step
 */
async function updateWorkflowStatus(
  db,
  repo,
  workflow,
  branch,
  status,
  workflowPayload
) {
  const statusField = `${workflow}.status`
  const workflowField = `${workflow}.${branch}.workflow` // branch is either 'main' or 'pr'
  return db.collection('status').updateOne(
    {
      repositoryName: repo,
      [statusField]: { $nin: dontOverwriteStatus(status) }
    },
    { $set: { [statusField]: status, [workflowField]: workflowPayload } }
  )
}

async function updateStatus(db, repo, field, status) {
  return await db
    .collection('status')
    .updateOne({ repositoryName: repo }, { $set: { [field]: status } })
}

async function findAllInProgressOrFailed(db) {
  return await db
    .collection('status')
    .find(
      {
        status: { $in: [statuses.inProgress, statuses.failure] }
      },
      {
        projection: { _id: 0, repositoryName: 1 }
      }
    )
    .toArray()
}

export {
  findAllInProgressOrFailed,
  findByRepoName,
  updatePrStatus,
  updateWorkflowStatus,
  findByCommitHash,
  findByPrNumber,
  updateStatus
}
