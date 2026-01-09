const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();

// Render需要HTTP服务器
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord Bot is running!');
});

app.listen(PORT, () => {
    console.log(`HTTP服务器运行在端口 ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// 管理的身份组ID集合
const managedRoleIds = new Set([
    '1458371609642401843', // 红桃K
    '1458371855164510260', // 红桃J
    '1458372485740236873', // 红桃Q
    '1458372914771525734', // 红桃A
    '1458373189515218997', // 红桃7
    '1458373488279683093'  // 黑桃♠
]);

// 按钮配置
const buttons = [
    { name: '红桃K', roleId: '1458371609642401843', customId: 'role_1', channelId: '1447586495899631799', minReactions: 5 },
    { name: '红桃J', roleId: '1458371855164510260', customId: 'role_2', channelId: '1451436047090188429', minReactions: 5 },
    { name: '红桃Q', roleId: '1458372485740236873', customId: 'role_3', channelId: '1451435615877861437', minReactions: 5 },
    { name: '红桃A', roleId: '1458372914771525734', customId: 'role_4', channelId: '1451496615712919593', minReactions: 5 },
    { name: '红桃7', roleId: '1458373189515218997', customId: 'role_5', channelId: '1451434539430707221', minReactions: 5 },
    { name: '黑桃♠', roleId: '1458373488279683093', customId: 'role_6', channelId: '1451440604537032734', minReactions: 10 }
];

const channelId = '1451475403834261554';

client.once('ready', async () => {
    console.log(`已登录为 ${client.user.tag}`);
    
    // 注册斜杠命令
    try {
        await client.application.commands.create({
            name: 'switch',
            description: '切换显示的身份组'
        });
        console.log('斜杠命令已注册！');
    } catch (error) {
        console.error('注册斜杠命令时出错：', error);
    }
    
    try {
        const channel = await client.channels.fetch(channelId);
        
        if (!channel || !channel.isTextBased()) {
            console.error('无法找到指定的频道或频道不是文本频道');
            return;
        }

        // 创建按钮行（Discord限制每行5个按钮）
        const row1 = new ActionRowBuilder();
        const row2 = new ActionRowBuilder();

        // 添加前5个按钮到第一行
        buttons.slice(0, 5).forEach(btn => {
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId(btn.customId)
                    .setLabel(btn.name)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        // 添加第6个按钮到第二行
        if (buttons.length > 5) {
            row2.addComponents(
                new ButtonBuilder()
                    .setCustomId(buttons[5].customId)
                    .setLabel(buttons[5].name)
                    .setStyle(ButtonStyle.Primary)
            );
        }

        // 发送消息
        await channel.send({
            content: '亲爱的创作者，请详细阅读规则＆导航处各个身份组的申请要求，点击下方对应身份组按钮来获取身份哦。',
            components: [row1, row2]
        });

        console.log('消息已成功发送到频道！');
    } catch (error) {
        console.error('发送消息时出错：', error);
    }
});

// 处理按钮交互
client.on('interactionCreate', async interaction => {
    // 处理斜杠命令
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'switch') {
            try {
                const member = interaction.member;
                
                // 查找用户拥有的管理身份组
                const userManagedRoles = [];
                for (const btn of buttons) {
                    if (member.roles.cache.has(btn.roleId)) {
                        userManagedRoles.push(btn);
                    }
                }
                
                if (userManagedRoles.length === 0) {
                    await interaction.reply({
                        content: '您还没有获得任何可切换的身份组。',
                        ephemeral: true
                    });
                    return;
                }
                
                // 创建切换按钮
                const rows = [];
                let currentRow = new ActionRowBuilder();
                
                userManagedRoles.forEach((btn, index) => {
                    currentRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`switch_${btn.customId}`)
                            .setLabel(btn.name)
                            .setStyle(ButtonStyle.Secondary)
                    );
                    
                    // 每行最多5个按钮
                    if ((index + 1) % 5 === 0 || index === userManagedRoles.length - 1) {
                        rows.push(currentRow);
                        currentRow = new ActionRowBuilder();
                    }
                });
                
                await interaction.reply({
                    content: '芭比衣橱闪亮登场，请选择要佩戴的身份组',
                    components: rows,
                    ephemeral: true
                });
            } catch (error) {
                console.error('处理switch命令时出错：', error);
                await interaction.reply({
                    content: '处理命令时发生错误，请稍后再试。',
                    ephemeral: true
                });
            }
        }
        return;
    }
    
    // 处理按钮点击
    if (interaction.isButton()) {
        // 处理身份组切换按钮
        if (interaction.customId.startsWith('switch_')) {
            try {
                const originalCustomId = interaction.customId.replace('switch_', '');
                const buttonConfig = buttons.find(btn => btn.customId === originalCustomId);
                
                if (!buttonConfig) return;
                
                const member = interaction.member;
                const targetRoleId = buttonConfig.roleId;
                
                // 检查用户是否拥有该身份组
                if (!member.roles.cache.has(targetRoleId)) {
                    await interaction.reply({
                        content: '您没有该身份组，无法切换。',
                        ephemeral: true
                    });
                    return;
                }
                
                // 获取目标身份组对象
                const targetRole = interaction.guild.roles.cache.get(targetRoleId);
                if (!targetRole) {
                    await interaction.reply({
                        content: '错误：找不到该身份组。',
                        ephemeral: true
                    });
                    return;
                }
                
                // 先移除该身份组，再添加回来，这样会将其置于顶层
                await member.roles.remove(targetRoleId);
                await member.roles.add(targetRoleId);
                
                // 等待一小段时间确保角色顺序更新
                await new Promise(resolve => setTimeout(resolve, 500));
                
                await interaction.reply({
                    content: `已切换到 ${buttonConfig.name} 身份组！`,
                    ephemeral: true
                });
                
                console.log(`用户 ${member.user.tag} 切换到身份组 ${buttonConfig.name}`);
            } catch (error) {
                console.error('切换身份组时出错：', error);
                await interaction.reply({
                    content: '切换身份组时发生错误，请联系管理员。',
                    ephemeral: true
                });
            }
            return;
        }
        
        // 处理申请身份组按钮
        const buttonConfig = buttons.find(btn => btn.customId === interaction.customId);
        
        if (!buttonConfig) return;

        try {
            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(buttonConfig.roleId);

            if (!role) {
                await interaction.reply({
                    content: '错误：找不到对应的身份组。',
                    ephemeral: true
                });
                return;
            }

            // 检查用户是否已有该身份组
            if (member.roles.cache.has(buttonConfig.roleId)) {
                await interaction.reply({
                    content: `您已经拥有 ${buttonConfig.name} 身份组了。`,
                    ephemeral: true
                });
                return;
            }

            // 创建模态框让用户输入帖子ID
            const modal = new ModalBuilder()
                .setCustomId(`modal_${buttonConfig.customId}`)
                .setTitle(`申请 ${buttonConfig.name} 身份组`);

            const postIdInput = new TextInputBuilder()
                .setCustomId('postId')
                .setLabel('请填入对应频道您用于申请身份组的帖子ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('请输入帖子ID')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(postIdInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } catch (error) {
            console.error('显示模态框时出错：', error);
        }
    }
    
    // 处理模态框提交
    if (interaction.isModalSubmit()) {
        const customId = interaction.customId.replace('modal_', '');
        const buttonConfig = buttons.find(btn => btn.customId === customId);
        
        if (!buttonConfig) return;

        const postId = interaction.fields.getTextInputValue('postId');
        
        try {
            // 延迟回复，因为验证可能需要时间
            await interaction.deferReply({ ephemeral: true });

            // 验证帖子
            const isValid = await verifyPost(interaction.guild, postId, buttonConfig, interaction.user.id);
            
            if (!isValid) {
                await interaction.editReply({
                    content: '很遗憾！您未满足相应要求。'
                });
                return;
            }

            // 验证通过，分配身份组
            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(buttonConfig.roleId);
            
            if (!role) {
                await interaction.editReply({
                    content: '错误：找不到对应的身份组。'
                });
                return;
            }

            await member.roles.add(role);
            
            await interaction.editReply({
                content: `恭喜您！获得 ${buttonConfig.name} 身份组。`
            });

            console.log(`已为用户 ${member.user.tag} 分配身份组 ${buttonConfig.name}`);
        } catch (error) {
            console.error('验证帖子或分配身份组时出错：', error);
            await interaction.editReply({
                content: '验证过程中发生错误，请联系管理员。'
            });
        }
    }
});

// 验证帖子函数
async function verifyPost(guild, postId, buttonConfig, userId) {
    try {
        // 获取频道
        const channel = await guild.channels.fetch(buttonConfig.channelId);
        
        if (!channel) {
            console.error(`找不到频道 ${buttonConfig.channelId}`);
            return false;
        }

        // 获取帖子（消息）
        let post;
        try {
            // 如果是论坛频道，尝试作为线程获取
            if (channel.isThread() || channel.type === 15) { // 15 是 GUILD_FORUM
                const threads = await channel.threads.fetch();
                post = threads.threads.get(postId);
                if (post) {
                    // 获取线程的起始消息
                    const starterMessage = await post.fetchStarterMessage();
                    if (!starterMessage) return false;
                    post = starterMessage;
                }
            } else {
                // 普通频道，直接获取消息
                post = await channel.messages.fetch(postId);
            }
        } catch (err) {
            // 尝试作为线程ID直接获取
            try {
                const thread = await guild.channels.fetch(postId);
                if (thread && thread.isThread()) {
                    const starterMessage = await thread.fetchStarterMessage();
                    if (!starterMessage) return false;
                    post = starterMessage;
                    
                    // 验证线程是否在正确的父频道下
                    if (thread.parentId !== buttonConfig.channelId) {
                        console.log(`帖子不在正确的频道内`);
                        return false;
                    }
                }
            } catch (threadErr) {
                console.error('获取帖子失败：', err, threadErr);
                return false;
            }
        }

        if (!post) {
            console.log('找不到指定的帖子');
            return false;
        }

        // 验证帖子作者
        if (post.author.id !== userId) {
            console.log('帖子作者不匹配');
            return false;
        }

        // 统计反应总数
        let totalReactions = 0;
        if (post.reactions && post.reactions.cache.size > 0) {
            for (const reaction of post.reactions.cache.values()) {
                totalReactions += reaction.count;
            }
        }

        console.log(`帖子反应数：${totalReactions}，要求：${buttonConfig.minReactions}`);
        
        // 验证反应数
        if (totalReactions < buttonConfig.minReactions) {
            console.log('反应数不足');
            return false;
        }

        return true;
    } catch (error) {
        console.error('验证帖子时出错：', error);
        return false;
    }
}

// 登录
client.login(process.env.DISCORD_BOT_TOKEN);
