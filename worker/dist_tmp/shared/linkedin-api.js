"use strict";
// LinkedIn API Helper Functions
// Provides reusable functions for various LinkedIn API operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinkedInProfile = getLinkedInProfile;
exports.getLinkedInPosts = getLinkedInPosts;
exports.registerLinkedInUpload = registerLinkedInUpload;
exports.uploadLinkedInMediaFromUrl = uploadLinkedInMediaFromUrl;
exports.createLinkedInPost = createLinkedInPost;
exports.createLinkedInMediaPost = createLinkedInMediaPost;
exports.createLinkedInArticlePost = createLinkedInArticlePost;
exports.createLinkedInCompanyPost = createLinkedInCompanyPost;
exports.deleteLinkedInPost = deleteLinkedInPost;
exports.getPersonUrnFromToken = getPersonUrnFromToken;
function normalizePersonUrn(personUrnOrId) {
    if (!personUrnOrId)
        return '';
    return personUrnOrId.startsWith('urn:li:person:')
        ? personUrnOrId
        : `urn:li:person:${personUrnOrId}`;
}
/**
 * Get LinkedIn user profile
 */
async function getLinkedInProfile(accessToken) {
    // Prefer OIDC userinfo endpoint (works with scopes: openid profile email)
    // Fallback to legacy /v2/me for older apps/scopes.
    const userInfoResp = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (userInfoResp.ok) {
        const json = (await userInfoResp.json());
        if (!json.sub) {
            // Unexpected, but don't fail hard; try legacy endpoint.
            // eslint-disable-next-line no-console
            console.warn('[LinkedIn API] /v2/userinfo missing sub; falling back to /v2/me');
        }
        else {
            return {
                id: json.sub,
                name: json.name,
                given_name: json.given_name,
                family_name: json.family_name,
                picture: json.picture,
                email: json.email,
            };
        }
    }
    // Legacy endpoint
    const meResp = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!meResp.ok) {
        const errorText = await meResp.text();
        const userInfoErrText = await userInfoResp.text().catch(() => '');
        throw new Error(`LinkedIn API error: /v2/userinfo (${userInfoResp.status}) ${userInfoErrText.slice(0, 200)}; ` +
            `/v2/me (${meResp.status}) ${errorText.slice(0, 200)}`);
    }
    return (await meResp.json());
}
/**
 * Get LinkedIn user posts
 */
async function getLinkedInPosts(accessToken, personUrn, count = 10) {
    // Use UGC Posts API to get user's posts
    const authorUrn = normalizePersonUrn(personUrn);
    const queryParams = new URLSearchParams({
        q: 'authors',
        authors: `List(${authorUrn})`,
        count: count.toString(),
    });
    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts?${queryParams.toString()}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn API error (${response.status}): ${errorText}`);
    }
    const data = (await response.json());
    return data.elements || [];
}
/**
 * Register a LinkedIn media upload for a member post.
 * Returns the asset URN and the upload URL where the raw bytes must be sent.
 */
async function registerLinkedInUpload(accessToken, ownerUrn, kind) {
    const owner = normalizePersonUrn(ownerUrn);
    const recipe = kind === 'video'
        ? 'urn:li:digitalmediaRecipe:feedshare-video'
        : 'urn:li:digitalmediaRecipe:feedshare-image';
    const body = {
        registerUploadRequest: {
            owner,
            recipes: [recipe],
            serviceRelationships: [
                {
                    relationshipType: 'OWNER',
                    identifier: 'urn:li:userGeneratedContent',
                },
            ],
        },
    };
    const response = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn registerUpload error (${response.status}): ${errorText.slice(0, 300)}`);
    }
    const json = (await response.json());
    const assetUrn = json.value?.asset;
    const uploadUrl = json.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
        ?.uploadUrl;
    if (!assetUrn || !uploadUrl) {
        throw new Error('[LinkedIn API] registerUpload response missing asset or uploadUrl');
    }
    return { assetUrn, uploadUrl };
}
/**
 * Download media from a public URL (or decode a data URI) and upload it to the LinkedIn upload URL.
 * Returns basic metadata about the uploaded file.
 */
async function uploadLinkedInMediaFromUrl(uploadUrl, mediaUrl, overrideContentType) {
    let buffer;
    let contentType;
    // Handle base64 data URIs (e.g. data:image/jpeg;base64,/9j/...)
    if (mediaUrl.startsWith('data:')) {
        const commaIdx = mediaUrl.indexOf(',');
        if (commaIdx === -1) {
            throw new Error('[LinkedIn API] Invalid data URI: missing comma separator');
        }
        const meta = mediaUrl.slice(5, commaIdx); // e.g. "image/jpeg;base64"
        const dataPart = mediaUrl.slice(commaIdx + 1);
        const isBase64 = meta.includes(';base64');
        contentType = overrideContentType || meta.replace(';base64', '').trim() || 'application/octet-stream';
        buffer = isBase64 ? Buffer.from(dataPart, 'base64') : Buffer.from(decodeURIComponent(dataPart));
    }
    else {
        const mediaResp = await fetch(mediaUrl);
        if (!mediaResp.ok) {
            const errorText = await mediaResp.text().catch(() => '');
            throw new Error(`[LinkedIn API] Failed to download media from mediaUrl (${mediaResp.status}): ${errorText.slice(0, 300)}`);
        }
        contentType =
            overrideContentType ||
                mediaResp.headers.get('content-type') ||
                'application/octet-stream';
        const arrayBuffer = await mediaResp.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
    }
    const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': contentType,
        },
        body: buffer,
    });
    if (!uploadResp.ok) {
        const errorText = await uploadResp.text().catch(() => '');
        throw new Error(`LinkedIn media upload error (${uploadResp.status}): ${errorText.slice(0, 300)}`);
    }
    return { contentType, size: buffer.byteLength };
}
/**
 * Create a LinkedIn post
 */
async function createLinkedInPost(accessToken, personUrn, text, visibility = 'PUBLIC') {
    const author = normalizePersonUrn(personUrn);
    const requestBody = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text,
                },
                shareMediaCategory: 'NONE',
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
        },
    };
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn API error (${response.status}): ${errorText}`);
    }
    return (await response.json());
}
/**
 * Create a LinkedIn media post (image or video) for a member profile.
 */
async function createLinkedInMediaPost(accessToken, personUrn, text, assetUrn, kind, visibility = 'PUBLIC') {
    const author = normalizePersonUrn(personUrn);
    const mediaCategory = kind === 'video' ? 'VIDEO' : 'IMAGE';
    const requestBody = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text,
                },
                shareMediaCategory: mediaCategory,
                media: [
                    {
                        status: 'READY',
                        media: assetUrn,
                    },
                ],
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
        },
    };
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn media post error (${response.status}): ${errorText.slice(0, 300)}`);
    }
    return (await response.json());
}
/**
 * Create a LinkedIn article link-share post (shareMediaCategory: ARTICLE).
 */
async function createLinkedInArticlePost(accessToken, personUrn, text, articleUrl, visibility = 'PUBLIC') {
    const author = normalizePersonUrn(personUrn);
    const requestBody = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text },
                shareMediaCategory: 'ARTICLE',
                media: [{ status: 'READY', originalUrl: articleUrl }],
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
        },
    };
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn article post error (${response.status}): ${errorText.slice(0, 300)}`);
    }
    return (await response.json());
}
/**
 * Create a LinkedIn post on behalf of a company/organization page.
 * Requires w_organization_social scope.
 */
async function createLinkedInCompanyPost(accessToken, organizationId, text, visibility = 'PUBLIC') {
    const author = organizationId.startsWith('urn:li:organization:')
        ? organizationId
        : `urn:li:organization:${organizationId}`;
    const requestBody = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text },
                shareMediaCategory: 'NONE',
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
        },
    };
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn company post error (${response.status}): ${errorText.slice(0, 300)}`);
    }
    return (await response.json());
}
/**
 * Delete a LinkedIn post
 */
async function deleteLinkedInPost(accessToken, postUrn) {
    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts/${postUrn}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn API error (${response.status}): ${errorText}`);
    }
}
/**
 * Get person URN from access token (extracts from /v2/me response)
 */
async function getPersonUrnFromToken(accessToken) {
    const profile = await getLinkedInProfile(accessToken);
    // LinkedIn returns either:
    // - OIDC: profile.id == sub (member id)
    // - Legacy: profile.id might be "urn:li:person:xxxxx" or just "xxxxx"
    if (!profile.id)
        return '';
    return profile.id.startsWith('urn:li:person:')
        ? profile.id.replace('urn:li:person:', '')
        : profile.id;
}
