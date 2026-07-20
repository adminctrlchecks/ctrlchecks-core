# GitHub Node - Comprehensive Usage Guide

Complete guide for using the comprehensive GitHub node in CtrlChecks workflows.

## Overview

The GitHub node supports two patterns:

1. **Legacy Pattern** (backward compatible): Simple operation-based
2. **Comprehensive Pattern** (new): Resource/operation-based with full GitHub API support

---

## Installation

The `@octokit/rest` package has been installed. No additional setup needed.

---

## Usage Patterns

### Pattern 1: Legacy (Simple Operations)

**Supported Operations:**
- `post_issue` / `create_issue` - Create GitHub issue
- `create_repo` / `create_repository` - Create repository
- `get_user` / `get_profile` - Get user info
- `commit_file` / `commit` - Commit file to repository

**Example:**
```json
{
  "type": "github",
  "config": {
    "operation": "post_issue",
    "owner": "octocat",
    "repo": "hello-world",
    "title": "Bug Report",
    "body": "Found a bug",
    "labels": ["bug"]
  }
}
```

### Pattern 2: Comprehensive (Resource/Operation)

**Supports all GitHub resources:**
- `repository` - Repository operations
- `issue` - Issue operations
- `pullRequest` - Pull request operations
- `file` - File/content operations
- `commit` - Commit operations
- `branch` - Branch operations
- `release` - Release operations

**Example:**
```json
{
  "type": "github",
  "config": {
    "resource": "issue",
    "operation": "createIssue",
    "owner": "octocat",
    "repo": "hello-world",
    "title": "Bug Report",
    "body": "Found a bug",
    "labels": ["bug"]
  }
}
```

---

## Available Resources and Operations

### 1. Repository

**Operations:**
- `getRepo` - Get repository details
- `listRepos` - List repositories (user or org)
- `createRepo` - Create new repository
- `updateRepo` - Update repository settings
- `deleteRepo` - Delete repository

**Example - Create Repository:**
```json
{
  "type": "github",
  "config": {
    "resource": "repository",
    "operation": "createRepo",
    "name": "my-new-repo",
    "description": "Repository description",
    "private": false,
    "has_issues": true,
    "has_wiki": true,
    "auto_init": true
  }
}
```

**Example - List Repositories:**
```json
{
  "type": "github",
  "config": {
    "resource": "repository",
    "operation": "listRepos",
    "org": "my-org"  // Optional: list org repos, omit for user repos
  }
}
```

### 2. Issue

**Operations:**
- `getIssue` - Get single issue
- `listIssues` - List issues in repository
- `createIssue` - Create new issue
- `updateIssue` - Update issue
- `addIssueComment` - Add comment to issue
- `lockIssue` - Lock issue conversation
- `unlockIssue` - Unlock issue conversation

**Example - Create Issue:**
```json
{
  "type": "github",
  "config": {
    "resource": "issue",
    "operation": "createIssue",
    "owner": "octocat",
    "repo": "hello-world",
    "title": "Bug Report",
    "body": "Found a bug in the system",
    "labels": ["bug", "urgent"],
    "assignees": ["username"]
  }
}
```

**Example - List Issues:**
```json
{
  "type": "github",
  "config": {
    "resource": "issue",
    "operation": "listIssues",
    "owner": "octocat",
    "repo": "hello-world",
    "state": "open",  // open | closed | all
    "labels": ["bug"],
    "assignee": "username"
  }
}
```

**Example - Add Comment:**
```json
{
  "type": "github",
  "config": {
    "resource": "issue",
    "operation": "addIssueComment",
    "owner": "octocat",
    "repo": "hello-world",
    "issue_number": 123,
    "body": "This is a comment"
  }
}
```

### 3. Pull Request

**Operations:**
- `getPullRequest` - Get single PR
- `listPullRequests` - List PRs
- `createPullRequest` - Create PR
- `updatePullRequest` - Update PR
- `mergePullRequest` - Merge PR
- `requestReviewers` - Request reviewers

**Example - Create Pull Request:**
```json
{
  "type": "github",
  "config": {
    "resource": "pullRequest",
    "operation": "createPullRequest",
    "owner": "octocat",
    "repo": "hello-world",
    "title": "Fix bug",
    "head": "feature-branch",
    "base": "main",
    "body": "This PR fixes the bug"
  }
}
```

**Example - Merge Pull Request:**
```json
{
  "type": "github",
  "config": {
    "resource": "pullRequest",
    "operation": "mergePullRequest",
    "owner": "octocat",
    "repo": "hello-world",
    "pull_number": 456,
    "commit_title": "Merge PR #456",
    "merge_method": "squash"  // merge | squash | rebase
  }
}
```

### 4. File / Content

**Operations:**
- `getContents` - Get file or directory contents
- `createOrUpdateFile` - Create or update file
- `deleteFile` - Delete file

**Example - Get File Contents:**
```json
{
  "type": "github",
  "config": {
    "resource": "file",
    "operation": "getContents",
    "owner": "octocat",
    "repo": "hello-world",
    "path": "README.md",
    "ref": "main"  // Optional: branch/tag/commit
  }
}
```

**Example - Create or Update File:**
```json
{
  "type": "github",
  "config": {
    "resource": "file",
    "operation": "createOrUpdateFile",
    "owner": "octocat",
    "repo": "hello-world",
    "path": "docs/README.md",
    "message": "Add documentation",
    "content": "File content here",  // Will be base64 encoded automatically
    "branch": "main",
    "sha": "abc123"  // Required for update, omit for create
  }
}
```

### 5. Commit

**Operations:**
- `listCommits` - List commits
- `getCommit` - Get single commit

**Example - List Commits:**
```json
{
  "type": "github",
  "config": {
    "resource": "commit",
    "operation": "listCommits",
    "owner": "octocat",
    "repo": "hello-world",
    "sha": "main",  // Optional: branch/tag
    "path": "src/",  // Optional: filter by path
    "author": "username"  // Optional: filter by author
  }
}
```

### 6. Branch

**Operations:**
- `listBranches` - List branches
- `getBranch` - Get branch details
- `createBranch` - Create new branch
- `deleteBranch` - Delete branch

**Example - Create Branch:**
```json
{
  "type": "github",
  "config": {
    "resource": "branch",
    "operation": "createBranch",
    "owner": "octocat",
    "repo": "hello-world",
    "branch": "feature-branch",
    "sha": "abc123def456"  // SHA of commit to branch from
  }
}
```

### 7. Release

**Operations:**
- `getRelease` - Get release
- `listReleases` - List releases
- `createRelease` - Create release
- `updateRelease` - Update release
- `deleteRelease` - Delete release

**Example - Create Release:**
```json
{
  "type": "github",
  "config": {
    "resource": "release",
    "operation": "createRelease",
    "owner": "octocat",
    "repo": "hello-world",
    "tag_name": "v1.0.0",
    "name": "Version 1.0.0",
    "body": "Release notes",
    "draft": false,
    "prerelease": false,
    "target_commitish": "main"
  }
}
```

---

## Using Template Variables

All parameters support template variables:

```json
{
  "type": "github",
  "config": {
    "resource": "issue",
    "operation": "createIssue",
    "owner": "{{input.repo_owner}}",
    "repo": "{{input.repo_name}}",
    "title": "{{input.issue_title}}",
    "body": "{{input.issue_body}}"
  }
}
```

---

## Response Format

**Success Response:**
```json
{
  "success": true,
  "provider": "github",
  "action": "issue.createIssue",
  "data": {
    "id": 123456,
    "number": 1,
    "title": "Bug Report",
    "body": "Found a bug",
    "html_url": "https://github.com/octocat/hello-world/issues/1",
    ...
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "provider": "github",
  "action": "issue.createIssue",
  "data": {},
  "error": "Missing required parameter(s): owner, repo, title"
}
```

---

## Error Handling

The node automatically handles:
- **401 Unauthorized** - Token expired or invalid
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource doesn't exist
- **422 Unprocessable Entity** - Validation error
- **429 Rate Limited** - Automatic retry with backoff

All errors are returned in a structured format with status codes and error messages.

---

## Backward Compatibility

The legacy pattern still works:

```json
{
  "type": "github",
  "config": {
    "operation": "post_issue",  // Old pattern
    "owner": "octocat",
    "repo": "hello-world",
    "title": "Bug"
  }
}
```

This will continue to work exactly as before.

---

## Complete Example Workflow

```json
{
  "nodes": [
    {
      "id": "github-issue",
      "type": "github",
      "config": {
        "resource": "issue",
        "operation": "createIssue",
        "owner": "my-username",
        "repo": "my-repo",
        "title": "Workflow Generated Issue",
        "body": "This issue was created automatically",
        "labels": ["automated", "workflow"]
      }
    },
    {
      "id": "github-pr",
      "type": "github",
      "config": {
        "resource": "pullRequest",
        "operation": "createPullRequest",
        "owner": "my-username",
        "repo": "my-repo",
        "title": "Auto PR",
        "head": "feature-branch",
        "base": "main"
      }
    }
  ],
  "edges": []
}
```

---

## Next Steps

1. ✅ Install `@octokit/rest` - **DONE**
2. ✅ Create GitHub node implementation - **DONE**
3. ✅ Integrate with social dispatcher - **DONE**
4. ✅ Maintain backward compatibility - **DONE**
5. 🔄 Test workflows with new operations 
6. 🔄 Add UI components for resource/operation selection

The comprehensive GitHub node is now fully integrated and ready to use! 🎉
