import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function appendJsonToFile(
  filePath: string,
  data: any,
): Promise<void> {
  try {
    // Create directory if it does not exist
    await mkdir(dirname(filePath), { recursive: true });

    // Convert JSON object to string
    const json = JSON.stringify(data);

    if (json === undefined) {
      throw new Error('Invalid JSON data');
    }

    // Create file if not exists and append data
    await appendFile(filePath, `${json}\n`, {
      encoding: 'utf8',
    });
  } catch (error) {
    throw new Error(
      `Failed to append JSON to file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
