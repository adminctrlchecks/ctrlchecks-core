import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  getBinaryFileStorageRoot,
  readBinaryFileAsset,
  writeBinaryFileAsset,
} from './binary-file-service';

function createDbMock() {
  const rows: Record<string, any> = {};
  const insert = jest.fn(async (row: any) => {
    rows[row.id] = row;
    return { data: row, error: null };
  });
  const from = jest.fn((table: string) => {
    if (table !== 'workflow_file_assets') throw new Error(`unexpected table ${table}`);
    return {
      insert,
      select: jest.fn(() => ({
        eq: jest.fn((_field: string, value: string) => ({
          single: jest.fn(async () => ({ data: rows[value] || null, error: null })),
        })),
      })),
    };
  });
  return { db: { from }, insert, rows };
}

describe('binary-file-service', () => {
  let root: string;
  const previousRoot = process.env.BINARY_FILE_ROOT;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-binary-service-'));
    process.env.BINARY_FILE_ROOT = root;
  });

  afterEach(async () => {
    process.env.BINARY_FILE_ROOT = previousRoot;
    await fs.rm(root, { recursive: true, force: true });
  });

  it('writes base64 data as a managed asset and reads it back by assetId', async () => {
    const mock = createDbMock();

    const written = await writeBinaryFileAsset(
      {
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        dataBase64: Buffer.from('pdf bytes').toString('base64'),
        folder: 'reports',
      },
      {
        db: mock.db,
        workflowId: '11111111-1111-4111-8111-111111111111',
        userId: '22222222-2222-4222-8222-222222222222',
        nodeId: 'write-node',
      },
    );

    expect(written.success).toBe(true);
    expect(written.fileName).toBe('report.pdf');
    expect(written.mimeType).toBe('application/pdf');
    expect(written.metadataPersisted).toBe(true);
    expect(mock.insert).toHaveBeenCalledTimes(1);

    const read = await readBinaryFileAsset(
      { sourceType: 'assetId', assetId: written.assetId },
      { db: mock.db },
    );

    expect(Buffer.from(read.dataBase64, 'base64').toString('utf8')).toBe('pdf bytes');
    expect(read.fileName).toBe('report.pdf');
    expect(read.storageKey).toBe(written.storageKey);
  });

  it('accepts legacy content alias and data URLs', async () => {
    const written = await writeBinaryFileAsset({
      fileName: 'hello.txt',
      content: 'data:text/plain;base64,SGVsbG8=',
      persist: false,
    });

    expect(written.metadataPersisted).toBe(false);
    expect(written.mimeType).toBe('text/plain');
    expect(Buffer.from(written.dataBase64, 'base64').toString('utf8')).toBe('Hello');
  });

  it('blocks paths outside the configured binary storage root', async () => {
    await expect(
      readBinaryFileAsset({ sourceType: 'serverPath', filePath: '../outside.pdf' }),
    ).rejects.toThrow(/unsafe file path/);

    await expect(
      writeBinaryFileAsset({
        fileName: 'bad.pdf',
        filePath: '../outside.pdf',
        dataBase64: 'SGVsbG8=',
      }),
    ).rejects.toThrow(/unsafe file path/);
  });

  it('exposes the configured storage root for operators and tests', () => {
    expect(getBinaryFileStorageRoot()).toBe(path.resolve(root));
  });
});
