import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose the real Jenkins action: Build Job, Get Build Status, or Cancel Build.',
  helpText: richFieldHelp({
    what: 'The Jenkins action this node performs.',
    why: 'The Jenkins registry override supports only build, status, and cancel; this value decides which Jenkins job URL is called.',
    when: 'Fill it for every Jenkins node run.',
    enter: 'Choose Build Job to trigger a job, Get Build Status to read a build, or Cancel Build to stop a running build.',
    source: 'This comes from the dropdown in the node panel, not from Jenkins.',
    later: 'Downstream steps can inspect {{$json.success}}, {{$json.output.operation}}, {{$json.output.jobName}}, and {{$json.output.data}}.',
    format: 'Dropdown value build, status, or cancel.',
    example: 'Choose Build Job after a release approval form is accepted.',
    empty: 'If empty, runtime defaults to build.',
    mistake: 'Do not use old values like build_job, get_job, poll_build_status, or get_build_log; this override does not support them.',
  }),
  options: ['Build Job', 'Get Build Status', 'Cancel Build'],
  defaultValue: 'build',
};

const baseUrlField: FieldDoc = {
  name: 'Jenkins URL',
  internalKey: 'baseUrl',
  type: 'url',
  required: true,
  description: 'Root URL of the Jenkins server.',
  helpText: richFieldHelp({
    what: 'The base address of the Jenkins server CtrlChecks should call.',
    why: 'Runtime appends /job/... paths to this URL before triggering or reading builds.',
    when: 'Fill it for every operation.',
    enter: 'The Jenkins root URL, such as https://jenkins.company.com.',
    source: 'Copy the URL you use to open Jenkins in your browser, or use the URL saved in the Jenkins connection.',
    later: 'It is not returned, but it determines which Jenkins instance receives the build request.',
    format: 'HTTP or HTTPS URL. Runtime removes a trailing slash.',
    example: 'https://jenkins.acme.internal for the company CI server.',
    empty: 'If empty, output is success false with error code JENKINS_FAILED and message baseUrl is required.',
    mistake: 'Do not paste a job URL here; put only the Jenkins root and put the job path in Job Name.',
  }),
  placeholder: 'https://jenkins.example.com',
};

const usernameField: FieldDoc = {
  name: 'Username',
  internalKey: 'username',
  type: 'string',
  required: true,
  description: 'Jenkins username for Basic Auth.',
  helpText: richFieldHelp({
    what: 'The Jenkins account name used with the API token.',
    why: 'Jenkins authenticates API requests with username plus API token.',
    when: 'Fill it for every operation unless a credential selector injects it.',
    enter: 'The exact Jenkins username for the service account or user.',
    source: 'Find it in Jenkins user profile or ask the Jenkins administrator for the automation account username.',
    later: 'It is not returned to downstream nodes.',
    format: 'Plain username, not an email unless your Jenkins login is the email address.',
    example: 'ci-automation for a limited Jenkins service account.',
    empty: 'If empty, output is success false with error code JENKINS_FAILED and message username is required.',
    mistake: 'Do not use your Jenkins display name; use the login username.',
  }),
  placeholder: 'jenkins-user',
};

const apiTokenField: FieldDoc = {
  name: 'API Token',
  internalKey: 'apiToken',
  type: 'password',
  required: true,
  description: 'Jenkins API token used with Username.',
  helpText: richFieldHelp({
    what: 'The secret Jenkins API token for the selected username.',
    why: 'The override sends Basic Auth and cannot trigger or inspect jobs without this token.',
    when: 'Fill it for every operation, preferably through a saved Jenkins connection.',
    enter: 'A Jenkins API token created under the Jenkins user profile.',
    source: 'In Jenkins, click your username -> Configure -> API Token -> Add new Token -> Generate.',
    later: 'The token is never returned in node output.',
    format: 'Secret token string. Runtime reads apiToken, not the old token field.',
    example: 'A Jenkins token for a service account limited to the deploy-backend job.',
    empty: 'If empty, output is success false with error code JENKINS_FAILED and message apiToken is required.',
    mistake: 'Do not use the Jenkins account password; create an API token.',
  }),
  placeholder: 'API token',
  notes: 'Prefer Connections so the token is stored in the credential vault.',
};

const jobNameField: FieldDoc = {
  name: 'Job Name',
  internalKey: 'jobName',
  type: 'string',
  required: true,
  description: 'Jenkins job name or folder/job path.',
  helpText: richFieldHelp({
    what: 'The Jenkins job to build, inspect, or cancel.',
    why: 'Runtime converts folder/job-name into /job/folder/job/job-name before calling Jenkins.',
    when: 'Fill it for every operation.',
    enter: 'Use the job name exactly as Jenkins shows it. For folders, use slashes such as folder/subfolder/job.',
    source: 'Open the Jenkins job and copy the name from the URL after /job/ segments.',
    later: 'The output includes {{$json.output.jobName}} so later steps can log which job was touched.',
    format: 'Text path with folder segments separated by forward slashes.',
    example: 'deploy/backend-api for a foldered deployment job.',
    empty: 'If empty, output is success false with error code JENKINS_FAILED and message jobName is required.',
    mistake: 'Do not paste the full URL; enter only the job path.',
  }),
  placeholder: 'folder/job-name',
};

const buildNumberField: FieldDoc = {
  name: 'Build Number',
  internalKey: 'buildNumber',
  type: 'string',
  required: false,
  description: 'Specific build number for Status or Cancel.',
  helpText: richFieldHelp({
    what: 'The Jenkins build number inside the selected job.',
    why: 'Status can read a specific build, and Cancel must know which build to stop.',
    when: 'Fill it for Cancel Build. Fill it for Get Build Status only when you do not want lastBuild.',
    enter: 'The number from Jenkins build history, without the # symbol.',
    source: 'Open the Jenkins job and copy 123 from Build History entry #123 or from /job/name/123/.',
    later: 'The returned Jenkins data can include result, building, duration, url, and other build fields under {{$json.output.data}}.',
    format: 'Digits as text.',
    example: '128 from the deployment job that is currently running.',
    empty: 'Status uses lastBuild when empty. Cancel returns JENKINS_FAILED with buildNumber is required for cancel.',
    mistake: 'Do not use a queue item ID as the build number.',
  }),
  placeholder: '123',
};

const parametersField: FieldDoc = {
  name: 'Build Parameters',
  internalKey: 'parameters',
  type: 'json',
  required: false,
  description: 'JSON object sent to parameterized Jenkins builds.',
  helpText: richFieldHelp({
    what: 'Key/value parameters for a Jenkins parameterized job.',
    why: 'When this object has keys, runtime calls buildWithParameters and sends the values as form fields.',
    when: 'Fill it only for Build Job when the Jenkins job expects parameters.',
    enter: 'A JSON object whose keys exactly match Jenkins parameter names.',
    source: 'Open the Jenkins job configuration to see parameter names, or map a prepared object such as {{$json.jenkinsParameters}}.',
    later: 'Parameters are not returned directly, but Jenkins may echo them inside {{$json.output.data}} or the later build status.',
    format: 'JSON object, for example {"BRANCH":"main","ENV":"production"}.',
    example: '{"BRANCH":"release-2026-07","ENV":"production"} for a release deployment job.',
    empty: 'If empty, runtime calls the normal /build endpoint for a non-parameterized job.',
    mistake: 'Do not enter a JSON array or string; parameterized builds need an object.',
  }),
  placeholder: '{"BRANCH":"main","ENV":"production"}',
};

const commonFields = [operationField, baseUrlField, usernameField, apiTokenField, jobNameField, buildNumberField, parametersField];

export const jenkinsDoc: NodeDoc = {
  slug: 'jenkins',
  displayName: 'Jenkins',
  category: 'DevOps',
  logoUrl: '/icons/nodes/jenkins.svg',
  description: 'Trigger Jenkins builds, inspect build status, or stop a running build using the Jenkins registry override.',
  credentialType: 'Jenkins API Token',
  credentialSetupSteps: [
    'What this is: A Jenkins connection stores the Jenkins URL, username, and API token in the CtrlChecks credential vault.',
    'Where to start: Log in to Jenkins, open your user profile, then Configure -> API Token.',
    'Permissions: Use a Jenkins account that can build, read, or stop only the jobs this workflow needs.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Jenkins and save Jenkins URL, Username, and API Token.',
    'Test it: Use a small Get Build Status run against a known job, or confirm Jenkins accepts the same credentials through its remote API.',
    'Workflow wiring: Connect the output of this Jenkins node to the next step through the outgoing line, then configure that next service node with its own account connection.',
    'Important: Service nodes after Jenkins still need their own account connection; Jenkins credentials cannot post Slack updates or create Jira issues.',
  ],
  credentialDocsUrl: 'https://www.jenkins.io/doc/book/using/remote-access-api/',
  resources: [
    {
      name: 'Jobs',
      description: 'Runtime-supported Jenkins operations for one named job.',
      operations: [
        {
          name: 'Build Job',
          value: 'build',
          description: 'Build Job triggers the selected Jenkins job. When Build Parameters is a non-empty object, runtime calls buildWithParameters; otherwise it calls the normal build endpoint.',
          fields: commonFields,
          outputExample: { success: true, output: { operation: 'build', jobName: 'deploy/backend-api', data: { status: 201, location: 'https://jenkins.example.com/queue/item/77/' } } },
          outputDescription: 'success: true when Jenkins accepted the build request. output.operation: build. output.jobName: selected job. output.data: HTTP status, queue location, and optional response body. error.code JENKINS_FAILED appears on failure.',
          usageExample: {
            scenario: 'Trigger a deployment job after a manager approves a production release request.',
            inputValues: { operation: 'build', baseUrl: 'https://jenkins.example.com', username: 'ci-automation', apiToken: '{{$credentials.jenkins.apiToken}}', jobName: 'deploy/backend-api', parameters: '{"BRANCH":"{{$json.releaseBranch}}"}' },
            expectedOutput: 'Send {{$json.output.data.location}} to the release channel so engineers can open the queued Jenkins item.',
          },
          externalDocsUrl: 'https://www.jenkins.io/doc/book/using/remote-access-api/',
        },
        {
          name: 'Get Build Status',
          value: 'status',
          description: 'Get Build Status reads JSON for one build. If Build Number is blank, runtime reads lastBuild; if it is filled, runtime reads that specific build number.',
          fields: commonFields,
          outputExample: { success: true, output: { operation: 'status', jobName: 'deploy/backend-api', data: { number: 128, building: false, result: 'SUCCESS', url: 'https://jenkins.example.com/job/deploy/job/backend-api/128/' } } },
          outputDescription: 'success: true when Jenkins returned build JSON. output.operation: status. output.jobName: selected job. output.data: raw Jenkins build JSON such as number, building, result, duration, and url. error.code JENKINS_FAILED appears on failure.',
          usageExample: {
            scenario: 'Check the latest deployment result before deciding whether to notify customers.',
            inputValues: { operation: 'status', baseUrl: 'https://jenkins.example.com', username: 'ci-automation', apiToken: '{{$credentials.jenkins.apiToken}}', jobName: 'deploy/backend-api', buildNumber: '' },
            expectedOutput: 'Branch on {{$json.output.data.result}} to send success or failure notifications.',
          },
          externalDocsUrl: 'https://www.jenkins.io/doc/book/using/remote-access-api/',
        },
        {
          name: 'Cancel Build',
          value: 'cancel',
          description: 'Cancel Build sends a stop request for a specific build number in the selected job. Runtime requires Build Number for this operation.',
          fields: commonFields,
          outputExample: { success: true, output: { operation: 'cancel', jobName: 'deploy/backend-api', data: { status: 200 } } },
          outputDescription: 'success: true when Jenkins accepted the stop request. output.operation: cancel. output.jobName: selected job. output.data: HTTP status/location/body from Jenkins. error.code JENKINS_FAILED appears when buildNumber or permissions are wrong.',
          usageExample: {
            scenario: 'Stop a deployment build when a change-freeze flag is raised by a release governance workflow.',
            inputValues: { operation: 'cancel', baseUrl: 'https://jenkins.example.com', username: 'ci-automation', apiToken: '{{$credentials.jenkins.apiToken}}', jobName: 'deploy/backend-api', buildNumber: '128' },
            expectedOutput: 'Log {{$json.output.operation}} and {{$json.output.jobName}} after Jenkins accepts the stop request.',
          },
          externalDocsUrl: 'https://www.jenkins.io/doc/book/using/remote-access-api/',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'JENKINS_FAILED: baseUrl is required', cause: 'Jenkins URL is blank or mapped from a missing upstream value.', fix: 'Enter the Jenkins root URL, not the job URL.' },
    { error: 'JENKINS_FAILED: username is required', cause: 'Username was not provided or not injected from the saved credential.', fix: 'Save or enter the Jenkins username for the automation account.' },
    { error: 'JENKINS_FAILED: apiToken is required', cause: 'The API token is missing. The runtime reads apiToken, not the old token field.', fix: 'Create a Jenkins API token and store it in Connections.' },
    { error: 'JENKINS_FAILED: jobName is required', cause: 'The selected job path is blank.', fix: 'Enter the job name or folder/job-name path from Jenkins.' },
    { error: 'JENKINS_FAILED: buildNumber is required for cancel', cause: 'Cancel Build was selected without a build number.', fix: 'Pass the build number from a previous status lookup or Jenkins build history.' },
  ],
  relatedNodes: ['gitlab', 'github', 'jira', 'vercel', 'netlify'],
};
