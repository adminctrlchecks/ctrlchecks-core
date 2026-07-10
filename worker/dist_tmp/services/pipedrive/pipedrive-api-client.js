"use strict";
/**
 * Pipedrive API Client
 *
 * Comprehensive client for interacting with Pipedrive REST API v1.
 * Handles authentication, pagination, error handling, and all resource operations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipedriveApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
// Removed separate error interface - using PipedriveApiResponse with success: false
class PipedriveApiClient {
    constructor(apiToken) {
        this.baseUrl = 'https://api.pipedrive.com/v1';
        if (!apiToken || apiToken.trim() === '') {
            throw new Error('Pipedrive API token is required');
        }
        // Pipedrive API v1 uses api_token as query parameter for API tokens
        // OAuth tokens can use Bearer header, but for compatibility we'll use query parameter
        // Store token to add as query parameter to all requests
        this.apiToken = apiToken;
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds
        });
    }
    /**
     * Make a GET request to Pipedrive API
     */
    async get(endpoint, params) {
        try {
            // Add api_token to query parameters
            const queryParams = { ...params, api_token: this.apiToken };
            const response = await this.axiosInstance.get(endpoint, { params: queryParams });
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * Make a POST request to Pipedrive API
     */
    async post(endpoint, data) {
        try {
            // Add api_token to query parameters
            const response = await this.axiosInstance.post(endpoint, data, {
                params: { api_token: this.apiToken }
            });
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * Make a PUT request to Pipedrive API
     */
    async put(endpoint, data) {
        try {
            // Add api_token to query parameters
            const response = await this.axiosInstance.put(endpoint, data, {
                params: { api_token: this.apiToken }
            });
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * Make a DELETE request to Pipedrive API
     */
    async delete(endpoint) {
        try {
            // Add api_token to query parameters
            const response = await this.axiosInstance.delete(endpoint, {
                params: { api_token: this.apiToken }
            });
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * Handle errors from API requests
     */
    handleError(error) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            const statusCode = axiosError.response?.status;
            const responseData = axiosError.response?.data;
            return {
                success: false,
                error: responseData?.error || responseData?.error_info || axiosError.message || 'Unknown error',
                error_info: `Status: ${statusCode}`,
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
    /**
     * Fetch all pages for paginated endpoints
     */
    async fetchAllPages(endpoint, params = {}, maxRecords) {
        const allItems = [];
        let start = params.start || 0;
        const limit = params.limit || 100;
        let hasMore = true;
        while (hasMore) {
            const response = await this.get(endpoint, { ...params, start, limit });
            if (!response.success || !response.data) {
                break;
            }
            const items = Array.isArray(response.data) ? response.data : [];
            allItems.push(...items);
            // Check pagination
            const pagination = response.additional_data?.pagination;
            if (pagination?.more_items_in_collection && pagination.next_start !== undefined) {
                start = pagination.next_start;
                hasMore = true;
            }
            else {
                hasMore = false;
            }
            // Check max records limit
            if (maxRecords && allItems.length >= maxRecords) {
                return allItems.slice(0, maxRecords);
            }
        }
        return allItems;
    }
    // ==================== DEAL OPERATIONS ====================
    async getDeal(dealId) {
        return this.get(`/deals/${dealId}`);
    }
    async listDeals(params) {
        const { limit, ...queryParams } = params || {};
        if (limit && limit > 0) {
            // Fetch all pages up to limit
            const deals = await this.fetchAllPages('/deals', queryParams, limit);
            return { success: true, data: deals };
        }
        else {
            // Fetch all pages
            const deals = await this.fetchAllPages('/deals', queryParams);
            return { success: true, data: deals };
        }
    }
    async createDeal(data) {
        return this.post('/deals', data);
    }
    async updateDeal(dealId, data) {
        return this.put(`/deals/${dealId}`, data);
    }
    async deleteDeal(dealId) {
        return this.delete(`/deals/${dealId}`);
    }
    async duplicateDeal(dealId, newTitle) {
        return this.post(`/deals/${dealId}/duplicate`, newTitle ? { title: newTitle } : {});
    }
    async searchDeals(params) {
        const queryParams = {
            term: params.term,
            exact_match: params.exact_match ? 1 : 0,
        };
        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(',');
        }
        return this.get('/deals/search', queryParams);
    }
    async getDealActivities(dealId) {
        return this.get(`/deals/${dealId}/activities`);
    }
    async getDealProducts(dealId) {
        return this.get(`/deals/${dealId}/products`);
    }
    async addProductToDeal(dealId, data) {
        return this.post(`/deals/${dealId}/products`, data);
    }
    // ==================== PERSON OPERATIONS ====================
    async getPerson(personId) {
        return this.get(`/persons/${personId}`);
    }
    async listPersons(params) {
        const { limit, ...queryParams } = params || {};
        if (limit && limit > 0) {
            const persons = await this.fetchAllPages('/persons', queryParams, limit);
            return { success: true, data: persons };
        }
        else {
            const persons = await this.fetchAllPages('/persons', queryParams);
            return { success: true, data: persons };
        }
    }
    async createPerson(data) {
        return this.post('/persons', data);
    }
    async updatePerson(personId, data) {
        return this.put(`/persons/${personId}`, data);
    }
    async deletePerson(personId) {
        return this.delete(`/persons/${personId}`);
    }
    async searchPersons(params) {
        const queryParams = {
            term: params.term,
            exact_match: params.exact_match ? 1 : 0,
        };
        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(',');
        }
        return this.get('/persons/search', queryParams);
    }
    async getPersonDeals(personId) {
        return this.get(`/persons/${personId}/deals`);
    }
    async getPersonActivities(personId) {
        return this.get(`/persons/${personId}/activities`);
    }
    // ==================== ORGANIZATION OPERATIONS ====================
    async getOrganization(orgId) {
        return this.get(`/organizations/${orgId}`);
    }
    async listOrganizations(params) {
        const { limit, ...queryParams } = params || {};
        if (limit && limit > 0) {
            const orgs = await this.fetchAllPages('/organizations', queryParams, limit);
            return { success: true, data: orgs };
        }
        else {
            const orgs = await this.fetchAllPages('/organizations', queryParams);
            return { success: true, data: orgs };
        }
    }
    async createOrganization(data) {
        return this.post('/organizations', data);
    }
    async updateOrganization(orgId, data) {
        return this.put(`/organizations/${orgId}`, data);
    }
    async deleteOrganization(orgId) {
        return this.delete(`/organizations/${orgId}`);
    }
    async searchOrganizations(params) {
        const queryParams = {
            term: params.term,
            exact_match: params.exact_match ? 1 : 0,
        };
        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(',');
        }
        return this.get('/organizations/search', queryParams);
    }
    async getOrganizationDeals(orgId) {
        return this.get(`/organizations/${orgId}/deals`);
    }
    async getOrganizationPersons(orgId) {
        return this.get(`/organizations/${orgId}/persons`);
    }
    async getOrganizationActivities(orgId) {
        return this.get(`/organizations/${orgId}/activities`);
    }
    // ==================== ACTIVITY OPERATIONS ====================
    async getActivity(activityId) {
        return this.get(`/activities/${activityId}`);
    }
    async listActivities(params) {
        const queryParams = {};
        if (params?.userId)
            queryParams.user_id = params.userId;
        if (params?.dealId)
            queryParams.deal_id = params.dealId;
        if (params?.personId)
            queryParams.person_id = params.personId;
        if (params?.orgId)
            queryParams.org_id = params.orgId;
        if (params?.type)
            queryParams.type = params.type;
        if (params?.startDate)
            queryParams.start_date = params.startDate;
        if (params?.endDate)
            queryParams.end_date = params.endDate;
        const { limit, ...restParams } = params || {};
        if (limit && limit > 0) {
            const activities = await this.fetchAllPages('/activities', { ...restParams, ...queryParams }, limit);
            return { success: true, data: activities };
        }
        else {
            const activities = await this.fetchAllPages('/activities', { ...restParams, ...queryParams });
            return { success: true, data: activities };
        }
    }
    async createActivity(data) {
        return this.post('/activities', data);
    }
    async updateActivity(activityId, data) {
        return this.put(`/activities/${activityId}`, data);
    }
    async deleteActivity(activityId) {
        return this.delete(`/activities/${activityId}`);
    }
    // ==================== NOTE OPERATIONS ====================
    async getNote(noteId) {
        return this.get(`/notes/${noteId}`);
    }
    async listNotes(params) {
        const queryParams = {};
        if (params?.dealId)
            queryParams.deal_id = params.dealId;
        if (params?.personId)
            queryParams.person_id = params.personId;
        if (params?.orgId)
            queryParams.org_id = params.orgId;
        const { limit, ...restParams } = params || {};
        if (limit && limit > 0) {
            const notes = await this.fetchAllPages('/notes', { ...restParams, ...queryParams }, limit);
            return { success: true, data: notes };
        }
        else {
            const notes = await this.fetchAllPages('/notes', { ...restParams, ...queryParams });
            return { success: true, data: notes };
        }
    }
    async createNote(data) {
        return this.post('/notes', data);
    }
    async updateNote(noteId, data) {
        return this.put(`/notes/${noteId}`, data);
    }
    async deleteNote(noteId) {
        return this.delete(`/notes/${noteId}`);
    }
    // ==================== PIPELINE OPERATIONS ====================
    async listPipelines() {
        return this.get('/pipelines');
    }
    async getPipeline(pipelineId) {
        return this.get(`/pipelines/${pipelineId}`);
    }
    async getPipelineStages(pipelineId) {
        return this.get(`/pipelines/${pipelineId}/stages`);
    }
    // ==================== STAGE OPERATIONS ====================
    async listStages(params) {
        const queryParams = {};
        if (params?.pipelineId)
            queryParams.pipeline_id = params.pipelineId;
        return this.get('/stages', queryParams);
    }
    async getStage(stageId) {
        return this.get(`/stages/${stageId}`);
    }
    async updateStage(stageId, data) {
        return this.put(`/stages/${stageId}`, data);
    }
    // ==================== PRODUCT OPERATIONS ====================
    async getProduct(productId) {
        return this.get(`/products/${productId}`);
    }
    async listProducts(params) {
        const { limit, ...queryParams } = params || {};
        if (limit && limit > 0) {
            const products = await this.fetchAllPages('/products', queryParams, limit);
            return { success: true, data: products };
        }
        else {
            const products = await this.fetchAllPages('/products', queryParams);
            return { success: true, data: products };
        }
    }
    async createProduct(data) {
        return this.post('/products', data);
    }
    async updateProduct(productId, data) {
        return this.put(`/products/${productId}`, data);
    }
    async deleteProduct(productId) {
        return this.delete(`/products/${productId}`);
    }
    async searchProducts(params) {
        const queryParams = {
            term: params.term,
            exact_match: params.exact_match ? 1 : 0,
        };
        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(',');
        }
        return this.get('/products/search', queryParams);
    }
    // ==================== LEAD OPERATIONS ====================
    async getLead(leadId) {
        return this.get(`/leads/${leadId}`);
    }
    async listLeads(params) {
        const queryParams = {};
        if (params?.personId)
            queryParams.person_id = params.personId;
        if (params?.organizationId)
            queryParams.organization_id = params.organizationId;
        if (params?.status)
            queryParams.status = params.status;
        const { limit, ...restParams } = params || {};
        if (limit && limit > 0) {
            const leads = await this.fetchAllPages('/leads', { ...restParams, ...queryParams }, limit);
            return { success: true, data: leads };
        }
        else {
            const leads = await this.fetchAllPages('/leads', { ...restParams, ...queryParams });
            return { success: true, data: leads };
        }
    }
    async createLead(data) {
        return this.post('/leads', data);
    }
    async updateLead(leadId, data) {
        return this.put(`/leads/${leadId}`, data);
    }
    async deleteLead(leadId) {
        return this.delete(`/leads/${leadId}`);
    }
    // ==================== FILE OPERATIONS ====================
    async listFiles(params) {
        const queryParams = {};
        if (params?.dealId)
            queryParams.deal_id = params.dealId;
        if (params?.personId)
            queryParams.person_id = params.personId;
        if (params?.orgId)
            queryParams.org_id = params.orgId;
        if (params?.activityId)
            queryParams.activity_id = params.activityId;
        return this.get('/files', queryParams);
    }
    async uploadFile(fileData, fileName, associations) {
        // Pipedrive file upload requires multipart/form-data
        const form = new form_data_1.default();
        // Add file
        if (typeof fileData === 'string') {
            // If it's a URL, download it first
            if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
                const fileResponse = await axios_1.default.get(fileData, { responseType: 'arraybuffer' });
                form.append('file', Buffer.from(fileResponse.data), fileName);
            }
            else {
                // Assume it's base64
                const base64Data = fileData.replace(/^data:.*,/, '');
                form.append('file', Buffer.from(base64Data, 'base64'), fileName);
            }
        }
        else {
            form.append('file', fileData, fileName);
        }
        // Add associations
        if (associations.dealId)
            form.append('deal_id', associations.dealId.toString());
        if (associations.personId)
            form.append('person_id', associations.personId.toString());
        if (associations.orgId)
            form.append('org_id', associations.orgId.toString());
        if (associations.activityId)
            form.append('activity_id', associations.activityId.toString());
        try {
            const response = await this.axiosInstance.post('/files', form, {
                headers: form.getHeaders(),
                params: { api_token: this.apiToken }
            });
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async downloadFile(fileId) {
        return this.get(`/files/${fileId}/download`);
    }
    async deleteFile(fileId) {
        return this.delete(`/files/${fileId}`);
    }
    // ==================== WEBHOOK OPERATIONS ====================
    async listWebhooks() {
        return this.get('/webhooks');
    }
    async createWebhook(data) {
        return this.post('/webhooks', data);
    }
    async deleteWebhook(webhookId) {
        return this.delete(`/webhooks/${webhookId}`);
    }
}
exports.PipedriveApiClient = PipedriveApiClient;
