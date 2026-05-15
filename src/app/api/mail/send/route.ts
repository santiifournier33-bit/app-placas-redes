import { NextResponse } from 'next/server';
import { getSmtpClient, getImapClient, findMailboxPath } from '@/lib/mail/client';

export async function POST(req: Request) {
  try {
    const { user, pass, to, cc, bcc, subject, text, html, attachments, senderName } = await req.json();
    if (!to || !subject) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });

    const transporter = getSmtpClient({ user, pass });
    
    // Preparar adjuntos si vienen en base64
    const formattedAttachments = attachments?.map((att: any) => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
      contentType: att.contentType
    }));

    const lowerEmail = user.toLowerCase();
    
    // Si no enviaron senderName, creamos un fallback usando el prefijo del correo
    const formattedName = senderName || lowerEmail
      .split('@')[0]
      .split('.')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const mailOptions = {
      from: { name: formattedName, address: user },
      to,
      cc,
      bcc,
      subject,
      text,
      html: html || text,
      attachments: formattedAttachments
    };

    const info = await transporter.sendMail(mailOptions);

    // Guardar copia en la carpeta Enviados vía IMAP
    try {
      const nodemailer = await import('nodemailer');
      
      // Recreate the message as raw RFC822 using streamTransport
      const streamTransport = nodemailer.default.createTransport({ streamTransport: true, newline: 'unix' });
      const rawInfo = await streamTransport.sendMail(mailOptions);
      const chunks: Buffer[] = [];
      for await (const chunk of rawInfo.message) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const rawSource = Buffer.concat(chunks);

      const imapClient = await getImapClient({ user, pass });
      const sentPath = await findMailboxPath(imapClient, 'Sent');
      await imapClient.append(sentPath, rawSource, ['\\Seen']);
      await imapClient.logout();
    } catch (appendErr: any) {
      console.warn('Could not save to Sent folder:', appendErr.message);
    }

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Mail send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
