// plugins/owner/delfile.js

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Asumsi path root adalah 2 tingkat di atas folder plugins/owner/
const ROOT_DIR = path.join(__dirname, '..', '..')

export default {
  command: 'delfile',
  alias: ['deletefile', 'rmfile', 'hapusfile'],
  category: 'owner',
  description: `> Menghapus file atau folder dari server bot.

*Keterangan Format:*
> \`<path_ke_file>\` = Lokasi file atau folder yang ingin dihapus.

contoh penggunaan:
> \`.delfile plugins/owner/addfile.js\`
> \`.delfile tmp/sampah.jpg\``,
  help: '<path_ke_file>',
  onlyOwner: true,

  async execute(m, { args }) {
    if (!args[0]) {
      return m.reply(
        `Masukkan path atau nama file yang ingin dihapus!\n\n` +
        `*Contoh:*\n` +
        `• ${m.prefix}${m.command} plugins/owner/test.js\n` +
        `• ${m.prefix}${m.command} tmp/gambar.jpg`
      )
    }

    // Menggabungkan argumen jika ada spasi pada nama file/folder
    const targetPath = args.join(' ')
    const fullPath = path.resolve(ROOT_DIR, targetPath)

    // Keamanan: Mencegah penghapusan di luar folder root bot (misal: ../../../etc/passwd)
    if (!fullPath.startsWith(ROOT_DIR)) {
      return m.reply('❌ Tidak diizinkan menghapus file di luar direktori utama bot.')
    }

    try {
      // Cek apakah file/folder eksis
      if (!fs.existsSync(fullPath)) {
        return m.reply(`❌ File atau folder tidak ditemukan di:\n\`${targetPath}\``)
      }

      // Ambil informasi status file
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Hapus folder dan seluruh isinya
        fs.rmSync(fullPath, { recursive: true, force: true })
        return m.reply(`🗑️ *Berhasil Menghapus Folder*\n\n\`Target:\` ${targetPath}`)
      } else {
        // Hapus file tunggal
        fs.unlinkSync(fullPath)
        return m.reply(`🗑️ *Berhasil Menghapus File*\n\n\`Target:\` ${targetPath}`)
      }

    } catch (err) {
      console.error(`[DELFILE] Error menghapus ${targetPath}:`, err.message)
      await m.reply(`❌ *Gagal menghapus file/folder!*\n\n\`Pesan:\` ${err.message}`)
    }
  }
}