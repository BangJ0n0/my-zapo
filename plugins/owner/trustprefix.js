// plugins/owner/trustprefix.js

import {
    addTrustedPrefixFeature,
    removeTrustedPrefixFeature,
    getTrustedPrefixFeatures
} from '../../db/group.js'

import { getCommandAliases } from '../../lib/utils.js'

export default {
    command: 'trustprefix',
    alias: ['trustpref', 'tprefix'],
    category: 'owner',
    description: `> Mengizinkan fitur tertentu digunakan tanpa prefix di grup ini, meskipun No-Prefix Mode sedang OFF.

*Keterangan Format:*
> \`<fitur>\` = nama fitur atau alias.
> \`-del <fitur>\` = hapus TrustPrefix.
> \`-list\` = lihat daftar fitur TrustPrefix.

contoh penggunaan:
> \`.trustprefix <fitur>\`
> \`.trustprefix -del <fitur>\`
> \`.trustprefix -list\`

Contoh:
> Jika \`play\` sudah di-TrustPrefix,
> maka \`play lagu\` bisa digunakan tanpa prefix.`,

    help: '<fitur>',
    onlyOwner: true,
    groupOnly: true,
    typing: true,

    async execute(m, { args }) {
        const flag = args[0]?.toLowerCase()

        if (flag === '-list') {
            const commands = getTrustedPrefixFeatures().get(m.chat)

            if (!commands?.size) {
                return m.reply(
                    'Belum ada fitur yang di-TrustPrefix di grup ini.'
                )
            }

            let text = '*📋 Fitur TrustPrefix di Grup Ini:*\n\n'

            for (const command of commands) {
                const aliases = getCommandAliases(command)

                text += `🔓 \`${command}\`\n`
                text += `alias: ${
                    aliases.length
                        ? '_' + aliases.join(', ') + '_'
                        : '-'
                }\n\n`
            }

            return m.reply(text.trim())
        }

        const name = (
            flag === '-del'
                ? args.slice(1).join(' ')
                : args.join(' ')
        ).trim()

        if (!name) {
            return m.reply(
                `Masukkan nama fitur atau aliasnya.\n` +
                `Contoh: \`${m.prefix}${m.command} play\``
            )
        }

        const plugin = global.plugins?.get(name.toLowerCase())

        if (!plugin) {
            return m.reply(
                `❌ Fitur \`${name}\` tidak ditemukan.`
            )
        }

        const command = plugin.command.toLowerCase()

        if (flag === '-del') {
            const removed = removeTrustedPrefixFeature(
                m.chat,
                command
            )

            return m.reply(
                removed
                    ? `✅ *TrustPrefix Berhasil Dihapus!*\n\n` +
                      `📌 *Grup:* \`${m.chat}\`\n` +
                      `🔧 *Fitur:* \`${command}\`\n\n` +
                      `Sekarang fitur ini kembali membutuhkan prefix.`
                    : `⚠️ Fitur \`${command}\` memang tidak ada di daftar TrustPrefix grup ini.`
            )
        }

        const added = addTrustedPrefixFeature(
            m.chat,
            command,
            m.sender
        )

        return m.reply(
            added
                ? `🔓 *TrustPrefix Berhasil!*\n\n` +
                  `📌 *Grup:* \`${m.chat}\`\n` +
                  `🔧 *Fitur:* \`${command}\`\n\n` +
                  `Sekarang fitur ini bisa digunakan tanpa prefix di grup ini, meskipun No-Prefix Mode sedang OFF.`
                : `⚠️ Fitur \`${command}\` sudah di-TrustPrefix di grup ini.`
        )
    }
}