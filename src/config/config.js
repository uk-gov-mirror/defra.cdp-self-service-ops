import convict from 'convict'
import path from 'path'

import { version } from '~/package.json'

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3009,
    env: 'PORT'
  },
  version: {
    doc: 'Api version',
    format: String,
    default: version
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'CDP Self-Service Ops'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.normalize(path.join(__dirname, '..', '..'))
  },
  awsRegion: {
    doc: 'AWS region',
    format: String,
    default: 'eu-west-2',
    env: 'AWS_REGION'
  },
  sqsEndpoint: {
    doc: 'AWS SQS endpoint',
    format: String,
    default: 'http://127.0.0.1:4566',
    env: 'SQS_ENDPOINT'
  },
  snsEndpoint: {
    doc: 'AWS SNS endpoint',
    format: String,
    default: 'http://127.0.0.1:4566',
    env: 'SNS_ENDPOINT'
  },
  oidcWellKnownConfigurationUrl: {
    doc: 'OIDC .well-known configuration URL',
    format: String,
    env: 'OIDC_WELL_KNOWN_CONFIGURATION_URL',
    default:
      'https://login.microsoftonline.com/6f504113-6b64-43f2-ade9-242e05780007/v2.0/.well-known/openid-configuration'
  },
  oidcAudience: {
    doc: 'OIDC Audience for verification',
    format: String,
    env: 'OIDC_AUDIENCE',
    default: '63983fc2-cfff-45bb-8ec2-959e21062b9a'
  },
  oidcAdminGroupId: {
    doc: 'OIDC Admin Group ID',
    format: String,
    env: 'OIDC_ADMIN_GROUP_ID',
    default: 'aabe63e7-87ef-4beb-a596-c810631fc474'
  },
  gitHubAppId: {
    doc: 'GitHub Api authentication App Id',
    format: String,
    env: 'GITHUB_APP_ID',
    default: '407916'
  },
  gitHubAppInstallationId: {
    doc: 'GitHub Api authentication App Installation Id',
    format: String,
    env: 'GITHUB_APP_INSTALLATION_ID',
    default: '43275761'
  },
  gitHubAppPrivateKey: {
    doc: 'GitHub Api authentication App Private Key. This key is a base64 encoded secret',
    format: '*',
    default: '',
    sensitive: true,
    env: 'GITHUB_API_AUTH_APP_PRIVATE_KEY'
  },
  gitHubOrg: {
    doc: 'GitHub Organisation',
    format: String,
    default: 'DEFRA',
    env: 'GITHUB_ORG'
  },
  gitHubApiVersion: {
    doc: 'GitHub Api Version',
    format: String,
    default: '2022-11-28'
  },
  gitHubRepoTfServiceInfra: {
    doc: 'Terraform GitHub Service Infrastructure repository',
    format: String,
    default: 'cdp-tf-svc-infra'
  },
  gitHubRepoTfService: {
    doc: 'Terraform GitHub Service repository',
    format: String,
    default: 'cdp-tf-svc'
  },
  gitHubRepoConfig: {
    doc: 'gitHub repo to create the application config in',
    format: String,
    default: 'cdp-app-config',
    env: 'GITHUB_REPO_APP_CONFIG'
  },
  gitHubRepoNginx: {
    doc: 'gitHub repo to create the nginx config in',
    format: String,
    default: 'cdp-nginx-upstreams',
    env: 'GITHUB_REPO_NGINX'
  },
  gitHubRepoSquid: {
    doc: 'GitHub repo to create squid config in',
    format: String,
    default: 'cdp-squid-proxy',
    env: 'GITHUB_REPO_NGINX'
  },
  gitHubRepoCreateWorkflows: {
    doc: 'GitHub repository containing the create workflows',
    format: String,
    default: 'cdp-create-workflows',
    env: 'GITHUB_REPO_CREATE_WORKFLOWS'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'production'
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: process.env.NODE_ENV !== 'production'
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'test'
  },
  logLevel: {
    doc: 'Logging level',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
    env: 'LOG_LEVEL'
  },
  mongoUri: {
    doc: 'URI for mongodb',
    format: String,
    default: 'mongodb://127.0.0.1:27017/',
    env: 'MONGO_URI'
  },
  mongoDatabase: {
    doc: 'database for mongodb',
    format: String,
    default: 'cdp-self-service-ops',
    env: 'MONGO_DATABASE'
  },
  snsDeployTopicArn: {
    doc: 'SNS Deploy Topic ARN',
    format: String,
    default: 'arn:aws:sns:eu-west-2:000000000000:deploy-topic',
    env: 'SNS_DEPLOY_TOPIC_ARN'
  },
  snsRunTestTopicArn: {
    doc: 'SNS Run Test Topic ARN',
    format: String,
    default: 'arn:aws:sns:eu-west-2:000000000000:run-test-topic',
    env: 'SNS_RUN_TEST_TOPIC_ARN'
  },
  sqsGitHubEvents: {
    queueUrl: {
      doc: 'URL of sqs queue providing gitHub events',
      format: String,
      default: 'github-events',
      env: 'SQS_GITHUB_QUEUE'
    },
    waitTimeSeconds: {
      doc: 'The duration for which the call will wait for a message to arrive in the queue before returning',
      format: Number,
      default: 10,
      env: 'SQS_GITHUB_WAIT_TIME_SECONDS'
    },
    visibilityTimeout: {
      doc: 'The duration (in seconds) that the received messages are hidden from subsequent retrieve requests after being retrieved by a ReceiveMessage request.',
      format: Number,
      default: 400,
      env: 'SQS_GITHUB_VISIBILITY_TIMEOUT'
    },
    pollingWaitTimeMs: {
      doc: 'The duration to wait before repolling the queue',
      format: Number,
      default: 0,
      env: 'SQS_GITHUB_POLLING_WAIT_TIME_MS'
    },
    enabled: {
      doc: 'Should the service listen for gitHub webhook events?',
      format: Boolean,
      default: true,
      env: 'SQS_GITHUB_ENABLED'
    }
  },
  userServiceApiUrl: {
    doc: 'User Service Backend API url',
    format: String,
    default: 'http://localhost:3001',
    env: 'USER_SERVICE_API_URL'
  },
  portalBackendApiUrl: {
    doc: 'Portal backend for deployments and deployables root API url',
    format: String,
    default: 'http://localhost:5094',
    env: 'PORTAL_BACKEND_API_URL'
  },
  createMicroServiceWorkflow: {
    doc: 'Name of workflow to trigger when creating a microservice',
    format: String,
    default: 'create_microservice.yml',
    env: 'CREATE_MICROSERVICE_WORKFLOW'
  },
  createRepositoryWorkflow: {
    doc: 'Name of workflow to trigger when creating a repository',
    format: String,
    default: 'create_repository.yml',
    env: 'CREATE_REPOSITORY_WORKFLOW'
  },
  createJourneyTestWorkflow: {
    doc: 'Name of workflow to trigger when creating a repository',
    format: String,
    default: 'create_journey_tests.yml',
    env: 'CREATE_JOURNEY_TESTS_WORKFLOW'
  },
  createEnvTestSuiteWorkflow: {
    doc: 'Name of workflow to trigger when creating a repository',
    format: String,
    default: 'create_env_test_suite.yml',
    env: 'CREATE_ENV_TEST_SUITE_WORKFLOW'
  },
  createPerfTestSuiteWorkflow: {
    doc: 'Name of workflow to trigger when creating a perf test repository',
    format: String,
    default: 'create_perf_test_suite.yml',
    env: 'CREATE_PERF_TEST_SUITE_WORKFLOW'
  },
  createSmokeTestSuiteWorkflow: {
    doc: 'Name of workflow to trigger when creating a perf test repository',
    format: String,
    default: 'create_smoke_test_suite.yml',
    env: 'CREATE_SMOKE_TEST_SUITE_WORKFLOW'
  },
  createSquidConfigWorkflow: {
    doc: 'Name of workflow to trigger when creating a repository',
    format: String,
    default: 'create_service.yml',
    env: 'CREATE_SQUID_CONFIG_WORKFLOW'
  },
  gitHubBaseUrl: {
    doc: 'Override the gitHub base url for local testing',
    format: '*',
    env: 'GITHUB_BASE_URL',
    default: null
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    default: '',
    env: 'CDP_HTTP_PROXY'
  },
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    default: '',
    env: 'CDP_HTTPS_PROXY'
  }
})

config.validate({ allowed: 'strict' })

export { config }
