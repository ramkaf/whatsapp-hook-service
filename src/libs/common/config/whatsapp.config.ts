export const whatsappConfiguration = () => ({
  monitoredGroupJids: ['120363430140113232@g.us'],
  // (process.env.WHATSAPP_MONITORED_GROUP_JIDS ?? '*')
  //   .split(',')
  //   .map((jid) => jid.trim())
  //   .filter(Boolean),
});
