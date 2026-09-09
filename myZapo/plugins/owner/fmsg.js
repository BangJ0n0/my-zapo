import { delay } from 'zapo-js';

const FAKE_EDIT = 14;

export default {
    command: 'fmsg',
    category: 'core',
    description: 'fake edit pesan yang di reply (khusus group)',
    onlyOwner: true,
    
    async execute(m, context) {
        // Mengambil sock dan args dari context sesuai dokumentasi README
        const { sock, args } = context;
        
        // Memanfaatkan properti bawaan dari object pesan 'm'
        const jid = m.chat;
        const q = m.quoted;
        const text = args.join(' ');

        // Pengecekan awal
        if (!q) return await m.reply('reply pesan yang mau di fake edit :v');
        if (!text) return await m.reply('masukkan teksnya');
        
        // Memakai properti bawaan m.isGroup sesuai README untuk pengecekan grup
        if (!m.isGroup) return await m.reply('khusus group');

        const stanzaId = q.key?.id || q.id;
        if (!stanzaId) return await m.reply('gagal dapetin id pesan');

        try {
            // Mengirim pesan menggunakan sock.message.send sesuai standar API dasar
            const temp = await sock.message.send(jid, {
                extendedTextMessage: {
                    text: '',
                    contextInfo: { isGroupStatus: true }
                }
            }, { quote: m });
            
            const tempId = temp?.key?.id || temp?.id;

            const edit = await sock.message.send(jid, {
                protocolMessage: {
                    key: {
                        remoteJid: jid,
                        fromMe: true,
                        id: tempId
                    },
                    type: FAKE_EDIT,
                    editedMessage: {
                        extendedTextMessage: {
                            text,
                            contextInfo: { isGroupStatus: false }
                        }
                    }
                }
            }, { id: stanzaId });
            
            const tempId2 = edit?.key?.id || edit?.id;

            await delay(100);

            await Promise.allSettled([
                sock.message.send(jid, {
                    type: 'revoke',
                    target: { id: tempId, fromMe: true }
                }),
                sock.message.send(jid, {
                    type: 'revoke',
                    target: { id: tempId2, fromMe: true }
                })
            ]);
        } catch (e) {
            return await m.reply(`gagal fakemsg ${e?.message ?? e}`);
        }
    }
};
