import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  let tmpPath: string | undefined;
  try {
    const { property, type, format } = await req.json();

    if (!property || !type) {
      return NextResponse.json({ error: 'Property data and type are required' }, { status: 400 });
    }

    if (!['placa', 'pdf'].includes(type)) {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }

    // Save JSON to a temporary file
    const tmpId = crypto.randomBytes(8).toString('hex');
    tmpPath = path.join(process.cwd(), 'public', 'generated', `tmp_${tmpId}.json`);
    await fs.mkdir(path.dirname(tmpPath), { recursive: true });
    await fs.writeFile(tmpPath, JSON.stringify(property), 'utf8');

    const scriptPath = path.join(process.cwd(), 'src', 'python', 'generator.py');
    const formatArg = format ? `--format ${format}` : '';

    console.log(`[Media Generator] type=${type} format=${format || 'default'}`);

    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}" --type ${type} ${formatArg} --datafile "${tmpPath}"`,
      { timeout: 60000 } // 60s timeout for downloads + rendering
    );

    if (stderr) {
      console.warn('Python stderr:', stderr);
    }

    try {
      const result = JSON.parse(stdout.trim());

      if (result.status === 'success') {
        return NextResponse.json({ url: result.file });
      } else {
        return NextResponse.json({ error: result.message || 'Error executing generator' }, { status: 500 });
      }
    } catch (parseError) {
      console.error('Failed to parse Python output:', stdout);
      return NextResponse.json({ error: 'Failed to process generator output' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Media Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    if (tmpPath) {
      try { await fs.unlink(tmpPath); } catch { /* ignore */ }
    }
  }
}
