"use strict";
/**
 * GitHub Service
 *
 * Production-ready GitHub API integration service.
 * Handles GitHub operations with proper error handling, rate limiting, and retry logic.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubAPIError = void 0;
exports.postGitHubIssue = postGitHubIssue;
exports.createGitHubRepository = createGitHubRepository;
exports.getGitHubUser = getGitHubUser;
exports.commitGitHubFile = commitGitHubFile;
const node_fetch_1 = __importDefault(require("node-fetch"));
const acknowledged_response_1 = require("../../core/http/acknowledged-response");
const GITHUB_API_BASE = 'https://api.github.com';
/**
 * GitHub API Error
 */
class GitHubAPIError extends Error {
    constructor(statusCode, statusText, apiError) {
        super(`GitHub API error: ${statusCode} ${statusText}`);
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.apiError = apiError;
        this.name = 'GitHubAPIError';
    }
}
exports.GitHubAPIError = GitHubAPIError;
/**
 * Validate GitHub token
 */
async function validateToken(token) {
    try {
        const response = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CtrlChecks/1.0',
            },
        });
        return response.ok;
    }
    catch (error) {
        return false;
    }
}
/**
 * Post GitHub issue
 */
async function postGitHubIssue(token, owner, repo, title, body, labels) {
    try {
        // Validate token
        const isValid = await validateToken(token);
        if (!isValid) {
            return {
                success: false,
                provider: 'github',
                action: 'post_issue',
                data: {},
                error: 'Invalid or expired GitHub token',
            };
        }
        // Validate inputs
        if (!owner || !repo || !title) {
            return {
                success: false,
                provider: 'github',
                action: 'post_issue',
                data: {},
                error: 'Missing required fields: owner, repo, and title are required',
            };
        }
        // Make API request
        const response = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CtrlChecks/1.0',
            },
            body: JSON.stringify({
                title,
                body: body || '',
                labels: labels || [],
            }),
        });
        const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
        const data = parsed.data;
        if (!response.ok) {
            const errorData = data || parsed.rawText || {};
            throw new GitHubAPIError(response.status, response.statusText, errorData);
        }
        return {
            success: true,
            provider: 'github',
            action: 'post_issue',
            data: {
                id: data.id,
                number: data.number,
                title: data.title,
                body: data.body,
                state: data.state,
                url: data.html_url,
                created_at: data.created_at,
            },
            error: null,
        };
    }
    catch (error) {
        if (error instanceof GitHubAPIError) {
            return {
                success: false,
                provider: 'github',
                action: 'post_issue',
                data: {},
                error: `GitHub API error (${error.statusCode}): ${error.statusText}`,
            };
        }
        return {
            success: false,
            provider: 'github',
            action: 'post_issue',
            data: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
/**
 * Create GitHub repository
 */
async function createGitHubRepository(token, name, description, privateRepo = false) {
    try {
        // Validate token
        const isValid = await validateToken(token);
        if (!isValid) {
            return {
                success: false,
                provider: 'github',
                action: 'create_repo',
                data: {},
                error: 'Invalid or expired GitHub token',
            };
        }
        // Validate inputs
        if (!name) {
            return {
                success: false,
                provider: 'github',
                action: 'create_repo',
                data: {},
                error: 'Repository name is required',
            };
        }
        // Make API request
        const response = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/user/repos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CtrlChecks/1.0',
            },
            body: JSON.stringify({
                name,
                description: description || '',
                private: privateRepo,
                auto_init: true,
            }),
        });
        const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
        const data = parsed.data;
        if (!response.ok) {
            const errorData = data || parsed.rawText || {};
            throw new GitHubAPIError(response.status, response.statusText, errorData);
        }
        return {
            success: true,
            provider: 'github',
            action: 'create_repo',
            data: {
                id: data.id,
                name: data.name,
                full_name: data.full_name,
                description: data.description,
                private: data.private,
                url: data.html_url,
                created_at: data.created_at,
            },
            error: null,
        };
    }
    catch (error) {
        if (error instanceof GitHubAPIError) {
            return {
                success: false,
                provider: 'github',
                action: 'create_repo',
                data: {},
                error: `GitHub API error (${error.statusCode}): ${error.statusText}`,
            };
        }
        return {
            success: false,
            provider: 'github',
            action: 'create_repo',
            data: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
/**
 * Get GitHub user info
 */
async function getGitHubUser(token) {
    try {
        // Validate token
        const isValid = await validateToken(token);
        if (!isValid) {
            return {
                success: false,
                provider: 'github',
                action: 'get_user',
                data: {},
                error: 'Invalid or expired GitHub token',
            };
        }
        // Make API request
        const response = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CtrlChecks/1.0',
            },
        });
        const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
        const data = parsed.data;
        if (!response.ok) {
            const errorData = data || parsed.rawText || {};
            throw new GitHubAPIError(response.status, response.statusText, errorData);
        }
        return {
            success: true,
            provider: 'github',
            action: 'get_user',
            data: {
                id: data.id,
                login: data.login,
                name: data.name,
                email: data.email,
                avatar_url: data.avatar_url,
                bio: data.bio,
                public_repos: data.public_repos,
                followers: data.followers,
                following: data.following,
                created_at: data.created_at,
            },
            error: null,
        };
    }
    catch (error) {
        if (error instanceof GitHubAPIError) {
            return {
                success: false,
                provider: 'github',
                action: 'get_user',
                data: {},
                error: `GitHub API error (${error.statusCode}): ${error.statusText}`,
            };
        }
        return {
            success: false,
            provider: 'github',
            action: 'get_user',
            data: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
/**
 * Commit file to GitHub repository
 *
 * This operation creates or updates a file in a repository by:
 * 1. Getting the current SHA of the file (if exists)
 * 2. Creating a blob with the new content
 * 3. Creating a tree with the updated file
 * 4. Creating a commit
 * 5. Updating the branch reference
 */
async function commitGitHubFile(token, owner, repo, path, content, message, branch = 'main') {
    try {
        // Validate token
        const isValid = await validateToken(token);
        if (!isValid) {
            return {
                success: false,
                provider: 'github',
                action: 'commit_file',
                data: {},
                error: 'Invalid or expired GitHub token',
            };
        }
        // Validate inputs
        if (!owner || !repo || !path || !content || !message) {
            return {
                success: false,
                provider: 'github',
                action: 'commit_file',
                data: {},
                error: 'Missing required fields: owner, repo, path, content, and message are required',
            };
        }
        // Step 1: Get the current reference (branch)
        const refResponse = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CtrlChecks/1.0',
            },
        });
        if (!refResponse.ok) {
            const errorData = await refResponse.json().catch(() => ({}));
            throw new GitHubAPIError(refResponse.status, refResponse.statusText, errorData);
        }
        const refData = await refResponse.json();
        const baseSha = refData.object.sha;
        // Step 2: Get the current tree
        const treeResponse = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${baseSha}?recursive=1`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CtrlChecks/1.0',
            },
        });
        if (!treeResponse.ok) {
            const errorData = await treeResponse.json().catch(() => ({}));
            throw new GitHubAPIError(treeResponse.status, treeResponse.statusText, errorData);
        }
        const treeData = await treeResponse.json();
        // Step 3: Find existing file SHA (if file exists)
        const existingFile = treeData.tree.find((item) => item.path === path && item.type === 'blob');
        const fileSha = existingFile?.sha || null;
        // Step 4: Create blob with file content
        const blobResponse = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CtrlChecks/1.0',
            },
            body: JSON.stringify({
                content: Buffer.from(content).toString('base64'),
                encoding: 'base64',
            }),
        });
        if (!blobResponse.ok) {
            const errorData = await blobResponse.json().catch(() => ({}));
            throw new GitHubAPIError(blobResponse.status, blobResponse.statusText, errorData);
        }
        const blobData = await blobResponse.json();
        const blobSha = blobData.sha;
        // Step 5: Create new tree with updated file
        const newTreeItems = treeData.tree
            .filter((item) => item.path !== path || item.type !== 'blob')
            .map((item) => ({
            path: item.path,
            mode: item.mode,
            type: item.type,
            sha: item.sha,
        }));
        // Add the new/updated file
        newTreeItems.push({
            path,
            mode: '100644', // Regular file
            type: 'blob',
            sha: blobSha,
        });
        const createTreeResponse = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CtrlChecks/1.0',
            },
            body: JSON.stringify({
                base_tree: baseSha,
                tree: newTreeItems,
            }),
        });
        if (!createTreeResponse.ok) {
            const errorData = await createTreeResponse.json().catch(() => ({}));
            throw new GitHubAPIError(createTreeResponse.status, createTreeResponse.statusText, errorData);
        }
        const newTreeData = await createTreeResponse.json();
        const newTreeSha = newTreeData.sha;
        // Step 6: Create commit
        const commitResponse = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CtrlChecks/1.0',
            },
            body: JSON.stringify({
                message,
                tree: newTreeSha,
                parents: [baseSha],
            }),
        });
        if (!commitResponse.ok) {
            const errorData = await commitResponse.json().catch(() => ({}));
            throw new GitHubAPIError(commitResponse.status, commitResponse.statusText, errorData);
        }
        const commitData = await commitResponse.json();
        const commitSha = commitData.sha;
        // Step 7: Update branch reference
        const updateRefResponse = await (0, node_fetch_1.default)(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CtrlChecks/1.0',
            },
            body: JSON.stringify({
                sha: commitSha,
            }),
        });
        if (!updateRefResponse.ok) {
            const errorData = await updateRefResponse.json().catch(() => ({}));
            throw new GitHubAPIError(updateRefResponse.status, updateRefResponse.statusText, errorData);
        }
        return {
            success: true,
            provider: 'github',
            action: 'commit_file',
            data: {
                commit: {
                    sha: commitSha,
                    message: commitData.message,
                    url: commitData.html_url,
                },
                file: {
                    path,
                    sha: blobSha,
                    url: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
                },
            },
            error: null,
        };
    }
    catch (error) {
        if (error instanceof GitHubAPIError) {
            return {
                success: false,
                provider: 'github',
                action: 'commit_file',
                data: {},
                error: `GitHub API error (${error.statusCode}): ${error.statusText}`,
            };
        }
        return {
            success: false,
            provider: 'github',
            action: 'commit_file',
            data: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
