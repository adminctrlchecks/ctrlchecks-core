"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectCursorPages = collectCursorPages;
async function collectCursorPages(fetchPage, returnAll = false) {
    const first = await fetchPage();
    if (!returnAll) {
        return { items: first.data || [], paging: first.paging };
    }
    const items = [...(first.data || [])];
    let after = first.paging?.cursors?.after;
    let paging = first.paging;
    while (after) {
        const page = await fetchPage(after);
        items.push(...(page.data || []));
        paging = page.paging;
        after = page.paging?.cursors?.after;
    }
    return { items, paging };
}
