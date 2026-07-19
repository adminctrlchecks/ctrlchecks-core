import type { NodeDoc } from '../types';

export const formDoc: NodeDoc = {
  slug: 'form',
  displayName: 'Form Trigger',
  category: 'Triggers',
  logoUrl: '/icons/nodes/form.svg',
  description: 'Build a public CtrlChecks form and start the workflow when someone submits it.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account connection is required to show the form or receive submissions.',
    'Add Form Trigger as the first node, set the title, add at least one form field, and save the workflow.',
    'Copy the public form URL from the form preview or workflow UI and share it with the right audience.',
    'Connect the output line from Form Trigger to the service node that should use the submitted answers. That next service node may need its own account connection.',
    'Do not ask for passwords, API keys, access tokens, or bank details in ordinary form fields. Use CtrlChecks Connections for service credentials.',
    'Test the form with realistic answers, open the execution output, and confirm later nodes map fields such as {{$json.email}} or {{$json.data.email}} correctly.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Public Form',
      description: 'Configure the questions, submit behavior, confirmation message, and submission controls for a CtrlChecks-hosted form.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Starts the workflow when a person submits the public form. Use this for lead capture, support requests, onboarding forms, event registrations, feedback surveys, approval intake, and other workflows where a person supplies structured information.',
          fields: [
            {
              name: 'Form Title',
              internalKey: 'formTitle',
              type: 'string',
              required: true,
              description: 'The main heading shown at the top of the public form.',
              helpText: `What this field means: Form Title is the main heading people see before they start filling the form.
Why it matters: A clear title reassures the submitter that they opened the right form and helps teammates recognize the workflow in testing.
When to fill it: Fill it before sharing the form URL.
What to enter: Use a short workplace name such as Request a Demo, Support Request, Vendor Onboarding, or Employee Equipment Request.
Where the value comes from: You write this based on the purpose of the form; it does not come from another app.
How to use it later: The form metadata can identify which form was submitted, while later nodes usually map answer fields like {{$json.email}} or {{$json.data.message}}.
Accepted format: Plain text, ideally under one sentence.
Real workplace example: Use Support Request when customers submit billing or technical issues for a helpdesk workflow.
If it is empty or wrong: People may abandon the form or submit the wrong kind of request.
Common mistake: Using an internal automation name instead of wording the submitter understands.`,
              placeholder: 'Support Request',
              example: 'Support Request',
              defaultValue: 'Form Submission',
            },
            {
              name: 'Form Description',
              internalKey: 'formDescription',
              type: 'textarea',
              required: false,
              description: 'Optional helper text shown under the title.',
              helpText: `What this field means: Form Description explains what the form is for and what the submitter should prepare.
Why it matters: Good instructions reduce incomplete answers and follow-up messages.
When to fill it: Use it when the title alone does not explain what information is needed.
What to enter: A friendly sentence about what will happen after submission, required context, or expected response time.
Where the value comes from: You write it from your team process or policy.
How to use it later: It is display text only. Later workflow nodes use submitted fields such as {{$json.data.customer_email}}, not the description.
Accepted format: Plain text, one to three short sentences.
Real workplace example: "Tell us what happened and attach a screenshot. Support will reply within one business day."
If it is empty or wrong: Users may leave important details out, or expect a different follow-up than the workflow provides.
Common mistake: Putting private internal notes here; this text is visible to the person submitting the form.`,
              placeholder: 'Tell us what happened and we will reply within one business day.',
              example: 'Tell us what happened and we will reply within one business day.',
            },
            {
              name: 'Form Fields',
              internalKey: 'fields',
              type: 'json',
              required: true,
              description: 'The list of questions the submitter answers. Each field has a label, internal name, type, required setting, and optional display settings.',
              helpText: `What this field means: Form Fields are the questions shown on the form and the keys that appear in workflow output after submission.
Why it matters: These fields define the data later nodes can use, such as a lead email, ticket category, order number, or uploaded file.
When to fill it: Add at least one field before sharing the form.
What to enter: Add one question per piece of information. Use text for short answers, email for email addresses, number for numeric values, tel for phone numbers, url for website links, date for dates, textarea for long messages, select for a dropdown, radio for one visible choice, checkbox for yes/no confirmation, and file for uploads.
Where the value comes from: You design the questions from the workplace process this form starts.
How to use it later: Later nodes can map answers by internal name, such as {{$json.email}}, {{$json.message}}, {{$json.data.email}}, or {{$json.files}}.
Accepted format: In the visual editor, add fields with the Add Field button. As JSON, use an array of field objects with name, label, type, required, placeholder, and options where needed.
Real workplace example: A lead form might collect name, email, company_size, interest_area, and message before creating a CRM contact.
If it is empty or wrong: The form may show no useful questions, validation may fail, or later nodes may look for fields that do not exist.
Common mistake: Renaming an internal field after downstream nodes already use it, such as changing customer_email while an Email node still maps {{$json.customer_email}}.`,
              placeholder: '[{"name":"email","label":"Email Address","type":"email","required":true}]',
              example: '[{"name":"email","label":"Email Address","type":"email","required":true},{"name":"message","label":"How can we help?","type":"textarea","required":true}]',
              defaultValue: '[]',
              notes: 'Changing a field label is usually safe. Changing the internal name or type can break mappings in later nodes.',
            },
            {
              name: 'Field Label',
              internalKey: 'fieldLabel',
              type: 'string',
              required: true,
              description: 'The visible question text for one form field.',
              helpText: `What this field means: Field Label is the question or prompt the submitter sees for one form answer.
Why it matters: Clear labels produce cleaner submissions and fewer corrections.
When to fill it: Fill it for every field you add.
What to enter: Write plain wording such as Work Email, Company Name, Order Number, or How can we help?
Where the value comes from: Use the language your team and submitters already use for this process.
How to use it later: The label is for people. Later nodes map the internal name, such as {{$json.work_email}}, not the label text.
Accepted format: Plain text, ideally a short phrase or question.
Real workplace example: Use "Order Number" so customers know to enter ORD-1048 instead of describing the whole purchase.
If it is empty or wrong: Users may misunderstand the question and downstream automations may receive messy data.
Common mistake: Writing a label that looks like a database key, such as customer_email, instead of a human label like Customer Email.`,
              placeholder: 'Work Email',
              example: 'Work Email',
            },
            {
              name: 'Internal Name',
              internalKey: 'internalName',
              type: 'string',
              required: true,
              description: 'The machine-friendly key used in workflow output for one answer.',
              helpText: `What this field means: Internal Name is the stable key that later workflow steps use to find this answer.
Why it matters: It becomes the mapping name in expressions, so a clean internal name makes downstream nodes easier to build and maintain.
When to fill it: Review it for every form field, especially before connecting Email, Slack, CRM, database, or approval nodes.
What to enter: Use lowercase letters, numbers, and underscores, such as customer_email, order_number, issue_category, or requested_date.
Where the value comes from: The editor can create it from the label, but you should adjust it to match how later nodes will read the value.
How to use it later: Map it with expressions like {{$json.customer_email}} or {{$json.data.customer_email}}.
Accepted format: Lowercase letters, numbers, and underscores; avoid spaces and punctuation.
Real workplace example: Use issue_category for a dropdown that routes support submissions to billing, technical, or sales teams.
If it is empty or wrong: Later nodes may fail because {{$json.email}} does not exist or points to the wrong answer.
Common mistake: Changing this name after the workflow is already mapped. Rename downstream expressions at the same time if you must change it.`,
              placeholder: 'customer_email',
              example: 'customer_email',
            },
            {
              name: 'Field Type',
              internalKey: 'fieldType',
              type: 'select',
              required: true,
              description: 'The kind of answer one form question collects. Options: text, email, number, tel, url, date, textarea, select, checkbox, radio, file.',
              helpText: `What this field means: Field Type controls how the answer is entered and validated.
Why it matters: The right type prevents bad data and makes later mappings more reliable.
When to fill it: Choose it for every field before sharing the form.
What to enter: Choose text for short free text, email for email addresses, number for numeric values, tel for phone numbers, url for website links, date for dates, textarea for long notes, select for a dropdown, radio for one visible choice, checkbox for yes/no confirmation, and file for uploads.
Where the value comes from: Pick the type from the kind of answer your process needs.
How to use it later: The submitted value appears under the internal name, such as {{$json.phone_number}} for tel or {{$json.resume_file}} for file.
Accepted format: One dropdown option: text, email, number, tel, url, date, textarea, select, checkbox, radio, or file.
Real workplace example: Use select for Department so every request routes to one of the approved teams instead of free-text variations.
If it is empty or wrong: Validation may reject valid users, or later nodes may receive answers in a format they do not expect.
Common mistake: Using text for values that should be email, number, url, or date, then needing extra cleanup later.`,
              defaultValue: 'text',
              options: ['text', 'email', 'number', 'tel', 'url', 'date', 'textarea', 'select', 'checkbox', 'radio', 'file'],
              example: 'email',
            },
            {
              name: 'Placeholder',
              internalKey: 'placeholder',
              type: 'string',
              required: false,
              description: 'Example text shown inside an empty answer field. It appears for text-like fields such as text, email, number, and textarea.',
              helpText: `What this field means: Placeholder is light example text shown before the submitter types an answer.
Why it matters: It shows the expected format without adding another instruction line.
When to fill it: Use it for text, email, number, tel, url, date, and textarea fields when an example would prevent confusion.
What to enter: Use a safe fake example, such as alex@example.com, ORD-1048, https://example.com, or "Briefly describe the issue."
Where the value comes from: You write it based on the answer format your team expects.
How to use it later: Placeholder text is not submitted. Later nodes only use the answer, such as {{$json.order_number}}.
Accepted format: Plain text; avoid real customer data.
Real workplace example: For Order Number, use ORD-1048 so customers know the exact style to enter.
If it is empty or wrong: The form still works, but users may enter inconsistent formats.
Common mistake: Putting a real default answer in the placeholder. If the user leaves the field blank, placeholder text is not sent.`,
              placeholder: 'alex@example.com',
              example: 'ORD-1048',
              notes: 'This field is most useful for text-like fields and may not appear for every field type.',
            },
            {
              name: 'Options',
              internalKey: 'options',
              type: 'textarea',
              required: false,
              description: 'Allowed choices for select and radio fields.',
              helpText: `What this field means: Options are the choices a submitter can pick from a select dropdown or radio group.
Why it matters: Fixed choices make routing, reporting, and branching reliable because later nodes receive predictable values.
When to fill it: Fill it when Field Type is select or radio. It is not needed for text, email, number, tel, url, date, textarea, checkbox, or file.
What to enter: Add clear choices separated by commas, or label:value pairs when the saved value should be shorter than the visible label.
Where the value comes from: Use the approved categories, departments, statuses, products, or request types in your process.
How to use it later: Later nodes can branch on values like {{$json.issue_category}} equals Billing or Technical.
Accepted format: Comma-separated choices such as Billing, Technical, Sales, or pairs such as Billing Team:billing.
Real workplace example: Use New Account, Billing Question, Technical Issue, and Cancellation Request on a support intake form.
If it is empty or wrong: Submitters may see no useful choices, and routing rules may not match.
Common mistake: Letting option wording drift from workflow branch conditions, such as a Switch node expecting billing while the form sends Billing Team.`,
              placeholder: 'Billing, Technical, Sales',
              example: 'Billing Team:billing, Technical Support:technical, Sales:sales',
              notes: 'This field appears when the question type is select or radio.',
            },
            {
              name: 'Required',
              internalKey: 'required',
              type: 'boolean',
              required: false,
              description: 'Controls whether a submitter must answer one question before submitting the form.',
              helpText: `What this field means: Required decides whether the form can be submitted without this answer.
Why it matters: Required fields protect the workflow from missing values that later nodes need.
When to fill it: Turn it on only for information the workflow truly cannot continue without.
What to enter: true/on when the answer is mandatory, false/off when the answer is helpful but optional.
Where the value comes from: Base it on the next steps in the workflow and your team's minimum intake requirements.
How to use it later: If a field is required, later nodes can safely map values such as {{$json.customer_email}} with less fallback handling.
Accepted format: true or false.
Real workplace example: Make Work Email required on a demo request form because the sales follow-up email needs it.
If it is empty or wrong: Too many required fields reduce submissions; too few required fields can break later nodes.
Common mistake: Marking every question required instead of only the answers needed to route or complete the work.`,
              defaultValue: 'false',
              options: ['true', 'false'],
              example: 'true',
            },
            {
              name: 'Submit Button Text',
              internalKey: 'submitButtonText',
              type: 'string',
              required: false,
              description: 'The text on the button used to submit the form.',
              helpText: `What this field means: Submit Button Text is the action label people click when they finish the form.
Why it matters: A specific button label sets expectations and can improve completion.
When to fill it: Change it when Submit is too generic for the form's purpose.
What to enter: Use a clear action such as Send Request, Register, Request Demo, Submit Ticket, or Send Feedback.
Where the value comes from: Choose wording that matches the submitter's goal.
How to use it later: This is display text only. Later nodes use submitted values such as {{$json.email}} or {{$json.data.company_name}}.
Accepted format: Short plain text.
Real workplace example: Use Submit Ticket for a support intake form that creates a helpdesk ticket.
If it is empty or wrong: Users may be unsure what will happen after clicking the button.
Common mistake: Using vague text like Go or OK when the action has a business consequence.`,
              placeholder: 'Submit Ticket',
              example: 'Submit Ticket',
              defaultValue: 'Submit',
            },
            {
              name: 'Success Message',
              internalKey: 'successMessage',
              type: 'textarea',
              required: false,
              description: 'The confirmation message shown after a successful submission.',
              helpText: `What this field means: Success Message tells the submitter the form was received.
Why it matters: It reduces duplicate submissions and explains what happens next.
When to fill it: Set it before sharing the form, especially for customer-facing or employee-facing intake forms.
What to enter: Confirm receipt and mention the next step or expected timing.
Where the value comes from: Use your team's response process or service-level expectation.
How to use it later: This message is shown to the submitter. Later nodes can send richer follow-ups using fields like {{$json.customer_email}}.
Accepted format: Plain text, one or two short sentences.
Real workplace example: "Thanks, we received your request. A support specialist will email you within one business day."
If it is empty or wrong: Users may submit again or contact the team separately because they are not sure the form worked.
Common mistake: Promising a response time the downstream workflow or team cannot meet.`,
              placeholder: 'Thanks, we received your request.',
              example: 'Thanks, we received your request. A support specialist will email you within one business day.',
              defaultValue: 'Thank you for your submission!',
            },
            {
              name: 'Redirect URL',
              internalKey: 'redirectUrl',
              type: 'url',
              required: false,
              description: 'Optional page to send users to after the form submits.',
              helpText: `What this field means: Redirect URL sends the submitter to another page after a successful submission.
Why it matters: It is useful when you have a thank-you page, payment page, onboarding page, or documentation page they should see next.
When to fill it: Use it only when leaving the form page is part of the desired experience.
What to enter: Paste the full HTTPS URL for the destination page, or leave it blank to show the success message on the form page.
Where the value comes from: Use a page controlled by your company, product, event, or support team.
How to use it later: This field changes the submitter experience only. Later nodes still use submitted answers such as {{$json.data.email}}.
Accepted format: A full URL starting with https://.
Real workplace example: Redirect event registrants to https://example.com/event/next-steps after they submit.
If it is empty or wrong: Users stay on the form page, or they may be sent to a broken or unrelated page.
Common mistake: Using an internal admin URL that customers or employees outside the admin team cannot open.`,
              placeholder: 'https://example.com/thank-you',
              example: 'https://example.com/thank-you',
            },
            {
              name: 'Allow Multiple Submissions',
              internalKey: 'allowMultipleSubmissions',
              type: 'boolean',
              required: false,
              description: 'Controls whether the same person can submit the form more than once.',
              helpText: `What this field means: Allow Multiple Submissions controls whether one person can send the form repeatedly.
Why it matters: Some forms are repeatable requests, while others should be one-time applications or RSVPs.
When to fill it: Review it before sharing the form URL.
What to enter: true/on for repeatable requests such as support tickets, feedback, expenses, or maintenance requests. false/off for one-time applications, votes, RSVPs, or eligibility checks.
Where the value comes from: Base it on the business rule for this process.
How to use it later: Later nodes can still use submitted fields like {{$json.employee_id}} to detect duplicates if your process needs stricter checks.
Accepted format: true or false.
Real workplace example: Turn true for an IT help request form because the same employee may submit multiple issues.
If it is empty or wrong: Users may be blocked from valid repeat submissions, or duplicate records may be created.
Common mistake: Turning it off for customer support forms where one person can reasonably have more than one issue.`,
              defaultValue: 'true',
              options: ['true', 'false'],
              example: 'true',
            },
            {
              name: 'Require Authentication',
              internalKey: 'requireAuthentication',
              type: 'boolean',
              required: false,
              description: 'Controls whether a user must be signed in before submitting.',
              helpText: `What this field means: Require Authentication limits submissions to people who are signed in.
Why it matters: It helps tie submissions to known users for internal requests, employee workflows, or protected forms.
When to fill it: Turn it on when the submitter identity matters or the form should not be public.
What to enter: true/on to require sign-in, false/off for public forms such as lead capture or event interest.
Where the value comes from: Use your organization's access policy for the form audience.
How to use it later: When authentication is available, later nodes may use submitter identity or user metadata along with {{$json.data}} values.
Accepted format: true or false.
Real workplace example: Turn true for an employee equipment request so HR or IT knows which signed-in employee submitted it.
If it is empty or wrong: Public users may be blocked, or sensitive internal forms may accept anonymous submissions.
Common mistake: Enabling it for a marketing lead form, then wondering why outside prospects cannot submit.`,
              defaultValue: 'false',
              options: ['true', 'false'],
              example: 'false',
            },
            {
              name: 'CAPTCHA',
              internalKey: 'captcha',
              type: 'boolean',
              required: false,
              description: 'Adds a spam-prevention challenge for public form submissions.',
              helpText: `What this field means: CAPTCHA adds an anti-spam check before the form can be submitted.
Why it matters: Public forms can attract automated spam that creates noisy workflow runs and unwanted tickets or messages.
When to fill it: Turn it on for public contact, demo, support, or signup forms that could be found by unknown users.
What to enter: true/on to require CAPTCHA, false/off for trusted internal forms or private forms where speed matters more.
Where the value comes from: Base it on whether the form URL is public and how much spam risk the workflow has.
How to use it later: CAPTCHA affects whether the workflow starts. Later nodes receive only successful submissions such as {{$json.message}}.
Accepted format: true or false.
Real workplace example: Turn true for a website contact form that creates CRM leads and sends sales notifications.
If it is empty or wrong: Leaving it off can create spam executions; turning it on can add friction for trusted internal users.
Common mistake: Relying on CAPTCHA instead of also validating required fields such as email and message.`,
              defaultValue: 'false',
              options: ['true', 'false'],
              example: 'true',
            },
          ],
          outputExample: {
            name: 'Alex Morgan',
            customer_email: 'alex@example.com',
            issue_category: 'billing',
            message: 'Invoice INV-4821 shows the wrong billing address.',
            submitted_at: '2026-07-18T08:45:00.000Z',
            form: {
              title: 'Support Request',
              id: 'form_node_1',
            },
            data: {
              name: 'Alex Morgan',
              customer_email: 'alex@example.com',
              issue_category: 'billing',
              message: 'Invoice INV-4821 shows the wrong billing address.',
            },
            files: [],
            meta: {
              submittedAt: '2026-07-18T08:45:00.000Z',
              ip: 'masked',
              userAgent: 'Mozilla/5.0',
            },
          },
          outputDescription: 'Submitted answers are available at the top level by internal name, such as name, customer_email, issue_category, and message. The same answers are also available under data for explicit mapping, such as {{$json.data.customer_email}}. submitted_at records when the form was submitted. form contains the title and form node id. files contains uploaded files when file fields are used. meta contains submission metadata such as submittedAt, masked IP, and userAgent.',
          usageExample: {
            scenario: 'Collect a support request, create a helpdesk ticket, and send the customer a confirmation email.',
            inputValues: {
              formTitle: 'Support Request',
              formDescription: 'Tell us what happened and we will reply within one business day.',
              fields: 'name, customer_email, issue_category, message',
              fieldLabel: 'Customer Email',
              internalName: 'customer_email',
              fieldType: 'email',
              placeholder: 'alex@example.com',
              options: 'Billing Team:billing, Technical Support:technical, Sales:sales',
              required: 'true',
              submitButtonText: 'Submit Ticket',
              successMessage: 'Thanks, we received your request.',
              redirectUrl: '',
              allowMultipleSubmissions: 'true',
              requireAuthentication: 'false',
              captcha: 'true',
            },
            expectedOutput: 'The next node can use {{$json.customer_email}}, {{$json.data.issue_category}}, {{$json.message}}, {{$json.submitted_at}}, {{$json.form.id}}, {{$json.files}}, and {{$json.meta.submittedAt}} to route the ticket, send replies, and log the submission.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Required form title or fields are missing',
      cause: 'The form has no title, no questions, or the field list was removed before saving.',
      fix: 'Add a clear Form Title and at least one Form Field, then save and preview the public form again.',
    },
    {
      error: 'A required answer is blank',
      cause: 'A form field marked Required was submitted without a value.',
      fix: 'Either ask the submitter to fill the required field or turn Required off if the workflow can continue without it.',
    },
    {
      error: 'Invalid email, number, URL, or date format',
      cause: 'The submitted answer does not match the selected Field Type validation.',
      fix: 'Choose the correct Field Type and use placeholders such as alex@example.com, 42, https://example.com, or 2026-07-18 to show the expected format.',
    },
    {
      error: 'Dropdown or radio option does not match workflow branch',
      cause: 'The Options text changed, but a Switch, If/Else, Slack, CRM, or database node still expects the old value.',
      fix: 'Update downstream conditions to match the current option values, or use stable label:value pairs for options.',
    },
    {
      error: 'Next node cannot find the submitted value',
      cause: 'The Internal Name was changed or the next node is mapping the wrong path.',
      fix: 'Open a recent execution and map the exact key, such as {{$json.customer_email}} or {{$json.data.customer_email}}.',
    },
    {
      error: 'Duplicate submissions or blocked repeat submissions',
      cause: 'Allow Multiple Submissions does not match the intended business rule.',
      fix: 'Turn it on for repeatable requests and off for one-time applications, votes, or registrations.',
    },
    {
      error: 'Public users cannot submit the form',
      cause: 'Require Authentication is on for a form meant for people outside your workspace.',
      fix: 'Turn Require Authentication off for public lead, contact, survey, and customer support forms.',
    },
    {
      error: 'Spam submissions start too many workflow runs',
      cause: 'CAPTCHA is off for a public form that can be reached by unknown users.',
      fix: 'Turn CAPTCHA on and keep required email or message validation in place.',
    },
    {
      error: 'Permission denied in a later service node',
      cause: 'Form Trigger does not use credentials, but the connected service node may need an account connection with permission to create, update, send, or upload data.',
      fix: 'Open the connected output node, select or create its service account connection, test it, and rerun the form submission.',
    },
  ],
  relatedNodes: ['email', 'slack_message', 'google_sheets', 'hubspot', 'database_write', 'if_else'],
};
