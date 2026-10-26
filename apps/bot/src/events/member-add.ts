import { BRAND } from '@veyra/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';
import { onMemberJoin } from '../modules/welcome/service.js';

export const guildMemberAddEvent: BotEvent = {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    const config = await client.getConfig(member.guild.id);
    client.stats?.recordJoin(member.guild.id);

    if (!isLogIgnored(config.logging, null, member.id)) {
      const embed = logEmbed('Member joined', BRAND.success)
        .setThumbnail(member.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: 'Member', value: `${member} \`${member.id}\``, inline: true },
          {
            name: 'Account created',
            value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>`,
            inline: true,
          },
          { name: 'Member count', value: String(member.guild.memberCount), inline: true },
        );

      await sendLog(client, member.guild.id, 'memberJoin', embed, config);
    }

    const handled = (await client.automod?.handleJoin(member)) ?? false;
    if (handled) return;

    await onMemberJoin(client, member);
  },
};
