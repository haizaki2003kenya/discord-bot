require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Temp Voice 房間資料
const tempChannels = new Map();

// 建立器頻道ID
const joinChannelId = "1502735120241791149";

// Bot 上線
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // 掃描已存在的 Temp VC
  for (const guild of client.guilds.cache.values()) {
    const channels = await guild.channels.fetch();

    channels.forEach((channel) => {
      if (
        channel &&
        channel.type === ChannelType.GuildVoice &&
        channel.name.startsWith("VC-")
      ) {
        tempChannels.set(channel.id, {
          owner: null,
        });
      }
    });
  }

  console.log(`Loaded ${tempChannels.size} temp channels.`);
});

// 測試指令
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "ping") {
    await message.reply("pong");
  }
});

// Temp Voice 系統
client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const guild = newState.guild;
    const member = newState.member;

    if (!guild || !member) return;

    // Bot 權限檢查
    const botMember = guild.members.me;

    if (
      !botMember.permissions.has(
        PermissionsBitField.Flags.MoveMembers
      )
    ) {
      console.log("Bot missing MoveMembers permission.");
      return;
    }

    // 進入建立器
    if (newState.channelId === joinChannelId) {
      const categoryId = newState.channel.parentId;

      const tempVC = await guild.channels.create({
        name: `VC-${member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: categoryId || undefined,

        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MoveMembers,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.DeafenMembers,
            ],
          },
          {
            id: guild.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
            ],
          },
        ],
      });

      tempChannels.set(tempVC.id, {
        owner: member.id,
        locked: false,
        limit: 0,
      });

      await newState.setChannel(tempVC);

      console.log(
        `${member.user.tag} created ${tempVC.name}`
      );
    }

    // 離開 Temp VC
    if (
      oldState.channelId &&
      tempChannels.has(oldState.channelId)
    ) {
      setTimeout(async () => {
        try {
          const channel = guild.channels.cache.get(
            oldState.channelId
          );

          if (!channel) return;

          if (channel.members.size === 0) {
            await channel.delete();
            tempChannels.delete(channel.id);

            console.log(
              `Deleted empty channel: ${channel.name}`
            );
          }
        } catch (error) {
          console.error(error);
        }
      }, 1000);
    }
  } catch (error) {
    console.error(error);
  }
});


console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);
client.login(process.env.TOKEN);

