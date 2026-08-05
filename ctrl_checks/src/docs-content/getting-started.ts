export interface StaticDocPage {
  slug: string;
  title: string;
  description: string;
  sections: Array<{
    id: string;
    title: string;
    body: string[];
    items?: string[];
  }>;
}

export const introductionPage: StaticDocPage = {
  slug: 'introduction',
  title: 'CtrlChecks Documentation',
  description: 'CtrlChecks is a workflow automation system for building, configuring, and running connected workflows across apps, APIs, databases, AI tools, triggers, and logic nodes.',
  sections: [
    {
      id: 'what-it-is',
      title: 'What CtrlChecks Is',
      body: [
        'CtrlChecks lets teams create workflows on a visual canvas. A workflow is made from nodes connected by edges, where each node receives data, performs one job, and passes output to the next node.',
        'The product combines a React Flow editor, schema-driven node configuration, saved connections, execution history, and an AI workflow builder that can generate workflow drafts from plain language.'
      ]
    },
    {
      id: 'who-it-is-for',
      title: 'Who It Is For',
      body: [
        'CtrlChecks is for operations, growth, support, engineering, finance, and automation teams that need repeatable integrations without writing one-off scripts for every process.'
      ]
    },
    {
      id: 'what-it-solves',
      title: 'What It Solves',
      body: [
        'It turns manual handoffs into reliable workflows: receive a trigger, transform or route data, call external services, and inspect outputs from each node.'
      ]
    },
    {
      id: 'integration-categories',
      title: 'Integration Categories',
      body: ['The current node registry groups integrations into these categories.'],
      items: ['AI', 'Communication', 'Data', 'Logic', 'Transformation', 'Triggers', 'Utility']
    }
  ]
};

export const gettingStartedPages: Record<string, StaticDocPage> = {
  'what-is-ctrlchecks': {
    slug: 'what-is-ctrlchecks',
    title: 'What Is CtrlChecks?',
    description: 'CtrlChecks is a visual automation workspace where workflows are assembled from typed nodes and executed by the worker backend.',
    sections: [
      {
        id: 'core-concept',
        title: 'Core Concept',
        body: ['A workflow is a directed graph: Trigger -> Action -> Output. Each node has a type, label, category, config, input schema, and output schema.']
      },
      {
        id: 'key-terms',
        title: 'Key Terms',
        body: ['These terms match the app UI and backend registry.'],
        items: ['Workflow: the saved automation graph.', 'Node: one configured step in the graph.', 'Edge: the connection from one node output to another node input.', 'Connection: saved credentials used at runtime.', 'Output panel: the execution result from a node.']
      }
    ]
  },
  'how-workflows-work': {
    slug: 'how-workflows-work',
    title: 'How Workflows Work',
    description: 'Workflows start from a trigger or source node, pass data through connected nodes, and end in output or side-effect nodes.',
    sections: [
      {
        id: 'trigger-action-flow',
        title: 'Trigger To Action Flow',
        body: ['A trigger starts execution. Downstream action nodes receive the previous output as input, run their configured operation, and expose a new output for the next node.']
      },
      {
        id: 'data-passing',
        title: 'How Data Passes Between Nodes',
        body: ['Use expressions like {{ $json.email }} to reference fields from the previous node output. The properties panel stores static config, runtime AI fill modes, and manual values in the node config.']
      },
      {
        id: 'branching',
        title: 'Branching And Conditions',
        body: ['Logic nodes such as If/Else, Switch, Merge, Loop, Filter, Try/Catch, Retry, and Parallel control which branch runs or how multiple inputs are combined.']
      }
    ]
  },
  'how-nodes-work': {
    slug: 'how-nodes-work',
    title: 'How Nodes Work',
    description: 'Nodes are schema-driven. The backend registry defines their fields, defaults, validation, ports, credential needs, and output schema.',
    sections: [
      {
        id: 'resources-operations',
        title: 'Resources And Operations',
        body: ['Some service nodes expose a resource selector and an operation selector. Utility and trigger nodes often have no operation selector and are configured directly through their fields.']
      },
      {
        id: 'input-fields',
        title: 'Input Fields',
        body: ['Required fields must be filled before a node can run reliably. Optional fields adjust behavior, filtering, formatting, limits, or metadata.']
      },
      {
        id: 'expressions',
        title: 'Expressions',
        body: ['Expressions use {{ $json.fieldName }} syntax to pull values from upstream data. Inspect the previous node output to confirm the field name.']
      }
    ]
  },
  'how-connections-work': {
    slug: 'how-connections-work',
    title: 'How Connections Work',
    description: 'Connections store service credentials separately from workflow logic so executions can authenticate without embedding secrets in node config.',
    sections: [
      {
        id: 'what-is-connection',
        title: 'What A Connection Is',
        body: ['A connection is a saved credential, OAuth grant, token, API key, webhook secret, or account reference used by one or more nodes.']
      },
      {
        id: 'auth-types',
        title: 'Auth Types',
        body: ['Nodes may use OAuth, bearer tokens, API keys, basic auth, database connection strings, webhook tokens, or no credentials at all. Utility and logic nodes usually require no connection.']
      },
      {
        id: 'testing-reconnecting',
        title: 'Testing And Reconnecting',
        body: ['Use the Connections area to create, test, reconnect, or replace saved credentials. If a run fails with authentication errors, reconnect the service and run again.']
      }
    ]
  },
  'your-first-workflow': {
    slug: 'your-first-workflow',
    title: 'Your First Workflow',
    description: 'Build a simple workflow that reads rows from Google Sheets and sends Gmail messages using those row values.',
    sections: [
      {
        id: 'walkthrough',
        title: 'Walkthrough',
        body: ['This example uses Google Sheets followed by Gmail. Both nodes should use the same Google account connection when possible.'],
        items: ['Open Workflows and create a workflow.', 'Add a Google Sheets node and choose the read operation.', 'Enter the spreadsheet ID, sheet name, and range.', 'Add a Gmail node after Google Sheets.', 'Set the recipient source to sheet output or use {{ $json.email }} in recipient fields.', 'Set the subject and body using expressions from the sheet row.', 'Run the workflow and inspect each node output.']
      },
      {
        id: 'verify',
        title: 'Verify The Result',
        body: ['Check the execution output panel in CtrlChecks, then open Gmail Sent Mail to confirm the message was sent.']
      }
    ]
  },
  'zoom-integration': {
    slug: 'zoom-integration',
    title: 'Using the Zoom Integration',
    description: 'How to add, use, and remove the Zoom connection in CtrlChecks, and what the Zoom Video node can do once connected.',
    sections: [
      {
        id: 'adding-the-app',
        title: 'Adding The Zoom Connection',
        body: [
          'CtrlChecks connects to Zoom using OAuth. Go to Connections in CtrlChecks, find Zoom under the service list, and click Connect.',
          'You will be redirected to zoom.us to sign in and approve the permissions CtrlChecks requests: creating, viewing, listing, and updating meetings, and viewing basic account/user information. You are always shown exactly which permissions are being requested before you approve.',
          'After approving, Zoom redirects back to CtrlChecks and the connection appears as Active in the Connections list.'
        ]
      },
      {
        id: 'using-the-app',
        title: 'Using The Zoom Video Node',
        body: [
          'Add a "Zoom Video" node to any workflow and select your Zoom connection. The node supports five operations: Create Meeting, List Meetings, Get Meeting, Update Meeting, and Delete Meeting.',
          'For Create Meeting and Update Meeting, set the meeting topic, duration, and start time (leave start time blank for an instant meeting). For Get Meeting, Update Meeting, and Delete Meeting, provide the target meeting ID, which can come from a previous node’s output.',
          'Run the node from the CtrlChecks debug panel or as part of a full workflow execution to see the live result returned from the Zoom API.'
        ]
      },
      {
        id: 'removing-the-app',
        title: 'Removing The Zoom Connection',
        body: [
          'To disconnect, go to Connections in CtrlChecks, find your Zoom connection, and choose Remove/Disconnect from its menu. This deletes the stored token from CtrlChecks and stops any workflow step using it from authenticating.',
          'You can also revoke CtrlChecks’ access directly from Zoom: sign in at zoom.us, go to your app management page (Profile > Zoom Apps in the Zoom web portal), and remove the CtrlChecks app from your authorized apps.'
        ]
      }
    ]
  }
};
