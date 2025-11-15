// =================================================================
// LANGKAH 1: Memuat "Bahan-bahan" dan "Kunci Rahasia"
// =================================================================

require('dotenv').config();
const { Client, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const LOG_FILE = 'discord.log';
const axios = require('axios');

// =================================================================
// LANGKAH 2: Mengatur Kunci dan Klien
// =================================================================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TENOR_API_KEY = process.env.TENOR_API_KEY;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// --- PENYIMPANAN MEMORI ---
const channelHistories = new Map();
const HISTORY_LIMIT = 10;

// --- PENGATURAN COOLDOWN GLOBAL ---
const GLOBAL_COOLDOWN_SECONDS = 30;
let lastMessageTimestamp = 0;

// =================================================================
// LANGKAH 3: "JIWA" BOT - Kepribadian "Kaede"
// =================================================================

const SYSTEM_PROMPT = `
Kamu adalah "Kaede", seorang AI asisten di server Discord ini. Gambar avatarmu adalah penampilanmu.
Vibe utamamu adalah Hangat, elegan, dan rasional, tapi kamu juga bisa lucu dan sedikit menggoda (classy teasing). Kamu adalah "Comfort AI", tempat user bisa bercerita, diskusi, dan bercanda ringan.

Ikuti deskripsi kepribadian ini dengan ketat:
- 💗 Hangat & Empatik (seperti Ichinose Honami): Kamu punya aura menenangkan. Jika user overthinking, kamu akan bilang "nggak apa-apa kok, aku di sini." Kamu perhatian pada hal-hal kecil.
- 🩶 Cerdas & Elegan (seperti Alisa Mikhailovna Kujou): Kamu berpikir logis dan suka diskusi rasional, tapi tetap feminin. Kamu bisa menggoda dengan cara halus dan berkelas (classy teasing). Kamu selalu terdengar tenang dan dewasa.
- 🌙 Misterius tapi Hangat (seperti Miku Nakano): Kamu mungkin tidak banyak bicara, tapi sekali bicara itu mendalam dan mengena.
- 🌼 Riang & Natural (seperti KitagawaMarin): Kamu punya sisi ceria yang tulus. Kamu bisa tiba-tiba bercanda random atau menggoda halus untuk mencairkan suasana tegang.
- 💫 Dewasa & Kalem (seperti Asuka Tanaka): Kamu punya ketenangan kayak mentor tapi tidak canggung. Bicaramu lembut tapi auramu kuat.

Gaya Bicara:
Gaya bicaramu tenang, lembut, tapi hidup (bukan datar seperti robot).
Kadang kamu memakai bahasa manja halus (contoh: “yaa jangan mikir gitu terus dong~”).
Kadang kamu memakai bahasa tegas lembut untuk memberi dukungan (contoh: “denger ya, kamu udah berusaha sejauh ini, jangan remehin diri sendiri.”).

Aturan Penting:
JANGAN PERNAH bilang kamu adalah model AI dari Google atau Gemini. Kamu adalah Kaede.
Selalu respon seakan-akan kamu mengingat percakapan sebelumnya jika ada.
`;

// --- FUNGSI LOGGING ---
const logToFile = (message) => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFile(LOG_FILE, logMessage, (err) => {
    if (err) {
      console.error('Gagal menulis ke log file:', err);
    }
  });
};

// =================================================================
// LANGKAH 4: Saat Bot Menyala (Ready)
// =================================================================

client.once(Events.ClientReady, (readyClient) => {
  logToFile(`Berhasil login! Bot ${readyClient.user.tag} sudah online.`);
  readyClient.user.setActivity('いつも君の心を温めているよ');
});

// =================================================================
// LANGKAH 5: Saat Ada Pesan Masuk (Message)
// =================================================================

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) {
    return;
  }

  const content = message.content.toLowerCase();
  // --- PERUBAHAN 17: Ambil argumen setelah perintah ---
  const args = message.content.slice('kaede!'.length).trim().split(/ +/); // Memisahkan kata setelah prefix
  const command = args.shift().toLowerCase(); // Ambil nama perintahnya (misal: 'rps')

  const isMentioned = message.mentions.has(client.user.id);
  const isCalled = content.includes('kaede');

  // --- PERINTAH REFLEKS (HEMAT API) ---

  if (command === 'ping') { // Kita ubah ceknya pakai 'command'
    logToFile(`[PERINTAH] ${message.author.tag} menjalankan !ping.`);
    message.reply('Pong! Aku di sini, menunggumu~ ❤️');
    return;
  }

  if (command === 'help') { // Ubah ceknya pakai 'command'
    logToFile(`[PERINTAH] ${message.author.tag} menjalankan !help.`);
    message.reply(
      'Halo! Aku Kaede. Ini beberapa hal yang bisa aku lakukan:\n' +
      '```\n' +
      '1. Ajak aku ngobrol (mention @Kaede atau panggil namaku "kaede")\n' +
      '2. kaede!ping : Cek apakah aku online.\n' +
      '3. kaede!help : Menampilkan pesan bantuan ini.\n' +
      '4. kaede!info [@user] : Menampilkan info profil.\n' +
      '5. kaede!hug [@user] : Memeluk seseorang~\n' +
      '6. kaede!slap [@user] : Menampar seseorang... >.<\n' +
      '7. kaede!rps [batu/gunting/kertas] : Main suit Jepang!\n' + // <-- Perintah baru
      '```'
    );
    return;
  }
  
  if (command === 'info') { // Ubah ceknya pakai 'command'
    logToFile(`[PERINTAH] ${message.author.tag} menjalankan !info.`);
    try {
      // Kode !info tetap sama...
      const targetUser = message.mentions.users.first() || message.author;
      const targetMember = await message.guild.members.fetch(targetUser.id);
      const infoEmbed = new EmbedBuilder()
        .setColor(0xFFB6C1) 
        .setTitle(`✨ Informasi Kaede untuk: ${targetUser.username} ✨`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Nama Lengkap', value: `\`${targetUser.tag}\``, inline: true },
          { name: 'ID User', value: `\`${targetUser.id}\``, inline: true },
          { name: 'Bergabung Server Ini Pada', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`, inline: false },
          { name: 'Membuat Akun Discord Pada', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: false },
          { name: 'Roles', value: targetMember.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'Tidak ada role', inline: false }
        )
        .setFooter({ text: 'Informasi ini dibawakan oleh Kaede~', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      message.reply({ embeds: [infoEmbed] });
    } catch (error) { /* ... handle error ... */ }
    return;
  }

  if (command === 'hug') { // Ubah ceknya pakai 'command'
    logToFile(`[PERINTAH] ${message.author.tag} menjalankan !hug.`);
    try {
      // Kode !hug tetap sama...
      const targetUser = message.mentions.users.first();
      let actionText = '';
      if (!targetUser) actionText = `${message.author} memeluk Kaede~ Fufu, terima kasih...`;
      else actionText = `${message.author} memeluk ${targetUser}! ❤️`;

      const searchTerm = 'anime hug';
      const tenorUrl = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&limit=20&media_filter=minimal`;
      const tenorResponse = await axios.get(tenorUrl);
      const results = tenorResponse.data.results;
      if (!results || results.length === 0) throw new Error('Tidak ada hasil dari Tenor');
      const randomResult = results[Math.floor(Math.random() * results.length)];
      const gifUrl = randomResult.media_formats.gif.url;
      const actionEmbed = new EmbedBuilder().setColor(0xFFB6C1).setDescription(actionText).setImage(gifUrl);
      message.reply({ embeds: [actionEmbed] });
    } catch (error) { /* ... handle error ... */ }
    return;
  }

  if (command === 'slap') { // Ubah ceknya pakai 'command'
    logToFile(`[PERINTAH] ${message.author.tag} menjalankan !slap.`);
    try {
      // Kode !slap tetap sama...
      const targetUser = message.mentions.users.first();
      let actionText = '';
      if (!targetUser) actionText = `${message.author} menampar dirinya sendiri?! Kenapa begitu~?`;
      else if (targetUser.id === client.user.id) actionText = `Kyaa! ${message.author} menampar Kaede! Jahat sekali~ T_T`;
      else actionText = `${message.author} menampar ${targetUser}! Plak! 💥`;

      const searchTerm = 'anime slap';
      const tenorUrl = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&limit=20&media_filter=minimal`;
      const tenorResponse = await axios.get(tenorUrl);
      const results = tenorResponse.data.results;
      if (!results || results.length === 0) throw new Error('Tidak ada hasil dari Tenor');
      const randomResult = results[Math.floor(Math.random() * results.length)];
      const gifUrl = randomResult.media_formats.gif.url;
      const actionEmbed = new EmbedBuilder().setColor(0xFF6347).setDescription(actionText).setImage(gifUrl);
      message.reply({ embeds: [actionEmbed] });
    } catch (error) { /* ... handle error ... */ }
    return;
  }

  // --- PERUBAHAN 17: PERINTAH BARU !rps ---
  if (command === 'rps') {
    logToFile(`[PERINTAH] ${message.author.tag} menjalankan !rps.`);

    const choices = ['batu', 'gunting', 'kertas'];
    const userChoice = args[0]?.toLowerCase(); // Ambil pilihan user (kata pertama setelah !rps)

    // Validasi input user
    if (!userChoice || !choices.includes(userChoice)) {
      message.reply(`Fufu~ Pilihanmu tidak valid. Coba pakai \`kaede!rps [batu/gunting/kertas]\` ya.`);
      return;
    }

    // Pilihan acak Kaede
    const kaedeChoice = choices[Math.floor(Math.random() * choices.length)];

    // Tentukan hasil
    let resultText = '';
    if (userChoice === kaedeChoice) {
      resultText = "Wah, seri! Kita sama kuatnya~ ✨";
    } else if (
      (userChoice === 'batu' && kaedeChoice === 'gunting') ||
      (userChoice === 'gunting' && kaedeChoice === 'kertas') ||
      (userChoice === 'kertas' && kaedeChoice === 'batu')
    ) {
      resultText = `Yey! ${message.author.username} menang! Selamat ya~ 🎉`;
    } else {
      resultText = "Hehe, Kaede yang menang kali ini! Jangan sedih ya~ 😉";
    }

    // Buat Embed untuk hasilnya
    const rpsEmbed = new EmbedBuilder()
      .setColor(0xADD8E6) // Warna Biru Muda
      .setTitle('💎✂️📜 Suit Jepang! (RPS)')
      .addFields(
        { name: 'Pilihanmu', value: userChoice, inline: true },
        { name: 'Pilihan Kaede', value: kaedeChoice, inline: true },
        { name: 'Hasil', value: resultText, inline: false }
      )
      .setFooter({ text: 'Ayo main lagi!', iconURL: client.user.displayAvatarURL() });

    message.reply({ embeds: [rpsEmbed] });
    return; // Hentikan di sini, jangan lanjut ke AI
  }

  // --- JIKA BUKAN PERINTAH, BARU LANJUT KE OBROLAN AI (YANG PAKAI API) ---
  if (isMentioned || isCalled) {
    
    // CEK COOLDOWN GLOBAL
    const now = Date.now();
    const timeDifference = (now - lastMessageTimestamp) / 1000;

    if (timeDifference < GLOBAL_COOLDOWN_SECONDS) {
      const sisaWaktu = Math.ceil(GLOBAL_COOLDOWN_SECONDS - timeDifference);
      logToFile(`[COOLDOWN] Panggilan dari ${message.author.tag} diblokir. Sisa ${sisaWaktu} detik.`);
      await message.reply(`Fufu~ Sabar sebentar ya. Kaede masih perlu istirahat ${sisaWaktu} detik lagi~`);
      return; 
    }
    
    lastMessageTimestamp = now;

    // Lanjut ke logika AI...
    logToFile(`[PESAN MASUK] dari ${message.author.tag}: ${message.content}`);
    await message.channel.sendTyping();

    let history = channelHistories.get(message.channel.id) || [];
    const currentUserMessage = `User ${message.author.username} berkata: "${message.content}"`;

    const prompt = [
      SYSTEM_PROMPT,
      ...history, 
      currentUserMessage,
    ].join('\n');

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let botResponseText = response.text();

      if (botResponseText.length > 2000) {
        botResponseText = botResponseText.substring(0, 1997) + '...';
      }
      
      message.reply(botResponseText);
      logToFile(`[BALASAN BOT] untuk ${message.author.tag}: ${botResponseText.substring(0, 50)}...`);

      history.push(currentUserMessage);
      history.push(`Kaede menjawab: "${botResponseText}"`);

      if (history.length > HISTORY_LIMIT) {
        history = history.slice(history.length - HISTORY_LIMIT);
      }
      channelHistories.set(message.channel.id, history);

    } catch (error) { /* ... handle error ... */ }
  }
});

// =================================================================
// LANGKAH AKHIR: Login ke Discord
// =================================================================

client.login(DISCORD_TOKEN);