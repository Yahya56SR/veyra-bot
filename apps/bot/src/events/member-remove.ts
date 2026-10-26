import { BRAND } from '@veyra/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';
import { onMemberLeave } from '../modules/welcome/service.js';

export const guildMemberRemoveEvent: BotEvent = {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    const config = await client.getConfig(member.guild.id);
    client.stats?.recordLeave(member.guild.id);

    if (!isLogIgnored(config.logging, null, member.id)) {
      const avatar = member.user?.displayAvatarURL({ size: 128 });
      const embed = logEmbed('Member left', BRAND.danger).addFields(
        {
          name: 'Member',
          value: `${member.user?.username ?? 'Unknown'} \`${member.id}\``,
          inline: true,
        },
        {
          name: 'Joined',
          value: member.joinedAt
            ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`
            : 'Unknown',
          inline: true,
        },
        { name: 'Roles', value: String(member.roles?.cache.size ?? 0), inline: true },
      );

      if (avatar) embed.setThumbnail(avatar);

      await sendLog(client, member.guild.id, 'memberLeave', embed, config);
    }

    await onMemberLeave(client, member);
  },
};
